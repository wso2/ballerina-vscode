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

package org.ballerinalang.langserver.workspace.eventbus;

import org.testng.Assert;
import org.testng.annotations.Test;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Tests three-tier delivery behavior of {@link EventSyncPubSubHolder}.
 *
 * @since 1.7.0
 */
public class EventSyncPubSubHolderTest {

    /**
     * Verifies event kind enum contains all domain event identifiers.
     */
    @Test
    public void eventKind_containsAllDomainEvents() {
        Assert.assertEquals(List.of(EventKind.values()).stream().map(Enum::name).toList(), List.of(
                "WORKSPACE_PROJECT_REGISTERED", "WORKSPACE_PROJECT_EVICTED",
                "WORKSPACE_PROJECT_HEALTH_STATE_CHANGED", "WORKSPACE_PROJECT_KIND_TRANSITIONED",
                "WORKSPACE_PROJECT_TIER_CHANGED", "WORKSPACE_BATCH_PROJECTS_REGISTERED",
                "WORKSPACE_LOCKING_MODE_CHANGED",
                "WM_DOCUMENT_OPENED", "WM_DOCUMENT_CHANGED", "WM_DOCUMENT_CLOSED", "WM_FILE_WATCHED_CHANGED",
                "COMPILER_SNAPSHOT_PUBLISHED", "COMPILER_COMPILATION_FAILED",
                "COMPILER_COMPILATION_CANCELLED", "COMPILER_RESOLUTION_COMPLETED",
                "CE_E5A_RESOLUTION_DIAGNOSTICS_READY", "CE_E5B_COMPILATION_DIAGNOSTICS_READY",
                "CE_RESOLUTION_EXHAUSTED", "CE_RESOLUTION_RECOVERED",
                "EXECUTION_PROCESS_STARTED", "EXECUTION_PROCESS_OUTPUT",
                "EXECUTION_PROCESS_TERMINATED", "CACHE_INVALIDATION_REQUESTED",
                "RM_E1_HEAP_PRESSURE_DETECTED"
        ));
    }

