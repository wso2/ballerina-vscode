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

import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;

import java.net.URI;
import java.nio.file.Path;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Lock-free URI resolution cache backed by an immutable persistent trie.
 *
 * <p>Readers call {@link #resolve(DocumentUri)} with zero synchronization — they snapshot
 * the current trie root via a plain {@link AtomicReference#get()} and traverse the immutable
 * structure without any locking. A single maintainer thread updates the root via
 * {@link AtomicReference#set(Object)} after constructing a new immutable snapshot.</p>
 *
 * <p>Implements the ADR-048 trie-based URI resolution design.</p>
 *
 * @since 1.7.0
 */
public final class UriResolver {

    private final AtomicReference<TrieNode<ResolvedEntry>> root =
            new AtomicReference<>(new TrieNode<>());

    /**
     * Resolves the given URI to its cached entry.
     *
     * <p>This method is lock-free: it reads the current trie snapshot atomically and
     * traverses the immutable structure without synchronization.</p>
     *
     * @param uri the document URI to resolve
     * @return the resolved entry, or empty if not cached
     */
    public Optional<ResolvedEntry> resolve(DocumentUri uri) {
        Objects.requireNonNull(uri, "uri must not be null");
        return root.get().lookup(toSegments(uri.uri()));
    }

    /**
     * Registers a resolved entry for the given URI.
     *
     * <p>Creates a new immutable trie snapshot with the entry added and publishes it
     * atomically. Must be called from the single maintainer thread only.</p>
     *
     * @param uri   the document URI
     * @param entry the resolved back-references to store
     */
    public void register(DocumentUri uri, ResolvedEntry entry) {
        Objects.requireNonNull(uri, "uri must not be null");
        Objects.requireNonNull(entry, "entry must not be null");
        root.set(root.get().insert(toSegments(uri.uri()), entry));
    }

    /**
     * Removes the entry for the given URI from the cache.
     *
     * <p>Creates a new immutable trie snapshot without the entry and publishes it
     * atomically. Must be called from the single maintainer thread only.</p>
     *
     * @param uri the document URI to remove
     */
    public void unregister(DocumentUri uri) {
        Objects.requireNonNull(uri, "uri must not be null");
        root.set(root.get().remove(toSegments(uri.uri())));
    }

    /**
     * Evicts all cached entries under the given source root prefix.
     *
     * <p>Creates a new immutable trie snapshot with the entire subtree removed and publishes
     * it atomically. Must be called from the single maintainer thread only.</p>
     *
     * @param sourceRoot the source root whose subtree should be evicted
     */
    public void evictSubtree(SourceRoot sourceRoot) {
        Objects.requireNonNull(sourceRoot, "sourceRoot must not be null");
        root.set(root.get().removeSubtree(toSegments(sourceRoot.path())));
    }

    /**
     * Decomposes a URI's path into trie segments using {@link Path} for segment splitting.
     * Does not use {@code String.split()} — relies on the JVM's {@link Path} name iterator.
     */
    private static String[] toSegments(URI uri) {
        return toSegments(Path.of(uri.getPath()));
    }

    /**
     * Decomposes an absolute {@link Path} into trie segments.
     * Each name element in the path becomes one segment.
     */
    private static String[] toSegments(Path path) {
        int count = path.getNameCount();
        String[] segments = new String[count];
        for (int i = 0; i < count; i++) {
            segments[i] = path.getName(i).toString();
        }
        return segments;
    }
}
