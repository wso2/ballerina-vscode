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

import * as vscode from 'vscode';
import { CustomDiagnostic } from './custom-diagnostics';
import {DRIFT_DIAGNOSTIC_ID, COMMAND_SHOW_TEXT} from "./constants";
import { result } from 'lodash';

const UPDATE_CODE_ACTION_CONTENT = "Update code to match docs";
const UPDATE_DOC_ACTION_CONTENT = "Update docs to match code";

export class NLCodeActionProvider implements vscode.CodeActionProvider {
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic instanceof CustomDiagnostic) {
                const customDiagnostic = diagnostic as CustomDiagnostic;

                if (customDiagnostic.data.id == DRIFT_DIAGNOSTIC_ID){
                    const implementationChangeSolution = customDiagnostic.data.implementationChangeSolution;
                    const docChangeSolution = customDiagnostic.data.docChangeSolution;

                    if (implementationChangeSolution != null && implementationChangeSolution != undefined && implementationChangeSolution != "") {
                        const replaceAction = new vscode.CodeAction(UPDATE_CODE_ACTION_CONTENT, vscode.CodeActionKind.QuickFix);
                        replaceAction.command = {
                            command: COMMAND_SHOW_TEXT,
                            title: UPDATE_CODE_ACTION_CONTENT,
                            arguments: [document, customDiagnostic, customDiagnostic.data.implementationChangeSolution, diagnostic.range]
                        };
                        actions.push(replaceAction);
                    }

                    if (docChangeSolution != null && docChangeSolution != undefined && docChangeSolution != "") {
                        const replaceAction = new vscode.CodeAction(UPDATE_DOC_ACTION_CONTENT, vscode.CodeActionKind.QuickFix);
                        const docRange: vscode.Range = diagnostic.data.docRange;
                        if (docRange != null) {
                            replaceAction.command = {
                                command: COMMAND_SHOW_TEXT,
                                title: UPDATE_DOC_ACTION_CONTENT,
                                arguments: [document, customDiagnostic, customDiagnostic.data.docChangeSolution, docRange]
                            };
                            actions.push(replaceAction);
                        }
                    }
                }
            }
        }

        return actions;
    }
}

export const showTextOptions = vscode.commands.registerCommand(COMMAND_SHOW_TEXT, async (document: vscode.TextDocument, 
                                    diagnostic: CustomDiagnostic, newText: string, range: vscode.Range) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
    }

    const textToReplace = document.getText(range);

    // Create a Git conflict-like view with "|||||||", "HEAD" and "======="
    const conflictText = `<<<<<<< HEAD\n${textToReplace}\n=======\n${newText}\n>>>>>>>\n`;

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, conflictText);
    await vscode.workspace.applyEdit(edit);
    vscode.window.showInformationMessage('Changes added');
});
