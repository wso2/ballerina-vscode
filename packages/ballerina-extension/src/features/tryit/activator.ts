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

import { commands, window, workspace, FileSystemWatcher, Disposable, Uri } from "vscode";
import { clearTerminal, PALETTE_COMMANDS } from "../project/cmds/cmd-runner";
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { BallerinaExtension } from "src/core";
import Handlebars from "handlebars";
import { clientManager, findRunningBallerinaProcesses, handleError, HTTPYAC_CONFIG_TEMPLATE, TRYIT_TEMPLATE, waitForBallerinaService } from "./utils";
import { BIDesignModelResponse, OpenAPISpec } from "@wso2/ballerina-core";
import { startDebugging } from "../editor-support/codelens-provider";
import { v4 as uuidv4 } from "uuid";
import { StateMachine } from "../../stateMachine";
import { createGraphqlView } from "../../views/graphql";

// File constants
const FILE_NAMES = {
    TRYIT: 'tryit.http',
    HTTPYAC_CONFIG: 'httpyac.config.js',
    ERROR_LOG: 'httpyac_errors.log'
};

let errorLogWatcher: FileSystemWatcher | undefined;

export function activateTryItCommand(ballerinaExtInstance: BallerinaExtension) {
    try {
        clientManager.setClient(ballerinaExtInstance.langClient);

        // Register try it command handler
        const disposable = commands.registerCommand(PALETTE_COMMANDS.TRY_IT, async (withNotice: boolean = false, resourceMetadata?: ResourceMetadata, serviceMetadata?: ServiceMetadata) => {
            try {
                await openTryItView(withNotice, resourceMetadata, serviceMetadata);
            } catch (error) {
                handleError(error, "Opening Try It view failed");
            }
        });

        return Disposable.from(disposable, {
            dispose: disposeErrorWatcher
        });
    } catch (error) {
        handleError(error, "Activating Try It command");
    }
}

async function openTryItView(withNotice: boolean = false, resourceMetadata?: ResourceMetadata, serviceMetadata?: ServiceMetadata) {
    try {
        if (!clientManager.hasClient()) {
            throw new Error('Ballerina Language Server is not connected');
        }

        const workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('Please open a workspace first');
        }

        const services: ServiceInfo[] = await getAvailableServices(workspaceRoot);
        if (!services || services.length === 0) {
            vscode.window.showInformationMessage('No services found in the project');
            return;
        }

        if (withNotice) {
            const selection = await vscode.window.showInformationMessage(
                `${services.length} service${services.length === 1 ? '' : 's'} found in the integration. Test with Try It Client?`,
                "Test",
                "Cancel"
            );

            if (selection !== "Test") {
                return;
            }
        } else {
            const processesRunning = await checkBallerinaProcessRunning(workspaceRoot);
            if (!processesRunning) {
                return;
            }
        }

        let selectedService: ServiceInfo;
        // If in resource try it mode, find the service containing the resource path
        if (resourceMetadata) {
            const matchingService = await findServiceForResource(services, resourceMetadata, serviceMetadata);
            if (!matchingService) {
                vscode.window.showErrorMessage(`Could not find a service containing the resource path: ${resourceMetadata.pathValue}`);
                return;
            }

            selectedService = matchingService;
        } else if (services.length > 1) {
            if (serviceMetadata) {
                const matchingService = services.find(service =>
                    service.basePath === serviceMetadata.basePath && compareListeners(service.listener, serviceMetadata.listener)
                );

                if (matchingService) {
                    selectedService = matchingService;
                }
            } else {
                const quickPickItems = services.map(service => ({
                    label: `'${service.basePath}' on ${service.listener.name}`,
                    description: `${service.type} Service`,
                    service
                }));

                const selected = await vscode.window.showQuickPick(quickPickItems, {
                    placeHolder: 'Select a service to try out',
                    title: 'Available Services'
                });

                if (!selected) {
                    return;
                }
                selectedService = selected.service;
            }
        } else {
            selectedService = services[0];
        }

        const targetDir = path.join(workspaceRoot, 'target');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir);
        }

        if (selectedService.type === ServiceType.HTTP) {
            const openapiSpec: OAISpec = await getOpenAPIDefinition(selectedService);
            const selectedPort: number = await getServicePort(workspaceRoot, selectedService, openapiSpec);
            selectedService.port = selectedPort;

            const tryitFileUri = await generateTryItFileContent(targetDir, openapiSpec, selectedService, resourceMetadata);
            await openInSplitView(tryitFileUri, 'http');
        } else if (selectedService.type === ServiceType.GRAPHQL) {
            const selectedPort: number = await getServicePort(workspaceRoot, selectedService);
            const port = selectedPort;
            const path = selectedService.basePath;
            const service = `http://localhost:${port}${path}`;
            await createGraphqlView(service);
        } else {
            const selectedPort: number = await getServicePort(workspaceRoot, selectedService);
            selectedService.port = selectedPort;

            await openChatView(selectedService.basePath, selectedPort.toString());
        }

        // Setup the error log watcher
        setupErrorLogWatcher(targetDir);
    } catch (error) {
        handleError(error, "Opening Try It view");
    }
}

