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

import { URI, Utils } from "vscode-uri";
import { ARTIFACT_TYPE, Artifacts, ArtifactsNotification, BaseArtifact, DIRECTORY_MAP, EVENT_TYPE, MACHINE_VIEW, NodePosition, ProjectStructureArtifactResponse, ProjectStructureResponse, VisualizerLocation } from "@wso2/ballerina-core";
import { StateMachine } from "../stateMachine";
import * as fs from 'fs';
import * as path from 'path';
import { ExtendedLangClient } from "../core/extended-language-client";
import { ServiceDesignerRpcManager } from "../rpc-managers/service-designer/rpc-manager";
import { injectAgent, injectAgentCode, injectImportIfMissing } from "./source-utils";
import { tmpdir } from "os";
import { ArtifactsUpdated, ArtifactNotificationHandler } from "./project-artifacts-handler";

export async function buildProjectArtifactsStructure(projectDir: string, langClient: ExtendedLangClient, isUpdate: boolean = false): Promise<ProjectStructureResponse> {
    const result: ProjectStructureResponse = {
        projectName: "",
        directoryMap: {
            [DIRECTORY_MAP.AUTOMATION]: [],
            [DIRECTORY_MAP.SERVICE]: [],
            [DIRECTORY_MAP.LISTENER]: [],
            [DIRECTORY_MAP.FUNCTION]: [],
            [DIRECTORY_MAP.CONNECTION]: [],
            [DIRECTORY_MAP.TYPE]: [],
            [DIRECTORY_MAP.CONFIGURABLE]: [],
            [DIRECTORY_MAP.DATA_MAPPER]: [],
            [DIRECTORY_MAP.NP_FUNCTION]: [],
            [DIRECTORY_MAP.AGENTS]: [],
            [DIRECTORY_MAP.LOCAL_CONNECTORS]: [],
        }
    };
    const designArtifacts = await langClient.getProjectArtifacts({ projectPath: projectDir });
    console.log("designArtifacts", designArtifacts);
    if (designArtifacts?.artifacts) {
        traverseComponents(designArtifacts.artifacts, result);
        await populateLocalConnectors(projectDir, result);
    }
    if (isUpdate) {
        StateMachine.updateProjectStructure({ ...result });
    }
    return result;
}

export async function updateProjectArtifacts(publishedArtifacts: ArtifactsNotification): Promise<void> {
    // Current project structure
    const currentProjectStructure: ProjectStructureResponse = StateMachine.context().projectStructure;
    if (publishedArtifacts && currentProjectStructure) {
        const tmpUri = URI.file(tmpdir());
        const publishedArtifactsUri = URI.parse(publishedArtifacts.uri);
        if (publishedArtifactsUri.path.toLowerCase().includes(tmpUri.path.toLowerCase())) {
            // Skip the temp dirs
            return;
        }
        const entryLocations = await traverseUpdatedComponents(publishedArtifacts.artifacts, currentProjectStructure);
        if (entryLocations.length > 0) {
            const notificationHandler = ArtifactNotificationHandler.getInstance();
            // Publish a notification to the artifact handler
            notificationHandler.publish(ArtifactsUpdated.method, {
                data: entryLocations,
                timestamp: Date.now()
            });
        }
        StateMachine.updateProjectStructure({ ...currentProjectStructure }); // Update the project structure and refresh the tree
    }
}

async function traverseComponents(artifacts: Artifacts, response: ProjectStructureResponse) {
    response.directoryMap[DIRECTORY_MAP.AUTOMATION].push(...await getComponents(artifacts[ARTIFACT_TYPE.EntryPoints], DIRECTORY_MAP.AUTOMATION, "task"));
    response.directoryMap[DIRECTORY_MAP.SERVICE].push(...await getComponents(artifacts[ARTIFACT_TYPE.EntryPoints], DIRECTORY_MAP.SERVICE, "http-service"));
    response.directoryMap[DIRECTORY_MAP.LISTENER].push(...await getComponents(artifacts[ARTIFACT_TYPE.Listeners], DIRECTORY_MAP.LISTENER, "http-service"));
    response.directoryMap[DIRECTORY_MAP.FUNCTION].push(...await getComponents(artifacts[ARTIFACT_TYPE.Functions], DIRECTORY_MAP.FUNCTION, "function"));
    response.directoryMap[DIRECTORY_MAP.DATA_MAPPER].push(...await getComponents(artifacts[ARTIFACT_TYPE.DataMappers], DIRECTORY_MAP.DATA_MAPPER, "dataMapper"));
    response.directoryMap[DIRECTORY_MAP.CONNECTION].push(...await getComponents(artifacts[ARTIFACT_TYPE.Connections], DIRECTORY_MAP.CONNECTION, "connection"));
    response.directoryMap[DIRECTORY_MAP.TYPE].push(...await getComponents(artifacts[ARTIFACT_TYPE.Types], DIRECTORY_MAP.TYPE, "type"));
    response.directoryMap[DIRECTORY_MAP.CONFIGURABLE].push(...await getComponents(artifacts[ARTIFACT_TYPE.Configurations], DIRECTORY_MAP.CONFIGURABLE, "config"));
    response.directoryMap[DIRECTORY_MAP.NP_FUNCTION].push(...await getComponents(artifacts[ARTIFACT_TYPE.NaturalFunctions], DIRECTORY_MAP.NP_FUNCTION, "function"));
}

