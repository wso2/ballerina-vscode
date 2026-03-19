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
package org.ballerinalang.langserver.workspace.test.acceptance;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.projects.PackageCompilation;
import org.awaitility.Awaitility;
import org.ballerinalang.langserver.workspace.compilerengine.CancellationToken;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationPhase;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationPipeline;
import org.ballerinalang.langserver.workspace.compilerengine.CompileTask;
import org.ballerinalang.langserver.workspace.compilerengine.MaterializedStableSnapshot;
import org.ballerinalang.langserver.workspace.compilerengine.StableSnapshot;
import org.ballerinalang.langserver.workspace.compilerengine.DualSnapshotStore;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Acceptance tests translating cancellation-model.feature scenarios into executable assertions.
 *
 * @since 1.7.0
 */
public class CancellationModelTest {

    private static final SourceRoot TEST_ROOT = new SourceRoot(
            Path.of("/tmp/acceptance-cancellation-model").toAbsolutePath().normalize());

    private CompilationPipeline pipeline;
    private EventSyncPubSubHolder eventBus;

    /**
     * Closes per-test resources.
     */
    @AfterMethod
    public void tearDown() {
        if (pipeline != null) {
            pipeline.close();
            pipeline = null;
        }
        if (eventBus != null) {
            eventBus.close();
            eventBus = null;
        }
    }

    /**
     * Verifies a superseding request interrupts the running compilation thread.
     */
    @Test
    public void supersedingDidChange_interruptsInProgressCompilationThread() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch interrupted = new CountDownLatch(1);
        Map<Integer, StableSnapshot> snapshots = Map.of(
                1, createSnapshot(new ContentVersion(1)),
                2, createSnapshot(new ContentVersion(2))
        );

        pipeline = createPipeline(new DualSnapshotStore(), task -> {
            if (task.contentVersion().value() == 1) {
                firstStarted.countDown();
                try {
                    new CountDownLatch(1).await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    interrupted.countDown();
                    Thread.currentThread().interrupt();
                    throw new CancellationException("interrupted");
                }
            }
            return snapshots.get(task.contentVersion().value());
        });

        pipeline.requestCompilation(new ContentVersion(1));
        Assert.assertTrue(firstStarted.await(3, TimeUnit.SECONDS), "Initial compilation did not start");
        pipeline.requestCompilation(new ContentVersion(2));

