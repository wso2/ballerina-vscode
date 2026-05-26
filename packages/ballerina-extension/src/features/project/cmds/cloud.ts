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
import { commands, window } from "vscode";
import { findBallerinaPackageRoot, outputChannel } from "../../../utils";
import {
    TM_EVENT_PROJECT_CLOUD, TM_EVENT_ERROR_EXECUTE_PROJECT_CLOUD, CMP_PROJECT_CLOUD, sendTelemetryEvent,
    sendTelemetryException,
    getMessageObject
} from "../../telemetry";
import { getCurrentProjectRoot, tryGetCurrentBallerinaFile } from "../../../utils/project-utils";
import { MESSAGES, PALETTE_COMMANDS } from "./cmd-runner";
import * as fs from 'fs';
import { findWorkspaceTypeFromWorkspaceFolders } from "../../../rpc-managers/common/utils";
import { StateMachine } from "../../../stateMachine";
import { selectPackageOrPrompt, requiresPackageSelection, needsProjectDiscovery } from "../../../utils/command-utils";
import { join } from "path";
import { URI } from "vscode-uri";
import { VisualizerWebview } from "../../../views/visualizer/webview";
import { discoverProjectPath } from "./doc";

// const CLOUD_CONFIG_FILE_NAME = `${sep}Cloud.toml`;
const CLOUD_CONFIG_FILE_NAME = 'Cloud.toml';

function activateCloudCommand() {
    // register create Cloud.toml command handler
    commands.registerCommand(PALETTE_COMMANDS.CLOUD, async () => {
        try {
            sendTelemetryEvent(extension.ballerinaExtInstance, TM_EVENT_PROJECT_CLOUD, CMP_PROJECT_CLOUD);

            if (window.activeTextEditor && window.activeTextEditor.document.languageId !== LANGUAGE.BALLERINA) {
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }

            const result = await findWorkspaceTypeFromWorkspaceFolders();
            let { workspacePath, view: webviewType, projectPath, projectInfo } = StateMachine.context();
            const isWebviewOpen = VisualizerWebview.currentPanel !== undefined;
            const hasActiveTextEditor = !!window.activeTextEditor;
            const currentBallerinaFile = tryGetCurrentBallerinaFile();
            const projectRoot = await findBallerinaPackageRoot(currentBallerinaFile);

            let targetPath = projectPath ?? "";

            if (result.type === "MULTIPLE_PROJECTS") {
                const packageRoot = await getCurrentProjectRoot();
                if (!packageRoot) {
                    window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
                    return;
                }
                projectInfo = await StateMachine.langClient().getProjectInfo({ projectPath: packageRoot });
                targetPath = projectInfo.projectPath ?? packageRoot;
            } else if (result.type === "BALLERINA_WORKSPACE") {
                if (requiresPackageSelection(workspacePath, webviewType, projectPath, isWebviewOpen, hasActiveTextEditor)) {
                    const availablePackages = projectInfo?.children.map((child: any) => child.projectPath) ?? [];
                    const selectedPackage = await selectPackageOrPrompt(
                        availablePackages,
                        "Select the project to create Cloud.toml in"
                    );
                    if (!selectedPackage) {
                        return;
                    }
                    targetPath = selectedPackage;
                    await StateMachine.updateProjectRootAndInfo(selectedPackage, projectInfo);
                } else if (needsProjectDiscovery(projectInfo, projectRoot, projectPath)) {
                    targetPath = await discoverProjectPath();
                } else {
                    targetPath = await getCurrentProjectRoot();
                }
            }


            let cloudTomlPath = join(targetPath, CLOUD_CONFIG_FILE_NAME);
            if (projectInfo.projectPath && !fs.existsSync(cloudTomlPath)) {
                const commandArgs = {
                    key: "uri",
                    value: window.activeTextEditor ? window.activeTextEditor!.document.uri.toString() : URI.file(join(targetPath, 'main.bal')).toString(),
                };
                commands.executeCommand('ballerina.create.cloud.exec', commandArgs);
                outputChannel.appendLine(`Cloud.toml created in ${projectInfo.projectPath}`);
                window.showInformationMessage(`Cloud.toml created at ${targetPath}`);
            } else {
                const message = `Cloud.toml already exists in the project.`;
                sendTelemetryEvent(extension.ballerinaExtInstance, TM_EVENT_ERROR_EXECUTE_PROJECT_CLOUD,
                    CMP_PROJECT_CLOUD, getMessageObject(message));
                window.showErrorMessage(message);
            }
        } catch (error) {
            if (error instanceof Error) {
                sendTelemetryException(extension.ballerinaExtInstance, error, CMP_PROJECT_CLOUD);
                window.showErrorMessage(error.message);
            } else {
                window.showErrorMessage("Unknown error occurred.");
            }
        }
    });
}

export { activateCloudCommand };