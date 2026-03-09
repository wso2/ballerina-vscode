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

package org.ballerinalang.langserver.workspace.documentstore;

import org.eclipse.lsp4j.FileChangeType;

import java.util.Collection;
import java.util.Objects;

/**
 * Aggregate that models a TOML configuration file and its reactivity behavior.
 *
 * @since 1.7.0
 */
public final class ConfigurationFile {

    private final DocumentUri uri;
    private final ConfigFileType fileType;
    private final String content;
    private final ContentVersion version;

    /**
     * Creates a configuration file with an initial version of zero.
     *
     * @param uri document URI
     * @param fileType TOML file type
     * @param content file content
     */
    public ConfigurationFile(DocumentUri uri, ConfigFileType fileType, String content) {
        this(uri, fileType, content, new ContentVersion(0));
    }

    private ConfigurationFile(DocumentUri uri, ConfigFileType fileType, String content, ContentVersion version) {
        this.uri = Objects.requireNonNull(uri, "uri must not be null");
        this.fileType = Objects.requireNonNull(fileType, "fileType must not be null");
        this.content = Objects.requireNonNull(content, "content must not be null");
        this.version = Objects.requireNonNull(version, "version must not be null");
    }

    /**
     * Returns the document identity of this configuration file.
     *
     * @return document URI
     */
    public DocumentUri uri() {
        return uri;
    }

    /**
     * Returns the TOML type associated with this file.
     *
     * @return configuration file type
     */
    public ConfigFileType fileType() {
        return fileType;
    }

    /**
     * Returns the current content.
     *
     * @return content
     */
    public String content() {
        return content;
    }

    /**
     * Returns the current version.
     *
     * @return content version
     */
    public ContentVersion version() {
        return version;
    }

    /**
     * Returns a new instance with updated content and incremented version.
     *
     * @param newContent updated content
     * @return updated configuration file
     */
    public ConfigurationFile withContent(String newContent) {
        return new ConfigurationFile(uri, fileType, Objects.requireNonNull(newContent, "newContent must not be null"),
                version.next());
    }

    /**
     * Classifies a file watcher change into a deterministic reactivity tier.
     *
     * @param changeType watcher change type
     * @return classified reactivity tier
     */
    public ReactivityTier classify(FileChangeType changeType) {
        Objects.requireNonNull(changeType, "changeType must not be null");
        return switch (fileType) {
            case BALLERINA_TOML -> ReactivityTier.STRUCTURAL;
            case DEPENDENCIES_TOML -> changeType == FileChangeType.Changed
                    ? ReactivityTier.DEPENDENCY_GRAPH
                    : ReactivityTier.STRUCTURAL;
            case CLOUD_TOML, COMPILER_PLUGIN_TOML, BAL_TOOL_TOML -> ReactivityTier.CONFIGURATION;
        };
    }

    /**
     * Promotes multiple tiers into the highest-priority tier in the set.
     *
     * @param tiers tiers to evaluate
     * @return highest promoted tier
     */
    public static ReactivityTier promote(Collection<ReactivityTier> tiers) {
        Objects.requireNonNull(tiers, "tiers must not be null");
        if (tiers.isEmpty()) {
            return ReactivityTier.CONFIGURATION;
        }

        ReactivityTier promoted = ReactivityTier.CONFIGURATION;
        for (ReactivityTier tier : tiers) {
            if (tier == null) {
                continue;
            }
            if (tier == ReactivityTier.STRUCTURAL) {
                return ReactivityTier.STRUCTURAL;
            }
            if (tier == ReactivityTier.DEPENDENCY_GRAPH) {
                promoted = ReactivityTier.DEPENDENCY_GRAPH;
            }
        }
        return promoted;
    }
}
