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

import { LANGUAGE } from "../../../core";
import { extension } from "../../../BalExtensionContext";
import { commands, QuickPickItem, window } from "vscode";
import {
    TM_EVENT_PROJECT_ADD, TM_EVENT_ERROR_EXECUTE_PROJECT_ADD, CMP_PROJECT_ADD, sendTelemetryEvent, sendTelemetryException, getMessageObject
} from "../../telemetry";
import { runCommand, BALLERINA_COMMANDS, MESSAGES, PROJECT_TYPE, PALETTE_COMMANDS } from "./cmd-runner";
import {
    getCurrentBallerinaProject,
    getCurrentProjectRoot
} from "../../../utils/project-utils";
import { MACHINE_VIEW, ProjectInfo } from "@wso2/ballerina-core";
import { StateMachine } from "../../../stateMachine";

function activateAddCommand() {
    // register ballerina add handler
    commands.registerCommand(PALETTE_COMMANDS.ADD, async () => {
        try {
            sendTelemetryEvent(extension.ballerinaExtInstance, TM_EVENT_PROJECT_ADD, CMP_PROJECT_ADD);

            if (window.activeTextEditor && window.activeTextEditor.document.languageId != LANGUAGE.BALLERINA) {
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }

            const context = StateMachine.context();
            const { workspacePath, view: webviewType, projectPath, projectInfo } = context;

            let targetPath = projectPath ?? "";
            if (workspacePath && webviewType === MACHINE_VIEW.WorkspaceOverview) {
                const selection = await getPackage(projectInfo);
                if (!selection) {
                    return;
                }
                targetPath = selection;
                
            } else if (workspacePath && !projectPath) {
                try {
                    targetPath = await getCurrentProjectRoot();
                } catch (error){
                    const selection = await getPackage(projectInfo);
                    if (!selection) {
                        return;
                    }
                    targetPath = selection;
                }
            } else {
                targetPath = await getCurrentProjectRoot();
            }
  
            if (!targetPath) {
                window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
                return;
            }

            const currentProject = await getCurrentBallerinaProject(targetPath);

            if (currentProject.kind === PROJECT_TYPE.SINGLE_FILE || !currentProject.path) {
                sendTelemetryEvent(extension.ballerinaExtInstance, TM_EVENT_ERROR_EXECUTE_PROJECT_ADD, CMP_PROJECT_ADD,
                    getMessageObject(MESSAGES.NOT_IN_PROJECT));
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }

            const moduleName = await window.showInputBox({ placeHolder: MESSAGES.MODULE_NAME });
            if (moduleName && moduleName.trim().length > 0) {
                runCommand(currentProject, extension.ballerinaExtInstance.getBallerinaCmd(), BALLERINA_COMMANDS.ADD,
                    moduleName);
            }

        } catch (error) {
            if (error instanceof Error) {
                sendTelemetryException(extension.ballerinaExtInstance, error, CMP_PROJECT_ADD);
                window.showErrorMessage(error.message);
            } else {
                window.showErrorMessage("Unkown error occurred.");
            }
        }
    });
}

export { activateAddCommand };

// Prompts user to select a package
async function getPackage(projectInfo: ProjectInfo): Promise<string | undefined> {
    const packages = projectInfo?.children;
    if (!packages || packages.length === 0) {
        window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
        return undefined;
    }
    else if (packages.length === 1) {
        return packages[0].projectPath;
    }
    const packagePaths = packages.map((pkg) => pkg.projectPath);
    const resultItem = await window.showQuickPick<QuickPickItem>(packagePaths.map(path => ({ label: path })), {
                placeHolder: `Select a Package to add the module to`,
            });
    return resultItem ? resultItem.label : undefined;
}