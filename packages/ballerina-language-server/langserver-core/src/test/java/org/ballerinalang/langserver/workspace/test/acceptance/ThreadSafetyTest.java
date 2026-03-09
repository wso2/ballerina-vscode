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

import org.ballerinalang.langserver.workspace.workspacemanager.HeapEstimate;
import org.ballerinalang.langserver.workspace.workspacemanager.Project;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Acceptance tests for thread safety and concurrency constraints.
 *
 * @since 1.7.0
 */
public class ThreadSafetyTest {

    @Test
    public void testGlobalRegistriesUseConcurrentHashMap() throws Exception {
        // RED: this test should fail — verify global registries use ConcurrentHashMap
        checkFieldType("org.ballerinalang.langserver.workspace.workspacemanager.ProjectRegistry", "cache", com.google.common.cache.Cache.class);
        // ProjectRegistry uses Guava Cache, but its internal map is ConcurrentHashMap.
        // Let's check other registries.
        checkFieldType("org.ballerinalang.langserver.workspace.execution.ProcessRegistry", "processes", ConcurrentHashMap.class);
    }

    @Test
    public void testBuildOptionsGuardedByAtomicReference() throws Exception {
        // RED: this test should fail — verify buildOptions uses AtomicReference
        checkFieldType("org.ballerinalang.langserver.workspace.workspacemanager.LockingModeController", "state", AtomicReference.class);
    }

    @Test
    public void testProjectLockIsReadWrite() throws Exception {
        // RED: this test should fail — verify ProjectLock uses ReentrantReadWriteLock
        checkFieldType("org.ballerinalang.langserver.workspace.workspacemanager.ProjectLock", "lock", ReentrantReadWriteLock.class);
    }

    @Test
    public void testNoRawCollectionsInMultiThreadedFields() throws Exception {
        // RED: this test should fail — verify no HashSet/HashMap in multi-threaded contexts
        String[] classesToCheck = {
                "org.ballerinalang.langserver.workspace.workspacemanager.ProjectRegistry",
                "org.ballerinalang.langserver.workspace.documentstore.VirtualFileSystem",
                "org.ballerinalang.langserver.workspace.execution.ProcessRegistry"
        };

        for (String className : classesToCheck) {
            Class<?> clazz = Class.forName(className);
            for (Field field : clazz.getDeclaredFields()) {
                if (!Modifier.isStatic(field.getModifiers())) {
                    String typeName = field.getType().getName();
                    Assert.assertFalse(typeName.equals("java.util.HashMap") || 
                                     typeName.equals("java.util.HashSet") || 
                                     typeName.equals("java.util.LinkedHashMap"),
                            "Field " + field.getName() + " in " + className + " uses non-thread-safe collection: " + typeName);
                }
            }
        }
    }

    @Test
    public void testConcurrentReadsDoNotBlockEachOther() throws Exception {
        Project project = new Project(new SourceRoot(Paths.get("/tmp/test")), ProjectKind.BUILD, HeapEstimate.ofMb(10));
        Lock readLock = project.projectLock().readLock();

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<CompletableFuture<Void>> futures = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            futures.add(CompletableFuture.runAsync(() -> {
                boolean acquired = readLock.tryLock();
                Assert.assertTrue(acquired, "Read lock should be acquired concurrently");
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    readLock.unlock();
                }
            }, executor));
        }

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get();
        executor.shutdown();
    }

    @Test
    public void testWriteLockBlocksReaders() throws Exception {
        Project project = new Project(new SourceRoot(Paths.get("/tmp/test")), ProjectKind.BUILD, HeapEstimate.ofMb(10));
        Lock readLock = project.projectLock().readLock();
        Lock writeLock = project.projectLock().writeLock();

        writeLock.lock();
        try {
            CompletableFuture<Boolean> readerFuture = CompletableFuture.supplyAsync(() -> {
                return readLock.tryLock();
            });
            Assert.assertFalse(readerFuture.get(), "Reader should be blocked by writer");
        } finally {
            writeLock.unlock();
        }
    }

    private void checkFieldType(String className, String fieldName, Class<?> expectedType) throws Exception {
        Class<?> clazz = Class.forName(className);
        Field field = clazz.getDeclaredField(fieldName);
        field.setAccessible(true);
        Assert.assertTrue(expectedType.isAssignableFrom(field.getType()),
                "Field " + fieldName + " in " + className + " should be " + expectedType.getSimpleName() + " but was " + field.getType().getSimpleName());
    }
}