async function getComponents(artifacts: Record<string, BaseArtifact>, artifactType: DIRECTORY_MAP, icon: string, moduleName?: string): Promise<ProjectStructureArtifactResponse[]> {
    const entries: ProjectStructureArtifactResponse[] = [];
    if (!artifacts) {
        return entries;
    }
    // Loop though the artifact records and create the project structure artifact response
    for (const [key, artifact] of Object.entries(artifacts)) {
        // Skip the entry to the entries array if the artifact type does not match the requested artifact type
        if (artifact.type !== artifactType) {
            continue;
        }
        const entryValue = await getEntryValue(artifact, icon, moduleName);
        entries.push(entryValue);
    }
    return entries;
}

async function getEntryValue(artifact: BaseArtifact, icon: string, moduleName?: string) {
    const targetFile = Utils.joinPath(URI.parse(StateMachine.context().projectUri), artifact.location.fileName).fsPath;
    const entryValue: ProjectStructureArtifactResponse = {
        id: artifact.id,
        name: artifact.name,
        path: targetFile,
        moduleName: artifact.module,
        type: artifact.type,
        icon: artifact.module ? `bi-${artifact.module}` : icon,
        context: artifact.name === "automation" ? "main" : artifact.name,
        resources: [],
        position: {
            endColumn: artifact.location.endLine.offset,
            endLine: artifact.location.endLine.line,
            startColumn: artifact.location.startLine.offset,
            startLine: artifact.location.startLine.line
        }
    };
    switch (artifact.type) {
        case DIRECTORY_MAP.AUTOMATION:
            // Do things related to automation
            entryValue.name = `Automation`;
            break;
        case DIRECTORY_MAP.SERVICE:
            // Do things related to service
            entryValue.name = artifact.name; // GraphQL Service - /foo
            entryValue.icon = getCustomEntryNodeIcon(artifact.module);
            if (artifact.module === "ai") {
                entryValue.resources = [];
                const aiResourceLocation = Object.values(artifact.children).find(child => child.type === DIRECTORY_MAP.RESOURCE)?.location;
                entryValue.position = {
                    endColumn: aiResourceLocation.endLine.offset,
                    endLine: aiResourceLocation.endLine.line,
                    startColumn: aiResourceLocation.startLine.offset,
                    startLine: aiResourceLocation.startLine.line
                };
            } else {
                // Get the children of the service
                const resourceFunctions = await getComponents(artifact.children, DIRECTORY_MAP.RESOURCE, icon, artifact.module);
                const remoteFunctions = await getComponents(artifact.children, DIRECTORY_MAP.REMOTE, icon, artifact.module);
                const privateFunctions = await getComponents(artifact.children, DIRECTORY_MAP.FUNCTION, icon, artifact.module);
                entryValue.resources = [...resourceFunctions, ...remoteFunctions, ...privateFunctions];
            }
            break;
        case DIRECTORY_MAP.LISTENER:
            // Do things related to listener
            entryValue.icon = getCustomEntryNodeIcon(getTypePrefix(artifact.module));
            break;
        case DIRECTORY_MAP.CONNECTION:
            entryValue.icon = icon;
            break;
        case DIRECTORY_MAP.RESOURCE:
            // Do things related to resource
            let resourceName = `${artifact.name}`;
            let resourceIcon = `${artifact.accessor}-api`;
            if (moduleName && moduleName === "graphql") {
                resourceName = `${artifact.name}`;
                resourceIcon = ``;
            }
            entryValue.name = resourceName;
            entryValue.icon = resourceIcon;
            break;
        case DIRECTORY_MAP.REMOTE:
            // Do things related to remote
            entryValue.icon = ``;
            break;
    }
    return entryValue;
}