// Generic utility function for opening files in split view
async function openInSplitView(fileUri: vscode.Uri, editorType: string = 'default') {
    try {
        // Ensure we have a two-column layout
        await vscode.commands.executeCommand('workbench.action.editorLayoutTwoColumns');

        // Focus right editor group explicitly
        await vscode.commands.executeCommand('workbench.action.focusSecondEditorGroup');

        // Open the file with specified editor type in the current (right) group
        if (editorType === 'default') {
            await vscode.commands.executeCommand('vscode.open', fileUri);
        } else {
            await vscode.commands.executeCommand('vscode.openWith', fileUri, editorType);
        }

        // Focus left editor group to return to the original editor
        await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    } catch (error) {
        handleError(error, "Opening file in split view");
    }
}

async function openChatView(basePath: string, port: string) {
    try {
        const baseUrl = `http://localhost:${port}`;
        const chatPath = "chat";

        const serviceEp = new URL(basePath, baseUrl);
        const cleanedServiceEp = serviceEp.pathname.replace(/\/$/, '') + "/" + chatPath.replace(/^\//, '');
        const chatEp = new URL(cleanedServiceEp, serviceEp.origin);

        const sessionId = uuidv4();

        commands.executeCommand("ballerina.open.agent.chat", { chatEp: chatEp.href, chatSessionId: sessionId });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to call Chat-Agent: ${error}`);
    }
}

async function findServiceForResource(services: ServiceInfo[], resourceMetadata: ResourceMetadata, serviceMetadata: ServiceMetadata): Promise<ServiceInfo | undefined> {
    try {
        // Normalize path values for comparison
        const targetPath = resourceMetadata.pathValue?.trim();
        if (!targetPath) {
            return undefined;
        }

        // check all services' OpenAPI specs to see which one contains the path
        // TODO: Optimize this by checking only the relevant service once we have the lang server support for that
        for (const service of services) {
            try {
                if (serviceMetadata && (service.basePath !== serviceMetadata.basePath || !compareListeners(service.listener, serviceMetadata.listener))) {
                    continue;
                }

                const openapiSpec: OAISpec = await getOpenAPIDefinition(service);
                const matchingPaths = Object.keys(openapiSpec.paths || {}).filter((specPath) => {
                    return comparePathPatterns(specPath, targetPath);

                });

                if (matchingPaths.length > 0) {
                    return service;
                }
            } catch (error) {
                continue;
            }
        }

        return undefined;
    } catch (error) {
        handleError(error, "Finding service for resource", false);
        return undefined;
    }
}

async function getAvailableServices(projectDir: string): Promise<ServiceInfo[]> {
    try {
        const langClient = clientManager.getClient();

        const response: BIDesignModelResponse = await langClient.getDesignModel({
            projectPath: projectDir
        }).catch((error: any) => {
            throw new Error(`Failed to get design model: ${error.message || 'Unknown error'}`);
        });

        const services = response.designModel.services
            .filter(({ type }) => {
                const lowerType = type.toLowerCase();
                return lowerType.includes('http') || lowerType.includes('ai') || lowerType.includes('graphql');
            })
            .map(({ displayName, absolutePath, location, attachedListeners, type }) => {
                const trimmedPath = absolutePath.trim();
                const name = displayName || (trimmedPath.startsWith('/') ? trimmedPath.substring(1) : trimmedPath);
                const serviceType = type.toLowerCase().includes('http') ? ServiceType.HTTP : type.toLowerCase().includes('graphql') ? ServiceType.GRAPHQL : ServiceType.AGENT;
                const listener = {
                    name: attachedListeners
                        .map(listenerId => response.designModel.listeners.find(l => l.uuid === listenerId)?.symbol)
                        .filter(Boolean)
                        .join(','),
                    port: attachedListeners
                        .map(listenerId => response.designModel.listeners.find(l => l.uuid === listenerId)?.args.find(arg => arg.key === 'port')?.value)
                        .filter(Boolean)
                        .join(','),
                };



                return {
                    name,
                    basePath: trimmedPath,
                    filePath: location.filePath,
                    type: serviceType,
                    listener,
                };
            });

        return services || [];
    } catch (error) {
        handleError(error, "Getting available services", false);
        return [];
    }
}

async function generateTryItFileContent(targetDir: string, openapiSpec: OAISpec, service: ServiceInfo, resourceMetadata?: ResourceMetadata): Promise<vscode.Uri | undefined> {
    try {
        // Register Handlebars helpers
        registerHandlebarsHelpers(openapiSpec);

        let isResourceMode = false;
        let resourcePath = '';
        // Filter paths based on resourceMetadata if provided
        if (resourceMetadata) {
            const originalPaths = openapiSpec.paths;
            const filteredPaths: Record<string, Record<string, Operation>> = {};

            let matchingPath = '';
            for (const path in originalPaths) {
                const pathMatches = comparePathPatterns(path, resourceMetadata.pathValue);
                if (pathMatches) {
                    matchingPath = path;
                    break;
                }
            }

            if (matchingPath && originalPaths[matchingPath]) {
                isResourceMode = true;
                resourcePath = matchingPath;

                const method = resourceMetadata.methodValue.toLowerCase();
                if (originalPaths[matchingPath][method]) {
                    // Create entry with only the specified method
                    filteredPaths[matchingPath] = {
                        [method]: {
                            ...originalPaths[matchingPath][method]
                        }
                    };
                } else {
                    // Method not found in matching path
                    vscode.window.showWarningMessage(`Method ${resourceMetadata.methodValue} not found for path ${matchingPath}. Showing all methods for this path.`);
                    filteredPaths[matchingPath] = originalPaths[matchingPath];
                }

                openapiSpec.paths = filteredPaths;
            } else {
                // Path not found in OpenAPI spec
                vscode.window.showWarningMessage(
                    `Path ${resourceMetadata.pathValue} not found in service ${service.name || service.basePath}. Showing all resources.`
                );
            }
        }

        const tryitCompiledTemplate = Handlebars.compile(TRYIT_TEMPLATE);
        const tryitContent = tryitCompiledTemplate({
            ...openapiSpec,
            port: service.port.toString(),
            basePath: service.basePath === '/' ? '' : sanitizePath(service.basePath), // to avoid double slashes in the URL
            serviceName: service.name || 'Default',
            isResourceMode: isResourceMode,
            resourceMethod: isResourceMode ? resourceMetadata?.methodValue.toUpperCase() : '',
            resourcePath: resourcePath,
        });

        const httpyacCompiledTemplate = Handlebars.compile(HTTPYAC_CONFIG_TEMPLATE);
        const httpyacContent = httpyacCompiledTemplate({
            errorLogFile: FILE_NAMES.ERROR_LOG,
        });

        const tryitFilePath = path.join(targetDir, FILE_NAMES.TRYIT);
        const configFilePath = path.join(targetDir, FILE_NAMES.HTTPYAC_CONFIG);
        fs.writeFileSync(tryitFilePath, tryitContent);
        fs.writeFileSync(configFilePath, httpyacContent);

        return vscode.Uri.file(tryitFilePath);
    } catch (error) {
        handleError(error, "Try It client initialization failed");
        return undefined;
    }
}

// Helper function to compare path patterns, considering path parameters
function comparePathPatterns(specPath: string, targetPath: string): boolean {
    const specSegments = specPath.split('/').filter(Boolean);
    const targetSegments = targetPath.split('/').filter(Boolean);

    if (specSegments.length !== targetSegments.length) {
        return false;
    }

    // Compare segments, allowing for path parameters
    for (let i = 0; i < specSegments.length; i++) {
        const specSeg = specSegments[i];
        const targetSeg = sanitizeBallerinaPathSegment(targetSegments[i]);

        // TODO - improve path parameter matching with exact type comparison
        if (specSeg.startsWith('{') && specSeg.endsWith('}') && targetSeg.startsWith('[') && targetSeg.endsWith(']')) {
            continue;
        }

        if (specSeg !== targetSeg) {
            return false;
        }
    }

    return true;
}

async function getOpenAPIDefinition(service: ServiceInfo): Promise<OAISpec> {
    try {
        const langClient = clientManager.getClient();

        const openapiDefinitions: OpenAPISpec | 'NOT_SUPPORTED_TYPE' = await langClient.convertToOpenAPI({
            documentFilePath: service.filePath
        });

        if (openapiDefinitions === 'NOT_SUPPORTED_TYPE') {
            throw new Error(`OpenAPI spec generation failed for the service with base path: '${service.basePath}'`);
        }

        const matchingDefinition = (openapiDefinitions as OpenAPISpec).content.filter(content =>
            content.serviceName.toLowerCase() === service?.name.toLowerCase()
            || (service.basePath !== "" && service?.name === '' && content.spec?.servers[0]?.url?.endsWith(service.basePath))
            || (service?.name === '' && content.spec?.servers[0]?.url == undefined) // TODO: Update the condition after fixing the issue in the OpenAPI tool
            || extractPath(content.spec?.servers[0]?.url) === extractPath(service.basePath));

        if (matchingDefinition.length === 0) {
            throw new Error(`Failed to find matching OpenAPI definition: No service matches the base path '${service.basePath}' ${service.name !== '' ? `and service name '${service.name}'` : ''}`);
        }

        if (matchingDefinition.length > 1) {
            throw new Error(`Ambiguous service reference: Multiple matching OpenAPI definitions found for ${service.name !== '' ? `service '${service.name}'` : `base path '${service.basePath}'`}`);
        }

        return matchingDefinition[0].spec as OAISpec;
    } catch (error) {
        handleError(error, "Getting OpenAPI definition", false);
        throw error; // Re-throw to be caught by the caller
    }
}

async function getServicePort(projectDir: string, service: ServiceInfo, openapiSpec?: OAISpec): Promise<number> {
    try {
        // If the service has an anonymous listener, directly use the port defined inline
        if (service.listener.port && !isNaN(parseInt(service.listener.port))) {
            return parseInt(service.listener.port);
        }

        // Try to get default port from OpenAPI spec first
        let portInSpec: number;
        const portInSpecStr = openapiSpec?.servers?.[0]?.variables?.port?.default;
        if (portInSpecStr) {
            const parsedPort = parseInt(portInSpecStr);
            portInSpec = !isNaN(parsedPort) ? parsedPort : undefined;
        }

        const balProcesses = await findRunningBallerinaProcesses(projectDir)
            .catch(error => {
                throw new Error(`Failed to find running Ballerina processes: ${error.message}`);
            });

        if (!balProcesses?.length) {
            throw new Error('No running Ballerina processes found. Please run your service first.');
        }

        const uniquePorts: number[] = [...new Set(balProcesses.flatMap(process => process.ports))];
        if (portInSpec && uniquePorts.includes(portInSpec)) {
            return portInSpec;
        }

        if (uniquePorts.length === 0) {
            throw new Error('No service ports found in running Ballerina processes');
        }

        if (uniquePorts.length === 1) {
            return uniquePorts[0];
        }

        // If multiple ports, prompt user to select one
        const portItems = uniquePorts.map(port => ({
            label: `Port ${port}`, port
        }));

        const selected = await vscode.window.showQuickPick(portItems, {
            placeHolder: `Multiple service ports found. Select the port of the service '${service.name || service.basePath}'`,
            title: 'Select Service Port'
        });

        if (!selected) {
            throw new Error('No port selected for the service');
        }

        return selected.port;
    } catch (error) {
        handleError(error, "Getting service port", false);
        throw error;
    }
}

/**
 * Helper function to detect running Ballerina processes and, prompt the user to run the program if not found
 */
async function checkBallerinaProcessRunning(projectDir: string): Promise<boolean> {
    try {
        const balProcesses = await findRunningBallerinaProcesses(projectDir)
            .catch(error => {
                throw new Error(`Failed to find running Ballerina processes: ${error.message}`);
            });

        if (!balProcesses?.length) {
            const selection = await vscode.window.showWarningMessage(
                'The "Try It" feature requires a running Ballerina service. Would you like to run the integration first?',
                'Run Integration',
                'Cancel'
            );

            if (selection === 'Run Integration') {
                // Execute the run command
                clearTerminal();
                await startDebugging(Uri.file(projectDir), false, false, true);

                // Wait for the Ballerina service(s) to start
                const newProcesses = await waitForBallerinaService(projectDir).then(() => {
                    return findRunningBallerinaProcesses(projectDir);
                });

                return newProcesses?.length > 0;
            }

            return false;
        }

        return true;
    } catch (error) {
        handleError(error, "Checking Ballerina processes", false);
        return false;
    }
}

function registerHandlebarsHelpers(openapiSpec: OAISpec): void {
    // handlebar helper to process query parameters
    if (!Handlebars.helpers.queryParams) {
        Handlebars.registerHelper('queryParams', function (parameters) {
            if (!parameters || !parameters.length) {
                return '';
            }

            const queryParams = parameters
                .filter(param => param.in === 'query')
                .map(param => {
                    const value = param.schema?.default || `{?}`;
                    return `${param.name}=${value}`;
                })
                .join('&');

            return new Handlebars.SafeString(queryParams && queryParams.length > 0 ? `?${queryParams}` : '');
        });
    }

    // handlebar helper to process header parameters
    if (!Handlebars.helpers.headerParams) {
        Handlebars.registerHelper('headerParams', function (parameters) {
            if (!parameters || !parameters.length) {
                return '';
            }

            const headerParams = parameters
                .filter(param => param.in === 'header')
                .map(param => {
                    const value = param.schema?.default || `{?}`;
                    return `${param.name}: ${value}`;
                })
                .join('\n');

            return new Handlebars.SafeString(headerParams ? `\n${headerParams}` : '');
        });

        // Helper to group parameters by type (path, query, header)
        if (!Handlebars.helpers.groupParams) {
            Handlebars.registerHelper('groupParams', function (parameters) {
                if (!parameters || !parameters.length) {
                    return {};
                }

                return parameters.reduce((acc: any, param) => {
                    if (!acc[param.in]) {
                        acc[param.in] = [];
                    }
                    acc[param.in].push(param);
                    return acc;
                }, {});
            });
        }
    }

    if (!Handlebars.helpers.eq) {
        Handlebars.registerHelper('eq', (value1, value2) => value1 === value2);
    }

    // Helper to get the content type from request body
    if (!Handlebars.helpers.getContentType) {
        Handlebars.registerHelper('getContentType', (requestBody) => {
            const contentTypes = Object.keys(requestBody.content);
            return contentTypes[0] || 'application/json';
        });
    }

    // Helper to generate schema description
    if (!Handlebars.helpers.generateSchemaDescription) {
        Handlebars.registerHelper('generateSchemaDescription', function (requestBody) {
            const contentType = Object.keys(requestBody.content)[0];
            const schema = requestBody.content[contentType].schema;
            // Pass the full OpenAPI spec context to resolve references
            return generateSchemaDoc(schema, 0, openapiSpec);
        });
    }

    // Helper to generate request body
    if (!Handlebars.helpers.generateRequestBody) {
        Handlebars.registerHelper('generateRequestBody', function (requestBody) {
            return new Handlebars.SafeString(generateRequestBody(requestBody, openapiSpec));
        });
    }

    if (!Handlebars.helpers.not) {
        Handlebars.registerHelper('not', function (value) {
            return !value;
        });
    }

    if (!Handlebars.helpers.uppercase) {
        Handlebars.registerHelper('uppercase', (str: string) => str.toUpperCase());
    }

    if (!Handlebars.helpers.trim) {
        Handlebars.registerHelper('trim', (str?: string) => str ? str.trim() : '');
    }
}

function generateSchemaDoc(schema: Schema, depth: number, context: OAISpec): string {
    const indent = '  '.repeat(depth);

    // Handle schema reference
    if ('$ref' in schema) {
        const resolvedSchema = resolveSchemaRef(schema.$ref, context);
        if (!resolvedSchema) {
            return "";
        }
        return generateSchemaDoc(resolvedSchema, depth, context);
    }

    if (schema.type === 'object' && schema.properties) {
        let doc = `${indent}${schema.type}\n`;
        for (const [propName, prop] of Object.entries(schema.properties)) {
            const propSchema = '$ref' in prop ? resolveSchemaRef(prop.$ref, context) || prop : prop;
            const format = propSchema.format ? `(${propSchema.format})` : '';
            const description = propSchema.description ? ` - ${propSchema.description}` : '';
            doc += `${indent}- ${propName}: ${propSchema.type}${format}${description}\n`;

            if (propSchema.type === 'object' && 'properties' in propSchema) {
                doc += generateSchemaDoc(propSchema, depth + 1, context);
            } else if (propSchema.type === 'array' && 'items' in propSchema) {
                const itemsSchema = '$ref' in propSchema.items
                    ? resolveSchemaRef(propSchema.items.$ref, context) || propSchema.items
                    : propSchema.items;
                doc += `${indent}  items: ${generateSchemaDoc(itemsSchema as Schema, depth + 1, context).trimStart()}`;
            }

            // Add enum values if present
            if (propSchema.enum) {
                doc += `${indent}  enum: [${propSchema.enum.join(', ')}]\n`;
            }
        }
        return doc;
    } else if (schema.type === 'array') {
        let doc = `array\n`;
        if (schema.type === 'array' && 'items' in schema) {
            const itemsSchema = '$ref' in schema.items
                ? resolveSchemaRef(schema.items.$ref, context) || schema.items
                : schema.items;
            doc += `${indent}items: ${generateSchemaDoc(itemsSchema as Schema, depth + 1, context).trimStart()}`;
        }
        return doc;
    }

    return `${schema.type}${schema.format ? ` (${schema.format})` : ''}`;
}

// Helper to get content type and generate appropriate payload
function generateRequestBody(requestBody: RequestBody, context: OAISpec): string {
    const contentType = Object.keys(requestBody.content)[0];
    const schema = requestBody.content[contentType].schema;
    const schemaDoc = generateSchemaDoc(schema, 1, context);
    const isJson = contentType === 'application/json';

    // Generate the comment block with schema documentation using line comments
    const commentLines = [
        `# ${getCommentText(contentType)}`
    ];
    if (schemaDoc.trim()) {
        commentLines.push(
            '#',
            '# Expected schema:',
            ...schemaDoc.split('\n').map(line => line.trim() ? `# ${line}` : '')
        );
    }

    // For JSON, generate sample data. For other types, return empty string
    const payload = isJson ? JSON.stringify(generateSampleValue(schema, context), null, 2) : '';
    return `${commentLines.join('\n')}\n${payload}`;
}

function getCommentText(contentType: string): string {
    switch (contentType) {
        case 'application/json':
            return 'Modify the JSON payload as needed';
        case 'application/x-www-form-urlencoded':
            return 'Complete the form URL-encoded payload';
        case 'multipart/form-data':
            return 'Complete the multipart form data payload';
        case 'text/plain':
            return 'Enter your text content here';
        default:
            return `Complete the payload for content type: ${contentType}`;
    }
}

function generateSampleValue(schema: Schema, context: OAISpec): any {
    // Handle schema reference
    if (schema.$ref) {
        const resolvedSchema = resolveSchemaRef(schema.$ref, context);
        if (!resolvedSchema) {
            return { error: `Reference not found: ${schema.$ref}` };
        }
        return generateSampleValue(resolvedSchema, context);
    }

    if (!schema.type) {
        return {};
    }

    switch (schema.type) {
        case 'object':
            if (!schema.properties) {
                return {};
            }
            const obj: Record<string, any> = {};
            for (const [propName, prop] of Object.entries(schema.properties)) {
                // Handle property references
                const propSchema = '$ref' in prop ? resolveSchemaRef(prop.$ref, context) || prop : prop;
                obj[propName] = generateSampleValue(propSchema as Schema, context);
            }
            return obj;

        case 'array':
            if (!schema.items) {
                return [];
            }
            // Handle array item references
            const itemsSchema = '$ref' in schema.items ? resolveSchemaRef(schema.items.$ref, context) || schema.items : schema.items;
            return [generateSampleValue(itemsSchema as Schema, context)];
        case 'string':
            if (schema.enum && schema.enum.length > 0) {
                return schema.enum[0];
            }
            if (schema.format) {
                switch (schema.format) {
                    case 'date':
                        return "2024-02-06";
                    case 'date-time':
                        return "2024-02-06T12:00:00Z";
                    case 'email':
                        return "user@example.com";
                    case 'uuid':
                        return "123e4567-e89b-12d3-a456-426614174000";
                    default:
                        return "{?}";
                }
            }
            return schema.default || "{?}";
        case 'integer':
        case 'number':
            return schema.default || 0;
        case 'boolean':
            return schema.default || false;
        case 'null':
            return null;
        default:
            return undefined;
    }
}

function resolveSchemaRef(ref: string, context: OAISpec): Schema | undefined {
    if (!ref.startsWith('#/')) {
        // Currently only supporting local references
        return undefined;
    }

    const parts = ref.substring(2).split('/');
    let current: any = context;

    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return undefined;
        }
    }

    return current as Schema;
}

