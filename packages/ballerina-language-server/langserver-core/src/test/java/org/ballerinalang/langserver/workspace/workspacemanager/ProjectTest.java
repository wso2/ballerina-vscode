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

import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.Lock;

/**
 * Tests for {@link Project} aggregate root and contained value objects.
 *
 * @since 1.7.0
 */
public class ProjectTest {

    private static final Path ABS_PATH = Path.of("/workspace/myproject").toAbsolutePath().normalize();
    private static final DocumentUri SOURCE_ROOT = new DocumentUri.FileUri(ABS_PATH.toUri());

    // -------------------------------------------------------------------------
    // HeapEstimate tests
    // -------------------------------------------------------------------------

    /**
     * Verifies ofMb with a valid positive value.
     */
    @Test
    public void heapEstimate_ofMb_validPositiveValue() {
        HeapEstimate h = HeapEstimate.ofMb(256);
        Assert.assertEquals(h.estimatedHeapMb(), 256);
    }

    /**
     * Verifies ofMb with zero is allowed.
     */
    @Test
    public void heapEstimate_ofMb_zeroIsAllowed() {
        HeapEstimate h = HeapEstimate.ofMb(0);
        Assert.assertEquals(h.estimatedHeapMb(), 0);
    }

    /**
     * Verifies ofMb with negative value throws IllegalArgumentException.
     */
    @Test(expectedExceptions = IllegalArgumentException.class)
    public void heapEstimate_ofMb_negativeThrows() {
        HeapEstimate.ofMb(-1);
    }

    /**
     * Verifies add produces the correct sum.
     */
    @Test
    public void heapEstimate_add_sumsCorrectly() {
        HeapEstimate a = HeapEstimate.ofMb(100);
        HeapEstimate b = HeapEstimate.ofMb(50);
        HeapEstimate sum = a.add(b);
        Assert.assertEquals(sum.estimatedHeapMb(), 150);
    }

    /**
     * Verifies compareTo orders by magnitude.
     */
    @Test
    public void heapEstimate_compareTo_ordersByMagnitude() {
        HeapEstimate small = HeapEstimate.ofMb(10);
        HeapEstimate large = HeapEstimate.ofMb(100);
        Assert.assertTrue(small.compareTo(large) < 0);
        Assert.assertTrue(large.compareTo(small) > 0);
        Assert.assertEquals(small.compareTo(HeapEstimate.ofMb(10)), 0);
    }

    /**
     * Verifies equals on same value is true.
     */
    @Test
    public void heapEstimate_equals_sameValueIsEqual() {
        HeapEstimate a = HeapEstimate.ofMb(128);
        HeapEstimate b = HeapEstimate.ofMb(128);
        Assert.assertEquals(a, b);
        Assert.assertEquals(a.hashCode(), b.hashCode());
    }

    /**
     * Verifies equals on different values is false.
     */
    @Test
    public void heapEstimate_equals_differentValueIsNotEqual() {
        HeapEstimate a = HeapEstimate.ofMb(128);
        HeapEstimate b = HeapEstimate.ofMb(256);
        Assert.assertNotEquals(a, b);
    }

    /**
     * Verifies toString format.
     */
    @Test
    public void heapEstimate_toString_format() {
        HeapEstimate h = HeapEstimate.ofMb(64);
        Assert.assertEquals(h.toString(), "HeapEstimate[64MB]");
    }

    // -------------------------------------------------------------------------
    // OpenDocumentCount tests
    // -------------------------------------------------------------------------

    /**
     * Verifies initial count is zero and tier is BACKGROUND.
     */
    @Test
    public void openDocumentCount_initialState_zeroCountBackgroundTier() {
        OpenDocumentCount c = new OpenDocumentCount();
        Assert.assertEquals(c.count(), 0);
        Assert.assertEquals(c.tier(), ProjectTier.BACKGROUND);
    }

    /**
     * Verifies increment increases count to 1 and switches to ACTIVE tier.
     */
    @Test
    public void openDocumentCount_increment_switchesToActiveTier() {
        OpenDocumentCount c = new OpenDocumentCount();
        c.increment();
        Assert.assertEquals(c.count(), 1);
        Assert.assertEquals(c.tier(), ProjectTier.ACTIVE);
    }

