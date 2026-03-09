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

import javax.management.ListenerNotFoundException;
import javax.management.Notification;
import javax.management.NotificationEmitter;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryNotificationInfo;
import java.lang.management.MemoryPoolMXBean;
import java.lang.management.MemoryType;
import java.util.Comparator;
import java.util.Objects;
import java.util.Optional;

/**
 * Listens for JVM old-generation heap pressure via {@link MemoryPoolMXBean} and
 * triggers a configurable eviction callback when the post-GC usage exceeds 75%.
 *
 * <p>The pool is resolved by <em>capability</em> (supports collection usage threshold,
 * is heap type, largest max size), not by name, so the implementation is agnostic to
 * the GC implementation (G1/Parallel/ZGC/Shenandoah).</p>
 *
 * <p>{@code setCollectionUsageThreshold} (post-GC) is used instead of
 * {@code setUsageThreshold} (pre-GC) to avoid spurious firing during allocation bursts.</p>
 *
 * @since 1.7.0
 */
public final class HeapPressureListener {

    private final double thresholdFraction;
    private final Runnable evictionCallback;
    private volatile NotificationEmitter registeredEmitter;

    /**
     * Constructs a listener that fires {@code evictionCallback} when heap pressure is detected.
     *
     * @param thresholdFraction fraction of old-gen max at which to trigger; e.g. 0.75
     * @param evictionCallback  callback to run on threshold exceeded; must not be null
     * @throws NullPointerException if evictionCallback is null
     */
    public HeapPressureListener(double thresholdFraction, Runnable evictionCallback) {
        Objects.requireNonNull(evictionCallback, "evictionCallback must not be null");
        this.thresholdFraction = thresholdFraction;
        this.evictionCallback = evictionCallback;
    }

    /**
     * Registers with the JVM MemoryMXBean to receive post-GC collection threshold notifications.
     * If no suitable old-gen pool is found, registration is skipped (no-op fallback).
     */
    public void start() {
        Optional<MemoryPoolMXBean> pool = findOldGenPool();
        if (pool.isEmpty()) {
            return;
        }
        long max = pool.get().getUsage().getMax();
        if (max < 0) {
            return;
        }
        long threshold = (long) (max * thresholdFraction);
        pool.get().setCollectionUsageThreshold(threshold);

        NotificationEmitter emitter = (NotificationEmitter) ManagementFactory.getMemoryMXBean();
        emitter.addNotificationListener(this::handleNotification, null, null);
        this.registeredEmitter = emitter;
    }

    /**
     * Removes the notification listener if one was registered. Safe to call even if
     * {@link #start()} was never called.
     */
    public void stop() {
        NotificationEmitter emitter = this.registeredEmitter;
        if (emitter != null) {
            try {
                emitter.removeNotificationListener(this::handleNotification);
            } catch (ListenerNotFoundException e) {
                // Already removed or never registered — safe to ignore.
            }
            this.registeredEmitter = null;
        }
    }

    /**
     * Test-only hook: directly invokes the eviction callback, bypassing MXBean machinery.
     */
    public void simulateThresholdExceeded() {
        evictionCallback.run();
    }

    /**
     * Finds the old-generation heap pool by capability: heap type, supports collection
     * usage threshold, with the largest max size. Pool names are GC-specific and must
     * not be relied upon.
     *
     * @return the best-matching old-gen pool, or empty if none qualifies
     */
    static Optional<MemoryPoolMXBean> findOldGenPool() {
        return ManagementFactory.getMemoryPoolMXBeans().stream()
                .filter(p -> p.getType() == MemoryType.HEAP)
                .filter(MemoryPoolMXBean::isCollectionUsageThresholdSupported)
                .max(Comparator.comparingLong(p -> p.getUsage().getMax()));
    }

    private void handleNotification(Notification notification, Object handback) {
        if (MemoryNotificationInfo.MEMORY_COLLECTION_THRESHOLD_EXCEEDED.equals(notification.getType())) {
            evictionCallback.run();
        }
    }
}
