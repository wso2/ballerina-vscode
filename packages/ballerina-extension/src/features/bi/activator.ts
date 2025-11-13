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
import { commands, Uri, workspace, window, ConfigurationTarget } from "vscode";
import {
    BI_COMMANDS,
    BIDeleteByComponentInfoRequest,
    ComponentInfo,
    DIRECTORY_MAP,
    EVENT_TYPE,
    FlowNode,
    FOCUS_FLOW_DIAGRAM_VIEW,
    MACHINE_VIEW
} from "@wso2/ballerina-core";
import { BallerinaExtension } from "../../core";
import { openView } from "../../stateMachine";
import { ENABLE_DEBUG_LOG, ENABLE_TRACE_LOG, TRACE_SERVER } from "../../core/preferences";
import { prepareAndGenerateConfig } from "../config-generator/configGenerator";
import { StateMachine } from "../../stateMachine";
import { BiDiagramRpcManager } from "../../rpc-managers/bi-diagram/rpc-manager";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { isPositionEqual, isPositionWithinDeletedComponent } from "../../utils/history/util";
import { startDebugging } from "../editor-support/activator";
import { createBIProjectFromMigration, createBIProjectPure } from "../../utils/bi";

const FOCUS_DEBUG_CONSOLE_COMMAND = 'workbench.debug.action.focusRepl';
const TRACE_SERVER_OFF = "off";
const TRACE_SERVER_VERBOSE = "verbose";

export function activate(context: BallerinaExtension) {
    commands.registerCommand(BI_COMMANDS.BI_RUN_PROJECT, () => {
        prepareAndGenerateConfig(context, StateMachine.context().projectPath, false, true);
    });

    commands.registerCommand(BI_COMMANDS.BI_DEBUG_PROJECT, () => {
        commands.executeCommand(FOCUS_DEBUG_CONSOLE_COMMAND);
        startDebugging(Uri.file(StateMachine.context().projectPath), false, true);
    });

    commands.registerCommand(BI_COMMANDS.ADD_CONNECTIONS, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.AddConnectionWizard });
    });

    commands.registerCommand(BI_COMMANDS.ADD_CUSTOM_CONNECTOR, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.AddCustomConnector });
    });

    commands.registerCommand(BI_COMMANDS.ADD_ENTRY_POINT, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIComponentView });
    });

    commands.registerCommand(BI_COMMANDS.ADD_TYPE, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.TypeDiagram, addType: true });
    });

    commands.registerCommand(BI_COMMANDS.VIEW_TYPE_DIAGRAM, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.TypeDiagram, rootDiagramId: `type-diagram-${Date.now()}` });
    });

    commands.registerCommand(BI_COMMANDS.ADD_FUNCTION, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIFunctionForm });
    });

    commands.registerCommand(BI_COMMANDS.ADD_CONFIGURATION, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.AddConfigVariables });
    });

    commands.registerCommand(BI_COMMANDS.VIEW_CONFIGURATION, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.ViewConfigVariables });
    });

    commands.registerCommand(BI_COMMANDS.SHOW_OVERVIEW, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview });
    });

    commands.registerCommand(BI_COMMANDS.ADD_PROJECT, async () => {
        const workspacePath = StateMachine.context().workspacePath;
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIAddProjectForm, workspacePath: workspacePath });
    });

    commands.registerCommand(BI_COMMANDS.ADD_DATA_MAPPER, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIDataMapperForm });
    });

    commands.registerCommand(BI_COMMANDS.ADD_NATURAL_FUNCTION, () => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BINPFunctionForm });
    });

    commands.registerCommand(BI_COMMANDS.SWITCH_PROJECT, async () => {
        // Hack to switch the project. This will reload the window and prompt the user to select the project.
        // This is a temporary solution until we provide the support for multi root workspaces.
        // Ref: https://github.com/wso2/product-ballerina-integrator/issues/1465
        StateMachine.sendEvent("SWITCH_PROJECT" as any);
    });

    commands.registerCommand(BI_COMMANDS.TOGGLE_TRACE_LOGS, toggleTraceLogs);

    commands.registerCommand(BI_COMMANDS.CREATE_BI_PROJECT, (params) => {
        return createBIProjectPure(params);
    });

    commands.registerCommand(BI_COMMANDS.CREATE_BI_MIGRATION_PROJECT, (params) => {
        return createBIProjectFromMigration(params);
    });

    commands.registerCommand(BI_COMMANDS.DELETE_COMPONENT, async (item: any) => {
        console.log(">>> delete component", item);

        if (item.contextValue === DIRECTORY_MAP.CONNECTION) {
            await handleConnectionDeletion(item.label, item.info);
        } else if (item.contextValue === DIRECTORY_MAP.LOCAL_CONNECTORS) {
            await handleLocalModuleDeletion(item.label, item.info);
        } else {
            await handleComponentDeletion(item.contextValue, item.label, item.info);
        }
    });

    // Open the ballerina toml file as the first file for LS to trigger the project loading
    openBallerinaTomlFile(context);
}


