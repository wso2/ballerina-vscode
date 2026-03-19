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

import org.testng.Assert;
import org.testng.annotations.Test;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Tests for {@link ProjectRegistry}, {@link PathToRootCache},
 * {@link SharedDependencyCache}, {@link MemoryBudget}, and
 * {@link CacheInvalidationEvent}.
 *
 * @since 1.7.0
 */
public class RegistryTest {

    // =========================================================================
    // Helpers
    // =========================================================================

    private static SourceRoot root(String path) {
        return new SourceRoot(Path.of(path).toAbsolutePath().normalize());
    }

    private static Project project(SourceRoot root, int heapMb) {
        return new Project(root, ProjectKind.BUILD, HeapEstimate.ofMb(heapMb));
    }

    // =========================================================================
    // MemoryBudget
    // =========================================================================

    @Test
    public void memoryBudget_ofMb_valid() {
        MemoryBudget budget = MemoryBudget.ofMb(512);
        Assert.assertEquals(budget.toMb(), 512L);
    }

    @Test(expectedExceptions = IllegalArgumentException.class)
    public void memoryBudget_ofMb_zero_throws() {
        MemoryBudget.ofMb(0);
    }

    @Test(expectedExceptions = IllegalArgumentException.class)
    public void memoryBudget_ofMb_negative_throws() {
        MemoryBudget.ofMb(-1);
    }

    @Test
    public void memoryBudget_equalsAndHashCode() {
        MemoryBudget a = MemoryBudget.ofMb(256);
        MemoryBudget b = MemoryBudget.ofMb(256);
        MemoryBudget c = MemoryBudget.ofMb(512);
        Assert.assertEquals(a, b);
        Assert.assertEquals(a.hashCode(), b.hashCode());
        Assert.assertNotEquals(a, c);
    }

    @Test
    public void memoryBudget_toString() {
        Assert.assertEquals(MemoryBudget.ofMb(128).toString(), "MemoryBudget[128MB]");
    }

    // =========================================================================
    // CacheInvalidationEvent
    // =========================================================================

    @Test
    public void cacheInvalidationEvent_fields_correct() {
        SourceRoot root = root("/projects/alpha");
        CacheInvalidationEvent event = new CacheInvalidationEvent(
                root, CacheInvalidationEvent.InvalidationType.PROJECT_ADDED);
        Assert.assertEquals(event.affectedRoot(), root);
        Assert.assertEquals(event.type(), CacheInvalidationEvent.InvalidationType.PROJECT_ADDED);
    }

    @Test
    public void cacheInvalidationEvent_batchUpdate_null_affectedRoot() {
        CacheInvalidationEvent event = new CacheInvalidationEvent(
                null, CacheInvalidationEvent.InvalidationType.BATCH_UPDATE);
        Assert.assertNull(event.affectedRoot());
        Assert.assertEquals(event.type(), CacheInvalidationEvent.InvalidationType.BATCH_UPDATE);
    }

    @Test
    public void cacheInvalidationEvent_invalidationType_constants() {
        CacheInvalidationEvent.InvalidationType[] values = CacheInvalidationEvent.InvalidationType.values();
        Assert.assertEquals(values.length, 3);
        Assert.assertEquals(CacheInvalidationEvent.InvalidationType.PROJECT_ADDED,
                CacheInvalidationEvent.InvalidationType.valueOf("PROJECT_ADDED"));
        Assert.assertEquals(CacheInvalidationEvent.InvalidationType.PROJECT_REMOVED,
                CacheInvalidationEvent.InvalidationType.valueOf("PROJECT_REMOVED"));
        Assert.assertEquals(CacheInvalidationEvent.InvalidationType.BATCH_UPDATE,
                CacheInvalidationEvent.InvalidationType.valueOf("BATCH_UPDATE"));
    }

    // =========================================================================
    // ProjectRegistry
    // =========================================================================