// helper function to compare listeners
function compareListeners(serviceInfoListener: { name: string, port?: string }, serviceMetadataListener: string): boolean {
    // named listeners
    if (serviceInfoListener.name && serviceMetadataListener === serviceInfoListener.name) {
        return true;
    }

    // anonymous listeners
    if (serviceMetadataListener.startsWith('new http:Listener') && serviceInfoListener.port) {
        // Extract port from 'http:Listener(9090)'
        const portMatch = serviceMetadataListener.match(/new http:Listener\((\d+)\)/);
        if (portMatch && portMatch[1]) {
            const port = parseInt(portMatch[1], 10);
            return port === parseInt(serviceInfoListener.port);
        }
    }

    return false;
}

// Function to setup error log watching
function setupErrorLogWatcher(targetDir: string) {
    const errorLogPath = path.join(targetDir, FILE_NAMES.ERROR_LOG);

    // Dispose existing watcher if any
    disposeErrorWatcher();

    if (!fs.existsSync(errorLogPath)) {
        fs.writeFileSync(errorLogPath, '');
    }

    // Setup the file watcher Watch for changes in the error log file
    errorLogWatcher = workspace.createFileSystemWatcher(errorLogPath);
    errorLogWatcher.onDidChange(() => {
        try {
            const content = fs.readFileSync(errorLogPath, 'utf-8');
            if (content.trim()) {
                // Show a notification with "Show Details" button
                window.showWarningMessage(
                    'The request contains missing required parameters. Please provide values for the placeholders before sending the request.',
                    'Show Details'
                ).then(selection => {
                    if (selection === 'Show Details') {
                        // Show the full error in an output channel
                        const outputChannel = window.createOutputChannel('WSO2 Integrator: BI Tryit - Log');
                        outputChannel.appendLine(content.trim());
                        outputChannel.show();
                    }
                });
            }
        } catch (error) {
            console.error('Error reading error log file:', error);
        }
    });
}

