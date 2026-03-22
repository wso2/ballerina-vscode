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

package org.ballerinalang.langserver.workspace.workspacemanager.cache;

import org.ballerinalang.langserver.workspace.workspacemanager.project.EvictionReason;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.DocumentUri;

import javax.annotation.Nullable;

/**
 * Domain event signalling that a cache invalidation is required.
 * {@code affectedRoot} is {@code null} for {@link InvalidationType#BATCH_UPDATE}.
 * {@code evictionReason} is non-null only for {@link InvalidationType#PROJECT_REMOVED}.
 *
 * @since 1.7.0
 */
public record CacheInvalidationEvent(
        DocumentUri affectedRoot,
        InvalidationType type,
        @Nullable EvictionReason evictionReason) {

    /**
     * Creates a cache invalidation event with no eviction reason.
     *
     * @param affectedRoot the affected root URI
     * @param type         the invalidation type
     */
    public CacheInvalidationEvent(DocumentUri affectedRoot, InvalidationType type) {
        this(affectedRoot, type, null);
    }

    /**
     * Discriminates the scope of the invalidation.
     */
    public enum InvalidationType {
        /** A single project was added; invalidate paths associated with the affected root. */
        PROJECT_ADDED,
        /** A single project was removed; invalidate paths associated with the affected root. */
        PROJECT_REMOVED,
        /** A bulk change occurred; invalidate all cached entries. */
        BATCH_UPDATE
    }
}