function openBallerinaTomlFile(context: BallerinaExtension) {
    const projectPath = StateMachine.context().projectPath;
    const ballerinaTomlFile = path.join(projectPath, "Ballerina.toml");
    try {
        const content = readFileSync(ballerinaTomlFile, "utf8");
        if (content) {
            context.langClient.didOpen({
                textDocument: {
                    uri: Uri.file(ballerinaTomlFile).toString(),
                    languageId: "toml",
                    version: 1,
                    text: content,
                },
            });
            console.log(`>>> Opened file: ${ballerinaTomlFile}`);
        } else {
            console.error(`>>> No content found for file ${ballerinaTomlFile}`);
        }
    } catch (error) {
        console.error(`Error opening file ${ballerinaTomlFile}:`, error);
    }
}

function openAllBallerinaFiles(context: BallerinaExtension) {
    const projectPath = StateMachine.context().projectPath;

    if (context.langClient && projectPath) {
        try {
            // Find all Ballerina files in the project
            const ballerinaFiles = findBallerinaFiles(projectPath);
            console.log(`>>> Found ${ballerinaFiles.length} Ballerina files in the project`);

            // Open each Ballerina file
            ballerinaFiles.forEach((filePath) => {
                try {
                    const content = readFileSync(filePath, "utf8");
                    if (content) {
                        context.langClient.didOpen({
                            textDocument: {
                                uri: Uri.file(filePath).toString(),
                                languageId: "ballerina",
                                version: 1,
                                text: content,
                            },
                        });
                        console.log(`>>> Opened file: ${filePath}`);
                    } else {
                        console.error(`>>> No content found for file ${filePath}`);
                    }
                } catch (error) {
                    console.error(`Error opening file ${filePath}:`, error);
                }
            });
        } catch (error) {
            console.error("Error finding Ballerina files:", error);
        }
    }
}

// Function to recursively find all Ballerina files
const findBallerinaFiles = (dir: string, fileList: string[] = []): string[] => {
    const files = readdirSync(dir);

    files.forEach((file: string) => {
        const filePath = path.join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory() && !file.startsWith(".")) {
            // Recursively search directories, skip hidden directories
            fileList = findBallerinaFiles(filePath, fileList);
        } else if (file.endsWith(".bal")) {
            // Add Ballerina files to the list
            fileList.push(filePath);
        }
    });

    return fileList;
};

const handleComponentDeletion = async (componentType: string, itemLabel: string, filePath: string) => {
    const rpcClient = new BiDiagramRpcManager();
    const componentCategory = StateMachine.context().projectStructure.directoryMap[componentType];

    if (!componentCategory) {
        console.error(`Component type ${componentType} not found in project structure`);
        return;
    }

    componentCategory.forEach((component) => {
        if (component.name === itemLabel) {
            const componentInfo: ComponentInfo = {
                name: component.name,
                filePath: component.path,
                startLine: component.position.startLine,
                startColumn: component.position.startColumn,
                endLine: component.position.endLine,
                endColumn: component.position.endColumn,
                resources: component?.resources
            };

            deleteComponent(componentInfo, rpcClient, filePath);
        }
    });
};

const handleLocalModuleDeletion = async (moduleName: string, filePath: string) => {
    const rpcClient = new BiDiagramRpcManager();
    // Note: Project path is overriden at rpc-client level.
    rpcClient.deleteOpenApiGeneratedModules({ projectPath: "", module: moduleName }).then((response) => {
        console.log(">>> Updated source code after local connector delete", response);
    });
};

