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

import java.util.Optional;

/**
 * Tests for {@link TrieNode} structural sharing and immutable trie operations.
 *
 * @since 1.7.0
 */
public class TrieNodeTest {

    /**
     * Verifies lookup on an empty trie returns empty.
     */
    @Test
    public void trieNode_lookup_emptyTrieReturnsEmpty() {
        TrieNode<String> root = new TrieNode<>();

        Assert.assertEquals(root.lookup(segments("workspace", "main.bal")), Optional.empty());
    }

    /**
     * Verifies insert returns a new root and lookup finds the inserted value.
     */
    @Test
    public void trieNode_insert_returnsNewRootWithInsertedValue() {
        TrieNode<String> root = new TrieNode<>();
        TrieNode<String> updated = root.insert(segments("workspace", "main.bal"), "doc-1");

        Assert.assertNotSame(updated, root);
        Assert.assertEquals(updated.lookup(segments("workspace", "main.bal")), Optional.of("doc-1"));
        Assert.assertEquals(root.lookup(segments("workspace", "main.bal")), Optional.empty());
    }

    /**
     * Verifies insert overwrites an existing key without mutating the previous root.
     */
    @Test
    public void trieNode_insert_overwriteExistingKeyLeavesOldRootUnchanged() {
        TrieNode<String> original = new TrieNode<String>().insert(segments("workspace", "main.bal"), "doc-1");
        TrieNode<String> updated = original.insert(segments("workspace", "main.bal"), "doc-2");

        Assert.assertEquals(updated.lookup(segments("workspace", "main.bal")), Optional.of("doc-2"));
        Assert.assertEquals(original.lookup(segments("workspace", "main.bal")), Optional.of("doc-1"));
    }

    /**
     * Verifies remove deletes only the requested value and preserves the previous root.
     */
    @Test
    public void trieNode_remove_existingKeyReturnsRootWithoutValue() {
        TrieNode<String> original = new TrieNode<String>()
                .insert(segments("workspace", "main.bal"), "doc-1")
                .insert(segments("workspace", "util.bal"), "doc-2");
        TrieNode<String> updated = original.remove(segments("workspace", "main.bal"));

        Assert.assertEquals(updated.lookup(segments("workspace", "main.bal")), Optional.empty());
        Assert.assertEquals(updated.lookup(segments("workspace", "util.bal")), Optional.of("doc-2"));
        Assert.assertEquals(original.lookup(segments("workspace", "main.bal")), Optional.of("doc-1"));
    }

    /**
     * Verifies removeSubtree evicts every value below the given prefix.
     */
    @Test
    public void trieNode_removeSubtree_evictsAllDescendantsUnderPrefix() {
        TrieNode<String> original = new TrieNode<String>()
                .insert(segments("workspace", "modules", "auth", "auth.bal"), "auth")
                .insert(segments("workspace", "modules", "auth", "util.bal"), "auth-util")
                .insert(segments("workspace", "modules", "db", "db.bal"), "db");
        TrieNode<String> updated = original.removeSubtree(segments("workspace", "modules", "auth"));

        Assert.assertEquals(updated.lookup(segments("workspace", "modules", "auth", "auth.bal")), Optional.empty());
        Assert.assertEquals(updated.lookup(segments("workspace", "modules", "auth", "util.bal")), Optional.empty());
        Assert.assertEquals(updated.lookup(segments("workspace", "modules", "db", "db.bal")), Optional.of("db"));
    }

    /**
     * Verifies insert structurally shares unchanged subtrees.
     */
    @Test
    public void trieNode_insert_structurallySharesUnchangedSubtrees() {
        TrieNode<String> original = new TrieNode<String>()
                .insert(segments("workspace", "modules", "auth", "auth.bal"), "auth")
                .insert(segments("workspace", "modules", "db", "db.bal"), "db");
        TrieNode<String> updated = original.insert(segments("workspace", "modules", "auth", "service.bal"), "service");

        Assert.assertSame(updated.child("workspace").child("modules").child("db"),
                original.child("workspace").child("modules").child("db"));
    }

    /**
     * Verifies remove structurally shares unchanged subtrees.
     */
    @Test
    public void trieNode_remove_structurallySharesUnchangedSubtrees() {
        TrieNode<String> original = new TrieNode<String>()
                .insert(segments("workspace", "modules", "auth", "auth.bal"), "auth")
                .insert(segments("workspace", "modules", "db", "db.bal"), "db");
        TrieNode<String> updated = original.remove(segments("workspace", "modules", "auth", "auth.bal"));

        Assert.assertSame(updated.child("workspace").child("modules").child("db"),
                original.child("workspace").child("modules").child("db"));
    }

    private String[] segments(String... segments) {
        return segments;
    }
}
