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
    CommandsRequest,
    FileOrDirRequest,
    GoToSourceRequest,
    OpenExternalUrlRequest,
    RunExternalCommandRequest,
    ShowErrorMessageRequest,
    WorkspaceFileRequest,
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
import { Messenger } from "vscode-messenger";
import { CommonRpcManager } from "./rpc-manager";

export function registerCommonRpcHandlers(messenger: Messenger) {
    const rpcManger = new CommonRpcManager();
    messenger.onRequest(getTypeCompletions, () => rpcManger.getTypeCompletions());
    messenger.onNotification(goToSource, (args: GoToSourceRequest) => rpcManger.goToSource(args));
    messenger.onRequest(getWorkspaceFiles, (args: WorkspaceFileRequest) => rpcManger.getWorkspaceFiles(args));
    messenger.onRequest(getBallerinaDiagnostics, (args: BallerinaDiagnosticsRequest) => rpcManger.getBallerinaDiagnostics(args));
    messenger.onRequest(executeCommand, (args: CommandsRequest) => rpcManger.executeCommand(args));
    messenger.onRequest(runBackgroundTerminalCommand, (args: RunExternalCommandRequest) => rpcManger.runBackgroundTerminalCommand(args));
    messenger.onNotification(openExternalUrl, (args: OpenExternalUrlRequest) => rpcManger.openExternalUrl(args));
    messenger.onRequest(selectFileOrDirPath, (args: FileOrDirRequest) => rpcManger.selectFileOrDirPath(args));
    messenger.onRequest(experimentalEnabled, () => rpcManger.experimentalEnabled());
    messenger.onRequest(isNPSupported, () => rpcManger.isNPSupported());
    messenger.onRequest(getWorkspaceRoot, () => rpcManger.getWorkspaceRoot());
    messenger.onNotification(showErrorMessage, (args: ShowErrorMessageRequest) => rpcManger.showErrorMessage(args));
}
