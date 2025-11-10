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

import { TextEditor, Uri, window } from "vscode";
import { basename, dirname } from "path";
import { BallerinaExtension, ExtendedLangClient } from "../../core";
import { checkIsBallerinaPackage } from "../../utils";

export function activate(ballerinaExtInstance: BallerinaExtension) {
    const langClient = <ExtendedLangClient>ballerinaExtInstance.langClient;
    // const designDiagramRenderer = commands.registerCommand(PALETTE_COMMANDS.SHOW_ENTITY_DIAGRAM, (selectedRecord = "") => {
    //     if (isCompatible(ballerinaExtInstance.ballerinaVersion)) {
    //         filePath = window.activeTextEditor?.document?.uri.fsPath;
    //         if (filePath) {
    //             showERDiagram(langClient, selectedRecord);
    //         } else {
    //             // Todo: Update error message
    //             window.showErrorMessage("Error: Could not detect persist model.");
    //         }
    //     } else {
    //         window.showErrorMessage(COMPATIBILITY_MESSAGE);
    //     }
    // });
    // ballerinaExtInstance.context.subscriptions.push(designDiagramRenderer);

    if (window.activeTextEditor) {
        ballerinaExtInstance.setPersistStatusContext(window.activeTextEditor);
    }

    window.onDidChangeActiveTextEditor((textEditor: TextEditor) => {
        ballerinaExtInstance.setPersistStatusContext(textEditor);
    });
}

// function showERDiagram(langClient: ExtendedLangClient, selectedRecord: string) {
//     if (!diagramWebview) {
//         setupWebviewPanel(langClient);
//     }

//     if (diagramWebview) {
//         const html = render(diagramWebview.webview, selectedRecord);
//         if (html) {
//             diagramWebview.webview.html = html;
//             return;
//         }
//     }
//     window.showErrorMessage("Error: Failed to generate the ER diagram.");
// }

// function setupWebviewPanel(langClient: ExtendedLangClient) {
//     diagramWebview = window.createWebviewPanel(
//         "persistERDiagram",
//         "Entity Relationship Diagram",
//         { viewColumn: ViewColumn.Beside, preserveFocus: false },
//         getCommonWebViewOptions()
//     );

//     const refreshDiagram = debounce(() => {
//         if (diagramWebview) {
//             diagramWebview.webview.postMessage({ command: "refresh" });
//         }
//     }, 500);

//     workspace.onDidChangeTextDocument((event) => {
//         if (event.document.uri.fsPath === filePath) {
//            refreshDiagram();
//         }
//     });

//     const remoteMethods:  = [
//         {
//             methodName: "getPersistERModel",
//             handler: (): Promise<GetPersistERModelResponse> => {
//                 return langClient.getPersistERModel({
//                     documentUri: filePath
//                 });
//             }
//         },
//         {
//             methodName: "showProblemPanel",
//             handler: async () => {
//                 return await commands.executeCommand('workbench.action.problems.focus');
//             }
//         }
//     ];

//     WebViewRPCHandler.create(diagramWebview, langClient, remoteMethods);

//     diagramWebview.onDidDispose(() => {
//         diagramWebview = undefined;
//     });
// }

// function isCompatible(ballerinaVersion: string) {
//     return parseFloat(ballerinaVersion) >= 2201.6;
// }

export async function checkIsPersistModelFile(fileUri: Uri): Promise<boolean> {
    const directoryPath = dirname(fileUri.fsPath);
    const parentDirectoryPath = dirname(directoryPath);
    const directoryName = basename(directoryPath);
    const isBallerinaPackage = await checkIsBallerinaPackage(Uri.parse(parentDirectoryPath));
    return directoryName === 'persist' && isBallerinaPackage;
}
