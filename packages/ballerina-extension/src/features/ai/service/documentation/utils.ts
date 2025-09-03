// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { ProjectSource } from "@wso2/ballerina-core";

// ==============================================
//            UTILITY FUNCTIONS
// ==============================================

export function extractDocumentationFromResponse(response: string): string {
    // For now, return the full response as documentation
    // In the future, we might want to extract specific sections or format it
    return response.trim();
}

export function flattenProjectToText(projectSource: ProjectSource): string {
    let flattenedProject = "";

    const modules = projectSource.projectModules;
    if (modules) {
        for (const module of modules) {
            let moduleSource = "";
            for (const sourceFile of module.sourceFiles) {
                moduleSource += `\`\`\`ballerina
# modules/${module.moduleName}/${sourceFile.filePath}

${sourceFile.content}
\`\`\`

`;
            }
            flattenedProject += moduleSource;
        }
    }

    for (const sourceFile of projectSource.sourceFiles) {
        flattenedProject += `\`\`\`ballerina
# ${sourceFile.filePath}

${sourceFile.content}
\`\`\`

`;
    }

    return flattenedProject;
}

export function getExternalTypesAsJsonSchema(openApiSpec: string): string {
    try {
        const externalTypes: Record<string, any> = {};

        const openApiSpecObj = JSON.parse(openApiSpec);
        const components = openApiSpecObj.components;

        if (components && components.schemas) {
            for (const componentName in components.schemas) {
                const componentSchema = components.schemas[componentName];
                if (componentSchema && componentSchema['x-ballerina-type'] !== undefined) {
                    externalTypes[componentName] = componentSchema;
                }
            }
        }

        return JSON.stringify(externalTypes, null, 2);
    } catch (error) {
        // Return empty object if parsing fails
        return "{}";
    }
}

export function getTypesAsJsonSchema(openApiSpec: string): string {
    try {
        const openApiSpecObj = JSON.parse(openApiSpec);
        const components = openApiSpecObj.components;

        if (components) {
            return JSON.stringify(components, null, 2);
        }

        return "{}";
    } catch (error) {
        // Return empty object if parsing fails
        return "{}";
    }
}
