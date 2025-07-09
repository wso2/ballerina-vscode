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

import { commands, languages, Uri, window, workspace } from "vscode";
import { BALLERINA_COMMANDS, getRunCommand, PALETTE_COMMANDS, runCommand } from "./cmd-runner";
import { ballerinaExtInstance } from "../../../core";
import { getConfigCompletions } from "../../config-generator/utils";
import { BiDiagramRpcManager } from "../../../rpc-managers/bi-diagram/rpc-manager";

function activateConfigRunCommand() {
    // register the config view run command
    commands.registerCommand(PALETTE_COMMANDS.RUN_CONFIG, async (filePath: Uri) => {
        const currentProject = ballerinaExtInstance.getDocumentContext().getCurrentProject();
        if (currentProject) {
            runCommand(currentProject, ballerinaExtInstance.getBallerinaCmd(),
            getRunCommand(),
            currentProject.path!);
            return;
        }
    });

    commands.registerCommand(PALETTE_COMMANDS.CONFIG_CREATE_COMMAND, async () => {
        try {
            // Open current config.toml or create a new config.toml if it does not exist
            let projectPath: string;
            if (window.activeTextEditor) {
                projectPath = window.activeTextEditor.document.uri.fsPath;
            } else if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
                projectPath = workspace.workspaceFolders[0].uri.fsPath;
            }

            const biDiagramRpcManager = new BiDiagramRpcManager();
            await biDiagramRpcManager.openConfigToml({ filePath: projectPath });
            return;
        } catch (error) {
            throw new Error("Unable to create Config.toml file. Try again with a valid Ballerina file open in the editor.");
        }
    });

    languages.registerCompletionItemProvider({ language: 'toml' }, {
        async provideCompletionItems(document, position, token, context) {
            const currentProject = ballerinaExtInstance.getDocumentContext().getCurrentProject();
            const filePath = window.activeTextEditor.document;
            const path = filePath.uri.fsPath;
            const suggestions = await getConfigCompletions(ballerinaExtInstance, currentProject ? currentProject.path! : path, document, position);
            return suggestions;
        }
    });
}

export { activateConfigRunCommand };
