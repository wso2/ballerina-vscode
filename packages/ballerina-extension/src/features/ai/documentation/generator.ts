/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { DocGenerationRequest } from '@wso2/ballerina-core';
import { generateDocumentation, DocumentationGenerationRequest } from './index';
import { getOpenAPISpecification, getProjectSource } from '../utils';
import { getCurrentProjectRoot } from '../../../utils/project-utils';

// Main documentation generator function that handles all the logic
export async function generateDocumentationForService(params: DocGenerationRequest): Promise<void> {
    try {
        // Get the project root
        const projectPath = await getCurrentProjectRoot();

        // Get the project source files
        const projectSource = await getProjectSource(projectPath);
        if (!projectSource) {
            throw new Error("The current project is not recognized as a valid Ballerina project. Please ensure you have opened a Ballerina project.");
        }

        // Find the service declaration and get OpenAPI spec
        // const { serviceDocFilePath } = await getServiceDeclaration(projectPath, params.serviceName);
        const openApiSpec = await getOpenAPISpecification("serviceDocFilePath");

        // Create the documentation generation request
        const docRequest: DocumentationGenerationRequest = {
            serviceName: params.serviceName,
            projectSource: projectSource,
            openApiSpec: openApiSpec
        };

        // Generate the documentation with streaming
        await generateDocumentation(docRequest);
    } catch (error) {
        console.error("Error during documentation generation:", error);
        throw error;
    }
}
