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

import { DiagnosticEntry, Diagnostics, OpenAPISpec, ProjectDiagnostics, ProjectModule, ProjectSource, SyntaxTree, TestGenerationRequest, TestGenerationResponse, TestGenerationTarget } from '@wso2/ballerina-core';
import { ErrorCode } from "@wso2/ballerina-core";
import { DotToken, IdentifierToken, ModulePart, ResourceAccessorDefinition, ResourcePathRestParam, ResourcePathSegmentParam, ServiceDeclaration, SlashToken, STKindChecker } from "@wso2/syntax-tree";
import { Uri, workspace } from "vscode";
import { PARSING_ERROR, UNKNOWN_ERROR, ENDPOINT_REMOVED } from '../../views/ai-panel/errorCodes';
import { langClient } from './activator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { writeBallerinaFileDidOpen } from '../../utils/modification';
import { fetchData } from '../../rpc-managers/ai-panel/utils/fetch-data-utils';
import { closeAllBallerinaFiles } from './utils';

const TEST_GEN_REQUEST_TIMEOUT = 100000;

// ----------- TEST GENERATOR -----------
export async function generateTest(
    projectRoot: string,
    testGenRequest: TestGenerationRequest,
    abortController: AbortController
): Promise<TestGenerationResponse> {
    const projectSource = await getProjectSource(projectRoot);
    if (!projectSource) {
        throw new Error("The current project is not recognized as a valid Ballerina project. Please ensure you have opened a Ballerina project.");
    }

    const backendUri = testGenRequest.backendUri;

    if (testGenRequest.targetType === TestGenerationTarget.Service) {
        if (!testGenRequest.targetIdentifier) {
            throw new Error("Service name is missing in the test request. Please provide a valid service name to generate tests.");
        }

        const serviceName = testGenRequest.targetIdentifier;
        const { serviceDeclaration, serviceDocFilePath } = await getServiceDeclaration(projectRoot, serviceName);

        const openApiSpec = await getOpenAPISpecification(serviceDocFilePath);
        const testPlan = testGenRequest.testPlan;

        if (typeof testGenRequest.existingTests === 'undefined' || typeof testGenRequest.diagnostics === 'undefined') {
            const unitTestResp: TestGenerationResponse | ErrorCode = await getUnitTests(testGenRequest, projectSource, abortController, openApiSpec);
            if (isErrorCode(unitTestResp)) {
                throw new Error((unitTestResp as ErrorCode).message);
            }
            return unitTestResp as TestGenerationResponse;
        } else {
            const updatedUnitTestResp: TestGenerationResponse | ErrorCode = await getUnitTests(testGenRequest, projectSource, abortController, openApiSpec);
            if (isErrorCode(updatedUnitTestResp)) {
                throw new Error((updatedUnitTestResp as ErrorCode).message);
            }
            return updatedUnitTestResp as TestGenerationResponse;
        }

    } else if (testGenRequest.targetType === TestGenerationTarget.Function) {
        if (!testGenRequest.targetIdentifier) {
            throw new Error("Function identifier is missing in the test request. Please provide a valid function identifier to generate tests.");
        }

        const functionIdentifier = testGenRequest.targetIdentifier;
        const { serviceDeclaration, resourceAccessorDef, serviceDocFilePath } = await getResourceAccessorDef(projectRoot, functionIdentifier);
        const openApiSpec = await getOpenAPISpecification(serviceDocFilePath);

        // TODO: At the moment we just look at the test.bal file, technically we should be maintain a state of the test file that we are working,
        // and do the amendments accordingly.

        if (!testGenRequest.diagnostics) {
            const projectSourceWithTests = await getProjectSourceWithTests(projectRoot);
            const testFile = projectSourceWithTests.projectTests.find(test =>
                test.filePath.split('/').pop() === 'test.bal'
            );
            const updatedTestGenRequest: TestGenerationRequest = {
                ...testGenRequest,
                existingTests: testFile?.content,
            };
            const serviceProjectSource: ProjectSource = {
                sourceFiles: [
                    {
                        filePath: "service.bal",
                        content: serviceDeclaration.source
                    }
                ],
                projectName: ""
            };

            const unitTestResp: TestGenerationResponse | ErrorCode = await getUnitTests(updatedTestGenRequest, serviceProjectSource, abortController, openApiSpec);
            if (isErrorCode(unitTestResp)) {
                throw new Error((unitTestResp as ErrorCode).message);
            }
            return unitTestResp as TestGenerationResponse;
        } else {
            const updatedUnitTestResp: TestGenerationResponse | ErrorCode = await getUnitTests(testGenRequest, projectSource, abortController, openApiSpec);
            if (isErrorCode(updatedUnitTestResp)) {
                throw new Error((updatedUnitTestResp as ErrorCode).message);
            }
            return updatedUnitTestResp as TestGenerationResponse;
        }
    } else {
        throw new Error("Invalid test generation target type.");
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
        const syntaxTree = await langClient.getSyntaxTree({
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

export async function getResourceAccessorDef(projectRoot: string, resourceMethodAndPath: string): Promise<{ serviceDeclaration: ServiceDeclaration | null, resourceAccessorDef: ResourceAccessorDefinition | null, serviceDocFilePath: string }> {
    const projectSource = await getProjectSource(projectRoot);
    if (!projectSource) {
        throw new Error("The current project is not recognized as a valid Ballerina project. Please ensure you have opened a Ballerina project.");
    }

    let serviceDeclaration: ServiceDeclaration | null = null;
    let resourceAccessorDef: ResourceAccessorDefinition | null = null;
    let serviceDocFilePath = "";

    let found = false;

    for (const sourceFile of projectSource.sourceFiles) {
        if (found) { break; }

        serviceDocFilePath = sourceFile.filePath;
        const fileUri = Uri.file(serviceDocFilePath).toString();
        const syntaxTree = await langClient.getSyntaxTree({
            documentIdentifier: {
                uri: fileUri
            }
        }) as SyntaxTree;

        if (!STKindChecker.isModulePart(syntaxTree.syntaxTree)) {
            continue;
        }

        for (const member of (syntaxTree.syntaxTree as ModulePart).members) {
            if (found) { break; }

            if (STKindChecker.isServiceDeclaration(member)) {
                const resourceAccessors = (member as ServiceDeclaration).members.filter(m => STKindChecker.isResourceAccessorDefinition(m));
                for (const resourceAccessor of resourceAccessors) {
                    const resourceMethod = (resourceAccessor as ResourceAccessorDefinition).functionName.value;
                    const resourcePath = (resourceAccessor as ResourceAccessorDefinition).relativeResourcePath.reduce((accumulator, currentValue) => {
                        let value = "";

                        if (STKindChecker.isIdentifierToken(currentValue)) {
                            value = (currentValue as IdentifierToken).value;
                        } else if (STKindChecker.isDotToken(currentValue)) {
                            value = (currentValue as DotToken).value;
                        } else if (STKindChecker.isResourcePathRestParam(currentValue)) {
                            value = (currentValue as ResourcePathRestParam).source;
                        } else if (STKindChecker.isResourcePathSegmentParam(currentValue)) {
                            value = (currentValue as ResourcePathSegmentParam).source;
                        } else if (STKindChecker.isSlashToken(currentValue)) {
                            value = (currentValue as SlashToken).value;
                        }

                        return accumulator + value;
                    }, "");

                    const constructedResource = resourceMethod + " " + resourcePath;

                    if (constructedResource.toLowerCase() === resourceMethodAndPath) {
                        serviceDeclaration = member as ServiceDeclaration;
                        resourceAccessorDef = resourceAccessor as ResourceAccessorDefinition;
                        found = true;
                        break;
                    }
                }
            }
        }
    }

    if (!serviceDeclaration) {
        throw new Error(`Couldn't find any resources matching the resourcemethod and path provided, which is "${resourceMethodAndPath}". Please recheck if the provided resource is correct.`);
    }

    return { serviceDeclaration, resourceAccessorDef, serviceDocFilePath };
}

export async function getDiagnostics(
    projectRoot: string,
    generatedTestSource: TestGenerationResponse
): Promise<ProjectDiagnostics> {
    const ballerinaProjectRoot = await findBallerinaProjectRoot(projectRoot);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temp-bal-test-gen-'));
    fs.cpSync(ballerinaProjectRoot, tempDir, { recursive: true });
    const tempTestFolderPath = path.join(tempDir, 'tests');
    if (!fs.existsSync(tempTestFolderPath)) {
        fs.mkdirSync(tempTestFolderPath, { recursive: true });
    }
    const tempTestFilePath = path.join(tempTestFolderPath, 'test.bal');
    writeBallerinaFileDidOpen(tempTestFilePath, generatedTestSource.testSource);

    const diagnosticsResult = await langClient.getDiagnostics({ documentIdentifier: { uri: Uri.file(tempTestFilePath).toString() } });
    await closeAllBallerinaFiles(tempDir);
    fs.rmSync(tempDir, { recursive: true, force: true });
    if (Array.isArray(diagnosticsResult)) {
        const errorDiagnostics = getErrorDiagnostics(diagnosticsResult, tempTestFilePath);
        return errorDiagnostics;
    }
    return {
        diagnostics: []
    };
}

async function getProjectSource(dirPath: string): Promise<ProjectSource | null> {
    const projectRoot = await findBallerinaProjectRoot(dirPath);

    if (!projectRoot) {
        return null;
    }

    const projectSource: ProjectSource = {
        sourceFiles: [],
        projectTests: [],
        projectModules: [],
        projectName: ""
    };

    // Read root-level .bal files
    const rootFiles = fs.readdirSync(projectRoot);
    for (const file of rootFiles) {
        if (file.endsWith('.bal')) {
            const filePath = path.join(projectRoot, file);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            projectSource.sourceFiles.push({ filePath, content });
        }
    }

    // Read modules
    const modulesDir = path.join(projectRoot, 'modules');
    if (fs.existsSync(modulesDir)) {
        const modules = fs.readdirSync(modulesDir, { withFileTypes: true });
        for (const moduleDir of modules) {
            if (moduleDir.isDirectory()) {
                const projectModule: ProjectModule = {
                    moduleName: moduleDir.name,
                    sourceFiles: [],
                    isGenerated: false,
                };

                const moduleFiles = fs.readdirSync(path.join(modulesDir, moduleDir.name));
                for (const file of moduleFiles) {
                    if (file.endsWith('.bal')) {
                        const filePath = path.join(modulesDir, moduleDir.name, file);
                        const content = await fs.promises.readFile(filePath, 'utf-8');
                        projectModule.sourceFiles.push({ filePath, content });
                    }
                }

                projectSource.projectModules.push(projectModule);
            }
        }
    }

    return projectSource;
}

async function getProjectSourceWithTests(dirPath: string): Promise<ProjectSource | null> {
    const projectRoot = await findBallerinaProjectRoot(dirPath);

    if (!projectRoot) {
        return null;
    }

    const projectSourceWithTests: ProjectSource = await getProjectSource(dirPath);

    // Read tests
    const testsDir = path.join(projectRoot, 'tests');
    if (fs.existsSync(testsDir)) {
        const testFiles = fs.readdirSync(testsDir);
        for (const file of testFiles) {
            if (file.endsWith('.bal') || file.endsWith('Config.toml')) {
                const filePath = path.join(testsDir, file);
                const content = await fs.promises.readFile(filePath, 'utf-8');
                projectSourceWithTests.projectTests.push({ filePath, content });
            }
        }
    }

    return projectSourceWithTests;
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

async function getOpenAPISpecification(documentFilePath: string): Promise<string> {
    const response = await langClient.convertToOpenAPI({ documentFilePath, enableBalExtension: true }) as OpenAPISpec;
    if (response.error) {
        throw new Error(response.error);
    }
    return JSON.stringify(response.content[0].spec);
}

async function getUnitTests(request: TestGenerationRequest, projectSource: ProjectSource, abortController: AbortController, openApiSpec?: string): Promise<TestGenerationResponse | ErrorCode> {
    try {
        let response = await sendTestGeneRequest(request, projectSource, abortController, openApiSpec);
        if (isErrorCode(response)) {
            return (response as ErrorCode);
        }
        response = (response as Response);
        return await filterTestGenResponse(response);
    } catch (error) {
        return UNKNOWN_ERROR;
    }
}

async function sendTestGeneRequest(request: TestGenerationRequest, projectSource: ProjectSource, abortController: AbortController, openApiSpec?: string): Promise<Response | ErrorCode> {
    const body = {
        targetType: request.targetType,
        targetIdentifier: request.targetIdentifier,
        projectSource: {
            projectModules: projectSource.projectModules?.map((module) => ({
                moduleName: module.moduleName,
                sourceFiles: module.sourceFiles.map((file) => ({
                    fileName: file.filePath,
                    content: file.content,
                })),
            })),
            sourceFiles: projectSource.sourceFiles.map((file) => ({
                fileName: file.filePath,
                content: file.content,
            })),
        },
        ...(openApiSpec && { openApiSpec: openApiSpec }),
        ...(request.testPlan && { testPlan: request.testPlan }),
        ...(request.diagnostics?.diagnostics && {
            diagnostics: request.diagnostics.diagnostics.map((diagnosticEntry) => ({
                message: `L${diagnosticEntry.line ?? "unknown"}: ${diagnosticEntry.message}`,
            })),
        }),
        ...(request.existingTests && { existingTests: request.existingTests }),
    };

    const response = await fetchWithTimeout(request.backendUri + "/tests", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Ballerina-VSCode-Plugin'
        },
        body: JSON.stringify(body)
    }, abortController, TEST_GEN_REQUEST_TIMEOUT);
    return response;
}

function getErrorDiagnostics(diagnostics: Diagnostics[], filePath: string): ProjectDiagnostics {
    const errorDiagnostics: DiagnosticEntry[] = [];

    diagnostics.forEach(diagParam => {
        if (diagParam.uri === Uri.file(filePath).toString()) {
            diagParam.diagnostics.forEach(diag => {
                if (diag.severity === 1) {
                    errorDiagnostics.push({
                        line: diag.range.start.line + 1,
                        message: diag.message
                    });
                }
            });
        }
    });

    return {
        diagnostics: errorDiagnostics
    };
}

async function filterTestGenResponse(resp: Response): Promise<TestGenerationResponse | ErrorCode> {
    if (resp.status == 200 || resp.status == 201) {
        const data = (await resp.json()) as any;
        return {
            testSource: data.testSource,
            testConfig: data.testConfig
        };
    }
    if (resp.status == 404) {
        return ENDPOINT_REMOVED;
    }
    if (resp.status == 400) {
        const data = (await resp.json()) as any;
        return PARSING_ERROR;
    }
    else {
        //TODO: Handle more error codes
        return { code: 4, message: `An unknown error occured. ${resp.statusText}.` };
    }
}

// // ----------- HEALPER FUNCTIONS -----------
async function findBallerinaProjectRoot(dirPath: string): Promise<string | null> {
    if (dirPath === null) {
        return null;
    }

    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders) {
        return null;
    }

    // Check if the directory is within any of the workspace folders
    const workspaceFolder = workspaceFolders.find(folder => dirPath.startsWith(folder.uri.fsPath));
    if (!workspaceFolder) {
        return null;
    }

    let currentDir = dirPath;

    while (currentDir.startsWith(workspaceFolder.uri.fsPath)) {
        const ballerinaTomlPath = path.join(currentDir, 'Ballerina.toml');
        if (fs.existsSync(ballerinaTomlPath)) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }

    return null;
}

const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    abortController: AbortController,
    timeout = 300000
): Promise<Response | ErrorCode> => {
    const id = setTimeout(() => abortController?.abort(), timeout);

    try {
        options = {
            ...options,
            signal: abortController.signal,
        };

        const response = await fetchData(url, options);
        return response;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return {
                code: -1,
                message: "Request aborted"
            };
        }
        if (error instanceof Error) {
            return {
                code: -2,
                message: error.message
            };
        }
        return UNKNOWN_ERROR;
    } finally {
        clearTimeout(id);
    }
};

