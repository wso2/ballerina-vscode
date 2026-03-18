/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package org.ballerinalang.langserver.workspace.workspacemanager;

import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Dedicated aggregate managing locking mode with authority priority chain,
 * temporary escalation via {@link ModeStack}, and self-write guard for Dependencies.toml.
 *
 * <p>Thread safety: compound {@link ModeState} in a single {@link AtomicReference} for lock-free reads,
 * with {@link ReentrantLock} for check-then-set operations in {@link #setMode} and {@link #escalate}.
 *
 * @since 1.7.0
 */
public final class LockingModeController {

    /**
     * Escalation sequence from most restrictive to most permissive.
     */
    private static final List<LockingMode> ESCALATION_SEQUENCE =
            List.of(LockingMode.LOCKED, LockingMode.HARD, LockingMode.MEDIUM, LockingMode.SOFT);

    private static final String SOURCE_CONTEXT = "locking-mode-controller";

    private final AtomicReference<ModeState> state;
    private final ModeStack modeStack;
    private final EventSyncPubSubHolder eventBus;
    private final ConcurrentHashMap<Path, Boolean> selfWriteTokens;
    private final ReentrantLock modeLock;

    /**
     * Compound value holding the current locking mode and its authority.
     */
    private record ModeState(LockingMode mode, LockingModeAuthority authority) {
    }

    /**
     * Creates a new controller with default state SOFT / EVENT_DRIVEN.
     *
     * @param eventBus the event bus for publishing mode change events and subscribing to compiler events
     * @throws NullPointerException if eventBus is null
     */
    public LockingModeController(EventSyncPubSubHolder eventBus) {
        Objects.requireNonNull(eventBus, "eventBus must not be null");

        this.eventBus = eventBus;
        this.state = new AtomicReference<>(new ModeState(LockingMode.SOFT, LockingModeAuthority.EVENT_DRIVEN));
        this.modeStack = new ModeStack();
        this.selfWriteTokens = new ConcurrentHashMap<>();
        this.modeLock = new ReentrantLock();

        // Subscribe to compiler events for automatic escalation/revert
        eventBus.subscribe("lmc-recovery-exhausted", SubscriberTier.CRITICAL,
                Set.of(EventKind.CE_RESOLUTION_EXHAUSTED), this::onRecoveryExhausted);
        eventBus.subscribe("lmc-resolution-completed", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_RESOLUTION_COMPLETED), this::onResolutionCompleted);
    }

    /**
     * Sets the locking mode if the caller's authority is equal to or higher than the current authority.
     *
     * <p>Authority priority is determined by ordinal comparison: lower ordinal = higher priority
     * (EXTERNAL_ENTITY > CONFIG > EVENT_DRIVEN).
     *
     * @param mode the target locking mode
     * @param authority the caller's authority
     * @param reason a human-readable reason for the change
     * @return true if the mode was changed, false if rejected or no-op
     * @throws NullPointerException if any argument is null
     */
    public boolean setMode(LockingMode mode, LockingModeAuthority authority, String reason) {
        Objects.requireNonNull(mode, "mode must not be null");
        Objects.requireNonNull(authority, "authority must not be null");
        Objects.requireNonNull(reason, "reason must not be null");

        modeLock.lock();
        try {
            ModeState current = state.get();

            // Reject if caller authority is lower priority (higher ordinal) than current
            if (authority.ordinal() > current.authority().ordinal()) {
                return false;
            }

            // No-op if same mode and authority
            if (current.mode() == mode && current.authority() == authority) {
                return false;
            }

            state.set(new ModeState(mode, authority));
        } finally {
            modeLock.unlock();
        }

        publishModeChanged(mode, authority, reason);
        return true;
    }

    /**
     * Returns the current locking mode. Lock-free read.
     *
     * @return current locking mode
     */
    public LockingMode getMode() {
        return state.get().mode();
    }

    /**
     * Returns the current authority. Lock-free read.
     *
     * @return current authority
     */
    public LockingModeAuthority getAuthority() {
        return state.get().authority();
    }

    /**
     * Escalates the locking mode one step more permissive in the escalation sequence.
     *
     * <p>Precondition: authority must be EVENT_DRIVEN. Pushes the current mode onto
     * the {@link ModeStack} before advancing.
     *
     * @return true if escalation occurred, false if at SOFT or authority is not EVENT_DRIVEN
     */
    public boolean escalate() {
        modeLock.lock();
        try {
            ModeState current = state.get();

            // Only EVENT_DRIVEN authority can escalate
            if (current.authority() != LockingModeAuthority.EVENT_DRIVEN) {
                return false;
            }

            int currentIndex = ESCALATION_SEQUENCE.indexOf(current.mode());
            if (currentIndex < 0 || currentIndex >= ESCALATION_SEQUENCE.size() - 1) {
                // Already at SOFT (most permissive) or unknown mode
                return false;
            }

            LockingMode nextMode = ESCALATION_SEQUENCE.get(currentIndex + 1);
            modeStack.push(current.mode());
            state.set(new ModeState(nextMode, LockingModeAuthority.EVENT_DRIVEN));
        } finally {
            modeLock.unlock();
        }

        ModeState newState = state.get();
        publishModeChanged(newState.mode(), newState.authority(), "escalation");
        return true;
    }

    /**
     * Reverts the locking mode to the previous mode from the {@link ModeStack}.
     *
     * @return true if reverted, false if the stack is empty
     */
    public boolean revert() {
        modeLock.lock();
        try {
            return modeStack.pop().map(previousMode -> {
                state.set(new ModeState(previousMode, LockingModeAuthority.EVENT_DRIVEN));
                publishModeChanged(previousMode, LockingModeAuthority.EVENT_DRIVEN, "revert");
                return true;
            }).orElse(false);
        } finally {
            modeLock.unlock();
        }
    }

    /**
     * Registers a self-write token for the given path.
     *
     * @param path the file path to register
     * @throws NullPointerException if path is null
     */
    public void registerSelfWriteToken(Path path) {
        Objects.requireNonNull(path, "path must not be null");
        selfWriteTokens.put(path.toAbsolutePath().normalize(), Boolean.TRUE);
    }

    /**
     * Atomically consumes a self-write token for the given path.
     *
     * @param path the file path to consume
     * @return true if a token was consumed, false if no token was registered
     * @throws NullPointerException if path is null
     */
    public boolean consumeSelfWriteToken(Path path) {
        Objects.requireNonNull(path, "path must not be null");
        return selfWriteTokens.remove(path.toAbsolutePath().normalize()) != null;
    }

    // =========================================================================
    // Event Handlers
    // =========================================================================

    private void onRecoveryExhausted(DomainEvent event) {
        escalate();
    }

    private void onResolutionCompleted(DomainEvent event) {
        revert();
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    private void publishModeChanged(LockingMode mode, LockingModeAuthority authority, String reason) {
        String coalesceScope = mode + "|" + authority + "|" + reason;
        eventBus.publish(new DomainEvent(Instant.now(), SOURCE_CONTEXT,
                EventKind.WORKSPACE_LOCKING_MODE_CHANGED, coalesceScope));
    }
}
