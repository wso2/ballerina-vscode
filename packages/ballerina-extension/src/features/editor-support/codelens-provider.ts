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

import { BallerinaExtension, ExtendedLangClient, LANGUAGE } from '../../core';
import {
    CancellationToken, CodeLens, CodeLensProvider, commands, debug, DebugConfiguration, Event, EventEmitter,
    ExtensionContext,
    ProviderResult, Range, TextDocument, Uri, window, workspace, WorkspaceFolder
} from 'vscode';
import { BAL_TOML, clearTerminal, PALETTE_COMMANDS } from '../project';
import {
    CMP_EXECUTOR_CODELENS, sendTelemetryEvent, TM_EVENT_SOURCE_DEBUG_CODELENS, TM_EVENT_TEST_DEBUG_CODELENS
} from '../telemetry';
import { constructDebugConfig } from '../debugger';
import { ExecutorPosition, ExecutorPositionsResponse, SyntaxTree } from '@wso2/ballerina-core';
import { traversNode } from '@wso2/syntax-tree';
import { CodeLensProviderVisitor } from './codelense-provider-visitor';

export enum EXEC_POSITION_TYPE {
    SOURCE = 'source',
    TEST = 'test'
}

enum EXEC_TYPE {
    RUN = 'Run',
    DEBUG = 'Debug'
}

enum EXEC_ARG {
    TESTS = '--tests'
}

export const INTERNAL_DEBUG_COMMAND = "ballerina.internal.debug";

const SOURCE_DEBUG_COMMAND = "ballerina.source.debug";
const TEST_DEBUG_COMMAND = "ballerina.test.debug";
const FOCUS_DEBUG_CONSOLE_COMMAND = 'workbench.debug.action.focusRepl';

export class ExecutorCodeLensProvider implements CodeLensProvider {

    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;
    private activeTextEditorUri: Uri | undefined;

    private ballerinaExtension: BallerinaExtension;

    constructor(extensionInstance: BallerinaExtension) {
        this.ballerinaExtension = extensionInstance;

        workspace.onDidOpenTextDocument((document) => {
            if (document.languageId === LANGUAGE.BALLERINA || document.fileName.endsWith(BAL_TOML)) {
                this._onDidChangeCodeLenses.fire();
            }
        });

        workspace.onDidChangeTextDocument((activatedTextEditor) => {
            if (activatedTextEditor && activatedTextEditor.document.languageId === LANGUAGE.BALLERINA ||
                activatedTextEditor.document.fileName.endsWith(BAL_TOML)) {
                this._onDidChangeCodeLenses.fire();
            }
        });

        commands.registerCommand(INTERNAL_DEBUG_COMMAND, async () => {
            sendTelemetryEvent(this.ballerinaExtension, TM_EVENT_SOURCE_DEBUG_CODELENS, CMP_EXECUTOR_CODELENS);
            clearTerminal();
            commands.executeCommand(FOCUS_DEBUG_CONSOLE_COMMAND);
            startDebugging(this.activeTextEditorUri!, false);
        });

        commands.registerCommand(SOURCE_DEBUG_COMMAND, async () => {
            this.activeTextEditorUri = window.activeTextEditor!.document.uri;
            commands.executeCommand(INTERNAL_DEBUG_COMMAND);
            return;
        });

        commands.registerCommand(TEST_DEBUG_COMMAND, async () => {
            sendTelemetryEvent(this.ballerinaExtension, TM_EVENT_TEST_DEBUG_CODELENS, CMP_EXECUTOR_CODELENS);
            clearTerminal();
            commands.executeCommand(FOCUS_DEBUG_CONSOLE_COMMAND);
            startDebugging(window.activeTextEditor!.document.uri, true);
        });
    }

    provideCodeLenses(_document: TextDocument, _token: CancellationToken): ProviderResult<any[]> {
        if (this.ballerinaExtension.langClient && window.activeTextEditor) {
            return this.getCodeLensList();
        }
        return [];
    }

    private async getCodeLensList(): Promise<CodeLens[]> {
        let codeLenses: CodeLens[] = [];
        let langClient: ExtendedLangClient | undefined = this.ballerinaExtension.langClient;

        if (!langClient) {
            return codeLenses;
        }

        const activeEditorUri = window.activeTextEditor!.document.uri;
        const fileUri = activeEditorUri.toString();

        try {
            const response = await langClient!.getExecutorPositions({
                documentIdentifier: {
                    uri: fileUri
                }
            }) as ExecutorPositionsResponse;
            if (response.executorPositions) {
                response.executorPositions.forEach(position => {
                    if (position.kind === EXEC_POSITION_TYPE.SOURCE) {
                        codeLenses.push(this.createCodeLens(position, EXEC_TYPE.RUN));
                        codeLenses.push(this.createCodeLens(position, EXEC_TYPE.DEBUG));
                    }
                });
            }
        } catch (error) {
        }

        // Open in diagram code lenses
        try {
            const syntaxTreeResponse = await langClient!.getSyntaxTree({
                documentIdentifier: {
                    uri: fileUri
                }
            });
            const response = syntaxTreeResponse as SyntaxTree;
            if (response.parseSuccess && response.syntaxTree) {
                const syntaxTree = response.syntaxTree;

                const visitor = new CodeLensProviderVisitor(activeEditorUri);
                traversNode(syntaxTree, visitor, undefined);
                codeLenses.push(...visitor.getCodeLenses());
            }
        } catch (error) {
        }

        return codeLenses;
    }

    private createCodeLens(execPosition: ExecutorPosition, execType: EXEC_TYPE): CodeLens {
        const startLine = execPosition.range.startLine.line;
        const startColumn = execPosition.range.startLine.offset;
        const endLine = execPosition.range.endLine.line;
        const endColumn = execPosition.range.endLine.offset;
        const codeLens = new CodeLens(new Range(startLine, startColumn, endLine, endColumn));
        codeLens.command = {
            title: execType.toString(),
            tooltip: `${execType.toString()} ${execPosition.name}`,
            command: execPosition.kind === EXEC_POSITION_TYPE.SOURCE ? (execType === EXEC_TYPE.RUN ?
                PALETTE_COMMANDS.RUN : SOURCE_DEBUG_COMMAND) : (execType === EXEC_TYPE.RUN ? PALETTE_COMMANDS.TEST :
                    TEST_DEBUG_COMMAND),
            arguments: execPosition.kind === EXEC_POSITION_TYPE.SOURCE ? [] : (execType === EXEC_TYPE.RUN ?
                [EXEC_ARG.TESTS, execPosition.name] : [execPosition.name])
        };
        return codeLens;
    }
}

export async function startDebugging(uri: Uri, testDebug: boolean = false, suggestTryit: boolean = false, noDebugMode: boolean = false): Promise<boolean> {
    const workspaceFolder: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(uri);
    const debugConfig: DebugConfiguration = await constructDebugConfig(uri, testDebug);
    debugConfig.suggestTryit = suggestTryit;
    debugConfig.noDebug = noDebugMode;

    return debug.startDebugging(workspaceFolder, debugConfig);
}
