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

import { isSupportedVersion, VERSION } from "../../utils";
import { commands, debug, DebugConfiguration, ProgressLocation, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { BallerinaExtension } from "../../core";
import { ReadOnlyContentProvider } from "./readonly-content-provider";
import * as gitStatus from "./git-status";
import { INTERNAL_DEBUG_COMMAND, clearTerminal, FOCUS_DEBUG_CONSOLE_COMMAND, SOURCE_DEBUG_COMMAND, TEST_DEBUG_COMMAND } from "../project";
import { sendTelemetryEvent, TM_EVENT_SOURCE_DEBUG_CODELENS, CMP_EXECUTOR_CODELENS, TM_EVENT_TEST_DEBUG_CODELENS } from "../telemetry";
import { constructDebugConfig } from "../debugger";
import { StringSplitFeature, StringSplitter } from "./split-provider";
import { PlatformExtRpcManager } from "../../rpc-managers/platform-ext/rpc-manager";

export function activate(ballerinaExtInstance: BallerinaExtension) {
    if (!ballerinaExtInstance.context || !ballerinaExtInstance.langClient) {
        return;
    }

    if (isSupportedVersion(ballerinaExtInstance, VERSION.ALPHA, 5)) {
        ballerinaExtInstance.context!.subscriptions.push(new StringSplitFeature(new StringSplitter(),
            ballerinaExtInstance));
    }

    // Create new content provider for ballerina library files
    const blProvider = new ReadOnlyContentProvider();
    ballerinaExtInstance.context.subscriptions.push(workspace.registerTextDocumentContentProvider('bala', blProvider));

    gitStatus.activate(ballerinaExtInstance);

    if (!ballerinaExtInstance.isAllCodeLensEnabled()) {
        return;
    }
    if (ballerinaExtInstance.isAllCodeLensEnabled() && isSupportedVersion(ballerinaExtInstance, VERSION.BETA, 1)) {
        // TODO: Remove this once LS changes are merged
        // languages.registerCodeLensProvider([{ language: LANGUAGE.BALLERINA, scheme: 'file' }],
        //     new ExecutorCodeLensProvider(ballerinaExtInstance));

        commands.registerCommand(INTERNAL_DEBUG_COMMAND, async () => {
            sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_SOURCE_DEBUG_CODELENS, CMP_EXECUTOR_CODELENS);
            clearTerminal();
            commands.executeCommand(FOCUS_DEBUG_CONSOLE_COMMAND);
            startDebugging(window.activeTextEditor!.document.uri, false);
        });

        commands.registerCommand(SOURCE_DEBUG_COMMAND, async () => {
            commands.executeCommand(INTERNAL_DEBUG_COMMAND);
            return;
        });

        commands.registerCommand(TEST_DEBUG_COMMAND, async () => {
            sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_TEST_DEBUG_CODELENS, CMP_EXECUTOR_CODELENS);
            clearTerminal();
            commands.executeCommand(FOCUS_DEBUG_CONSOLE_COMMAND);
            startDebugging(window.activeTextEditor!.document.uri, true);
        });
    }
}


export async function startDebugging(uri: Uri, testDebug: boolean = false, suggestTryit: boolean = false, noDebugMode: boolean = false): Promise<boolean> {
    const workspaceFolder: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(uri);
    const debugConfig: DebugConfiguration = await constructDebugConfig(uri, testDebug);
    debugConfig.suggestTryit = suggestTryit;
    debugConfig.noDebug = noDebugMode;

    const devantProxyResp = await window.withProgress({ // 64160
        location: ProgressLocation.Notification,
        title: 'Connecting to Devant...',
    }, async () => new PlatformExtRpcManager().startProxyServer());

    if(devantProxyResp.proxyServerPort){
        debugConfig.env = {  ...(debugConfig.env || {}), ...devantProxyResp.envVars };
        if(devantProxyResp.requiresProxy){
            debugConfig.env.BAL_CONFIG_VAR_DEVANTPROXYHOST="127.0.0.1",
            debugConfig.env.BAL_CONFIG_VAR_DEVANTPROXYPORT=`${devantProxyResp.proxyServerPort}`;
        }else{
            delete debugConfig.env.BAL_CONFIG_VAR_DEVANTPROXYHOST;
            delete debugConfig.env.BAL_CONFIG_VAR_DEVANTPROXYPORT;
        }
    }
    
    if(devantProxyResp.proxyServerPort){
        const disposable = debug.onDidTerminateDebugSession((session) => {
            if (session.configuration === debugConfig) {
                new PlatformExtRpcManager().stopProxyServer({proxyPort: devantProxyResp.proxyServerPort});
                disposable.dispose();
            }
        });
    }

    return debug.startDebugging(workspaceFolder, debugConfig);
}
