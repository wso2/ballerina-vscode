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
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Tests for {@link LockingModeController}.
 *
 * @since 1.7.0
 */
public class LockingModeControllerTest {

    private EventSyncPubSubHolder eventBus;
    private LockingModeController controller;
    private List<DomainEvent> capturedEvents;

    @BeforeMethod
    public void setUp() {
        eventBus = new EventSyncPubSubHolder();
        capturedEvents = new CopyOnWriteArrayList<>();

        // Capture WM-E7 events
        eventBus.subscribe("test-mode-watcher", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_LOCKING_MODE_CHANGED), capturedEvents::add);

        controller = new LockingModeController(eventBus);
    }

    @AfterMethod
    public void tearDown() throws Exception {
        // Allow async event delivery to complete before closing
        Thread.sleep(100);
        eventBus.close();
    }

    // =========================================================================
    // Default State Tests
    // =========================================================================

    @Test(groups = "default-state")
    public void defaultState_modeIsSOFT() {
        Assert.assertEquals(controller.getMode(), LockingMode.SOFT,
                "Default mode should be SOFT");
    }

    @Test(groups = "default-state")
    public void defaultState_authorityIsEVENT_DRIVEN() {
        Assert.assertEquals(controller.getAuthority(), LockingModeAuthority.EVENT_DRIVEN,
                "Default authority should be EVENT_DRIVEN");
    }

    // =========================================================================
    // setMode Tests
    // =========================================================================

    @Test(groups = "set-mode")
    public void setMode_equalAuthoritySucceeds() {
        boolean result = controller.setMode(LockingMode.HARD, LockingModeAuthority.EVENT_DRIVEN, "test");
        Assert.assertTrue(result, "setMode with equal authority should succeed");
        Assert.assertEquals(controller.getMode(), LockingMode.HARD);
    }

    @Test(groups = "set-mode")
    public void setMode_higherAuthorityOverrides() {
        // Set with EVENT_DRIVEN first (default), then override with EXTERNAL_ENTITY (higher priority)
        boolean result = controller.setMode(LockingMode.LOCKED, LockingModeAuthority.EXTERNAL_ENTITY, "test");
        Assert.assertTrue(result);
        Assert.assertEquals(controller.getMode(), LockingMode.LOCKED);
        Assert.assertEquals(controller.getAuthority(), LockingModeAuthority.EXTERNAL_ENTITY);
    }

    @Test(groups = "set-mode")
    public void setMode_lowerAuthorityRejected() {
        // Set with EXTERNAL_ENTITY (high priority)
        controller.setMode(LockingMode.LOCKED, LockingModeAuthority.EXTERNAL_ENTITY, "test");

        // Try to override with EVENT_DRIVEN (lower priority)
        boolean result = controller.setMode(LockingMode.SOFT, LockingModeAuthority.EVENT_DRIVEN, "test");
        Assert.assertFalse(result, "setMode with lower authority should be rejected");
        Assert.assertEquals(controller.getMode(), LockingMode.LOCKED, "Mode should remain unchanged");
    }

    @Test(groups = "set-mode")
    public void setMode_configCannotOverrideExternalEntity() {
        controller.setMode(LockingMode.HARD, LockingModeAuthority.EXTERNAL_ENTITY, "test");

        boolean result = controller.setMode(LockingMode.SOFT, LockingModeAuthority.CONFIG, "test");
        Assert.assertFalse(result, "CONFIG should not override EXTERNAL_ENTITY");
        Assert.assertEquals(controller.getMode(), LockingMode.HARD);
    }

    @Test(groups = "set-mode")
    public void setMode_emitsWME7Event() throws Exception {
        capturedEvents.clear();

        controller.setMode(LockingMode.HARD, LockingModeAuthority.EVENT_DRIVEN, "test-reason");

        // Allow async event delivery
        Thread.sleep(100);
        Assert.assertFalse(capturedEvents.isEmpty(), "WM-E7 event should be emitted");
        DomainEvent event = capturedEvents.get(0);
        Assert.assertEquals(event.eventKind(), EventKind.WORKSPACE_LOCKING_MODE_CHANGED);
        Assert.assertEquals(event.sourceContext(), "locking-mode-controller");
        Assert.assertTrue(event.coalesceScope().contains("HARD"));
        Assert.assertTrue(event.coalesceScope().contains("test-reason"));
    }

    @Test(groups = "set-mode")
    public void setMode_noOpSameModeAndAuthorityReturnsFalse() throws Exception {
        // Default is SOFT / EVENT_DRIVEN, setting same should be no-op
        capturedEvents.clear();

        boolean result = controller.setMode(LockingMode.SOFT, LockingModeAuthority.EVENT_DRIVEN, "test");

        Assert.assertFalse(result, "No-op should return false");
        Thread.sleep(100);
        Assert.assertTrue(capturedEvents.isEmpty(), "No event should be emitted for no-op");
    }

    // =========================================================================
    // Escalation Tests
    // =========================================================================

    @Test(groups = "escalation")
    public void escalate_fromLOCKEDToHARD() {
        controller.setMode(LockingMode.LOCKED, LockingModeAuthority.EVENT_DRIVEN, "setup");

        boolean result = controller.escalate();
        Assert.assertTrue(result, "Escalation should succeed");
        Assert.assertEquals(controller.getMode(), LockingMode.HARD);
    }

    @Test(groups = "escalation")
    public void escalate_fullSequenceLOCKEDToSOFT() {
        controller.setMode(LockingMode.LOCKED, LockingModeAuthority.EVENT_DRIVEN, "setup");

        Assert.assertTrue(controller.escalate());
        Assert.assertEquals(controller.getMode(), LockingMode.HARD);

        Assert.assertTrue(controller.escalate());
        Assert.assertEquals(controller.getMode(), LockingMode.MEDIUM);

        Assert.assertTrue(controller.escalate());
        Assert.assertEquals(controller.getMode(), LockingMode.SOFT);
    }

    @Test(groups = "escalation")
    public void escalate_atSOFTReturnsFalse() {
        // Default is SOFT
        boolean result = controller.escalate();
        Assert.assertFalse(result, "Escalation at SOFT should return false");
        Assert.assertEquals(controller.getMode(), LockingMode.SOFT);
    }

    @Test(groups = "escalation")
    public void escalate_rejectedWhenAuthorityIsEXTERNAL_ENTITY() {
        controller.setMode(LockingMode.LOCKED, LockingModeAuthority.EXTERNAL_ENTITY, "test");

        boolean result = controller.escalate();
        Assert.assertFalse(result, "Escalation should be rejected for EXTERNAL_ENTITY authority");
        Assert.assertEquals(controller.getMode(), LockingMode.LOCKED);
    }

    @Test(groups = "escalation")
    public void escalate_rejectedWhenAuthorityIsCONFIG() {
        controller.setMode(LockingMode.LOCKED, LockingModeAuthority.CONFIG, "test");

        boolean result = controller.escalate();
        Assert.assertFalse(result, "Escalation should be rejected for CONFIG authority");
        Assert.assertEquals(controller.getMode(), LockingMode.LOCKED);
    }

    // =========================================================================
    // Revert Tests
    // =========================================================================

    @Test(groups = "revert")
    public void revert_afterEscalationRestoresPreviousMode() {
        controller.setMode(LockingMode.LOCKED, LockingModeAuthority.EVENT_DRIVEN, "setup");
        controller.escalate(); // LOCKED -> HARD

        boolean result = controller.revert();
        Assert.assertTrue(result, "Revert should succeed");
        Assert.assertEquals(controller.getMode(), LockingMode.LOCKED);
    }

    @Test(groups = "revert")
    public void revert_emptyStackReturnsFalse() {
        boolean result = controller.revert();
        Assert.assertFalse(result, "Revert with empty stack should return false");
    }

    // =========================================================================
    // Self-Write Token Tests
    // =========================================================================

    @Test(groups = "self-write")
    public void selfWriteToken_registerAndConsumeReturnsTrue() {
        Path path = Path.of("/tmp/project/Dependencies.toml");
        controller.registerSelfWriteToken(path);

        boolean result = controller.consumeSelfWriteToken(path);
        Assert.assertTrue(result, "Consuming a registered token should return true");
    }

    @Test(groups = "self-write")
    public void selfWriteToken_consumeWithoutRegistrationReturnsFalse() {
        Path path = Path.of("/tmp/project/Dependencies.toml");

        boolean result = controller.consumeSelfWriteToken(path);
        Assert.assertFalse(result, "Consuming without registration should return false");
    }

    @Test(groups = "self-write")
    public void selfWriteToken_doubleConsumeReturnsFalseOnSecond() {
        Path path = Path.of("/tmp/project/Dependencies.toml");
        controller.registerSelfWriteToken(path);

        Assert.assertTrue(controller.consumeSelfWriteToken(path));
        Assert.assertFalse(controller.consumeSelfWriteToken(path),
                "Second consume should return false");
    }

    @Test(groups = "self-write")
    public void selfWriteToken_pathNormalization() {
        Path unnormalized = Path.of("/tmp/project/../project/Dependencies.toml");
        Path normalized = Path.of("/tmp/project/Dependencies.toml");

        controller.registerSelfWriteToken(unnormalized);
        Assert.assertTrue(controller.consumeSelfWriteToken(normalized),
                "Normalized path should match unnormalized registration");
    }

    // =========================================================================
    // Event-Driven Escalation/Revert Tests
    // =========================================================================

    @Test(groups = "event-driven")
    public void ceE6Event_triggersEscalation() throws Exception {
        controller.setMode(LockingMode.LOCKED, LockingModeAuthority.EVENT_DRIVEN, "setup");
        capturedEvents.clear();

        // Publish CE-E6 (recovery exhausted)
        eventBus.publish(new DomainEvent(Instant.now(), "compiler-engine",
                EventKind.CE_RESOLUTION_EXHAUSTED, "test-root"));

        Thread.sleep(100);
        Assert.assertEquals(controller.getMode(), LockingMode.HARD,
                "CE-E6 should trigger escalation from LOCKED to HARD");
    }

    @Test(groups = "event-driven")
    public void ceE4Event_triggersRevert() throws Exception {
        controller.setMode(LockingMode.LOCKED, LockingModeAuthority.EVENT_DRIVEN, "setup");
        controller.escalate(); // LOCKED -> HARD
        capturedEvents.clear();

        // Publish CE-E4 (resolution completed)
        eventBus.publish(new DomainEvent(Instant.now(), "compiler-engine",
                EventKind.COMPILER_RESOLUTION_COMPLETED, "test-root"));

        Thread.sleep(100);
        Assert.assertEquals(controller.getMode(), LockingMode.LOCKED,
                "CE-E4 should trigger revert from HARD to LOCKED");
    }
}