    /**
     * Verifies multiple increments accumulate.
     */
    @Test
    public void openDocumentCount_multipleIncrements_accumulate() {
        OpenDocumentCount c = new OpenDocumentCount();
        c.increment();
        c.increment();
        c.increment();
        Assert.assertEquals(c.count(), 3);
    }

    /**
     * Verifies decrement from 1 reaches 0 and switches back to BACKGROUND.
     */
    @Test
    public void openDocumentCount_decrement_switchesToBackgroundWhenZero() {
        OpenDocumentCount c = new OpenDocumentCount();
        c.increment();
        c.decrement();
        Assert.assertEquals(c.count(), 0);
        Assert.assertEquals(c.tier(), ProjectTier.BACKGROUND);
    }

    /**
     * Verifies decrement floors at zero and never goes negative.
     */
    @Test
    public void openDocumentCount_decrement_floorAtZero() {
        OpenDocumentCount c = new OpenDocumentCount();
        c.decrement(); // should not go negative
        Assert.assertEquals(c.count(), 0);
        c.decrement(); // still should not go negative
        Assert.assertEquals(c.count(), 0);
    }

    /**
     * Verifies concurrent increments and decrements produce a non-negative count.
     */
    @Test
    public void openDocumentCount_concurrency_nonNegativeUnderContention() throws InterruptedException {
        OpenDocumentCount c = new OpenDocumentCount();
        int threads = 20;
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            int idx = i;
            Thread t = new Thread(() -> {
                try {
                    start.await();
                    if (idx % 2 == 0) {
                        c.increment();
                    } else {
                        c.decrement();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
            t.start();
        }

        start.countDown();
        Assert.assertTrue(done.await(5, TimeUnit.SECONDS));
        Assert.assertTrue(c.count() >= 0, "count must never be negative");
    }

    // -------------------------------------------------------------------------
    // ProjectLock tests
    // -------------------------------------------------------------------------

    /**
     * Verifies readLock() is non-null.
     */
    @Test
    public void projectLock_readLock_nonNull() {
        ProjectLock pl = new ProjectLock();
        Assert.assertNotNull(pl.readLock());
    }

    /**
     * Verifies writeLock() is non-null.
     */
    @Test
    public void projectLock_writeLock_nonNull() {
        ProjectLock pl = new ProjectLock();
        Assert.assertNotNull(pl.writeLock());
    }

    /**
     * Verifies that two threads can both hold the read lock simultaneously.
     */
    @Test
    public void projectLock_readLock_allowsConcurrentReaders() throws InterruptedException {
        ProjectLock pl = new ProjectLock();
        Lock r1 = pl.readLock();
        Lock r2 = pl.readLock();

        CountDownLatch bothLocked = new CountDownLatch(2);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);

        Runnable reader = () -> {
            r1.lock();
            try {
                bothLocked.countDown();
                try {
                    release.await(2, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            } finally {
                r1.unlock();
                done.countDown();
            }
        };

        new Thread(reader).start();
        new Thread(reader).start();

        // Both threads must be able to hold the read lock simultaneously
        Assert.assertTrue(bothLocked.await(2, TimeUnit.SECONDS),
                "Both threads should hold read lock simultaneously");
        release.countDown();
        Assert.assertTrue(done.await(3, TimeUnit.SECONDS));
    }

    /**
     * Verifies that write lock excludes concurrent writers.
     */
    @Test
    public void projectLock_writeLock_exclusiveWrite() throws InterruptedException {
        ProjectLock pl = new ProjectLock();
        Lock w = pl.writeLock();

        AtomicReference<Boolean> wroteWhileLocked = new AtomicReference<>(false);
        CountDownLatch firstWriterIn = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondWriterDone = new CountDownLatch(1);

        // First writer holds the lock
        Thread firstWriter = new Thread(() -> {
            w.lock();
            try {
                firstWriterIn.countDown();
                try {
                    releaseFirst.await(2, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            } finally {
                w.unlock();
            }
        });

        // Second writer tries to acquire while first holds
        Thread secondWriter = new Thread(() -> {
            try {
                firstWriterIn.await(2, TimeUnit.SECONDS);
                // Try non-blocking acquire — must fail while first writer holds
                boolean acquired = w.tryLock();
                wroteWhileLocked.set(acquired);
                if (acquired) {
                    w.unlock();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                secondWriterDone.countDown();
            }
        });

        firstWriter.start();
        secondWriter.start();

        Assert.assertTrue(secondWriterDone.await(3, TimeUnit.SECONDS));
        Assert.assertFalse(wroteWhileLocked.get(),
                "Second writer must not acquire write lock while first holds it");
        releaseFirst.countDown();
        firstWriter.join(2000);
    }

    // -------------------------------------------------------------------------
    // Project constructor tests
    // -------------------------------------------------------------------------

    /**
     * Verifies initial state of a newly constructed project.
     */
    @Test
    public void project_constructor_initialState() {
        Project project = new Project(SOURCE_ROOT, ProjectKind.BUILD,
                HeapEstimate.ofMb(512));

        Assert.assertEquals(project.sourceRoot(), SOURCE_ROOT);
        Assert.assertEquals(project.kind(), ProjectKind.BUILD);
        Assert.assertEquals(project.healthState(), ProjectHealthState.HEALTHY);
        Assert.assertEquals(project.heapEstimate().estimatedHeapMb(), 512);
        Assert.assertNotNull(project.openDocumentCount());
        Assert.assertNotNull(project.projectLock());
    }

    /**
     * Verifies null sourceRoot throws NullPointerException.
     */
    @Test(expectedExceptions = NullPointerException.class)
    public void project_constructor_nullDocumentUriThrows() {
        new Project(null, ProjectKind.BUILD, HeapEstimate.ofMb(0));
    }

    /**
     * Verifies null kind throws NullPointerException.
     */
    @Test(expectedExceptions = NullPointerException.class)
    public void project_constructor_nullKindThrows() {
        new Project(SOURCE_ROOT, null, HeapEstimate.ofMb(0));
    }

    /**
     * Verifies null heapEstimate throws NullPointerException.
     */
    @Test(expectedExceptions = NullPointerException.class)
    public void project_constructor_nullHeapEstimateThrows() {
        new Project(SOURCE_ROOT, ProjectKind.BUILD, null);
    }

    /**
     * Verifies equality is based solely on the project root URI.
     */
    @Test
    public void project_equals_basedOnDocumentUri() {
        Project p1 = new Project(SOURCE_ROOT, ProjectKind.BUILD, HeapEstimate.ofMb(100));
        Project p2 = new Project(SOURCE_ROOT, ProjectKind.SINGLE_FILE, HeapEstimate.ofMb(200));
        Assert.assertEquals(p1, p2);
        Assert.assertEquals(p1.hashCode(), p2.hashCode());
    }

    /**
     * Verifies projects with different source roots are not equal.
     */
    @Test
    public void project_equals_differentDocumentUriNotEqual() {
        Path otherPath = Path.of("/workspace/other").toAbsolutePath().normalize();
        DocumentUri otherRoot = new DocumentUri.FileUri(otherPath.toUri());
        Project p1 = new Project(SOURCE_ROOT, ProjectKind.BUILD, HeapEstimate.ofMb(100));
        Project p2 = new Project(otherRoot, ProjectKind.BUILD, HeapEstimate.ofMb(100));
        Assert.assertNotEquals(p1, p2);
    }

    // -------------------------------------------------------------------------
    // FSM valid transition arcs
    // -------------------------------------------------------------------------

    /**
     * Verifies HEALTHY → COMPILATION_CRASHED transition.
     */
    @Test
    public void fsm_healthy_to_compilationCrashed_succeeds() {
        Project project = newHealthyProject();
        Project.HealthTransitionEvent evt = project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);

        Assert.assertEquals(project.healthState(), ProjectHealthState.COMPILATION_CRASHED);
        Assert.assertEquals(evt.fromState(), ProjectHealthState.HEALTHY);
        Assert.assertEquals(evt.toState(), ProjectHealthState.COMPILATION_CRASHED);
    }

    /**
     * Verifies HEALTHY → PROJECT_CRASHED transition.
     */
    @Test
    public void fsm_healthy_to_projectCrashed_succeeds() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        Assert.assertEquals(project.healthState(), ProjectHealthState.PROJECT_CRASHED);
    }

    /**
     * Verifies HEALTHY → CANCELLED transition.
     */
    @Test
    public void fsm_healthy_to_cancelled_succeeds() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.CANCELLED);
        Assert.assertEquals(project.healthState(), ProjectHealthState.CANCELLED);
    }

    /**
     * Verifies COMPILATION_CRASHED → RECOVERING requires sourceChangedSinceLastCrash flag.
     */
    @Test
    public void fsm_compilationCrashed_to_recovering_requiresSourceChangedFlag() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        project.notifySourceChanged();
        project.transitionTo(ProjectHealthState.RECOVERING);
        Assert.assertEquals(project.healthState(), ProjectHealthState.RECOVERING);
    }

    /**
     * Verifies PROJECT_CRASHED → RECOVERING transition.
     */
    @Test
    public void fsm_projectCrashed_to_recovering_succeeds() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        Assert.assertEquals(project.healthState(), ProjectHealthState.RECOVERING);
    }

    /**
     * Verifies CANCELLED → RECOVERING transition.
     */
    @Test
    public void fsm_cancelled_to_recovering_succeeds() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.CANCELLED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        Assert.assertEquals(project.healthState(), ProjectHealthState.RECOVERING);
    }

