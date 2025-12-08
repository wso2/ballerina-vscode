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
import { commands, QuickPickItem, Uri, window } from "vscode";
import {
    TM_EVENT_PROJECT_ADD, TM_EVENT_ERROR_EXECUTE_PROJECT_ADD, CMP_PROJECT_ADD, sendTelemetryEvent, sendTelemetryException, getMessageObject
} from "../../telemetry";
import { runCommand, BALLERINA_COMMANDS, MESSAGES, PROJECT_TYPE, PALETTE_COMMANDS } from "./cmd-runner";
import {
    getCurrentBallerinaProject,
    getCurrentProjectRoot
} from "../../../utils/project-utils";
import { BallerinaProject, MACHINE_VIEW } from "@wso2/ballerina-core";
import { StateMachine } from "../../../stateMachine";
import { getBallerinaPackages } from "../../../../src/utils";
import path from "path";

function activateAddCommand() {
    // register ballerina add handler
    commands.registerCommand(PALETTE_COMMANDS.ADD, async () => {
        try {
            sendTelemetryEvent(extension.ballerinaExtInstance, TM_EVENT_PROJECT_ADD, CMP_PROJECT_ADD);

            if (window.activeTextEditor && window.activeTextEditor.document.languageId != LANGUAGE.BALLERINA) {
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }

            let currentProject:BallerinaProject
            const context = StateMachine.context();
            const { workspacePath, view: webviewType, projectPath } = context;

            let targetPath = projectPath ?? "";
            if (workspacePath && webviewType === MACHINE_VIEW.WorkspaceOverview) {
                const packages = await getBallerinaPackages(Uri.file(workspacePath));
                targetPath = await getPackage(packages);
                
            } else if (workspacePath && !projectPath) {
                try {
                    targetPath = await getCurrentProjectRoot();
                } catch (error) {
                    const packages = await getBallerinaPackages(Uri.file(workspacePath));
                    targetPath = await getPackage(packages);
                }
            } else {
                targetPath = await getCurrentProjectRoot();
            }
  
            if (!targetPath) {
                window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
                return;
            }

            currentProject = await getCurrentBallerinaProject(targetPath);

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
async function getPackage(packages: string[]): Promise<string>{
    const options: PackageQuickPickItem[] = packages.map((pkg) => {
        return {
            label: path.basename(pkg),
            path: pkg
        };
    });
    if (options.length === 0) {
        return "";
    }
    else if (options.length === 1) {
        return options[0].path;
    }
    let resultItem = await window.showQuickPick<PackageQuickPickItem>(options, {
                placeHolder: `Select a Package to add the module to`,
            });
    return resultItem ? resultItem.path : "";
}

interface PackageQuickPickItem extends QuickPickItem {
    label: string,
    path: string
}