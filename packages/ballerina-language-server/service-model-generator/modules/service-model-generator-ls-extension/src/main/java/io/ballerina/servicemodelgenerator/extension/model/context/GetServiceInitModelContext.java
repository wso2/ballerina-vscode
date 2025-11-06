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
import io.ballerina.projects.Document;
import io.ballerina.projects.Project;

/**
 * Context for getting the initial service model.
 *
 * @param orgName       the organization name of the Ballerina package
 * @param packageName   the name of the Ballerina package
 * @param moduleName    the name of the Ballerina module
 * @param project       the Ballerina project
 * @param semanticModel the semantic model of the Ballerina source code
 * @param document      the Ballerina document
 * @since 1.3.0
 */
public record GetServiceInitModelContext(String orgName, String packageName, String moduleName, Project project,
                                         SemanticModel semanticModel, Document document) {
}