// This is a hack to inject the AI agent code into the chat service function
// This has to be replaced once we have a proper design for AI Agent Chat Service
async function injectAIAgent(serviceArtifact: BaseArtifact) {
    // Inject the import if missing
    const importStatement = `import ballerinax/ai`;
    await injectImportIfMissing(importStatement, path.join(StateMachine.context().projectUri, `agents.bal`));

    //get AgentName
    const agentName = serviceArtifact.name.split('-')[1].trim().replace(/\//g, '');

    // Inject the agent code
    await injectAgent(agentName, StateMachine.context().projectUri);
    // Retrieve the service model
    const targetFile = Utils.joinPath(URI.parse(StateMachine.context().projectUri), serviceArtifact.location.fileName).fsPath;
    const updatedService = await new ServiceDesignerRpcManager().getServiceModelFromCode({
        filePath: targetFile,
        codedata: {
            lineRange: {
                startLine: { line: serviceArtifact.location.startLine.line, offset: serviceArtifact.location.startLine.offset },
                endLine: { line: serviceArtifact.location.endLine.line, offset: serviceArtifact.location.endLine.offset }
            }
        }
    });
    if (!updatedService?.service?.functions?.[0]?.codedata?.lineRange?.endLine) {
        console.error('Unable to determine injection position: Invalid service structure');
        return;
    }
    const injectionPosition = updatedService.service.functions[0].codedata.lineRange.endLine;
    const serviceFile = path.join(StateMachine.context().projectUri, `main.bal`);
    ensureFileExists(serviceFile);
    await injectAgentCode(agentName, serviceFile, injectionPosition);
    const functionPosition: NodePosition = {
        startLine: updatedService.service.functions[0].codedata.lineRange.startLine.line,
        startColumn: updatedService.service.functions[0].codedata.lineRange.startLine.offset,
        endLine: updatedService.service.functions[0].codedata.lineRange.endLine.line + 3,
        endColumn: updatedService.service.functions[0].codedata.lineRange.endLine.offset
    };
    return {
        position: functionPosition
    };
}

function ensureFileExists(targetFile: string) {
    // Check if the file exists
    if (!fs.existsSync(targetFile)) {
        // Create the file if it does not exist
        fs.writeFileSync(targetFile, "");
        console.log(`>>> Created file at ${targetFile}`);
    }
}

/**
 * Maps an ARTIFACT_TYPE category key and a specific artifact to the corresponding DIRECTORY_MAP key and a default icon.
 * Note: The icon returned here is a base icon; `getEntryValue` might assign a more specific icon later based on the module.
 * @param artifact The specific artifact being processed. Used to differentiate between AUTOMATION and SERVICE within EntryPoints.
 * @param artifactCategoryKey The category key from ARTIFACT_TYPE (e.g., ARTIFACT_TYPE.EntryPoints).
 * @returns An object containing the DIRECTORY_MAP key and a base icon string, or null if the category is unhandled.
 */
function getDirectoryMapKeyAndIcon(artifact: BaseArtifact, artifactCategoryKey: string): { mapKey: DIRECTORY_MAP; icon: string } | null {
    switch (artifactCategoryKey) {
        case ARTIFACT_TYPE.EntryPoints:
            // EntryPoints can be either AUTOMATION or SERVICE type artifacts.
            // We use the artifact's ID as per the original logic to distinguish.
            if (artifact.id === "automation") {
                // Check the type for consistency, although original code relied on ID.
                if (artifact.type === DIRECTORY_MAP.AUTOMATION) {
                    return { mapKey: DIRECTORY_MAP.AUTOMATION, icon: "task" };
                } else {
                    console.warn(`Artifact with id 'automation' has unexpected type: ${artifact.type}`);
                    // Fallback based on ID, but log a warning.
                    return { mapKey: DIRECTORY_MAP.AUTOMATION, icon: "task" };
                }
            } else {
                // Assume it's a service if not automation.
                // Add a type check for robustness.
                if (artifact.type === DIRECTORY_MAP.SERVICE) {
                    return { mapKey: DIRECTORY_MAP.SERVICE, icon: "http-service" };
                } else {
                    console.warn(`EntryPoint artifact (id: ${artifact.id}) has unexpected type: ${artifact.type}. Assuming SERVICE.`);
                    // Fallback based on non-automation ID.
                    return { mapKey: DIRECTORY_MAP.SERVICE, icon: "http-service" };
                }
            }
        case ARTIFACT_TYPE.Listeners:
            return { mapKey: DIRECTORY_MAP.LISTENER, icon: "http-service" }; // Base icon, getEntryValue might refine
        case ARTIFACT_TYPE.Functions:
            return { mapKey: DIRECTORY_MAP.FUNCTION, icon: "function" };
        case ARTIFACT_TYPE.DataMappers:
            return { mapKey: DIRECTORY_MAP.DATA_MAPPER, icon: "dataMapper" };
        case ARTIFACT_TYPE.Connections:
            return { mapKey: DIRECTORY_MAP.CONNECTION, icon: "connection" };
        case ARTIFACT_TYPE.Types:
            return { mapKey: DIRECTORY_MAP.TYPE, icon: "type" };
        case ARTIFACT_TYPE.Configurations:
            return { mapKey: DIRECTORY_MAP.CONFIGURABLE, icon: "config" };
        case ARTIFACT_TYPE.NaturalFunctions:
            return { mapKey: DIRECTORY_MAP.NP_FUNCTION, icon: "function" };
        default:
            console.warn(`Unhandled artifact category key: ${artifactCategoryKey}`);
            return null;
    }
}

/**
 * Processes a single artifact deletion.
 * @param artifact The artifact to delete.
 * @param artifactCategoryKey The category key (from ARTIFACT_TYPE).
 * @param projectStructure The project structure to modify.
 */
function processDeletion(artifact: BaseArtifact, artifactCategoryKey: string, projectStructure: ProjectStructureResponse): void {
    const mapping = getDirectoryMapKeyAndIcon(artifact, artifactCategoryKey);
    if (mapping) {
        projectStructure.directoryMap[mapping.mapKey] =
            projectStructure.directoryMap[mapping.mapKey]?.filter(value => value.id !== artifact.id) ?? [];
    } else {
        console.error(`Could not determine directory map key for deletion of artifact ${artifact.id} in category ${artifactCategoryKey}`);
    }
}

/**
 * Processes a single artifact addition.
 * @param artifact The artifact to add.
 * @param artifactCategoryKey The category key (from ARTIFACT_TYPE).
 * @param projectStructure The project structure to modify.
 * @returns A promise resolving to the potentially relevant visualization entry, or undefined.
 */
async function processAddition(artifact: BaseArtifact, artifactCategoryKey: string, projectStructure: ProjectStructureResponse): Promise<ProjectStructureArtifactResponse | undefined> {
    const mapping = getDirectoryMapKeyAndIcon(artifact, artifactCategoryKey);
    if (mapping) {
        try {
            const entryValue = await getEntryValue(artifact, mapping.icon);
            // Ensure the array exists before pushing
            if (!projectStructure.directoryMap[mapping.mapKey]) {
                projectStructure.directoryMap[mapping.mapKey] = [];
            }
            entryValue.isNew = true; // This is a flag to identify the new artifact

            // Hack to handle AI services --------------------------------->
            // Inject the AI agent code into the service when new service is created
            if (artifact.module === "ai" && artifact.type === DIRECTORY_MAP.SERVICE) {
                const aiResourceLocation = Object.values(artifact.children).find(child => child.type === DIRECTORY_MAP.RESOURCE)?.location;
                const startLine = aiResourceLocation.startLine.line;
                const endLine = aiResourceLocation.endLine.line;
                const isEmptyResource = endLine - startLine === 1;
                if (isEmptyResource) {
                    const injectedResult = await injectAIAgent(artifact);
                    entryValue.position = injectedResult.position;
                }
            }
            // <-------------------------------------------------------------
            projectStructure.directoryMap[mapping.mapKey]?.push(entryValue);
            return entryValue;
        } catch (error) {
            console.error(`Error processing addition for artifact ${artifact.id} in category ${artifactCategoryKey}:`, error);
            return undefined;
        }
    } else {
        console.error(`Could not determine directory map key for addition of artifact ${artifact.id} in category ${artifactCategoryKey}`);
        return undefined;
    }
}

/**
 * Processes a single artifact update.
 * @param artifact The artifact to update.
 * @param artifactCategoryKey The category key (from ARTIFACT_TYPE).
 * @param projectStructure The project structure to modify.
 * @returns A promise resolving to the potentially relevant visualization entry, or undefined.
 */
async function processUpdate(artifact: BaseArtifact, artifactCategoryKey: string, projectStructure: ProjectStructureResponse): Promise<ProjectStructureArtifactResponse | undefined> {
    const mapping = getDirectoryMapKeyAndIcon(artifact, artifactCategoryKey);
    if (mapping) {
        try {
            const entryValue = await getEntryValue(artifact, mapping.icon);
            // Ensure the array exists
            if (!projectStructure.directoryMap[mapping.mapKey]) {
                projectStructure.directoryMap[mapping.mapKey] = [];
            }
            const index = projectStructure.directoryMap[mapping.mapKey]?.findIndex(value => value.id === artifact.id);
            if (index !== undefined && index !== -1) {
                projectStructure.directoryMap[mapping.mapKey][index] = entryValue;
            } else {
                // Artifact not found for update, add it instead (matches original logic)
                console.warn(`Artifact ${artifact.id} not found for update in ${mapping.mapKey}, adding it instead.`);
                projectStructure.directoryMap[mapping.mapKey]?.push(entryValue);
            }
            return entryValue;
        } catch (error) {
            console.error(`Error processing update for artifact ${artifact.id} in category ${artifactCategoryKey}:`, error);
            return undefined;
        }
    } else {
        console.error(`Could not determine directory map key for update of artifact ${artifact.id} in category ${artifactCategoryKey}`);
        return undefined;
    }
}

async function traverseUpdatedComponents(publishedArtifacts: Artifacts, currentProjectStructure: ProjectStructureResponse): Promise<ProjectStructureArtifactResponse[]> {
    const entryLocations: ProjectStructureArtifactResponse[] = [];
    const promises: Promise<ProjectStructureArtifactResponse | undefined>[] = [];

    // Iterate through each artifact category (e.g., EntryPoints, Listeners)
    for (const [artifactCategoryKey, actionMap] of Object.entries(publishedArtifacts)) {
        // Process Deletions first (synchronous)
        if (actionMap.deletions) {
            for (const artifact of Object.values(actionMap.deletions) as BaseArtifact[]) {
                processDeletion(artifact, artifactCategoryKey, currentProjectStructure);
            }
        }

        // Process Additions (asynchronous)
        if (actionMap.additions) {
            for (const artifact of Object.values(actionMap.additions) as BaseArtifact[]) {
                promises.push(processAddition(artifact, artifactCategoryKey, currentProjectStructure));
            }
        }

        // Process Updates (asynchronous)
        if (actionMap.updates) {
            for (const artifact of Object.values(actionMap.updates) as BaseArtifact[]) {
                promises.push(processUpdate(artifact, artifactCategoryKey, currentProjectStructure));
            }
        }
    }

    // Wait for all additions and updates to complete
    const results = await Promise.all(promises);

    // Populate addition entry locations
    for (const result of results) {
        if (result) {
            entryLocations.push(result);
        }
    }
    return entryLocations;
}

async function populateLocalConnectors(projectDir: string, response: ProjectStructureResponse) {
    const filePath = `${projectDir}/Ballerina.toml`;
    const localConnectors = (await StateMachine.langClient().getOpenApiGeneratedModules({ projectPath: projectDir })).modules;
    const mappedEntries: ProjectStructureArtifactResponse[] = localConnectors.map(moduleName => ({
        id: moduleName,
        name: moduleName,
        path: filePath,
        type: "HTTP",
        icon: "connection",
        context: moduleName,
        resources: [],
        position: {
            endColumn: 61,
            endLine: 8,
            startColumn: 0,
            startLine: 5
        }
    }));

    response.directoryMap[DIRECTORY_MAP.LOCAL_CONNECTORS].push(...mappedEntries);
}

function getCustomEntryNodeIcon(type: string) {
    switch (type) {
        case "tcp":
            return "bi-tcp";
        case "ai":
            return "bi-ai-agent";
        case "kafka":
            return "bi-kafka";
        case "rabbitmq":
            return "bi-rabbitmq";
        case "nats":
            return "bi-nats";
        case "mqtt":
            return "bi-mqtt";
        case "grpc":
            return "bi-grpc";
        case "graphql":
            return "bi-graphql";
        case "java.jms":
            return "bi-java";
        case "github":
            return "bi-github";
        case "salesforce":
            return "bi-salesforce";
        case "asb":
            return "bi-asb";
        case "ftp":
            return "bi-ftp";
        case "file":
            return "bi-file";
        default:
            return "bi-globe";
    }
}

const getTypePrefix = (type: string): string => {
    if (!type) { return ""; }
    const parts = type.split(":");
    return parts.length > 1 ? parts[0] : type;
};
