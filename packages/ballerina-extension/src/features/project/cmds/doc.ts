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

import { commands, window } from "vscode";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";
import { extension } from "../../../BalExtensionContext";
import {
    TM_EVENT_PROJECT_DOC, TM_EVENT_ERROR_EXECUTE_PROJECT_DOC, CMP_PROJECT_DOC, sendTelemetryEvent,
    sendTelemetryException,
    getMessageObject
} from "../../telemetry";
import {
    runCommand,
    BALLERINA_COMMANDS,
    MESSAGES,
    PROJECT_TYPE,
    PALETTE_COMMANDS
} from "./cmd-runner";
import {
    getCurrentBallerinaProject,
    getCurrentProjectRoot,
    tryGetCurrentBallerinaFile
} from "../../../utils/project-utils";
import { LANGUAGE } from "../../../core";
import { openView, StateMachine } from "../../../stateMachine";
import {
    needsProjectDiscovery,
    requiresPackageSelection,
    selectPackageOrPrompt
} from "../../../utils/command-utils";
import { VisualizerWebview } from "../../../views/visualizer/webview";
import { findBallerinaPackageRoot } from "../../../utils/file-utils";
import { findWorkspaceTypeFromWorkspaceFolders } from "../../../rpc-managers/common/utils";

function activateDocCommand() {
    // register ballerina doc handler
    commands.registerCommand(PALETTE_COMMANDS.DOC, async () => {
        try {
            sendTelemetryEvent(extension.ballerinaExtInstance, TM_EVENT_PROJECT_DOC, CMP_PROJECT_DOC);

            if (window.activeTextEditor && window.activeTextEditor.document.languageId != LANGUAGE.BALLERINA) {
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }

            const { workspacePath, view: webviewType, projectPath, projectInfo } = StateMachine.context();
            const isWebviewOpen = VisualizerWebview.currentPanel !== undefined;
            const hasActiveTextEditor = !!window.activeTextEditor;
            const currentBallerinaFile = tryGetCurrentBallerinaFile();
            const projectRoot = await findBallerinaPackageRoot(currentBallerinaFile);

            let targetPath = projectPath ?? "";

            if (requiresPackageSelection(workspacePath, webviewType, projectPath, isWebviewOpen, hasActiveTextEditor)) {
                const availablePackages = projectInfo?.children.map((child: any) => child.projectPath) ?? [];
                const selectedPackage = await selectPackageOrPrompt(
                    availablePackages,
                    "Select a package to build documentation"
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

            if (!targetPath) {
                window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
                return;
            }

            if (isWebviewOpen) {
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.PackageOverview, projectPath: targetPath });
            }

            const currentProject = await getCurrentBallerinaProject(targetPath);

            if (currentProject.kind === PROJECT_TYPE.SINGLE_FILE) {
                sendTelemetryEvent(extension.ballerinaExtInstance, TM_EVENT_ERROR_EXECUTE_PROJECT_DOC, CMP_PROJECT_DOC,
                    getMessageObject(MESSAGES.NOT_IN_PROJECT));
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }
            runCommand(currentProject, extension.ballerinaExtInstance.getBallerinaCmd(), BALLERINA_COMMANDS.DOC,
                currentProject.path!);

        } catch (error) {
            if (error instanceof Error) {
                sendTelemetryException(extension.ballerinaExtInstance, error, CMP_PROJECT_DOC);
                window.showErrorMessage(error.message);
            } else {
                window.showErrorMessage("Unknown error occurred.");
            }
        }
    });
}

async function discoverProjectPath(): Promise<string | undefined> {
    const workspaceType = await findWorkspaceTypeFromWorkspaceFolders();
    const packageRoot = await getCurrentProjectRoot();

    if (!packageRoot) {
        return undefined;
    }

    if (workspaceType.type === "MULTIPLE_PROJECTS") {
        const projectInfo = await StateMachine.langClient().getProjectInfo({ projectPath: packageRoot });
        await StateMachine.updateProjectRootAndInfo(packageRoot, projectInfo);
        return packageRoot;
    }

    if (workspaceType.type === "BALLERINA_WORKSPACE") {
        await StateMachine.updateProjectRootAndInfo(packageRoot, StateMachine.context().projectInfo);
        return packageRoot;
    }

    return undefined;
}

export { activateDocCommand };
