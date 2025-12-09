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

import * as vscode from 'vscode';
import { MESSAGES, PALETTE_COMMANDS } from '../../features/project/cmds/cmd-runner';
import { StateMachine, openView } from '../../stateMachine';
import { extension } from '../../BalExtensionContext';
import { BI_COMMANDS, EVENT_TYPE, MACHINE_VIEW, NodePosition, SHARED_COMMANDS } from '@wso2/ballerina-core';
import { buildProjectsStructure } from '../../utils/project-artifacts';
import { createVersionNumber, findBallerinaPackageRoot, isSupportedSLVersion } from '../../utils';
import { VisualizerWebview } from './webview';
import { findWorkspaceTypeFromWorkspaceFolders } from '../../rpc-managers/common/utils';
import { getCurrentProjectRoot, tryGetCurrentBallerinaFile } from '../../utils/project-utils';

export function activateSubscriptions() {
    const context = extension.context;
    context.subscriptions.push(
        vscode.commands.registerCommand(PALETTE_COMMANDS.SHOW_SOURCE, () => {
            const path = StateMachine.context().documentUri;
            if (!path) {
                return;
            }
            vscode.window.showTextDocument(vscode.Uri.file(path), { viewColumn: vscode.ViewColumn.Beside });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(PALETTE_COMMANDS.SHOW_ENTITY_DIAGRAM, (path, selectedRecord = "") => {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.ERDiagram, documentUri: path?.fsPath || vscode.window.activeTextEditor.document.uri.fsPath, identifier: selectedRecord });
        })
    );


    // <------------- Shared Commands ------------>
    context.subscriptions.push(
        vscode.commands.registerCommand(
            SHARED_COMMANDS.SHOW_VISUALIZER,
            async (
                pathOrItem: string | vscode.Uri | vscode.TreeItem,
                position,
                resetHistory = false
            ) => {
                // Check if position is a LineRange object (has 'start' and 'end' keys)
                let nodePosition: NodePosition = position;
                if (position && typeof position === "object" && "start" in position && "end" in position) {
                    // Convert LineRange to NodePosition
                    nodePosition = {
                        startLine: position.start.line,
                        startColumn: position.start.character,
                        endLine: position.end.line,
                        endColumn: position.end.character
                    };
                }
                let documentPath = "";
                if (pathOrItem) {
                    if (typeof pathOrItem === "string") {
                        if (pathOrItem.startsWith("file:")) {
                            documentPath = vscode.Uri.parse(pathOrItem).fsPath;
                        } else {
                            documentPath = vscode.Uri.file(pathOrItem).fsPath;
                        }
                    } else if (pathOrItem instanceof vscode.Uri) {
                        documentPath = pathOrItem.fsPath;
                    }
                }

                let projectPath = StateMachine.context().projectPath;
                const projectRoot = await findBallerinaPackageRoot(documentPath);

                const isBallerinaWorkspace = !!StateMachine.context().workspacePath;
                if (isBallerinaWorkspace) {
                    if (pathOrItem instanceof vscode.TreeItem) {
                        openView(
                            EVENT_TYPE.OPEN_VIEW,
                            {
                                projectPath: pathOrItem.resourceUri?.fsPath,
                                view: MACHINE_VIEW.PackageOverview
                            },
                            true
                        );
                        return;
                    }
                    const documentUri = documentPath || vscode.window.activeTextEditor?.document.uri.fsPath;
                    openView(
                        EVENT_TYPE.OPEN_VIEW,
                        {
                            projectPath: projectRoot,
                            documentUri: documentUri,
                            position: nodePosition
                        },
                        true
                    );
                    return;
                }

                if (!projectPath || projectPath !== projectRoot) {
                    // Initialize project structure if not already set by finding and loading the Ballerina project root
                    // Can happen when the user opens a directory containing multiple Ballerina projects
                    if (projectRoot) {
                        const projectInfo = await StateMachine.langClient().getProjectInfo({ projectPath: projectRoot });
                        await StateMachine.updateProjectRootAndInfo(projectRoot, projectInfo);
                    }
                }
                
                if (StateMachine.langClient() && StateMachine.context().isBISupported) { // This is added since we can't fetch new diagram data without bi supported ballerina version
                    openView(EVENT_TYPE.OPEN_VIEW, { documentUri: documentPath || vscode.window.activeTextEditor?.document.uri.fsPath, position: nodePosition }, resetHistory);
                } else {
                    openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BallerinaUpdateView }); // Redirect user to the ballerina update available page
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.GET_STATE_CONTEXT, () => {
            return StateMachine.context();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.FORCE_UPDATE_PROJECT_ARTIFACTS, () => {
            console.log("Force updating project artifacts...");
            return buildProjectsStructure(StateMachine.context().projectInfo, StateMachine.langClient(), true);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.OPEN_BI_WELCOME, () => {
            if (StateMachine.langClient()) {
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIWelcome });
            } else {
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.SetupView });
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.OPEN_BI_NEW_PROJECT, () => {
            const isBallerinaWorkspace = !!StateMachine.context().workspacePath;
            const isWorkspaceSupported = isSupportedSLVersion(
                extension.ballerinaExtInstance,
                createVersionNumber(2201, 13, 0)
            );

            if (isBallerinaWorkspace && isWorkspaceSupported) {
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIAddProjectForm });
            } else {
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIProjectForm });
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(BI_COMMANDS.OPEN_TYPE_DIAGRAM, async () => {
            const { projectInfo, projectPath, view, workspacePath } = StateMachine.context();
            const isWebviewOpen = VisualizerWebview.currentPanel !== undefined;
            const isActiveTextEditor = vscode.window.activeTextEditor;

            const isAtWorkspaceLevel = 
                workspacePath && 
                (view === MACHINE_VIEW.WorkspaceOverview || !projectPath || !isWebviewOpen) &&
                !isActiveTextEditor;

            const currentBallerinaFile = tryGetCurrentBallerinaFile();
            const projectRoot = await findBallerinaPackageRoot(currentBallerinaFile);

            if (isAtWorkspaceLevel) {
                const availablePackages = projectInfo?.children.map((child) => child.projectPath) ?? [];
                const selectedPackage = await vscode.window.showQuickPick(availablePackages, {
                    placeHolder: "Select a package to open type diagram",
                    ignoreFocusOut: false
                });

                // User cancelled selection
                if (!selectedPackage) {
                    return;
                }

                openView(
                    EVENT_TYPE.OPEN_VIEW,
                    { view: MACHINE_VIEW.TypeDiagram, projectPath: selectedPackage }
                );
            } else if (!projectInfo || (projectRoot && projectPath !== projectRoot)) {
                try {
                    const workspaceType = await findWorkspaceTypeFromWorkspaceFolders();
                    const packageRoot = await getCurrentProjectRoot();
                    if (packageRoot) {
                        if (workspaceType.type === "MULTIPLE_PROJECTS") {
                            const projectInfo = await StateMachine.langClient().getProjectInfo({ projectPath: packageRoot });
                            await StateMachine.updateProjectRootAndInfo(packageRoot, projectInfo);
                            openView(
                                EVENT_TYPE.OPEN_VIEW,
                                { view: MACHINE_VIEW.TypeDiagram, projectPath: packageRoot },
                                true
                            );
                            return;
                        } else if (workspaceType.type === "BALLERINA_WORKSPACE") {
                            openView(
                                EVENT_TYPE.OPEN_VIEW,
                                { view: MACHINE_VIEW.TypeDiagram, projectPath: packageRoot },
                                true
                            );
                            return;
                        }
                    }
                    vscode.window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
                    return;
                } catch (error) {
                    vscode.window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
                    return;
                }
            } else {
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.TypeDiagram });
            }
        })
    );


    StateMachine.service().onTransition((state) => {
        vscode.commands.executeCommand('setContext', 'showBalGoToSource', state.context?.documentUri !== undefined);
    });

}
