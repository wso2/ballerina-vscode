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

import java.util.Objects;
import java.util.Optional;

/**
 * Immutable linked entry chain stored at a trie node.
 *
 * <p>Each link discriminates cached values by URI scheme and target type so a single trie path
 * can retain multiple resolved objects without losing structural sharing.</p>
 *
 * @param <V> cached value type
 * @since 1.7.0
 */
final class EntryChain<V> {

    private final String scheme;
    private final TargetType targetType;
    private final V value;
    private final EntryChain<V> next;

    /**
     * Creates a new chain link.
     *
     * @param scheme URI scheme discriminator
     * @param targetType cached target type discriminator
     * @param value cached value for the key pair
     * @param next next chain link, or {@code null} for the end of the chain
     */
    EntryChain(@Nonnull String scheme, @Nonnull TargetType targetType, V value, EntryChain<V> next) {
        this.scheme = scheme;
        this.targetType = targetType;
        this.value = value;
        this.next = next;
    }

    /**
     * Returns the scheme discriminator for this link.
     *
     * @return URI scheme discriminator
     */
    String scheme() {
        return scheme;
    }

    /**
     * Returns the target type discriminator for this link.
     *
     * @return target type discriminator
     */
    TargetType targetType() {
        return targetType;
    }

    /**
     * Returns the cached value for this link.
     *
     * @return cached value
     */
    V value() {
        return value;
    }

    /**
     * Returns the next link in the chain.
     *
     * @return next link, or {@code null} when this is the tail
     */
    EntryChain<V> next() {
        return next;
    }

    /**
     * Scans a chain for the first entry matching the given scheme and target type.
     *
     * @param head head of the chain to scan
     * @param scheme URI scheme discriminator
     * @param targetType cached target type discriminator
     * @param <V> cached value type
     * @return matching cached value, when present
     */
    static <V> Optional<V> find(EntryChain<V> head, @Nonnull String scheme, @Nonnull TargetType targetType) {
        EntryChain<V> current = head;
        while (current != null) {
            if (current.matches(scheme, targetType)) {
                return Optional.ofNullable(current.value);
            }
            current = current.next;
        }
        return Optional.empty();
    }

    /**
     * Prepends a new entry after removing any existing entry with the same key.
     *
     * @param head current chain head
     * @param scheme URI scheme discriminator
     * @param targetType cached target type discriminator
     * @param value cached value to store
     * @param <V> cached value type
     * @return updated chain head
     */
    static <V> EntryChain<V> upsert(EntryChain<V> head, @Nonnull String scheme, @Nonnull TargetType targetType,
                                    V value) {
        EntryChain<V> remaining = remove(head, scheme, targetType);
        return new EntryChain<>(scheme, targetType, value, remaining);
    }

    /**
     * Removes the first entry matching the given key pair.
     *
     * @param head current chain head
     * @param scheme URI scheme discriminator
     * @param targetType cached target type discriminator
     * @param <V> cached value type
     * @return updated chain head, or the original head when no match exists
     */
    static <V> EntryChain<V> remove(EntryChain<V> head, @Nonnull String scheme, @Nonnull TargetType targetType) {
        if (head == null) {
            return null;
        }
        if (head.matches(scheme, targetType)) {
            return head.next;
        }

        EntryChain<V> updatedNext = remove(head.next, scheme, targetType);
        if (updatedNext == head.next) {
            return head;
        }
        return new EntryChain<>(head.scheme, head.targetType, head.value, updatedNext);
    }

    private boolean matches(String scheme, TargetType targetType) {
        return this.scheme.equals(scheme) && this.targetType == targetType;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof EntryChain<?> other)) {
            return false;
        }
        return Objects.equals(scheme, other.scheme)
                && targetType == other.targetType
                && Objects.equals(value, other.value)
                && Objects.equals(next, other.next);
    }

    @Override
    public int hashCode() {
        return Objects.hash(scheme, targetType, value, next);
    }
}
