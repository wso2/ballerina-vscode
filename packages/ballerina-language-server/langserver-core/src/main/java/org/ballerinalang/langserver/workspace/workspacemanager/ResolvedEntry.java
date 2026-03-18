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

import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Module;
import io.ballerina.projects.Project;

/**
 * Back-references to the resolved Ballerina compiler objects for a given URI.
 *
 * <p>{@code documentId} may be {@code null} for entries that represent only a project
 * or module boundary (e.g., a {@code Ballerina.toml} config entry).</p>
 *
 * @param project    the Ballerina project containing the resolved document
 * @param module     the module within the project
 * @param documentId the document identifier, or {@code null} for config-file entries
 * @since 1.7.0
 */
public record ResolvedEntry(Project project, Module module, DocumentId documentId) {
}
