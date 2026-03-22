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

package org.ballerinalang.langserver.workspace.workspacemanager.uri;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Immutable persistent trie node keyed by path segments.
 *
 * <p>Every mutation returns a new root while unchanged subtrees are shared by reference.
 * This enables lock-free readers to traverse a stable snapshot without synchronization.</p>
 *
 * @param <V> value type stored at terminal nodes
 * @since 1.7.0
 */
public final class TrieNode<V> {

    private static final String DEFAULT_SCHEME = "file";
    private static final TargetType DEFAULT_TARGET_TYPE = TargetType.DOCUMENT;
    private static final TrieNode<?> EMPTY = new TrieNode<>(Map.of(), null);

    private final Map<String, TrieNode<V>> children;
    private final EntryChain<V> entries;

    /**
     * Creates an empty trie node.
     */
    public TrieNode() {
        this(Map.of(), null);
    }

    private TrieNode(Map<String, TrieNode<V>> children, EntryChain<V> entries) {
        this.children = children;
        this.entries = entries;
    }

    /**
     * Returns a new trie root with the value stored at the given path.
     *
     * <p>This compatibility overload uses the default `(file, DOCUMENT)` key.</p>
     *
     * @param pathSegments path segments from root to leaf
     * @param newValue value to store at the target path
     * @return new trie root containing the inserted value
     */
    public TrieNode<V> insert(String[] pathSegments, V newValue) {
        return insert(pathSegments, DEFAULT_SCHEME, DEFAULT_TARGET_TYPE, newValue);
    }

    /**
     * Returns a new trie root with the keyed value stored at the given path.
     *
     * @param pathSegments path segments from root to leaf
     * @param scheme URI scheme discriminator
     * @param targetType resolved target type discriminator
     * @param newValue value to store at the target path
     * @return new trie root containing the inserted value
     */
    public TrieNode<V> insert(String[] pathSegments, String scheme, TargetType targetType, V newValue) {
        validatePathSegments(pathSegments);
        Objects.requireNonNull(scheme, "scheme must not be null");
        Objects.requireNonNull(targetType, "targetType must not be null");
        return insert(pathSegments, 0, scheme, targetType, newValue);
    }

    /**
     * Looks up the value stored at the given path.
     *
     * <p>This compatibility overload uses the default `(file, DOCUMENT)` key.</p>
     *
     * @param pathSegments path segments from root to leaf
     * @return optional containing the stored value when present
     */
    public Optional<V> lookup(String[] pathSegments) {
        return lookup(pathSegments, DEFAULT_SCHEME, DEFAULT_TARGET_TYPE);
    }

    /**
     * Looks up the keyed value stored at the given path.
     *
     * @param pathSegments path segments from root to leaf
     * @param scheme URI scheme discriminator
     * @param targetType resolved target type discriminator
     * @return optional containing the stored value when present
     */
    public Optional<V> lookup(String[] pathSegments, String scheme, TargetType targetType) {
        validatePathSegments(pathSegments);
        Objects.requireNonNull(scheme, "scheme must not be null");
        Objects.requireNonNull(targetType, "targetType must not be null");
        TrieNode<V> node = this;
        for (String segment : pathSegments) {
            node = node.children.get(segment);
            if (node == null) {
                return Optional.empty();
            }
        }
        return EntryChain.find(node.entries, scheme, targetType);
    }

    /**
     * Returns a new trie root with the value at the given path removed.
     *
     * <p>This compatibility overload uses the default `(file, DOCUMENT)` key.</p>
     *
     * @param pathSegments path segments from root to leaf
     * @return new trie root without the removed value
     */
    public TrieNode<V> remove(String[] pathSegments) {
        return remove(pathSegments, DEFAULT_SCHEME, DEFAULT_TARGET_TYPE);
    }

    /**
     * Returns a new trie root with the keyed value at the given path removed.
     *
     * @param pathSegments path segments from root to leaf
     * @param scheme URI scheme discriminator
     * @param targetType resolved target type discriminator
     * @return new trie root without the removed value
     */
    public TrieNode<V> remove(String[] pathSegments, String scheme, TargetType targetType) {
        validatePathSegments(pathSegments);
        Objects.requireNonNull(scheme, "scheme must not be null");
        Objects.requireNonNull(targetType, "targetType must not be null");
        return remove(pathSegments, 0, scheme, targetType);
    }

