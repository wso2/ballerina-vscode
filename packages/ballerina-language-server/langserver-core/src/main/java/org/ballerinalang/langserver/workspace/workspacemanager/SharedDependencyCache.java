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

import javax.annotation.Nonnull;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Reference-counted shared dependency cache backed by {@link ConcurrentHashMap}.
 *
 * <p>Guava auto-eviction is intentionally avoided: an entry must NOT be evicted
 * while its reference count is {@code > 0}. Manual budget tracking via
 * {@link #totalWeightMb} enforces a configurable MB ceiling.</p>
 *
 * <p>Usage pattern:
 * <ol>
 *   <li>First caller: {@code retain(key, value, weightMb)} — creates the entry.</li>
 *   <li>Subsequent callers: {@code retain(key, value, weightMb)} — increments refcount.</li>
 *   <li>Each caller eventually calls {@code release(key)} to decrement.
 *       Entry is removed when refcount reaches zero.</li>
 * </ol>
 * </p>
 *
 * @since 1.7.0
 */
public final class SharedDependencyCache {

    private record Entry(Object value, AtomicInteger refCount, int weightMb) {}

    private final ConcurrentHashMap<String, Entry> store = new ConcurrentHashMap<>();
    private final AtomicLong totalWeightMb = new AtomicLong(0);
    private final long budgetMb;

    /**
     * Constructs a shared dependency cache bounded by the given budget.
     *
     * @param budget maximum total weight in MB; must not be null
     */
    public SharedDependencyCache(@Nonnull MemoryBudget budget) {
        this.budgetMb = budget.toMb();
    }

    /**
     * Retains an entry in the cache. If the key is already present, increments the
     * reference count. If absent and the new weight would not exceed the budget,
     * creates the entry with refcount 1.
     *
     * @param key      cache key; must not be null
     * @param value    value to store (used only on first insertion)
     * @param weightMb MB weight of the entry (used only on first insertion)
     * @return {@code true} if the entry is now retained; {@code false} if the budget
     *         would be exceeded and no entry was created
     */
    public boolean retain(@Nonnull String key, Object value, int weightMb) {
        boolean[] success = {false};
        store.compute(key, (k, existing) -> {
            if (existing != null) {
                existing.refCount().incrementAndGet();
                success[0] = true;
                return existing;
            }
            // New entry: check budget before inserting.
            if (totalWeightMb.get() + weightMb <= budgetMb) {
                totalWeightMb.addAndGet(weightMb);
                success[0] = true;
                return new Entry(value, new AtomicInteger(1), weightMb);
            }
            return null; // key was absent; returning null is a no-op
        });
        return success[0];
    }

    /**
     * Returns the cached value for the given key, or empty if absent.
     *
     * @param key cache key; must not be null
     * @return value wrapped in Optional, or empty
     */
    public Optional<Object> get(@Nonnull String key) {
        Entry entry = store.get(key);
        return entry == null ? Optional.empty() : Optional.of(entry.value());
    }

    /**
     * Decrements the reference count for the given key. Removes the entry and
     * subtracts its weight from the total when the count reaches zero.
     * If the key is absent (already fully released), this is a no-op.
     *
     * @param key cache key; must not be null
     */
    public void release(@Nonnull String key) {
        store.computeIfPresent(key, (k, entry) -> {
            int remaining = entry.refCount().decrementAndGet();
            if (remaining <= 0) {
                totalWeightMb.addAndGet(-entry.weightMb());
                return null; // remove entry
            }
            return entry;
        });
    }

    /**
     * Returns the total weight of all currently retained entries in megabytes.
     *
     * @return total weight in MB
     */
    public long totalWeightMb() {
        return totalWeightMb.get();
    }
}
