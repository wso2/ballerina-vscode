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

import org.ballerinalang.langserver.workspace.workspacemanager.uri.TargetType;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.TrieNode;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.Optional;

/**
 * Tests for {@link TrieNode} structural sharing and immutable trie operations.
 *
 * @since 1.7.0
 */
public class TrieNodeTest {

    private static final String FILE_SCHEME = "file";
    private static final String EXPR_SCHEME = "expr";

    /**
     * Verifies lookup on an empty trie returns empty.
     */
    @Test
    public void trieNode_lookup_emptyTrieReturnsEmpty() {
        TrieNode<String> root = new TrieNode<>();

        Assert.assertEquals(root.lookup(segments("workspace", "main.bal")), Optional.empty());
    }

    /**
     * Verifies lookup on an empty trie returns empty for keyed entries.
     */
    @Test
    public void trieNode_lookup_keyedEmptyTrieReturnsEmpty() {
        TrieNode<String> root = new TrieNode<>();

        Assert.assertEquals(root.lookup(segments("workspace", "main.bal"), FILE_SCHEME, TargetType.DOCUMENT),
                Optional.empty());
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

    /**
     * Verifies a node can store multiple entries distinguished by scheme and target type.
     */
    @Test
    public void trieNode_insert_samePathDifferentKeysStoresMultipleEntries() {
        TrieNode<String> root = new TrieNode<String>()
                .insert(segments("workspace", "project"), FILE_SCHEME, TargetType.PROJECT, "project")
                .insert(segments("workspace", "project"), FILE_SCHEME, TargetType.MODULE, "module")
                .insert(segments("workspace", "project"), EXPR_SCHEME, TargetType.PROJECT, "expr-project");

        Assert.assertEquals(root.lookup(segments("workspace", "project"), FILE_SCHEME, TargetType.PROJECT),
                Optional.of("project"));
        Assert.assertEquals(root.lookup(segments("workspace", "project"), FILE_SCHEME, TargetType.MODULE),
                Optional.of("module"));
        Assert.assertEquals(root.lookup(segments("workspace", "project"), EXPR_SCHEME, TargetType.PROJECT),
                Optional.of("expr-project"));
    }

    /**
     * Verifies keyed insert replaces an existing entry with the same scheme and target type.
     */
    @Test
    public void trieNode_insert_sameKeyReplacesExistingEntry() {
        TrieNode<String> original = new TrieNode<String>()
                .insert(segments("workspace", "main.bal"), FILE_SCHEME, TargetType.DOCUMENT, "doc-1")
                .insert(segments("workspace", "main.bal"), FILE_SCHEME, TargetType.PROJECT, "project");
        TrieNode<String> updated = original.insert(segments("workspace", "main.bal"), FILE_SCHEME,
                TargetType.DOCUMENT, "doc-2");

        Assert.assertEquals(updated.lookup(segments("workspace", "main.bal"), FILE_SCHEME, TargetType.DOCUMENT),
                Optional.of("doc-2"));
        Assert.assertEquals(updated.lookup(segments("workspace", "main.bal"), FILE_SCHEME, TargetType.PROJECT),
                Optional.of("project"));
        Assert.assertEquals(original.lookup(segments("workspace", "main.bal"), FILE_SCHEME, TargetType.DOCUMENT),
                Optional.of("doc-1"));
    }

    /**
     * Verifies keyed remove only removes the matching chain entry and preserves siblings.
     */
    @Test
    public void trieNode_remove_matchingKeyPreservesSiblingEntries() {
        TrieNode<String> original = new TrieNode<String>()
                .insert(segments("workspace", "project"), FILE_SCHEME, TargetType.PROJECT, "project")
                .insert(segments("workspace", "project"), FILE_SCHEME, TargetType.MODULE, "module");
        TrieNode<String> updated = original.remove(segments("workspace", "project"), FILE_SCHEME,
                TargetType.PROJECT);

        Assert.assertEquals(updated.lookup(segments("workspace", "project"), FILE_SCHEME, TargetType.PROJECT),
                Optional.empty());
        Assert.assertEquals(updated.lookup(segments("workspace", "project"), FILE_SCHEME, TargetType.MODULE),
                Optional.of("module"));
        Assert.assertEquals(original.lookup(segments("workspace", "project"), FILE_SCHEME, TargetType.PROJECT),
                Optional.of("project"));
    }

    /**
     * Verifies removing the final entry compacts the leaf node out of the trie.
     */
    @Test
    public void trieNode_remove_lastEntryCompactsLeafNode() {
        TrieNode<String> original = new TrieNode<String>()
                .insert(segments("main.bal"), FILE_SCHEME, TargetType.DOCUMENT, "doc");
        TrieNode<String> updated = original.remove(segments("main.bal"), FILE_SCHEME, TargetType.DOCUMENT);

        Assert.assertEquals(updated.lookup(segments("main.bal"), FILE_SCHEME, TargetType.DOCUMENT), Optional.empty());
        Assert.assertNull(updated.child("main.bal"));
        Assert.assertNotNull(original.child("main.bal"));
    }

    /**
     * Verifies removeSubtree evicts all schemes and target types under the removed prefix.
     */
    @Test
    public void trieNode_removeSubtree_keyedEntriesEvictsAllDescendants() {
        TrieNode<String> original = new TrieNode<String>()
                .insert(segments("workspace", "project"), FILE_SCHEME, TargetType.PROJECT, "project")
                .insert(segments("workspace", "project"), FILE_SCHEME, TargetType.MODULE, "module")
                .insert(segments("workspace", "project", "main.bal"), FILE_SCHEME, TargetType.DOCUMENT, "doc")
                .insert(segments("workspace", "project", "main.bal"), EXPR_SCHEME, TargetType.DOCUMENT, "expr-doc")
                .insert(segments("workspace", "other", "util.bal"), FILE_SCHEME, TargetType.DOCUMENT, "other");
        TrieNode<String> updated = original.removeSubtree(segments("workspace", "project"));

        Assert.assertEquals(updated.lookup(segments("workspace", "project"), FILE_SCHEME, TargetType.PROJECT),
                Optional.empty());
        Assert.assertEquals(updated.lookup(segments("workspace", "project"), FILE_SCHEME, TargetType.MODULE),
                Optional.empty());
        Assert.assertEquals(updated.lookup(segments("workspace", "project", "main.bal"), FILE_SCHEME,
                TargetType.DOCUMENT), Optional.empty());
        Assert.assertEquals(updated.lookup(segments("workspace", "project", "main.bal"), EXPR_SCHEME,
                TargetType.DOCUMENT), Optional.empty());
        Assert.assertEquals(updated.lookup(segments("workspace", "other", "util.bal"), FILE_SCHEME,
                TargetType.DOCUMENT), Optional.of("other"));
    }

    /**
     * Verifies validation rejects null path segments.
     */
    @Test(expectedExceptions = NullPointerException.class)
    public void trieNode_insert_nullPathSegment_throwsNullPointerException() {
        new TrieNode<String>().insert(new String[]{"workspace", null, "main.bal"}, "doc");
    }

    /**
     * Verifies validation rejects empty path segments.
     */
    @Test(expectedExceptions = IllegalArgumentException.class)
    public void trieNode_insert_emptyPathSegment_throwsIllegalArgumentException() {
        new TrieNode<String>().insert(new String[]{"workspace", "", "main.bal"}, "doc");
    }

    /**
     * Verifies removing a non-existent key is a no-op that returns the same root instance.
     */
    @Test
    public void trieNode_remove_nonExistentKey_returnsSameInstance() {
        TrieNode<String> root = new TrieNode<String>().insert(segments("workspace", "main.bal"), "doc");

        Assert.assertSame(root.remove(segments("workspace", "util.bal")), root);
    }

    /**
     * Verifies removing a non-existent subtree prefix is a no-op that returns the same root instance.
     */
    @Test
    public void trieNode_removeSubtree_nonExistentPrefix_returnsSameInstance() {
        TrieNode<String> root = new TrieNode<String>().insert(segments("workspace", "main.bal"), "doc");

        Assert.assertSame(root.removeSubtree(segments("workspace", "missing")), root);
    }

    /**
     * Verifies single-segment paths work correctly.
     */
    @Test
    public void trieNode_insert_singleSegmentPath_resolvesValue() {
        TrieNode<String> root = new TrieNode<String>().insert(segments("main.bal"), "doc");

        Assert.assertEquals(root.lookup(segments("main.bal")), Optional.of("doc"));
    }

    /**
     * Verifies deep paths continue to resolve correctly.
     */
    @Test
    public void trieNode_insert_deepPath_resolvesValue() {
        String[] deepPath = segments("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "main.bal");
        TrieNode<String> root = new TrieNode<String>().insert(deepPath, "doc");

        Assert.assertEquals(root.lookup(deepPath), Optional.of("doc"));
    }

    /**
     * Verifies removeSubtree on an empty trie returns the same empty root.
     */
    @Test
    public void trieNode_removeSubtree_emptyTrie_returnsSameEmptyRoot() {
        TrieNode<String> root = new TrieNode<>();

        Assert.assertSame(root.removeSubtree(segments("workspace")), root);
    }

    private String[] segments(String... segments) {
        return segments;
    }
}