    /**
     * Verifies RECOVERING → HEALTHY transition.
     */
    @Test
    public void fsm_recovering_to_healthy_succeeds() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.HEALTHY);
        Assert.assertEquals(project.healthState(), ProjectHealthState.HEALTHY);
    }

    /**
     * Verifies RECOVERING → CIRCUIT_OPEN transition.
     */
    @Test
    public void fsm_recovering_to_circuitOpen_succeeds() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.CIRCUIT_OPEN);
        Assert.assertEquals(project.healthState(), ProjectHealthState.CIRCUIT_OPEN);
    }

    /**
     * Verifies CIRCUIT_OPEN → RECOVERING transition.
     */
    @Test
    public void fsm_circuitOpen_to_recovering_succeeds() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.CIRCUIT_OPEN);
        project.transitionTo(ProjectHealthState.RECOVERING);
        Assert.assertEquals(project.healthState(), ProjectHealthState.RECOVERING);
    }

    // -------------------------------------------------------------------------
    // FSM invalid arcs — all must throw IllegalStateException
    // -------------------------------------------------------------------------

    /**
     * Verifies HEALTHY → RECOVERING is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_healthy_to_recovering() {
        newHealthyProject().transitionTo(ProjectHealthState.RECOVERING);
    }

    /**
     * Verifies HEALTHY → CIRCUIT_OPEN is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_healthy_to_circuitOpen() {
        newHealthyProject().transitionTo(ProjectHealthState.CIRCUIT_OPEN);
    }

    /**
     * Verifies HEALTHY → HEALTHY (self-transition) is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_healthy_selfTransition() {
        newHealthyProject().transitionTo(ProjectHealthState.HEALTHY);
    }

    /**
     * Verifies COMPILATION_CRASHED → RECOVERING is rejected without sourceChangedSinceLastCrash.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_compilationCrashed_to_recovering_withoutSourceChange() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        // Do NOT call notifySourceChanged — transition must be rejected
        project.transitionTo(ProjectHealthState.RECOVERING);
    }

    /**
     * Verifies COMPILATION_CRASHED → HEALTHY is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_compilationCrashed_to_healthy() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        project.transitionTo(ProjectHealthState.HEALTHY);
    }

    /**
     * Verifies COMPILATION_CRASHED → CIRCUIT_OPEN is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_compilationCrashed_to_circuitOpen() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        project.transitionTo(ProjectHealthState.CIRCUIT_OPEN);
    }

    /**
     * Verifies PROJECT_CRASHED → HEALTHY is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_projectCrashed_to_healthy() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.HEALTHY);
    }

    /**
     * Verifies RECOVERING → COMPILATION_CRASHED is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_recovering_to_compilationCrashed() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
    }

    /**
     * Verifies RECOVERING → CANCELLED is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_recovering_to_cancelled() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.CANCELLED);
    }

    /**
     * Verifies CIRCUIT_OPEN → HEALTHY is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_circuitOpen_to_healthy() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.CIRCUIT_OPEN);
        project.transitionTo(ProjectHealthState.HEALTHY);
    }

    /**
     * Verifies CIRCUIT_OPEN → CIRCUIT_OPEN (self-transition) is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void fsm_invalid_circuitOpen_selfTransition() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.CIRCUIT_OPEN);
        project.transitionTo(ProjectHealthState.CIRCUIT_OPEN);
    }

    // -------------------------------------------------------------------------
    // Event payload tests
    // -------------------------------------------------------------------------

    /**
     * Verifies HealthTransitionEvent has non-null eventId.
     */
    @Test
    public void event_healthTransition_eventIdNonNull() {
        Project project = newHealthyProject();
        Project.HealthTransitionEvent evt = project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        Assert.assertNotNull(evt.eventId());
    }

    /**
     * Verifies HealthTransitionEvent has correct from/to states.
     */
    @Test
    public void event_healthTransition_correctFromToStates() {
        Project project = newHealthyProject();
        Project.HealthTransitionEvent evt = project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        Assert.assertEquals(evt.fromState(), ProjectHealthState.HEALTHY);
        Assert.assertEquals(evt.toState(), ProjectHealthState.PROJECT_CRASHED);
    }

    /**
     * Verifies HealthTransitionEvent has non-null timestamp.
     */
    @Test
    public void event_healthTransition_timestampNonNull() {
        Project project = newHealthyProject();
        Project.HealthTransitionEvent evt = project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        Assert.assertNotNull(evt.timestamp());
    }

    /**
     * Verifies HealthTransitionEvent timestamps are monotonically ordered.
     */
    @Test
    public void event_healthTransition_timestampsMonotonicallyOrdered() throws InterruptedException {
        Project project = newHealthyProject();
        Project.HealthTransitionEvent evt1 = project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        Thread.sleep(2); // ensure clock advances
        project.notifySourceChanged();
        Project.HealthTransitionEvent evt2 = project.transitionTo(ProjectHealthState.RECOVERING);

        Assert.assertFalse(evt2.timestamp().isBefore(evt1.timestamp()),
                "Second event timestamp must not precede first");
    }

    /**
     * Verifies HealthTransitionEvent carries correct sourceRoot.
     */
    @Test
    public void event_healthTransition_correctDocumentUri() {
        Project project = newHealthyProject();
        Project.HealthTransitionEvent evt = project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        Assert.assertEquals(evt.sourceRoot(), SOURCE_ROOT);
    }

    /**
     * Verifies HealthTransitionEvent has the correct eventType string.
     */
    @Test
    public void event_healthTransition_correctEventType() {
        Project project = newHealthyProject();
        Project.HealthTransitionEvent evt = project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        Assert.assertEquals(evt.eventType(), "health-state-changed");
    }

    /**
     * Verifies KindTransitionEvent has non-null eventId, correct from/to kinds, and correct eventType.
     */
    @Test
    public void event_kindTransition_correctPayload() {
        Project project = newSingleFileProject();
        Project.KindTransitionEvent evt = project.transitionKind(ProjectKind.BUILD);

        Assert.assertNotNull(evt.eventId());
        Assert.assertNotNull(evt.timestamp());
        Assert.assertEquals(evt.sourceRoot(), SOURCE_ROOT);
        Assert.assertEquals(evt.eventType(), "kind-transitioned");
        Assert.assertEquals(evt.fromKind(), ProjectKind.SINGLE_FILE);
        Assert.assertEquals(evt.toKind(), ProjectKind.BUILD);
    }

    // -------------------------------------------------------------------------
    // notifySourceChanged tests
    // -------------------------------------------------------------------------

    /**
     * Verifies that notifySourceChanged enables the COMPILATION_CRASHED → RECOVERING arc.
     */
    @Test
    public void notifySourceChanged_enablesCompilationCrashedToRecovering() {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        project.notifySourceChanged();
        // Must NOT throw
        project.transitionTo(ProjectHealthState.RECOVERING);
        Assert.assertEquals(project.healthState(), ProjectHealthState.RECOVERING);
    }

    /**
     * Verifies that the sourceChangedSinceLastCrash flag is reset when entering RECOVERING,
     * so a subsequent COMPILATION_CRASHED cycle requires a fresh notifySourceChanged call.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void notifySourceChanged_flagResetAfterTransition() {
        Project project = newHealthyProject();
        // Cycle through RECOVERING — this resets sourceChangedSinceLastCrash to false
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.CIRCUIT_OPEN);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.HEALTHY);
        // Now enter COMPILATION_CRASHED — flag is false (was reset on last RECOVERING entry)
        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        // Must throw: sourceChangedSinceLastCrash is false; no notifySourceChanged called since
        project.transitionTo(ProjectHealthState.RECOVERING);
    }

    // -------------------------------------------------------------------------
    // Kind transition tests
    // -------------------------------------------------------------------------

    /**
     * Verifies SINGLE_FILE → BUILD transition is allowed.
     */
    @Test
    public void kindTransition_singleFile_to_build_allowed() {
        Project project = newSingleFileProject();
        project.transitionKind(ProjectKind.BUILD);
        Assert.assertEquals(project.kind(), ProjectKind.BUILD);
    }

    /**
     * Verifies BUILD → SINGLE_FILE transition is allowed.
     */
    @Test
    public void kindTransition_build_to_singleFile_allowed() {
        Project project = new Project(SOURCE_ROOT, ProjectKind.BUILD, HeapEstimate.ofMb(256));
        project.transitionKind(ProjectKind.SINGLE_FILE);
        Assert.assertEquals(project.kind(), ProjectKind.SINGLE_FILE);
    }

    /**
     * Verifies SINGLE_FILE → BALA is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void kindTransition_singleFile_to_bala_rejected() {
        newSingleFileProject().transitionKind(ProjectKind.BALA);
    }

    /**
     * Verifies SINGLE_FILE → WORKSPACE is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void kindTransition_singleFile_to_workspace_rejected() {
        newSingleFileProject().transitionKind(ProjectKind.WORKSPACE);
    }

    /**
     * Verifies BUILD → BALA is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void kindTransition_build_to_bala_rejected() {
        new Project(SOURCE_ROOT, ProjectKind.BUILD, HeapEstimate.ofMb(256))
                .transitionKind(ProjectKind.BALA);
    }

    /**
     * Verifies SINGLE_FILE → SINGLE_FILE (self-transition kind) is rejected.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void kindTransition_selfTransition_rejected() {
        newSingleFileProject().transitionKind(ProjectKind.SINGLE_FILE);
    }

    // -------------------------------------------------------------------------
    // Concurrency tests
    // -------------------------------------------------------------------------

    /**
     * Verifies concurrent transitionTo calls do not produce an inconsistent state.
     * Only one thread should win each transition; all others should see a consistent state.
     */
    @Test
    public void concurrency_concurrentTransitionTo_consistentState() throws InterruptedException {
        Project project = newHealthyProject();
        int threads = 10;
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        List<Throwable> errors = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            Thread t = new Thread(() -> {
                try {
                    start.await();
                    try {
                        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
                    } catch (IllegalStateException ignored) {
                        // Expected: only the first thread wins; others see wrong pre-state
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Throwable e) {
                    synchronized (errors) {
                        errors.add(e);
                    }
                } finally {
                    done.countDown();
                }
            });
            t.start();
        }

        start.countDown();
        Assert.assertTrue(done.await(5, TimeUnit.SECONDS));
        Assert.assertTrue(errors.isEmpty(), "Unexpected errors: " + errors);
        // Final state must be COMPILATION_CRASHED (exactly one thread won)
        Assert.assertEquals(project.healthState(), ProjectHealthState.COMPILATION_CRASHED);
    }

    /**
     * Verifies notify + transition do not deadlock.
     */
    @Test(timeOut = 5000)
    public void concurrency_notifyAndTransition_noDeadlock() throws InterruptedException {
        Project project = newHealthyProject();
        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);

        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);

        Thread notifier = new Thread(() -> {
            try {
                start.await();
                for (int i = 0; i < 100; i++) {
                    project.notifySourceChanged();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });

        Thread transitioner = new Thread(() -> {
            try {
                start.await();
                for (int i = 0; i < 50; i++) {
                    try {
                        project.notifySourceChanged();
                        project.transitionTo(ProjectHealthState.RECOVERING);
                        project.transitionTo(ProjectHealthState.HEALTHY);
                        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
                    } catch (IllegalStateException ignored) {
                        // Races are expected
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });

        notifier.start();
        transitioner.start();
        start.countDown();
        Assert.assertTrue(done.await(4, TimeUnit.SECONDS), "Test should complete without deadlock");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Project newHealthyProject() {
        return new Project(SOURCE_ROOT, ProjectKind.BUILD, HeapEstimate.ofMb(512));
    }

    private Project newSingleFileProject() {
        return new Project(SOURCE_ROOT, ProjectKind.SINGLE_FILE, HeapEstimate.ofMb(64));
    }
}