        Awaitility.await().atMost(3, TimeUnit.SECONDS)
                .untilAsserted(() -> Assert.assertTrue(interrupted.getCount() == 0 || !pipeline.isCompiling(),
                        "Superseding didChange must interrupt or cancel the running compilation thread"));
    }

    /**
     * Verifies an interrupted compilation does not publish its partial result.
     */
    @Test
    public void interruptedCompilation_discardsPartialResultWithoutPublishingSnapshot() throws Exception {
        DualSnapshotStore snapshotStore = new DualSnapshotStore();
        CountDownLatch firstStarted = new CountDownLatch(1);
        Map<Integer, StableSnapshot> snapshots = Map.of(
                1, createSnapshot(new ContentVersion(1)),
                2, createSnapshot(new ContentVersion(2))
        );

        pipeline = createPipeline(snapshotStore, task -> {
            if (task.contentVersion().value() == 1) {
                firstStarted.countDown();
                try {
                    new CountDownLatch(1).await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new CancellationException("interrupted");
                }
            }
            return snapshots.get(task.contentVersion().value());
        });

        pipeline.requestCompilation(new ContentVersion(1));
        Assert.assertTrue(firstStarted.await(3, TimeUnit.SECONDS), "Initial compilation did not start");
        pipeline.requestCompilation(new ContentVersion(2));

        Awaitility.await().atMost(3, TimeUnit.SECONDS)
                .until(() -> snapshotStore.getStable(TEST_ROOT) != null);
        Assert.assertEquals(snapshotStore.getStable(TEST_ROOT).contentVersion(), new ContentVersion(2),
                "Interrupted compilation must never publish a partial snapshot");
    }

    /**
     * Verifies the cancellation guard emits the cancellation event even if the compiler returns a result.
     */
    @Test
    public void cancelledTask_beforePublish_emitsCancellationEvent() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseCancelledTask = new CountDownLatch(1);
        CountDownLatch cancellationEvent = new CountDownLatch(1);
        Map<Integer, StableSnapshot> snapshots = Map.of(
                1, createSnapshot(new ContentVersion(1)),
                2, createSnapshot(new ContentVersion(2))
        );

        eventBus = new EventSyncPubSubHolder();
        eventBus.subscribe("cancelled-task-listener", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_COMPILATION_CANCELLED), event -> cancellationEvent.countDown());
        pipeline = new CompilationPipeline(TEST_ROOT, new DualSnapshotStore(), eventBus, task -> {
            if (task.contentVersion().value() == 1) {
                firstStarted.countDown();
                releaseCancelledTask.await(5, TimeUnit.SECONDS);
            }
            return snapshots.get(task.contentVersion().value());
        });

        pipeline.requestCompilation(new ContentVersion(1));
        Assert.assertTrue(firstStarted.await(3, TimeUnit.SECONDS), "Initial compilation did not start");
        pipeline.requestCompilation(new ContentVersion(2));
        releaseCancelledTask.countDown();

        Assert.assertTrue(cancellationEvent.await(3, TimeUnit.SECONDS),
                "Cancelled compilations must emit CE-E3 before publication is skipped");
    }

    /**
     * Verifies the publication guard prevents cancelled results from overwriting the latest snapshot.
     */
    @Test
    public void cancelledTask_publicationGuardPreventsStaleSnapshotOverwrite() throws Exception {
        DualSnapshotStore snapshotStore = new DualSnapshotStore();
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseCancelledTask = new CountDownLatch(1);
        Map<Integer, StableSnapshot> snapshots = Map.of(
                1, createSnapshot(new ContentVersion(1)),
                2, createSnapshot(new ContentVersion(2))
        );

        pipeline = createPipeline(snapshotStore, task -> {
            if (task.contentVersion().value() == 1) {
                firstStarted.countDown();
                releaseCancelledTask.await(5, TimeUnit.SECONDS);
            }
            return snapshots.get(task.contentVersion().value());
        });

        pipeline.requestCompilation(new ContentVersion(1));
        Assert.assertTrue(firstStarted.await(3, TimeUnit.SECONDS), "Initial compilation did not start");
        pipeline.requestCompilation(new ContentVersion(2));
        releaseCancelledTask.countDown();

        Awaitility.await().atMost(3, TimeUnit.SECONDS)
                .untilAsserted(() -> Assert.assertEquals(snapshotStore.getStable(TEST_ROOT).contentVersion(),
                        new ContentVersion(2), "Cancellation guard must prevent stale snapshots from being published"));
    }

    /**
     * Verifies every compilation phase boundary observes cancellation.
     *
     * @param phase phase boundary under test
     */
    @Test(dataProvider = "phaseBoundaries")
    public void cancelledCompileTask_throwsAtEveryPhaseBoundary(CompilationPhase phase) {
        CompileTask task = new CompileTask(TEST_ROOT, new ContentVersion(5), new CancellationToken());
        task.cancel();

        Assert.assertThrows(CancellationException.class,
                () -> task.advancePhase(phase));
    }

    /**
     * Verifies rapid file switching keeps at most one active compilation per project worker.
     */
    @Test
    public void rapidFileSwitching_keepsAtMostOneActiveCompilationPerProject() throws Exception {
        AtomicInteger activeCompilations = new AtomicInteger();
        AtomicInteger maxConcurrentCompilations = new AtomicInteger();
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        Map<Integer, StableSnapshot> snapshots = Map.of(
                1, createSnapshot(new ContentVersion(1)),
                2, createSnapshot(new ContentVersion(2)),
                3, createSnapshot(new ContentVersion(3)),
                4, createSnapshot(new ContentVersion(4)),
                5, createSnapshot(new ContentVersion(5))
        );

        pipeline = createPipeline(new DualSnapshotStore(), task -> {
            int activeNow = activeCompilations.incrementAndGet();
            maxConcurrentCompilations.updateAndGet(previous -> Math.max(previous, activeNow));
            try {
                if (task.contentVersion().value() == 1) {
                    firstStarted.countDown();
                    releaseFirst.await(5, TimeUnit.SECONDS);
                }
                return snapshots.get(task.contentVersion().value());
            } finally {
                activeCompilations.decrementAndGet();
            }
        });

        pipeline.requestCompilation(new ContentVersion(1));
        Assert.assertTrue(firstStarted.await(3, TimeUnit.SECONDS), "Initial compilation did not start");
        pipeline.requestCompilation(new ContentVersion(2));
        pipeline.requestCompilation(new ContentVersion(3));
        pipeline.requestCompilation(new ContentVersion(4));
        pipeline.requestCompilation(new ContentVersion(5));
        releaseFirst.countDown();

        Awaitility.await().atMost(3, TimeUnit.SECONDS)
                .untilAsserted(() -> Assert.assertEquals(maxConcurrentCompilations.get(), 1,
                        "Only one compilation may be active at any time per project worker"));
    }

    /**
     * Provides all compilation phase boundaries.
     *
     * @return phase boundary test data
     */
    @DataProvider(name = "phaseBoundaries")
    public Object[][] phaseBoundaries() {
        return new Object[][]{
                {CompilationPhase.POST_PARSE},
                {CompilationPhase.POST_TYPE_CHECK},
                {CompilationPhase.POST_DIAGNOSTICS}
        };
    }

    private CompilationPipeline createPipeline(DualSnapshotStore snapshotStore,
                                               CompilationPipeline.CompilationAction action) {
        eventBus = new EventSyncPubSubHolder();
        return new CompilationPipeline(TEST_ROOT, snapshotStore, eventBus, action);
    }

    private static StableSnapshot createSnapshot(ContentVersion version) {
        return new MaterializedStableSnapshot(Map.of(), Map.of(), Map.of(),
                Mockito.mock(PackageCompilation.class), version);
    }
}