    /**
     * Returns a new trie root with the entire subtree at the given prefix removed.
     *
     * @param prefixSegments prefix identifying the subtree root
     * @return new trie root without the removed subtree
     */
    public TrieNode<V> removeSubtree(String[] prefixSegments) {
        validatePathSegments(prefixSegments);
        return removeSubtree(prefixSegments, 0);
    }

    public TrieNode<V> child(String segment) {
        return children.get(segment);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof TrieNode<?> other)) {
            return false;
        }
        return Objects.equals(entries, other.entries) && Objects.equals(children, other.children);
    }

    @Override
    public int hashCode() {
        return Objects.hash(children, entries);
    }

    @Override
    public String toString() {
        return "TrieNode[hasEntries=" + (entries != null) + ", children=" + children.keySet() + "]";
    }

    private TrieNode<V> insert(String[] pathSegments, int depth, String scheme, TargetType targetType, V newValue) {
        if (depth == pathSegments.length) {
            return new TrieNode<>(children, EntryChain.upsert(entries, scheme, targetType, newValue));
        }

        String segment = pathSegments[depth];
        TrieNode<V> currentChild = children.get(segment);
        TrieNode<V> baseChild = currentChild == null ? emptyNode() : currentChild;
        TrieNode<V> updatedChild = baseChild.insert(pathSegments, depth + 1, scheme, targetType, newValue);

        Map<String, TrieNode<V>> updatedChildren = new HashMap<>(children);
        updatedChildren.put(segment, updatedChild);
        return new TrieNode<>(Map.copyOf(updatedChildren), entries);
    }

    private TrieNode<V> remove(String[] pathSegments, int depth, String scheme, TargetType targetType) {
        if (depth == pathSegments.length) {
            EntryChain<V> updatedEntries = EntryChain.remove(entries, scheme, targetType);
            if (updatedEntries == entries) {
                return this;
            }
            return compact(children, updatedEntries);
        }

        String segment = pathSegments[depth];
        TrieNode<V> currentChild = children.get(segment);
        if (currentChild == null) {
            return this;
        }

        TrieNode<V> updatedChild = currentChild.remove(pathSegments, depth + 1, scheme, targetType);
        if (updatedChild == currentChild) {
            return this;
        }

        Map<String, TrieNode<V>> updatedChildren = new HashMap<>(children);
        if (updatedChild.isEmptyNode()) {
            updatedChildren.remove(segment);
        } else {
            updatedChildren.put(segment, updatedChild);
        }
        return compact(updatedChildren, entries);
    }

    private TrieNode<V> removeSubtree(String[] prefixSegments, int depth) {
        if (depth == prefixSegments.length) {
            return emptyNode();
        }

        String segment = prefixSegments[depth];
        TrieNode<V> currentChild = children.get(segment);
        if (currentChild == null) {
            return this;
        }

        TrieNode<V> updatedChild = currentChild.removeSubtree(prefixSegments, depth + 1);
        if (updatedChild == currentChild) {
            return this;
        }

        Map<String, TrieNode<V>> updatedChildren = new HashMap<>(children);
        if (updatedChild.isEmptyNode()) {
            updatedChildren.remove(segment);
        } else {
            updatedChildren.put(segment, updatedChild);
        }
        return compact(updatedChildren, entries);
    }

    private boolean isEmptyNode() {
        return entries == null && children.isEmpty();
    }

    private TrieNode<V> compact(Map<String, TrieNode<V>> candidateChildren, EntryChain<V> candidateEntries) {
        if (candidateEntries == null && candidateChildren.isEmpty()) {
            return emptyNode();
        }
        return new TrieNode<>(candidateChildren.isEmpty() ? Map.of() : Map.copyOf(candidateChildren), candidateEntries);
    }

    private static void validatePathSegments(String[] pathSegments) {
        for (String segment : pathSegments) {
            if (segment == null) {
                throw new NullPointerException("pathSegments must not contain null segments");
            }
            if (segment.isEmpty()) {
                throw new IllegalArgumentException("pathSegments must not contain empty segments");
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static <V> TrieNode<V> emptyNode() {
        return (TrieNode<V>) EMPTY;
    }
}
