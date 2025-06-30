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
import * as fs from 'fs';
import { workspace } from 'vscode';
import { Uri, Position } from 'vscode';
import { ArtifactData, EVENT_TYPE, LinePosition, MACHINE_VIEW, ProjectStructureArtifactResponse, STModification, SyntaxTree, TextEdit } from '@wso2/ballerina-core';
import path from 'path';
import { openView, StateMachine } from '../stateMachine';
import { ArtifactsUpdated, ArtifactNotificationHandler } from './project-artifacts-handler';
import { existsSync, writeFileSync } from 'fs';
import { notifyCurrentWebview } from '../RPCLayer';
import { applyBallerinaTomlEdit } from '../rpc-managers/bi-diagram/utils';

export interface UpdateSourceCodeRequest {
    textEdits: {
        [key: string]: TextEdit[];
    };
    resolveMissingDependencies?: boolean;
}

export async function updateSourceCode(updateSourceCodeRequest: UpdateSourceCodeRequest, artifactData?: ArtifactData): Promise<ProjectStructureArtifactResponse[]> {
    let tomlFilesUpdated = false;
    StateMachine.setEditMode();
    const modificationRequests: Record<string, { filePath: string; modifications: STModification[] }> = {};
    for (const [key, value] of Object.entries(updateSourceCodeRequest.textEdits)) {
        const fileUri = Uri.file(key);
        const fileUriString = fileUri.toString();
        if (!existsSync(fileUri.fsPath)) {
            writeFileSync(fileUri.fsPath, '');
            await new Promise(resolve => setTimeout(resolve, 500)); // Add small delay to ensure file is created
            await StateMachine.langClient().didOpen({
                textDocument: {
                    uri: fileUriString,
                    text: '',
                    languageId: 'ballerina',
                    version: 1
                }
            });
        }
        const edits = value;

        // Hack to handle .toml file edits. Planned to be removed once the updateSource method refactored to work on workspace edits
        if (fileUriString.endsWith(".toml")) {
            tomlFilesUpdated = true;
            for (const edit of edits) {
                await applyBallerinaTomlEdit(fileUri, edit);
            }
            continue;
        }

        if (edits && edits.length > 0) {
            const modificationList: STModification[] = [];

            for (const edit of edits) {
                const stModification: STModification = {
                    startLine: edit.range.start.line,
                    startColumn: edit.range.start.character,
                    endLine: edit.range.end.line,
                    endColumn: edit.range.end.character,
                    type: "INSERT",
                    isImport: false,
                    config: {
                        STATEMENT: edit.newText,
                    },
                };
                modificationList.push(stModification);
            }

            if (modificationRequests[fileUriString]) {
                modificationRequests[fileUriString].modifications.push(...modificationList);
            } else {
                modificationRequests[fileUriString] = { filePath: fileUri.fsPath, modifications: modificationList };
            }
        }
    }

    // Iterate through modificationRequests and apply modifications
    try {
        const workspaceEdit = new vscode.WorkspaceEdit();
        for (const [fileUriString, request] of Object.entries(modificationRequests)) {
            const { parseSuccess, source, syntaxTree } = (await StateMachine.langClient().stModify({
                documentIdentifier: { uri: fileUriString },
                astModifications: request.modifications,
            })) as SyntaxTree;

            if (parseSuccess) {
                const fileUri = Uri.file(request.filePath);
                workspaceEdit.replace(
                    fileUri,
                    new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
                    ),
                    source
                );
            }
        }

        // Apply all changes at once
        await workspace.applyEdit(workspaceEdit);

        // Handle missing dependencies after all changes are applied
        if (updateSourceCodeRequest.resolveMissingDependencies) {
            for (const [fileUriString] of Object.entries(modificationRequests)) {
                await StateMachine.langClient().resolveMissingDependencies({
                    documentIdentifier: { uri: fileUriString },
                });
            }
        }

        return new Promise((resolve, reject) => {
            if (tomlFilesUpdated) {
                StateMachine.setReadyMode();
                resolve([]);
                return;
            }
            // Get the artifact notification handler instance
            const notificationHandler = ArtifactNotificationHandler.getInstance();
            // Subscribe to artifact updated notifications
            let unsubscribe = notificationHandler.subscribe(ArtifactsUpdated.method, artifactData, async (payload) => {
                console.log("Received notification:", payload);
                clearTimeout(timeoutId);
                resolve(payload.data);
                StateMachine.setReadyMode();
                notifyCurrentWebview();
                unsubscribe();
            });

            // Set a timeout to reject if no notification is received within 10 seconds
            const timeoutId = setTimeout(() => {
                console.log("No artifact update notification received within 10 seconds");
                unsubscribe();
                StateMachine.setReadyMode();
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview });
                reject(new Error("Operation timed out. Please try again."));
            }, 10000);

            // Clear the timeout when notification is received
            const originalUnsubscribe = unsubscribe;
            unsubscribe = () => {
                clearTimeout(timeoutId);
                originalUnsubscribe();
            };
        });
    } catch (error) {
        StateMachine.setReadyMode();
        console.log(">>> error updating source", error);
    }
}

export async function injectImportIfMissing(importStatement: string, filePath: string) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    if (!fileContent.includes(importStatement)) {
        const workspaceEdit = new vscode.WorkspaceEdit();
        const position = new vscode.Position(0, 0); // Insert at the beginning of the file
        workspaceEdit.insert(vscode.Uri.file(filePath), position, importStatement + ';\n');
        await vscode.workspace.applyEdit(workspaceEdit);
    }
}

export async function injectAgent(name: string, projectUri: string) {
    const agentCode = `
final ai:OpenAiProvider _${name}Model = check new ("", ai:GPT_4O);
final ai:Agent _${name}Agent = check new (systemPrompt = {role: "", instructions: string \`\`},
    model = _${name}Model,
    tools = []
);`;
    // Update the service function code 
    const agentsFile = path.join(projectUri, `agents.bal`);
    const agentEdit = new vscode.WorkspaceEdit();

    // Read the file content to determine its length
    let fileContent = '';
    try {
        fileContent = fs.readFileSync(agentsFile, 'utf8');
    } catch (error) {
        // File doesn't exist, that's fine - we'll create it
    }

    // Insert at the end of the file
    agentEdit.insert(Uri.file(agentsFile), new Position(fileContent.split('\n').length, 0), agentCode);
    await workspace.applyEdit(agentEdit);
}


export async function injectAgentCode(name: string, serviceFile: string, injectionPosition: LinePosition) {
    // Update the service function code 
    const serviceEdit = new vscode.WorkspaceEdit();
    const serviceSourceCode = `
        string stringResult = check _${name}Agent->run(request.message, request.sessionId);
        return {message: stringResult};
`;
    serviceEdit.insert(Uri.file(serviceFile), new Position(injectionPosition.line, 0), serviceSourceCode);
    await workspace.applyEdit(serviceEdit);
}
