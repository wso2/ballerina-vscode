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

import { ballerinaExtInstance, LANGUAGE } from "../../../core";
import { commands, window } from "vscode";
import {
    TM_EVENT_PROJECT_BUILD, CMP_PROJECT_BUILD, sendTelemetryEvent, sendTelemetryException
} from "../../telemetry";
import { runCommand, BALLERINA_COMMANDS, PROJECT_TYPE, PALETTE_COMMANDS, MESSAGES }
    from "./cmd-runner";
import { getCurrentBallerinaProject, getCurrenDirectoryPath, getCurrentBallerinaFile }
    from "../../../utils/project-utils";
import { isSupportedSLVersion } from "../../../utils";

export function activateBuildCommand() {
    // register run project build handler
    commands.registerCommand(PALETTE_COMMANDS.BUILD, async () => {
        try {
            sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_PROJECT_BUILD, CMP_PROJECT_BUILD);

            if (window.activeTextEditor && window.activeTextEditor.document.languageId != LANGUAGE.BALLERINA) {
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }

            const currentProject = ballerinaExtInstance.getDocumentContext().isActiveDiagram() ? await
                getCurrentBallerinaProject(ballerinaExtInstance.getDocumentContext().getLatestDocument()?.toString())
                : await getCurrentBallerinaProject();

            let balCommand = BALLERINA_COMMANDS.BUILD;

            if (isSupportedSLVersion(ballerinaExtInstance, 2201130) && ballerinaExtInstance.enabledExperimentalFeatures()) {
                balCommand = BALLERINA_COMMANDS.BUILD_WITH_EXPERIMENTAL;
            }

            if (currentProject.kind !== PROJECT_TYPE.SINGLE_FILE) {
                runCommand(currentProject, ballerinaExtInstance.getBallerinaCmd(), balCommand,
                    currentProject.path!);
            } else {
                runCommand(getCurrenDirectoryPath(), ballerinaExtInstance.getBallerinaCmd(),
                    balCommand, getCurrentBallerinaFile());
            }

        } catch (error) {
            if (error instanceof Error) {
                sendTelemetryException(ballerinaExtInstance, error, CMP_PROJECT_BUILD);
                window.showErrorMessage(error.message);
            } else {
                window.showErrorMessage("Unkown error occurred.");
            }
        }
    });
}
