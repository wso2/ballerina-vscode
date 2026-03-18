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

    private static final TrieNode<?> EMPTY = new TrieNode<>(Map.of(), null, false);

    private final Map<String, TrieNode<V>> children;
    private final V value;
    private final boolean hasValue;

    /**
     * Creates an empty trie node.
     */
    public TrieNode() {
        this(Map.of(), null, false);
    }

    private TrieNode(Map<String, TrieNode<V>> children, V value, boolean hasValue) {
        this.children = children;
        this.value = value;
        this.hasValue = hasValue;
    }

    /**
     * Returns a new trie root with the value stored at the given path.
     *
     * @param pathSegments path segments from root to leaf
     * @param newValue value to store at the target path
     * @return new trie root containing the inserted value
     */
    public TrieNode<V> insert(String[] pathSegments, V newValue) {
        validatePathSegments(pathSegments);
        return insert(pathSegments, 0, newValue);
    }

    /**
     * Looks up the value stored at the given path.
     *
     * @param pathSegments path segments from root to leaf
     * @return optional containing the stored value when present
     */
    public Optional<V> lookup(String[] pathSegments) {
        validatePathSegments(pathSegments);
        TrieNode<V> node = this;
        for (String segment : pathSegments) {
            node = node.children.get(segment);
            if (node == null) {
                return Optional.empty();
            }
        }
        return node.hasValue ? Optional.ofNullable(node.value) : Optional.empty();
    }

    /**
     * Returns a new trie root with the value at the given path removed.
     *
     * @param pathSegments path segments from root to leaf
     * @return new trie root without the removed value
     */
    public TrieNode<V> remove(String[] pathSegments) {
        validatePathSegments(pathSegments);
        return remove(pathSegments, 0);
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

    TrieNode<V> child(String segment) {
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
        return hasValue == other.hasValue && Objects.equals(value, other.value)
                && Objects.equals(children, other.children);
    }

    @Override
    public int hashCode() {
        return Objects.hash(children, value, hasValue);
    }

    @Override
    public String toString() {
        return "TrieNode[hasValue=" + hasValue + ", children=" + children.keySet() + "]";
    }

    private TrieNode<V> insert(String[] pathSegments, int depth, V newValue) {
        if (depth == pathSegments.length) {
            return new TrieNode<>(children, newValue, true);
        }

        String segment = pathSegments[depth];
        TrieNode<V> currentChild = children.get(segment);
        TrieNode<V> baseChild = currentChild == null ? emptyNode() : currentChild;
        TrieNode<V> updatedChild = baseChild.insert(pathSegments, depth + 1, newValue);

        Map<String, TrieNode<V>> updatedChildren = new HashMap<>(children);
        updatedChildren.put(segment, updatedChild);
        return new TrieNode<>(Map.copyOf(updatedChildren), value, hasValue);
    }

    private TrieNode<V> remove(String[] pathSegments, int depth) {
        if (depth == pathSegments.length) {
            if (!hasValue) {
                return this;
            }
            return compact(children, null, false);
        }

        String segment = pathSegments[depth];
        TrieNode<V> currentChild = children.get(segment);
        if (currentChild == null) {
            return this;
        }

        TrieNode<V> updatedChild = currentChild.remove(pathSegments, depth + 1);
        if (updatedChild == currentChild) {
            return this;
        }

        Map<String, TrieNode<V>> updatedChildren = new HashMap<>(children);
        if (updatedChild.isEmptyNode()) {
            updatedChildren.remove(segment);
        } else {
            updatedChildren.put(segment, updatedChild);
        }
        return compact(updatedChildren, value, hasValue);
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
        Map<String, TrieNode<V>> updatedChildren = new HashMap<>(children);
        if (updatedChild.isEmptyNode()) {
            updatedChildren.remove(segment);
        } else {
            updatedChildren.put(segment, updatedChild);
        }
        return compact(updatedChildren, value, hasValue);
    }

    private boolean isEmptyNode() {
        return !hasValue && children.isEmpty();
    }

    private TrieNode<V> compact(Map<String, TrieNode<V>> candidateChildren, V candidateValue, boolean candidateHasValue) {
        if (!candidateHasValue && candidateChildren.isEmpty()) {
            return emptyNode();
        }
        return new TrieNode<>(candidateChildren.isEmpty() ? Map.of() : Map.copyOf(candidateChildren),
                candidateValue, candidateHasValue);
    }

    private static void validatePathSegments(String[] pathSegments) {
        Objects.requireNonNull(pathSegments, "pathSegments must not be null");
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