const handleConnectionDeletion = async (itemLabel: string, filePath: string) => {
    const rpcClient = new BiDiagramRpcManager();
    rpcClient.getModuleNodes().then((response) => {
        console.log(">>> moduleNodes", { moduleNodes: response });
        const connector = response?.flowModel?.connections.find(
            (node) => node.properties.variable.value === itemLabel.trim()
        );
        if (connector) {
            rpcClient
                .deleteFlowNode({
                    filePath: filePath,
                    flowNode: connector,
                })
                .then((response) => {
                    console.log(">>> Updated source code after delete", response);
                    if (response.artifacts) {
                        if (hasNoComponentsOpenInDiagram() || isFlowNodeOpenInDiagram(connector)) {
                            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview });
                        }
                    } else {
                        console.error(">>> Error updating source code", response);
                    }
                });
        } else {
            console.error(">>> Error finding connector", { connectionName: itemLabel });
        }
    });
};

async function deleteComponent(component: ComponentInfo, rpcClient: BiDiagramRpcManager, filePath: string) {
    const req: BIDeleteByComponentInfoRequest = {
        filePath: filePath,
        component: component,
    };

    console.log(">>> delete component request", req);

    await rpcClient.deleteByComponentInfo(req);

    if (hasNoComponentsOpenInDiagram() || isComponentOpenInDiagram(component)) {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview });
    }
}

function isComponentOpenInDiagram(component: ComponentInfo) {
    const openedCompoentPosition = StateMachine.context().position;
    const openedComponentFilePath = StateMachine.context().documentUri;

    if (!openedCompoentPosition) {
        return false;
    }

    const componentPosition = {
        startLine: component.startLine,
        startColumn: component.startColumn,
        endLine: component.endLine,
        endColumn: component.endColumn
    };
    const componentFilePath = component.filePath;
    const isWithinDeletedComponent = isPositionWithinDeletedComponent(openedCompoentPosition, componentPosition);
    const areFilePathsEqual = isFilePathsEqual(openedComponentFilePath, componentFilePath);
    return isWithinDeletedComponent && areFilePathsEqual;
}

function isFlowNodeOpenInDiagram(connector: FlowNode) {
    const openedCompoentPosition = StateMachine.context().position;
    const openedComponentFilePath = StateMachine.context().documentUri;

    if (!openedCompoentPosition) {
        return false;
    }

    const flowNodePosition = {
        startLine: connector.codedata.lineRange.startLine.line,
        startColumn: connector.codedata.lineRange.startLine.offset,
        endLine: connector.codedata.lineRange.endLine.line,
        endColumn: connector.codedata.lineRange.endLine.offset
    };
    const flowNodeFilePath = path.join(StateMachine.context().projectPath, connector.codedata.lineRange.fileName);

    return isFilePathsEqual(openedComponentFilePath, flowNodeFilePath)
        && isPositionEqual(openedCompoentPosition, flowNodePosition);
}

function hasNoComponentsOpenInDiagram() {
    return !StateMachine.context().position;
}

function isFilePathsEqual(filePath1: string, filePath2: string) {
    return path.normalize(filePath1) === path.normalize(filePath2);
}

function toggleTraceLogs() {
    const config = workspace.getConfiguration();

    const currentTraceServer = config.get<string>(TRACE_SERVER);
    const currentDebugLog = config.get<boolean>(ENABLE_DEBUG_LOG);
    const currentTraceLog = config.get<boolean>(ENABLE_TRACE_LOG);

    const isTraceEnabled = currentTraceServer === TRACE_SERVER_VERBOSE && currentDebugLog && currentTraceLog;

    if (isTraceEnabled) {
        config.update(TRACE_SERVER, TRACE_SERVER_OFF, ConfigurationTarget.Global);
        config.update(ENABLE_DEBUG_LOG, false, ConfigurationTarget.Global);
        config.update(ENABLE_TRACE_LOG, false, ConfigurationTarget.Global);
        window.showInformationMessage('BI extension trace logs disabled');
    } else {
        config.update(TRACE_SERVER, TRACE_SERVER_VERBOSE, ConfigurationTarget.Global);
        config.update(ENABLE_DEBUG_LOG, true, ConfigurationTarget.Global);
        config.update(ENABLE_TRACE_LOG, true, ConfigurationTarget.Global);
        window.showInformationMessage('BI extension trace logs enabled');
    }
}
