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
import { AIPanelPrompt, EVENT_TYPE, MACHINE_VIEW, SHARED_COMMANDS } from '@wso2/ballerina-core';
import { closeAIWebview, openAIWebview } from './aiMachine';
import { BallerinaExtension } from '../../core';
import { notifyAiWebview } from '../../RPCLayer';
import { openView, StateMachine } from '../../stateMachine';
import { VisualizerWebview } from '../visualizer/webview';

export function activateAiPanel(ballerinaExtInstance: BallerinaExtension) {
    ballerinaExtInstance.context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.OPEN_AI_PANEL, async (defaultPrompt?: AIPanelPrompt) => {
            const context = StateMachine.context();
            const { workspacePath, view, projectPath, projectInfo } = context;
            const isWebviewOpen = VisualizerWebview.currentPanel !== undefined;

            // Determine if package selection is required
            const requiresPackageSelection = 
                workspacePath && 
                (view === MACHINE_VIEW.WorkspaceOverview || !projectPath || !isWebviewOpen);

            if (requiresPackageSelection) {
                const availablePackages = projectInfo?.children.map((child) => child.projectPath) ?? [];
                
                // No packages available, open webview with no context
                if (availablePackages.length === 0) {
                    openAIWebview(null);
                    return;
                }

                try {
                    const selectedPackage = await vscode.window.showQuickPick(availablePackages, {
                        placeHolder: "Select a package to open AI panel",
                        ignoreFocusOut: false
                    });

                    // User cancelled selection
                    if (!selectedPackage) {
                        return;
                    }

                    openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.PackageOverview, projectPath: selectedPackage });
                } catch (error) {
                    console.error("Error selecting package:", error);
                    return;
                }
            }

            // Open webview with appropriate prompt
            const prompt = defaultPrompt instanceof vscode.Uri ? null : defaultPrompt;
            openAIWebview(prompt);
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
