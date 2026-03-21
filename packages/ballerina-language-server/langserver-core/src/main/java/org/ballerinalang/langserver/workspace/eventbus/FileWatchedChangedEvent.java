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

package org.ballerinalang.langserver.workspace.eventbus;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.net.URI;
import java.util.Map;
import java.util.UUID;

/**
 * Domain event emitted when a watched file changes on disk.
 * Carries a {@code changeScope} classifying the change:
 * {@code "DEPENDENCY_GRAPH"} for TOML files, {@code "SOURCE"} for Ballerina source files.
 *
 * @since 1.7.0
 */
public final class FileWatchedChangedEvent extends DocumentEvent {

    private final String changeScope;

    /**
     * Creates a file-watched-changed event with no causation link.
     *
     * @param sourceRoot  the project source root URI, or {@code null} if not resolved
     * @param documentUri the changed file URI
     * @param changeScope the change classification scope (e.g. {@code "DEPENDENCY_GRAPH"}, {@code "SOURCE"})
     */
    public FileWatchedChangedEvent(@Nullable URI sourceRoot, @Nonnull URI documentUri, @Nonnull String changeScope) {
        this(sourceRoot, documentUri, changeScope, null);
    }

    /**
     * Creates a file-watched-changed event with an optional causation link.
     *
     * @param sourceRoot  the project source root URI, or {@code null} if not resolved
     * @param documentUri the changed file URI
     * @param changeScope the change classification scope
     * @param causationId ID of the causing event, or {@code null}
     */
    public FileWatchedChangedEvent(@Nullable URI sourceRoot, @Nonnull URI documentUri, @Nonnull String changeScope,
                                   @Nullable UUID causationId) {
        super(EventKind.WM_FILE_WATCHED_CHANGED, sourceRoot, documentUri, causationId);
        this.changeScope = changeScope;
    }

    /**
     * Returns the change classification scope.
     *
     * @return change scope string
     */
    @Nonnull
    public String changeScope() {
        return changeScope;
    }

    @Override
    public Map<String, String> serialize() {
        Map<String, String> fields = super.serialize();
        fields.put("changeScope", changeScope);
        return fields;
    }
}
