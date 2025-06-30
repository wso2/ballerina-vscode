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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    BallerinaDiagnosticsRequest,
    BallerinaDiagnosticsResponse,
    CommandResponse,
    CommandsRequest,
    CommandsResponse,
    CommonRPCAPI,
    Completion,
    CompletionParams,
    DiagnosticData,
    FileOrDirRequest,
    FileOrDirResponse,
    GoToSourceRequest,
    OpenExternalUrlRequest,
    RunExternalCommandRequest,
    RunExternalCommandResponse,
    ShowErrorMessageRequest,
    SyntaxTree,
    TypeResponse,
    WorkspaceFileRequest,
    WorkspaceRootResponse,
    WorkspacesFileResponse,
} from "@wso2/ballerina-core";
import child_process from 'child_process';
import { Uri, commands, env, window, workspace, MarkdownString } from "vscode";
import { URI } from "vscode-uri";
import { ballerinaExtInstance } from "../../core";
import { StateMachine } from "../../stateMachine";
import { goToSource } from "../../utils";
import { askFilePath, askProjectPath, BALLERINA_INTEGRATOR_ISSUES_URL, getUpdatedSource } from "./utils";
import path from 'path';

export class CommonRpcManager implements CommonRPCAPI {
    async getTypeCompletions(): Promise<TypeResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            const completionParams: CompletionParams = {
                textDocument: {
                    uri: Uri.file(context.documentUri!).toString()
                },
                context: {
                    triggerKind: 25,
                },
                position: {
                    character: 0,
                    line: 0
                }
            };

            const completions: Completion[] = await StateMachine.langClient().getCompletion(completionParams);
            const filteredCompletions: Completion[] = completions.filter(value => value.kind === 25 || value.kind === 23 || value.kind === 22);
            resolve({ data: filteredCompletions });
        });
    }

    async goToSource(params: GoToSourceRequest): Promise<void> {
        const context = StateMachine.context();
        let filePath = params?.filePath || context.documentUri!;
        if (params?.fileName && context?.projectUri) {
            filePath = path.join(context.projectUri, params.fileName);
        }
        goToSource(params.position, filePath);
    }

    async getWorkspaceFiles(params: WorkspaceFileRequest): Promise<WorkspacesFileResponse> {
        // Get the workspace files form vscode workspace
        const files = [];
        // Get workspace path
        const workspaceRoot = workspace.workspaceFolders![0].uri.fsPath;
        const workspaceFiles = params.glob ? await workspace.findFiles(params.glob) : await workspace.findFiles('**/*.bal', '**/*test.bal');
        workspaceFiles.forEach(file => {
            // Push the file path relative to the workspace root without the leading slash
            files.push({ relativePath: file.fsPath.replace(workspaceRoot, '').substring(1), path: file.fsPath });
        });
        return { files, workspaceRoot };
    }

    async getBallerinaDiagnostics(params: BallerinaDiagnosticsRequest): Promise<BallerinaDiagnosticsResponse> {
        return new Promise(async (resolve) => {
            // Get the current working document Uri
            const documentUri = URI.file(StateMachine.context().documentUri).toString();

            const fullST = await StateMachine.langClient().getSyntaxTree({
                documentIdentifier: { uri: documentUri }
            }) as SyntaxTree;

            const currentSource = fullST.syntaxTree.source;

            // Get the updated source when applied to the current source
            const updatedSource = getUpdatedSource(params.ballerinaSource, currentSource, params.targetPosition, params.skipSemiColon);
            if (updatedSource) {
                // Send the didChange event with new changes
                StateMachine.langClient().didChange({
                    contentChanges: [
                        {
                            text: updatedSource
                        }
                    ],
                    textDocument: {
                        uri: documentUri,
                        version: 1
                    }
                });

                // Get any diagnostics
                const diagResp = await StateMachine.langClient().getDiagnostics({
                    documentIdentifier: {
                        uri: documentUri,
                    }
                }) as DiagnosticData[];

                // Revert the changes back to the original
                StateMachine.langClient().didChange({
                    contentChanges: [
                        {
                            text: currentSource
                        }
                    ],
                    textDocument: {
                        uri: documentUri,
                        version: 1
                    }
                });

                const response = {
                    diagnostics: params.checkSeverity ?
                        diagResp[0]?.diagnostics.filter(diag => diag.severity === params.checkSeverity) || [] :
                        diagResp[0]?.diagnostics || []
                } as BallerinaDiagnosticsResponse;
                resolve(response);

            }
        });
    }

    async executeCommand(params: CommandsRequest): Promise<CommandsResponse> {
        return new Promise(async (resolve) => {
            if (params.commands.length >= 1) {
                const cmdArgs = params.commands.length > 1 ? params.commands.slice(1) : [];
                await commands.executeCommand(params.commands[0], ...cmdArgs);
                resolve({ data: "SUCCESS" });
            }
        });
    }

    async selectFileOrDirPath(params: FileOrDirRequest): Promise<FileOrDirResponse> {
        return new Promise(async (resolve) => {
            if (params.isFile) {
                const selectedFile = await askFilePath();
                if (!selectedFile || selectedFile.length === 0) {
                    window.showErrorMessage('A file must be selected');
                    resolve({ path: "" });
                } else {
                    const filePath = selectedFile[0].fsPath;
                    resolve({ path: filePath });
                }
            } else {
                const selectedDir = await askProjectPath();
                if (!selectedDir || selectedDir.length === 0) {
                    window.showErrorMessage('A folder must be selected');
                    resolve({ path: "" });
                } else {
                    const dirPath = selectedDir[0].fsPath;
                    resolve({ path: dirPath });
                }
            }
        });
    }

    async experimentalEnabled(): Promise<boolean> {
        return ballerinaExtInstance.enabledExperimentalFeatures();
    }

    async runBackgroundTerminalCommand(params: RunExternalCommandRequest): Promise<RunExternalCommandResponse> {
        return new Promise<CommandResponse>(function (resolve) {
            child_process.exec(`${params.command}`, async (err, stdout, stderr) => {
                console.log(">>> command stdout: ", stdout);
                if (err) {
                    resolve({
                        error: true,
                        message: stderr + "\n" + stdout
                    });
                } else {
                    resolve({
                        error: false,
                        message: stdout
                    });
                }
            });
        });
    }

    async openExternalUrl(params: OpenExternalUrlRequest): Promise<void> {
        env.openExternal(Uri.parse(params.url));
    }

    async getWorkspaceRoot(): Promise<WorkspaceRootResponse> {
        return new Promise(async (resolve) => {
            const workspaceFolders = workspace.workspaceFolders;
            resolve(workspaceFolders ? { path: workspaceFolders[0].uri.fsPath } : { path: "" });
        });
    }

    async showErrorMessage(params: ShowErrorMessageRequest): Promise<void> {
        const messageWithLink = new MarkdownString(params.message);
        messageWithLink.appendMarkdown(`\n\nPlease [create an issue](${BALLERINA_INTEGRATOR_ISSUES_URL}) if the issue persists.`);
        window.showErrorMessage(messageWithLink.value);
    }

    async isNPSupported(): Promise<boolean> {
        return ballerinaExtInstance.isNPSupported;
    }
}
