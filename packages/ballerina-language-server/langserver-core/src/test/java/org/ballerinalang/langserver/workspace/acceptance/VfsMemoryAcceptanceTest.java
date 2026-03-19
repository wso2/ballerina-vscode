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

package org.ballerinalang.langserver.workspace.acceptance;

import org.ballerinalang.langserver.workspace.workspacemanager.HeapEstimate;
import org.ballerinalang.langserver.workspace.workspacemanager.MemoryBudget;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Acceptance tests for Virtual File System and Memory management.
 * Verifies end-to-end behavior across document store and memory components.
 *
 * @since 1.7.0
 */
public class VfsMemoryAcceptanceTest {

    // =========================================================================
    // MEMORY ACCEPTANCE TESTS
    // =========================================================================

    /**
     * Acceptance: HeapEstimate addition is commutative and associative.
     */
    @Test
    public void heapEstimate_arithmeticProperties() {
        HeapEstimate a = HeapEstimate.ofMb(100);
        HeapEstimate b = HeapEstimate.ofMb(200);
        HeapEstimate c = HeapEstimate.ofMb(300);

        // Commutative: a + b = b + a
        Assert.assertEquals(a.add(b), b.add(a));

        // Associative: (a + b) + c = a + (b + c)
        Assert.assertEquals(a.add(b).add(c), a.add(b.add(c)));

        // Identity: a + 0 = a
        HeapEstimate zero = HeapEstimate.ofMb(0);
        Assert.assertEquals(a.add(zero), a);
    }

    /**
     * Acceptance: HeapEstimate comparison is transitive.
     */
    @Test
    public void heapEstimate_comparisonTransitive() {
        HeapEstimate small = HeapEstimate.ofMb(10);
        HeapEstimate medium = HeapEstimate.ofMb(50);
        HeapEstimate large = HeapEstimate.ofMb(100);

        // Transitive: if a < b and b < c, then a < c
        Assert.assertTrue(small.compareTo(medium) < 0);
        Assert.assertTrue(medium.compareTo(large) < 0);
        Assert.assertTrue(small.compareTo(large) < 0);
    }

    /**
     * Acceptance: MemoryBudget rejects invalid values.
     */
    @Test
    public void memoryBudget_validatesInput() {
        // Valid positive values
        Assert.assertNotNull(MemoryBudget.ofMb(1));
        Assert.assertNotNull(MemoryBudget.ofMb(1024));
        Assert.assertNotNull(MemoryBudget.ofMb(Long.MAX_VALUE / 2));

        // Zero and negative should throw
        Assert.assertThrows(IllegalArgumentException.class, () -> MemoryBudget.ofMb(0));
        Assert.assertThrows(IllegalArgumentException.class, () -> MemoryBudget.ofMb(-1));
        Assert.assertThrows(IllegalArgumentException.class, () -> MemoryBudget.ofMb(-1000));
    }

    /**
     * Acceptance: MemoryBudget equality is consistent.
     */
    @Test
    public void memoryBudget_equalityConsistent() {
        MemoryBudget b1 = MemoryBudget.ofMb(512);
        MemoryBudget b2 = MemoryBudget.ofMb(512);
        MemoryBudget b3 = MemoryBudget.ofMb(1024);

        // Reflexive
        Assert.assertEquals(b1, b1);

        // Symmetric
        Assert.assertEquals(b1, b2);
        Assert.assertEquals(b2, b1);

        // Transitive
        MemoryBudget b4 = MemoryBudget.ofMb(512);
        Assert.assertEquals(b1, b2);
        Assert.assertEquals(b2, b4);
        Assert.assertEquals(b1, b4);

        // Different values are not equal
        Assert.assertNotEquals(b1, b3);
    }

    /**
     * Acceptance: HeapEstimate handles large values without overflow.
     */
    @Test
    public void heapEstimate_largeValues_noOverflow() {
        HeapEstimate large = HeapEstimate.ofMb(Integer.MAX_VALUE / 2);
        HeapEstimate sum = large.add(large);

        // Should not overflow - the sum should be approximately Integer.MAX_VALUE
        Assert.assertTrue(sum.estimatedHeapMb() > large.estimatedHeapMb());
    }

    /**
     * Acceptance: HeapEstimate concurrent operations are thread-safe.
     */
    @Test
    public void heapEstimate_concurrentAccess_threadSafe() throws InterruptedException {
        HeapEstimate base = HeapEstimate.ofMb(100);
        int threads = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        List<HeapEstimate> results = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            final int increment = (i + 1) * 10;
            executor.submit(() -> {
                try {
                    start.await();
                    HeapEstimate result = base.add(HeapEstimate.ofMb(increment));
                    results.add(result);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        Assert.assertTrue(done.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        // All results should be valid
        Assert.assertEquals(results.size(), threads);
        for (HeapEstimate result : results) {
            Assert.assertTrue(result.estimatedHeapMb() >= 100);
        }
    }

    /**
     * Acceptance: MemoryBudget value is correctly retained.
     */
    @Test
    public void memoryBudget_valueRetained() {
        long[] testValues = {1, 100, 1024, 2048, 4096, 8192, 16384, 32768, 65536};

        for (long mb : testValues) {
            MemoryBudget budget = MemoryBudget.ofMb(mb);
            Assert.assertEquals(budget.toMb(), mb, "MemoryBudget should retain value " + mb);
        }
    }

    /**
     * Acceptance: HeapEstimate and MemoryBudget work together for memory calculations.
     */
    @Test
    public void memoryComponents_integration() {
        // Simulate project memory calculation
        HeapEstimate project1 = HeapEstimate.ofMb(256);
        HeapEstimate project2 = HeapEstimate.ofMb(512);
        HeapEstimate project3 = HeapEstimate.ofMb(128);

        // Total heap usage
        HeapEstimate total = project1.add(project2).add(project3);
        Assert.assertEquals(total.estimatedHeapMb(), 896);

        // Check against budget
        MemoryBudget budget = MemoryBudget.ofMb(1024);
        Assert.assertTrue(total.estimatedHeapMb() <= budget.toMb(),
                "Total heap should fit within budget");

        // Over budget scenario
        HeapEstimate largeProject = HeapEstimate.ofMb(2000);
        Assert.assertTrue(largeProject.estimatedHeapMb() > budget.toMb(),
                "Large project should exceed budget");
    }

}
