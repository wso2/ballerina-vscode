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
    CommandsRequest,
    CommandsResponse,
    CommonRPCAPI,
    FileOrDirRequest,
    FileOrDirResponse,
    GoToSourceRequest,
    OpenExternalUrlRequest,
    RunExternalCommandRequest,
    RunExternalCommandResponse,
    ShowErrorMessageRequest,
    TypeResponse,
    WorkspaceFileRequest,
    WorkspaceRootResponse,
    WorkspacesFileResponse,
    executeCommand,
    experimentalEnabled,
    getBallerinaDiagnostics,
    getTypeCompletions,
    getWorkspaceFiles,
    getWorkspaceRoot,
    goToSource,
    isNPSupported,
    openExternalUrl,
    runBackgroundTerminalCommand,
    selectFileOrDirPath,
    showErrorMessage
} from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class CommonRpcClient implements CommonRPCAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    getTypeCompletions(): Promise<TypeResponse> {
        return this._messenger.sendRequest(getTypeCompletions, HOST_EXTENSION);
    }

    goToSource(params: GoToSourceRequest): void {
        return this._messenger.sendNotification(goToSource, HOST_EXTENSION, params);
    }

    getWorkspaceFiles(params: WorkspaceFileRequest): Promise<WorkspacesFileResponse> {
        return this._messenger.sendRequest(getWorkspaceFiles, HOST_EXTENSION, params);
    }

    getBallerinaDiagnostics(params: BallerinaDiagnosticsRequest): Promise<BallerinaDiagnosticsResponse> {
        return this._messenger.sendRequest(getBallerinaDiagnostics, HOST_EXTENSION, params);
    }

    executeCommand(params: CommandsRequest): Promise<CommandsResponse> {
        return this._messenger.sendRequest(executeCommand, HOST_EXTENSION, params);
    }

    runBackgroundTerminalCommand(params: RunExternalCommandRequest): Promise<RunExternalCommandResponse> {
        return this._messenger.sendRequest(runBackgroundTerminalCommand, HOST_EXTENSION, params);
    }

    openExternalUrl(params: OpenExternalUrlRequest): void {
        return this._messenger.sendNotification(openExternalUrl, HOST_EXTENSION, params);
    }

    selectFileOrDirPath(params: FileOrDirRequest): Promise<FileOrDirResponse> {
        return this._messenger.sendRequest(selectFileOrDirPath, HOST_EXTENSION, params);
    }

    experimentalEnabled(): Promise<boolean> {
        return this._messenger.sendRequest(experimentalEnabled, HOST_EXTENSION);
    }

    isNPSupported(): Promise<boolean> {
        return this._messenger.sendRequest(isNPSupported, HOST_EXTENSION);
    }

    getWorkspaceRoot(): Promise<WorkspaceRootResponse> {
        return this._messenger.sendRequest(getWorkspaceRoot, HOST_EXTENSION);
    }

    showErrorMessage(params: ShowErrorMessageRequest): void {
        return this._messenger.sendNotification(showErrorMessage, HOST_EXTENSION, params);
    }
}
