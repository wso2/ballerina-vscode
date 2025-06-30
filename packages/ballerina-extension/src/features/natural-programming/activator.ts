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

import vscode from 'vscode';
import { ENABLE_BACKGROUND_DRIFT_CHECK } from "../../core/preferences";
import { debounce } from 'lodash';
import { StateMachine } from "../../stateMachine";
import { addConfigFile, getConfigFilePath, getLLMDiagnostics} from "./utils";
import { NLCodeActionProvider, showTextOptions } from './nl-code-action-provider';
import { BallerinaExtension } from 'src/core';
import { PROGRESS_BAR_MESSAGE_FOR_DRIFT, WARNING_MESSAGE, WARNING_MESSAGE_DEFAULT, 
    MONITERED_EXTENSIONS
 } from './constants';
 import { isSupportedSLVersion } from "../../utils";

let diagnosticCollection: vscode.DiagnosticCollection;
const BALLERINA_UPDATE_13 = 2201130;

export function activate(ballerinaExtInstance: BallerinaExtension) {
    const backgroundDriftCheckConfig = vscode.workspace.getConfiguration().get<boolean>(ENABLE_BACKGROUND_DRIFT_CHECK);

    // Create diagnostic collection and register it
    diagnosticCollection = vscode.languages.createDiagnosticCollection('ballerina');
    ballerinaExtInstance.context.subscriptions.push(diagnosticCollection);

    const projectPath = StateMachine.context().projectUri;
    if (backgroundDriftCheckConfig) {
        if (!ballerinaExtInstance.context || projectPath == null || projectPath == "") {
            return;
        }

        const debouncedGetLLMDiagnostics = debounce(async () => {
            const result: number | null = await getLLMDiagnostics(projectPath, diagnosticCollection);
            if (result == null) {
                return;
            }
        
            if (result > 400 && result < 500) {
                vscode.window.showWarningMessage(WARNING_MESSAGE);
                return;
            }
            vscode.window.showWarningMessage(WARNING_MESSAGE_DEFAULT);
        }, 600000);
        
        vscode.workspace.onDidChangeTextDocument(async event => {
            const filePath = event.document.uri.fsPath; // Get the file path
            const fileExtension = filePath.substring(filePath.lastIndexOf('.')); // Extract the file extension
        
            // Check if the file extension is in the monitoredExtensions array
            if (MONITERED_EXTENSIONS.includes(fileExtension)) {
                debouncedGetLLMDiagnostics();
            }
        }, null, ballerinaExtInstance.context.subscriptions);
        
        vscode.workspace.onDidDeleteFiles(async event => {
            let isMoniteredFileGotDeleted = false;
            event.files.forEach(file => {
                const filePath = file.fsPath; // Get the file path
                const fileExtension = filePath.substring(filePath.lastIndexOf('.')); // Extract the file extension
        
                // Check if the file extension is in the monitoredExtensions array
                if (MONITERED_EXTENSIONS.includes(fileExtension)) {
                    isMoniteredFileGotDeleted = true;
                }
            });

            if (isMoniteredFileGotDeleted) {
                debouncedGetLLMDiagnostics();
            }
        }, null, ballerinaExtInstance.context.subscriptions);
    }

    // Register Code Action Provider after diagnostics setup
    ballerinaExtInstance.context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider('ballerina', new NLCodeActionProvider(), {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
        })
    );

    ballerinaExtInstance.context.subscriptions.push(showTextOptions);

    vscode.commands.registerCommand("ballerina.verifyDocs", async (...args: any[]) => {    
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: PROGRESS_BAR_MESSAGE_FOR_DRIFT,
                cancellable: false,
            },
            async () => {
                const result: number|null = await getLLMDiagnostics(projectPath, diagnosticCollection);
                if (result == null) {
                    return;
                }

                if (result > 400 && result < 500) {
                    vscode.window.showWarningMessage(WARNING_MESSAGE);
                    return;
                }
                vscode.window.showWarningMessage(WARNING_MESSAGE_DEFAULT);
            }
        );
    });

    vscode.commands.registerCommand("ballerina.configureDefaultModelForNaturalFunctions", async (...args: any[]) => {
        const configPath = await getConfigFilePath(ballerinaExtInstance, projectPath);
        if (configPath != null) {
            const isNaturalFunctionsAvailableInBallerinaOrg = 
                        isSupportedSLVersion(ballerinaExtInstance, BALLERINA_UPDATE_13);
            addConfigFile(configPath, isNaturalFunctionsAvailableInBallerinaOrg);
        }
    });
}
