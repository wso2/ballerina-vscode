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
import { MESSAGES } from '../../features/project/cmds/cmd-runner';
import { VisualizerWebview } from '../visualizer/webview';
import { needsProjectDiscovery, promptPackageSelection, requiresPackageSelection } from '../../utils/command-utils';
import { getCurrentProjectRoot, tryGetCurrentBallerinaFile } from '../../utils/project-utils';
import { findBallerinaPackageRoot } from '../../utils';
import { findWorkspaceTypeFromWorkspaceFolders } from '../../rpc-managers/common/utils';

export function activateAiPanel(ballerinaExtInstance: BallerinaExtension) {
    ballerinaExtInstance.context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.OPEN_AI_PANEL, handleOpenAIPanel)
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

// --- AI Panel Command Helpers ---

async function handleOpenAIPanel(defaultPrompt?: AIPanelPrompt): Promise<void> {
    const { projectInfo, projectPath, view, workspacePath } = StateMachine.context();
    const isWebviewOpen = VisualizerWebview.currentPanel !== undefined;
    const hasActiveTextEditor = !!vscode.window.activeTextEditor;

    const currentBallerinaFile = tryGetCurrentBallerinaFile();
    const projectRoot = await findBallerinaPackageRoot(currentBallerinaFile);

    const needsPackageSelection = requiresPackageSelection(
        workspacePath, view, projectPath, isWebviewOpen, hasActiveTextEditor
    );

    if (needsPackageSelection) {
        const handled = await handleWorkspaceLevelAIPanel(projectInfo);
        if (handled) {
            return;
        }
    }

    if (needsProjectDiscovery(projectInfo, projectRoot, projectPath)) {
        const success = await handleProjectDiscoveryForAIPanel();
        if (!success) {
            return;
        }
    }

    openAIWebviewWithPrompt(defaultPrompt);
}

async function handleWorkspaceLevelAIPanel(projectInfo: any): Promise<boolean> {
    const availablePackages = projectInfo?.children.map((child: any) => child.projectPath) ?? [];

    if (availablePackages.length === 0) {
        openAIWebview(null);
        return true;
    }

    try {
        const selectedPackage = await promptPackageSelection(
            availablePackages,
            "Select a package to open AI panel"
        );

        if (!selectedPackage) {
            return true; // User cancelled
        }

        openPackageOverviewView(selectedPackage);
        return false; // Continue to open AI webview
    } catch (error) {
        console.error("Error selecting package:", error);
        return true;
    }
}

async function handleProjectDiscoveryForAIPanel(): Promise<boolean> {
    try {
        const success = await tryOpenPackageOverviewForDiscoveredProject();
        if (!success) {
            vscode.window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
            return false;
        }
        return true;
    } catch {
        vscode.window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
        return false;
    }
}

function openAIWebviewWithPrompt(defaultPrompt?: AIPanelPrompt): void {
    const prompt = defaultPrompt instanceof vscode.Uri ? null : defaultPrompt;
    openAIWebview(prompt);
}

function openPackageOverviewView(projectPath?: string, resetHistory = false): void {
    openView(
        EVENT_TYPE.OPEN_VIEW,
        { view: MACHINE_VIEW.PackageOverview, projectPath },
        resetHistory
    );
}

async function tryOpenPackageOverviewForDiscoveredProject(): Promise<boolean> {
    const workspaceType = await findWorkspaceTypeFromWorkspaceFolders();
    const packageRoot = await getCurrentProjectRoot();

    if (!packageRoot) {
        return false;
    }

    if (workspaceType.type === "MULTIPLE_PROJECTS") {
        const projectInfo = await StateMachine.langClient().getProjectInfo({ projectPath: packageRoot });
        await StateMachine.updateProjectRootAndInfo(packageRoot, projectInfo);
        openPackageOverviewView(packageRoot, true);
        return true;
    }

    if (workspaceType.type === "BALLERINA_WORKSPACE") {
        openPackageOverviewView(packageRoot, true);
        return true;
    }

    return false;
}

// --- End AI Panel Command Helpers ---
