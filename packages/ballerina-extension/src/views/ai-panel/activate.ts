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
import { AIPanelPrompt, SHARED_COMMANDS } from '@wso2/ballerina-core';
import { closeAIWebview, openAIWebview } from './aiMachine';
import { BallerinaExtension } from '../../core';
import { notifyAiWebview } from '../../RPCLayer';

export function activateAiPanel(ballerinaExtInstance: BallerinaExtension) {
    ballerinaExtInstance.context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.OPEN_AI_PANEL, (defaultPrompt?: AIPanelPrompt) => {
            if (defaultPrompt instanceof vscode.Uri) {
                // Passed directly from vscode side
                openAIWebview(null);
            } else {
                openAIWebview(defaultPrompt);
            }
        })
    );
    ballerinaExtInstance.context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.CLOSE_AI_PANEL, () => {
            closeAIWebview();
        })
    );
    ballerinaExtInstance.context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme((event) => {
            notifyAiWebview();
        })
    );
    console.log("AI Panel Activated");
}
