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

package org.ballerinalang.langserver.workspace.workspacemanager.project;

/**
 * Immutable value object representing a memory budget in megabytes.
 * Used to configure bounded caches (ADR-013, ADR-026).
 *
 * @since 1.7.0
 */
public final class MemoryBudget {

    private final long maxMb;

    private MemoryBudget(long maxMb) {
        if (maxMb <= 0) {
            throw new IllegalArgumentException("maxMb must be > 0, got: " + maxMb);
        }
        this.maxMb = maxMb;
    }

    /**
     * Creates a MemoryBudget with the given megabyte limit.
     *
     * @param mb megabyte value, must be > 0
     * @return new MemoryBudget
     * @throws IllegalArgumentException if mb is zero or negative
     */
    public static MemoryBudget ofMb(long mb) {
        return new MemoryBudget(mb);
    }

    /**
     * Returns the budget in megabytes.
     *
     * @return megabyte limit
     */
    public long toMb() {
        return maxMb;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof MemoryBudget other)) {
            return false;
        }
        return this.maxMb == other.maxMb;
    }

    @Override
    public int hashCode() {
        return Long.hashCode(maxMb);
    }

    @Override
    public String toString() {
        return "MemoryBudget[" + maxMb + "MB]";
    }
}
