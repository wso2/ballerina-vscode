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

import { ProjectSource, SyntaxTree } from "@wso2/ballerina-core";
import { getProjectSource } from "../utils";
import { ModulePart, ServiceDeclaration, STKindChecker } from "@wso2/syntax-tree";
import { Uri } from "vscode";
import { StateMachine } from "../../../../src/stateMachine";

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

export async function getServiceDeclaration(projectRoot: string, serviceName: string): Promise<{ serviceDeclaration: ServiceDeclaration | null, serviceDocFilePath: string }> {
    const projectSource = await getProjectSource(projectRoot);
    if (!projectSource) {
        throw new Error("The current project is not recognized as a valid Ballerina project. Please ensure you have opened a Ballerina project.");
    }

    let serviceDeclaration: ServiceDeclaration | null = null;
    let serviceDocFilePath = "";

    for (const sourceFile of projectSource.sourceFiles) {
        serviceDocFilePath = sourceFile.filePath;
        const fileUri = Uri.file(serviceDocFilePath).toString();
        const syntaxTree = await StateMachine.langClient().getSyntaxTree({
            documentIdentifier: {
                uri: fileUri
            }
        }) as SyntaxTree;
        const matchedService = findMatchingServiceDeclaration(syntaxTree, serviceName);
        if (matchedService) {
            serviceDeclaration = matchedService;
            break;
        }
    }

    if (!serviceDeclaration) {
        throw new Error(`Couldn't find any services matching the service name provided, which is "${serviceName}". Please recheck if the provided service name is correct.`);
    }

    return { serviceDeclaration, serviceDocFilePath };
}

const findMatchingServiceDeclaration = (syntaxTree: SyntaxTree, targetServiceName: string): ServiceDeclaration | null => {
    const serviceDeclarations = findServiceDeclarations(syntaxTree);

    for (const serviceDecl of serviceDeclarations) {
        const serviceName = constructServiceName(serviceDecl);
        if (serviceName === targetServiceName) {
            return serviceDecl;
        }
    }

    return null;
};

const findServiceDeclarations = (syntaxTree: SyntaxTree): ServiceDeclaration[] => {
    const serviceDeclarations: ServiceDeclaration[] = [];

    const modulePartNode = syntaxTree.syntaxTree as ModulePart;
    for (const member of modulePartNode.members) {
        if (STKindChecker.isServiceDeclaration(member)) {
            serviceDeclarations.push(member);
        }
    }
    return serviceDeclarations;
};

function constructServiceName(targetNode: ServiceDeclaration): string {
    return targetNode.absoluteResourcePath.map(item => {
        if ('value' in item) { return item.value; }
        if ('literalToken' in item) { return item.literalToken.value; }
        return '';
    }).join('');
}

export async function getServiceDeclarationNames(projectRoot: string): Promise<string[]> {
    const projectSource = await getProjectSource(projectRoot);
    if (!projectSource) {
        throw new Error("Invalid Ballerina project. Please open a valid Ballerina project.");
    }

    return (await Promise.all(
        projectSource.sourceFiles.map(async ({ filePath }) => {
            const syntaxTree = await StateMachine.langClient().getSyntaxTree({
                documentIdentifier: { uri: Uri.file(filePath).toString() }
            }) as SyntaxTree;
            return findServiceDeclarations(syntaxTree).map(constructServiceName);
        })
    )).flat();
}
