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

import javax.annotation.Nonnull;

/**
 * Immutable heap-usage estimate for a project, measured in megabytes.
 * Used as the weight for LRU eviction decisions (ADR-013).
 *
 * @since 1.7.0
 */
public final class HeapEstimate implements Comparable<HeapEstimate> {

    private final int valueMb;

    private HeapEstimate(int valueMb) {
        if (valueMb < 0) {
            throw new IllegalArgumentException("valueMb must be >= 0, got: " + valueMb);
        }
        this.valueMb = valueMb;
    }

    /**
     * Creates a HeapEstimate with the given megabyte value.
     *
     * @param mb megabyte value, must be >= 0
     * @return new HeapEstimate
     * @throws IllegalArgumentException if mb is negative
     */
    public static HeapEstimate ofMb(int mb) {
        return new HeapEstimate(mb);
    }

    /**
     * Returns the estimated heap usage in megabytes.
     *
     * @return megabyte value
     */
    public int estimatedHeapMb() {
        return valueMb;
    }

    /**
     * Returns a new HeapEstimate whose value is the sum of this and other.
     *
     * @param other the estimate to add
     * @return combined estimate
     */
    public HeapEstimate add(@Nonnull HeapEstimate other) {
        return new HeapEstimate(this.valueMb + other.valueMb);
    }

    @Override
    public int compareTo(HeapEstimate other) {
        return Integer.compare(this.valueMb, other.valueMb);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof HeapEstimate other)) {
            return false;
        }
        return this.valueMb == other.valueMb;
    }

    @Override
    public int hashCode() {
        return Integer.hashCode(valueMb);
    }

    @Override
    public String toString() {
        return "HeapEstimate[" + valueMb + "MB]";
    }
}
