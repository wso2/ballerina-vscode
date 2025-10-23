/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.servicemodelgenerator.extension.model.context;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.projects.Project;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;

/**
 * Context for generating a service model from a source file.
 *
 * @param node            the syntax tree node where the service is defined
 * @param project         the Ballerina project
 * @param semanticModel   the semantic model of the project
 * @param workspaceManager the workspace manager for handling workspace operations
 * @param filePath        the path to the Ballerina file
 * @param serviceType     the type of the service (e.g., HTTP, gRPC)
 * @param orgName         name of the organization
 * @param packageName     name of the package
 * @param moduleName      name of the module
 * @param version         version of the package
 *
 * @since 1.2.0
 */
public record ModelFromSourceContext(Node node, Project project, SemanticModel semanticModel,
                                     WorkspaceManager workspaceManager, String filePath, String serviceType,
                                     String orgName, String packageName, String moduleName, String version) {
}