function isErrorCode(error: any): boolean {
    return error.hasOwnProperty("code") && error.hasOwnProperty("message");
}

// Functions to extract service names and resource names
export async function getServiceDeclarationNames(projectRoot: string): Promise<string[]> {
    const projectSource = await getProjectSource(projectRoot);
    if (!projectSource) {
        throw new Error("Invalid Ballerina project. Please open a valid Ballerina project.");
    }

    return (await Promise.all(
        projectSource.sourceFiles.map(async ({ filePath }) => {
            const syntaxTree = await langClient.getSyntaxTree({
                documentIdentifier: { uri: Uri.file(filePath).toString() }
            }) as SyntaxTree;
            return findServiceDeclarations(syntaxTree).map(constructServiceName);
        })
    )).flat();
}

export async function getResourceAccessorNames(projectRoot: string): Promise<string[]> {
    const projectSource = await getProjectSource(projectRoot);
    if (!projectSource) {
        throw new Error("Invalid Ballerina project. Please open a valid Ballerina project.");
    }

    return (await Promise.all(
        projectSource.sourceFiles.map(async ({ filePath }) => {
            const syntaxTree = await langClient.getSyntaxTree({
                documentIdentifier: { uri: Uri.file(filePath).toString() }
            }) as SyntaxTree;

            if (!STKindChecker.isModulePart(syntaxTree.syntaxTree)) { return []; }

            return (syntaxTree.syntaxTree as ModulePart).members
                .filter(STKindChecker.isServiceDeclaration)
                .flatMap(service =>
                    (service as ServiceDeclaration).members
                        .filter(STKindChecker.isResourceAccessorDefinition)
                        .map(resourceAccessor => {
                            const method = (resourceAccessor as ResourceAccessorDefinition).functionName.value;
                            const path = (resourceAccessor as ResourceAccessorDefinition).relativeResourcePath
                                .map(segment =>
                                    STKindChecker.isIdentifierToken(segment) ? (segment as IdentifierToken).value :
                                        STKindChecker.isDotToken(segment) ? (segment as DotToken).value :
                                            STKindChecker.isResourcePathRestParam(segment) ? (segment as ResourcePathRestParam).source :
                                                STKindChecker.isResourcePathSegmentParam(segment) ? (segment as ResourcePathSegmentParam).source :
                                                    STKindChecker.isSlashToken(segment) ? (segment as SlashToken).value :
                                                        ""
                                ).join("");

                            return `${method} ${path}`;
                        })
                );
        })
    )).flat();
}