function sanitizeBallerinaPathSegment(pathSegment: string): string {
    let sanitized = pathSegment.trim();
    // Remove escaped characters
    sanitized = sanitized.replace(/\\/g, '');
    // Remove leading single quote if present
    if (sanitized.startsWith("'")) {
        sanitized = sanitized.substring(1);
    }
    return sanitized;
}

function extractPath(url) {
    let match;

    // Remove escaping backslashes
    url = url.replace(/\\(.)/g, '$1');

    // If the string starts with one or more slashes, remove them.
    if (url.startsWith("/")) {
        return url.replace(/^\/+/, '');
    }

    if (url.includes("://")) {
        // For URLs with a protocol, remove the protocal and host.
        match = url.match(/^(?:[^\/]*:\/\/[^\/]+\/)(.*)$/);
        return match ? match[1] : "";
    } else {
        // For strings without a protocol, discards the part up to the first "/" and returns everything after.
        match = url.match(/^(?:[^\/]+\/)(.*)$/);
        return match ? match[1] : "";
    }
}

function sanitizePath(path) {
    if (!path) { return ''; }

    // Remove leading/trailing whitespace and escape backslashes
    return path.trim().replace(/\\(.)/g, '$1');
}

// cleanup function for the watcher
function disposeErrorWatcher() {
    if (errorLogWatcher) {
        errorLogWatcher.dispose();
        errorLogWatcher = undefined;
    }
}

