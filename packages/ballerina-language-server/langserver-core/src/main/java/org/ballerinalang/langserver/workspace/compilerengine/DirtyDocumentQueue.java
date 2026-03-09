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

package org.ballerinalang.langserver.workspace.compilerengine;

import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bounded, thread-safe tracker of documents that need recompilation.
 *
 * <p>Coalesces multiple edits to the same document, keeping only the latest version.
 * Uses {@link ConcurrentHashMap#compute} for atomic version comparison.
 *
 * @since 1.7.0
 */
public class DirtyDocumentQueue {

    private final ConcurrentHashMap<Path, ContentVersion> dirty;
    private final int capacity;

    /**
     * Creates a dirty document queue with the given capacity.
     *
     * @param capacity maximum number of distinct documents to track
     */
    public DirtyDocumentQueue(int capacity) {
        if (capacity <= 0) {
            throw new IllegalArgumentException("capacity must be positive");
        }
        this.capacity = capacity;
        this.dirty = new ConcurrentHashMap<>(capacity);
    }

    /**
     * Marks a document as dirty with the given content version.
     *
     * <p>If the document is already tracked, its version is updated only if the new version
     * is greater than or equal to the existing one. If the queue is at capacity and the
     * document is new, the call is rejected.
     *
     * @param path           the document path
     * @param contentVersion the content version
     * @return {@code true} if the document was marked dirty, {@code false} if rejected
     */
    public boolean markDirty(Path path, ContentVersion contentVersion) {
        if (dirty.containsKey(path)) {
            dirty.compute(path, (k, existing) -> {
                if (existing == null) {
                    return contentVersion;
                }
                return contentVersion.compareTo(existing) >= 0 ? contentVersion : existing;
            });
            return true;
        }
        if (dirty.size() >= capacity) {
            return false;
        }
        dirty.compute(path, (k, existing) -> {
            if (existing == null) {
                return contentVersion;
            }
            return contentVersion.compareTo(existing) >= 0 ? contentVersion : existing;
        });
        return true;
    }

    /**
     * Atomically drains all dirty entries and returns them.
     *
     * <p>After this call the queue is empty.
     *
     * @return a snapshot of all dirty documents and their versions
     */
    public Map<Path, ContentVersion> drain() {
        Map<Path, ContentVersion> result = new HashMap<>(dirty);
        dirty.keySet().removeAll(result.keySet());
        return result;
    }

    /**
     * Returns the number of documents currently tracked as dirty.
     *
     * @return dirty document count
     */
    public int size() {
        return dirty.size();
    }

    /**
     * Returns whether the queue has no dirty documents.
     *
     * @return {@code true} if empty
     */
    public boolean isEmpty() {
        return dirty.isEmpty();
    }
}
