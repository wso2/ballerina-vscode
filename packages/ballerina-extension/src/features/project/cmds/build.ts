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

import { MACHINE_VIEW } from "@wso2/ballerina-core";
import { LANGUAGE } from "../../../core";
import { extension } from "../../../BalExtensionContext";
import { commands, window } from "vscode";
import {
    TM_EVENT_PROJECT_BUILD,
    CMP_PROJECT_BUILD,
    sendTelemetryEvent,
    sendTelemetryException
} from "../../telemetry";
import {
    runCommand,
    BALLERINA_COMMANDS,
    PROJECT_TYPE,
    PALETTE_COMMANDS,
    MESSAGES
} from "./cmd-runner";
import {
    getCurrentBallerinaProject,
    getCurrenDirectoryPath,
    getCurrentBallerinaFile,
    getCurrentProjectRoot
} from "../../../utils/project-utils";
import { isSupportedSLVersion, createVersionNumber } from "../../../utils";
import { StateMachine } from "../../../stateMachine";

export function activateBuildCommand() {
    // register run project build handler
    commands.registerCommand(PALETTE_COMMANDS.BUILD, async () => {
        try {
            sendTelemetryEvent(extension.ballerinaExtInstance, TM_EVENT_PROJECT_BUILD, CMP_PROJECT_BUILD);

            if (window.activeTextEditor && window.activeTextEditor.document.languageId != LANGUAGE.BALLERINA) {
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }

            const context = StateMachine.context();
            const { workspacePath, view: webviewType, projectPath } = context;

            let targetPath = projectPath ?? "";
            if (workspacePath && webviewType === MACHINE_VIEW.WorkspaceOverview) {
                targetPath = workspacePath;
            } else if (workspacePath && !projectPath) {
                try {
                    targetPath = await getCurrentProjectRoot();
                } catch (error) {
                    targetPath = workspacePath;
                }
            } else {
                targetPath = await getCurrentProjectRoot();
            }

            if (!targetPath) {
                window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
                return;
            }

            const currentProject = await getCurrentBallerinaProject(targetPath);

            let balCommand = BALLERINA_COMMANDS.BUILD;

            if (isSupportedSLVersion(extension.ballerinaExtInstance, createVersionNumber(2201, 13, 0)) && extension.ballerinaExtInstance.enabledExperimentalFeatures()) {
                balCommand = BALLERINA_COMMANDS.BUILD_WITH_EXPERIMENTAL;
            }

            if (currentProject.kind !== PROJECT_TYPE.SINGLE_FILE) {
                runCommand(currentProject, extension.ballerinaExtInstance.getBallerinaCmd(), balCommand,
                    currentProject.path!);
            } else {
                runCommand(getCurrenDirectoryPath(), extension.ballerinaExtInstance.getBallerinaCmd(),
                    balCommand, getCurrentBallerinaFile());
            }

        } catch (error) {
            if (error instanceof Error) {
                sendTelemetryException(extension.ballerinaExtInstance, error, CMP_PROJECT_BUILD);
                window.showErrorMessage(error.message);
            } else {
                window.showErrorMessage("Unkown error occurred.");
            }
        }
    });
}