// Service information interface
enum ServiceType {
    HTTP = 'HTTP',
    AGENT = 'AI Agent',
    GRAPHQL = 'GraphQL'
}

interface ServiceInfo {
    name?: string;
    basePath: string;
    filePath: string;
    port?: number;
    type: ServiceType;
    listener: {
        name: string;
        port?: string;
    };
}

// Main OpenAPI specification interface
interface OAISpec {
    openapi: string;
    info: Info;
    servers?: Server[];
    paths: Record<string, Record<string, Operation>>;
    components?: Components;
}

interface Contact {
    name?: string;
    url?: string;
    email?: string;
}

interface License {
    name: string;
    url?: string;
}

interface Info {
    title: string;
    description?: string;
    version: string;
    contact?: Contact;
    license?: License;
}

interface Schema {
    $ref?: string;
    type?: string;
    properties?: Record<string, Schema>;
    items?: Schema;
    description?: string;
    format?: string;
    default?: any;
    enum?: any[];
}

interface Server {
    url: string;
    description?: string;
    variables?: Record<string, ServerVariable>;
}

interface ServerVariable {
    default: string;
    description?: string;
    enum?: string[];
}

interface Property {
    type: string;
    description?: string;
}

interface Operation {
    summary?: string;
    description?: string;
    parameters?: Parameter[];
    requestBody?: RequestBody;
    responses: Record<string, Response>;
}

interface Parameter {
    name: string;
    in: string;
    description?: string;
    required?: boolean;
    schema?: Schema;
}

interface Content {
    schema: Schema;
}

interface RequestBody {
    description?: string;
    content: Record<string, Content>;
}

interface Response {
    description: string;
    content?: Record<string, Content>;
}

interface Components {
    schemas?: Record<string, Schema>;
}

interface ResourceMetadata {
    methodValue: string;
    pathValue: string;
}

interface ServiceMetadata {
    basePath: string;
    listener: string;
}