    @Test
    public void registry_initialState_sizeZero() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        Assert.assertEquals(registry.size(), 0L);
        registry.shutdown();
    }

    @Test
    public void registry_register_get_returnsProject() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        SourceRoot root = root("/projects/alpha");
        Project p = project(root, 10);

        registry.register(root, p);

        Optional<Project> result = registry.get(root);
        Assert.assertTrue(result.isPresent());
        Assert.assertSame(result.get(), p);
        registry.shutdown();
    }

    @Test
    public void registry_computeIfAbsent_idempotent() throws Exception {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        SourceRoot root = root("/projects/beta");
        Project first = project(root, 10);

        Project p1 = registry.computeIfAbsent(root, () -> first);
        Project p2 = registry.computeIfAbsent(root, () -> project(root, 20)); // factory not called
        Assert.assertSame(p1, p2);
        registry.shutdown();
    }

    @Test
    public void registry_putAll_allRetrievable() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        SourceRoot rootA = root("/projects/a");
        SourceRoot rootB = root("/projects/b");
        Project pa = project(rootA, 5);
        Project pb = project(rootB, 5);

        registry.putAll(Map.of(rootA, pa, rootB, pb));

        Assert.assertTrue(registry.get(rootA).isPresent());
        Assert.assertTrue(registry.get(rootB).isPresent());
        registry.shutdown();
    }

    @Test
    public void registry_eviction_underWeightLimit() throws Exception {
        // Budget: 100 MB. Add projects totalling > 100 MB → some must be evicted.
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(100));
        SourceRoot root1 = root("/projects/x1");
        SourceRoot root2 = root("/projects/x2");
        SourceRoot root3 = root("/projects/x3");

        registry.register(root1, project(root1, 60));
        registry.register(root2, project(root2, 60)); // pushes over 100MB
        registry.register(root3, project(root3, 60));
        registry.size(); // trigger cleanup

        // After cleanup at least one entry must have been evicted.
        int present = 0;
        if (registry.get(root1).isPresent()) { present++; }
        if (registry.get(root2).isPresent()) { present++; }
        if (registry.get(root3).isPresent()) { present++; }
        Assert.assertTrue(present < 3, "Expected eviction but all entries still present");
        registry.shutdown();
    }

    @Test
    public void registry_evictBackgroundProjects_onlyBackgroundRemoved() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        SourceRoot activeRoot = root("/projects/active");
        SourceRoot bgRoot = root("/projects/background");
        Project activeP = project(activeRoot, 10);
        Project bgP = project(bgRoot, 10);
        activeP.openDocumentCount().increment(); // ACTIVE tier

        registry.register(activeRoot, activeP);
        registry.register(bgRoot, bgP);
        registry.evictBackgroundProjects();

        Assert.assertTrue(registry.get(activeRoot).isPresent(), "Active project must NOT be evicted");
        Assert.assertFalse(registry.get(bgRoot).isPresent(), "Background project must be evicted");
        registry.shutdown();
    }

    @Test
    public void registry_remove_projectNoLongerRetrievable() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        SourceRoot root = root("/projects/gamma");
        registry.register(root, project(root, 10));
        registry.remove(root);
        Assert.assertFalse(registry.get(root).isPresent());
        registry.shutdown();
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void registry_get_null_throws() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        registry.get(null);
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void registry_register_nullRoot_throws() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        SourceRoot root = root("/projects/z");
        registry.register(null, project(root, 10));
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void registry_register_nullProject_throws() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        registry.register(root("/projects/z"), null);
    }

    @Test
    public void registry_listener_projectAdded_fired_on_register() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        List<CacheInvalidationEvent> events = new ArrayList<>();
        registry.addListener(events::add);

        SourceRoot root = root("/projects/listen1");
        registry.register(root, project(root, 10));

        Assert.assertEquals(events.size(), 1);
        Assert.assertEquals(events.get(0).type(),
                CacheInvalidationEvent.InvalidationType.PROJECT_ADDED);
        Assert.assertEquals(events.get(0).affectedRoot(), root);
        registry.shutdown();
    }

    @Test
    public void registry_listener_batchUpdate_fired_on_putAll() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        List<CacheInvalidationEvent> events = new ArrayList<>();
        registry.addListener(events::add);

        SourceRoot r1 = root("/projects/b1");
        SourceRoot r2 = root("/projects/b2");
        registry.putAll(Map.of(r1, project(r1, 5), r2, project(r2, 5)));

        Assert.assertEquals(events.size(), 1);
        Assert.assertEquals(events.get(0).type(),
                CacheInvalidationEvent.InvalidationType.BATCH_UPDATE);
        Assert.assertNull(events.get(0).affectedRoot());
        registry.shutdown();
    }

    @Test
    public void registry_listener_projectRemoved_fired_on_remove() {
        ProjectRegistry registry = new ProjectRegistry(MemoryBudget.ofMb(2048));
        SourceRoot root = root("/projects/del1");
        registry.register(root, project(root, 10));

        List<CacheInvalidationEvent> events = new ArrayList<>();
        registry.addListener(events::add);
        registry.remove(root);

        Assert.assertEquals(events.size(), 1);
        Assert.assertEquals(events.get(0).type(),
                CacheInvalidationEvent.InvalidationType.PROJECT_REMOVED);
        Assert.assertEquals(events.get(0).affectedRoot(), root);
        registry.shutdown();
    }

    // =========================================================================
    // SharedDependencyCache
    // =========================================================================

    @Test
    public void sharedDepCache_retain_get_returnsValue() {
        SharedDependencyCache cache = new SharedDependencyCache(MemoryBudget.ofMb(512));
        boolean retained = cache.retain("dep:guava", "guava-jar", 5);
        Assert.assertTrue(retained);
        Assert.assertTrue(cache.get("dep:guava").isPresent());
        Assert.assertEquals(cache.get("dep:guava").get(), "guava-jar");
    }

    @Test
    public void sharedDepCache_retain_same_key_incrementsRefcount() {
        SharedDependencyCache cache = new SharedDependencyCache(MemoryBudget.ofMb(512));
        cache.retain("dep:commons", "commons-jar", 10);
        boolean again = cache.retain("dep:commons", "commons-jar", 10);
        Assert.assertTrue(again);
        Assert.assertEquals(cache.totalWeightMb(), 10L); // weight not double-counted
    }

    @Test
    public void sharedDepCache_release_decrement_removeAtZero() {
        SharedDependencyCache cache = new SharedDependencyCache(MemoryBudget.ofMb(512));
        cache.retain("dep:slf4j", "slf4j-jar", 3);
        cache.retain("dep:slf4j", "slf4j-jar", 3); // refcount = 2
        cache.release("dep:slf4j"); // refcount = 1
        Assert.assertTrue(cache.get("dep:slf4j").isPresent());
        cache.release("dep:slf4j"); // refcount = 0 → remove
        Assert.assertFalse(cache.get("dep:slf4j").isPresent());
        Assert.assertEquals(cache.totalWeightMb(), 0L);
    }

    @Test
    public void sharedDepCache_doubleRelease_noOp() {
        SharedDependencyCache cache = new SharedDependencyCache(MemoryBudget.ofMb(512));
        cache.retain("dep:logback", "logback-jar", 4);
        cache.release("dep:logback"); // refcount = 0 → removed
        cache.release("dep:logback"); // key absent → no-op; must not throw
        Assert.assertEquals(cache.totalWeightMb(), 0L);
    }

    @Test
    public void sharedDepCache_retain_overBudget_returnsFalse() {
        SharedDependencyCache cache = new SharedDependencyCache(MemoryBudget.ofMb(10));
        cache.retain("dep:big1", "big1", 8);
        boolean result = cache.retain("dep:big2", "big2", 5); // 8+5=13 > 10
        Assert.assertFalse(result, "retain must return false when budget would be exceeded");
        Assert.assertFalse(cache.get("dep:big2").isPresent());
    }

    @Test
    public void sharedDepCache_totalWeightMb_correct_after_retain_release() {
        SharedDependencyCache cache = new SharedDependencyCache(MemoryBudget.ofMb(512));
        cache.retain("a", "va", 20);
        cache.retain("b", "vb", 30);
        Assert.assertEquals(cache.totalWeightMb(), 50L);
        cache.release("a");
        Assert.assertEquals(cache.totalWeightMb(), 30L);
        cache.release("b");
        Assert.assertEquals(cache.totalWeightMb(), 0L);
    }

    @Test
    public void sharedDepCache_concurrent_retain_release_noCorruption() throws InterruptedException {
        SharedDependencyCache cache = new SharedDependencyCache(MemoryBudget.ofMb(512));
        final String key = "dep:concurrent";
        final int threads = 10;
        final int opsPerThread = 100;

        // Pre-populate with a high refcount so release never goes negative mid-test.
        for (int i = 0; i < threads * opsPerThread; i++) {
            cache.retain(key, "value", 1);
        }
        long initialWeight = cache.totalWeightMb();
        Assert.assertEquals(initialWeight, 1L); // weight counted once

        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        ExecutorService executor = Executors.newFixedThreadPool(threads);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    start.await();
                    for (int j = 0; j < opsPerThread; j++) {
                        cache.retain(key, "value", 1);
                        cache.release(key);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        Assert.assertTrue(done.await(10, TimeUnit.SECONDS), "Stress test timed out");
        executor.shutdown();

        // After equal retain/release operations the refcount should be back to initial.
        // Entry may or may not be present depending on exact interleaving, but totalWeight
        // must be 0 or 1 (the entry is either retained or fully released, never negative).
        long finalWeight = cache.totalWeightMb();
        Assert.assertTrue(finalWeight >= 0 && finalWeight <= 1,
                "totalWeightMb must be 0 or 1 after balanced concurrent retain/release, was: " + finalWeight);
    }

}
