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

import io.ballerina.projects.Document;
import io.ballerina.projects.Module;
import io.ballerina.projects.Project;
import io.ballerina.projects.TomlDocument;

/**
 * Discriminated union of resolved Ballerina compiler objects for a given URI.
 *
 * <p>Each variant carries exactly the object that the URI resolves to — no nulls,
 * no mixed concerns. Use pattern matching to handle each case at the call site.</p>
 *
 * @since 1.7.0
 */
public sealed interface ResolvedEntry
        permits ResolvedEntry.ProjectEntry,
                ResolvedEntry.ModuleEntry,
                ResolvedEntry.DocumentEntry,
                ResolvedEntry.ConfigEntry {

    /** A URI that resolves to a Ballerina project root. */
    record ProjectEntry(Project project) implements ResolvedEntry {}

    /** A URI that resolves to a Ballerina module. */
    record ModuleEntry(Module module) implements ResolvedEntry {}

    /** A URI that resolves to a Ballerina source document. */
    record DocumentEntry(Document document) implements ResolvedEntry {}

    /**
     * A URI that resolves to a TOML config file
     * (e.g. {@code Ballerina.toml}, {@code Dependencies.toml}).
     */
    record ConfigEntry(TomlDocument config) implements ResolvedEntry {}
}
