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

package org.ballerinalang.langserver.workspace.eventbus.event;

import org.ballerinalang.langserver.workspace.eventbus.EventKind;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Domain event representing a document lifecycle event.
 * Used for WM-E8 (document opened), WM-E9 (document changed), WM-E10 (document closed).
 *
 * @since 1.7.0
 */
public class DocumentEvent extends DomainEvent {

    @Nullable
    private final URI sourceRoot;
    private final URI documentUri;

    /**
     * Creates a document event with no causation link.
     *
     * @param eventKind   the event kind
     * @param sourceRoot  the project source root URI, or {@code null} if not resolved
     * @param documentUri the document URI
     */
    public DocumentEvent(@Nonnull EventKind eventKind, @Nullable URI sourceRoot, @Nonnull URI documentUri) {
        this(eventKind, sourceRoot, documentUri, null);
    }

    /**
     * Creates a document event with an optional causation link.
     *
     * @param eventKind   the event kind
     * @param sourceRoot  the project source root URI, or {@code null} if not resolved
     * @param documentUri the document URI
     * @param causationId ID of the causing event, or {@code null}
     */
    public DocumentEvent(@Nonnull EventKind eventKind, @Nullable URI sourceRoot, @Nonnull URI documentUri,
                         @Nullable UUID causationId) {
        super(Instant.now(), eventKind, causationId);
        this.sourceRoot = sourceRoot;
        this.documentUri = documentUri;
    }

    @Override
    public String coalesceScope() {
        return documentUri.toString();
    }

    /**
     * Returns the project source root URI, or {@code null} if not resolved.
     *
     * @return source root URI or null
     */
    @Nullable
    public URI sourceRoot() {
        return sourceRoot;
    }

    /**
     * Returns the document URI.
     *
     * @return document URI
     */
    @Nonnull
    public URI documentUri() {
        return documentUri;
    }

    @Override
    public Map<String, String> serialize() {
        Map<String, String> fields = super.serialize();
        if (sourceRoot != null) {
            fields.put("sourceRoot", sourceRoot.toString());
        }
        fields.put("documentUri", documentUri.toString());
        return fields;
    }
}
