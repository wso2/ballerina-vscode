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
import { commands, Uri, window } from "vscode";
import {
    TM_EVENT_PROJECT_RUN, CMP_PROJECT_RUN, sendTelemetryEvent, sendTelemetryException
} from "../../telemetry";
import { runCommand, BALLERINA_COMMANDS, PROJECT_TYPE, PALETTE_COMMANDS, runCommandWithConf, MESSAGES, getRunCommand } from "./cmd-runner";
import { getCurrentBallerinaProject, getCurrentBallerinaFile, getCurrenDirectoryPath } from "../../../utils/project-utils";
import { prepareAndGenerateConfig } from '../../config-generator/configGenerator';

function activateRunCmdCommand() {

    commands.registerCommand(PALETTE_COMMANDS.RUN, async (filePath: Uri) => {
        prepareAndGenerateConfig(ballerinaExtInstance, filePath ? filePath.toString() : "");
    });

    // register ballerina run handler
    commands.registerCommand(PALETTE_COMMANDS.RUN_CMD, async (...args: any[]) => {
        await run(args);
    });

    async function run(args: any[]) {
        try {
            sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_PROJECT_RUN, CMP_PROJECT_RUN);
            if (window.activeTextEditor && window.activeTextEditor.document.isDirty) {
                await commands.executeCommand(PALETTE_COMMANDS.SAVE_ALL);
            }

            let currentProject;
            if (window.activeTextEditor) {
                if (window.activeTextEditor.document.languageId != LANGUAGE.BALLERINA) {
                    window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                    return;
                }
                currentProject = await getCurrentBallerinaProject();
            } else {
                const document = ballerinaExtInstance.getDocumentContext().getLatestDocument();
                if (document) {
                    currentProject = await getCurrentBallerinaProject(document.fsPath);
                } else {
                    for (let editor of window.visibleTextEditors) {
                        if (editor.document.languageId === LANGUAGE.BALLERINA) {
                            currentProject = await getCurrentBallerinaProject(editor.document.uri.toString());
                            break;
                        }
                    }
                }
            }

            if (!currentProject) {
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }

            if (currentProject.kind !== PROJECT_TYPE.SINGLE_FILE) {
                const configPath: string = ballerinaExtInstance.getBallerinaConfigPath();
                ballerinaExtInstance.setBallerinaConfigPath('');
                runCommandWithConf(currentProject, ballerinaExtInstance.getBallerinaCmd(),
                    getRunCommand(),
                    configPath, currentProject.path!, ...args);
            } else {
                runCurrentFile();
            }

        } catch (error) {
            if (error instanceof Error) {
                sendTelemetryException(ballerinaExtInstance, error, CMP_PROJECT_RUN);
                window.showErrorMessage(error.message);
            } else {
                window.showErrorMessage("Unkown error occurred.");
            }
        }
    }
}

function runCurrentFile() {
    runCommand(getCurrenDirectoryPath(), ballerinaExtInstance.getBallerinaCmd(), 
        getRunCommand(),
        getCurrentBallerinaFile());
}

export { activateRunCmdCommand };