    /**
     * Verifies publish asynchronously dispatches to all matching subscribers.
     *
     * @throws InterruptedException if interrupted while awaiting delivery
     */
    @Test
    public void publish_dispatchesAsynchronouslyToAllSubscribers() throws InterruptedException {
        EventSyncPubSubHolder holder = new EventSyncPubSubHolder();
        CountDownLatch latch = new CountDownLatch(2);
        AtomicLong publishThreadId = new AtomicLong(Thread.currentThread().threadId());
        AtomicLong firstSubscriberThread = new AtomicLong(-1L);
        AtomicLong secondSubscriberThread = new AtomicLong(-1L);

        holder.subscribe("sub-a", SubscriberTier.BEST_EFFORT, Set.of(EventKind.WORKSPACE_PROJECT_REGISTERED), event -> {
            firstSubscriberThread.set(Thread.currentThread().threadId());
            latch.countDown();
        });
        holder.subscribe("sub-b", SubscriberTier.BEST_EFFORT, Set.of(EventKind.WORKSPACE_PROJECT_REGISTERED), event -> {
            secondSubscriberThread.set(Thread.currentThread().threadId());
            latch.countDown();
        });

        holder.publish(new DomainEvent(Instant.now(), "workspace-a", EventKind.WORKSPACE_PROJECT_REGISTERED));

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS));
        Assert.assertNotEquals(firstSubscriberThread.get(), publishThreadId.get());
        Assert.assertNotEquals(secondSubscriberThread.get(), publishThreadId.get());
        holder.close();
    }

    /**
     * Verifies critical subscribers reject publication after timeout under pressure.
     *
     * @throws InterruptedException if interrupted while coordinating latches
     */
    @Test
    public void criticalTier_throwsWhenQueueSaturated() throws InterruptedException {
        EventSyncPubSubHolder holder = new EventSyncPubSubHolder();
        CountDownLatch processingStarted = new CountDownLatch(1);
        CountDownLatch releaseProcessing = new CountDownLatch(1);

        holder.subscribe("critical-sub", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_REGISTERED), event -> {
            processingStarted.countDown();
            awaitLatch(releaseProcessing);
        });

        holder.publish(new DomainEvent(Instant.now(), "workspace-a", EventKind.WORKSPACE_PROJECT_REGISTERED));
        Assert.assertTrue(processingStarted.await(1, TimeUnit.SECONDS));

        Assert.assertThrows(IllegalStateException.class, () -> {
            for (int i = 0; i < 1_500; i++) {
                holder.publish(new DomainEvent(Instant.now(), "workspace-a", EventKind.WORKSPACE_PROJECT_REGISTERED));
            }
        });

        releaseProcessing.countDown();
        holder.close();
    }

    /**
     * Verifies coalesceable delivery keeps only the latest event for the same key.
     *
     * @throws InterruptedException if interrupted while awaiting delivery
     */
    @Test
    public void coalesceableTier_keepsLatestEventPerCoalesceKey() throws InterruptedException {
        EventSyncPubSubHolder holder = new EventSyncPubSubHolder();
        CountDownLatch latch = new CountDownLatch(1);
        List<DomainEvent> delivered = new CopyOnWriteArrayList<>();

        holder.subscribe("coalesce-sub", SubscriberTier.COALESCEABLE, Set.of(EventKind.WM_DOCUMENT_CHANGED), event -> {
            delivered.add(event);
            latch.countDown();
        });

        DomainEvent first = new DomainEvent(Instant.now(), "file:///workspace/main.bal", EventKind.WM_DOCUMENT_CHANGED);
        DomainEvent second = new DomainEvent(Instant.now(), "file:///workspace/main.bal", EventKind.WM_DOCUMENT_CHANGED);
        DomainEvent third = new DomainEvent(Instant.now(), "file:///workspace/main.bal", EventKind.WM_DOCUMENT_CHANGED);
        holder.publish(first);
        holder.publish(second);
        holder.publish(third);

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS));
        Assert.assertEquals(delivered.size(), 1);
        Assert.assertEquals(delivered.get(0), third);
        holder.close();
    }

    /**
     * Verifies best-effort delivery drops oldest events when capacity is exceeded.
     *
     * @throws InterruptedException if interrupted while awaiting delivery
     */
    @Test
    public void bestEffortTier_dropsOldestEventOnOverflow() throws InterruptedException {
        EventSyncPubSubHolder holder = new EventSyncPubSubHolder();
        CountDownLatch processingStarted = new CountDownLatch(1);
        CountDownLatch releaseProcessing = new CountDownLatch(1);
        List<DomainEvent> delivered = new CopyOnWriteArrayList<>();

        holder.subscribe("best-effort-sub", SubscriberTier.BEST_EFFORT,
                Set.of(EventKind.WORKSPACE_PROJECT_REGISTERED), event -> {
            delivered.add(event);
            processingStarted.countDown();
            awaitLatch(releaseProcessing);
        });

        holder.publish(new DomainEvent(Instant.now(), "seq-1", EventKind.WORKSPACE_PROJECT_REGISTERED));
        Assert.assertTrue(processingStarted.await(1, TimeUnit.SECONDS));

        for (int i = 2; i <= 202; i++) {
            holder.publish(new DomainEvent(Instant.now(), "seq-" + i, EventKind.WORKSPACE_PROJECT_REGISTERED));
        }

        releaseProcessing.countDown();
        Thread.sleep(300);

        boolean containsSecond = delivered.stream().anyMatch(event -> event.sourceContext().equals("seq-2"));
        boolean containsLast = delivered.stream().anyMatch(event -> event.sourceContext().equals("seq-202"));

        Assert.assertFalse(containsSecond);
        Assert.assertTrue(containsLast);
        holder.close();
    }

    /**
     * Verifies a blocked subscriber does not prevent delivery to other subscribers.
     *
     * @throws InterruptedException if interrupted while awaiting delivery
     */
    @Test
    public void subscriberIsolation_blockedSubscriberDoesNotBlockOthers() throws InterruptedException {
        EventSyncPubSubHolder holder = new EventSyncPubSubHolder();
        CountDownLatch blockedStarted = new CountDownLatch(1);
        CountDownLatch unblockBlocked = new CountDownLatch(1);
        CountDownLatch fastDelivered = new CountDownLatch(1);

        holder.subscribe("blocked", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_REGISTERED), event -> {
            blockedStarted.countDown();
            awaitLatch(unblockBlocked);
        });
        holder.subscribe("fast", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_REGISTERED), event -> fastDelivered.countDown());

        holder.publish(new DomainEvent(Instant.now(), "workspace-a", EventKind.WORKSPACE_PROJECT_REGISTERED));

        Assert.assertTrue(blockedStarted.await(1, TimeUnit.SECONDS));
        Assert.assertTrue(fastDelivered.await(1, TimeUnit.SECONDS));

        unblockBlocked.countDown();
        holder.close();
    }

    private static void awaitLatch(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(interruptedException);
        }
    }
}
