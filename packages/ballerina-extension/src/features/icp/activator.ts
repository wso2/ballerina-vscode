/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { BallerinaExtension } from '../../core';
import { resolveICPPath } from './detect';

const ICP_START_COMMAND = 'ballerina.icp.start';
const ICP_STOP_COMMAND = 'ballerina.icp.stop';
const ICP_TASK_NAME = 'ICP Server';
const ICP_TASK_SOURCE = 'ballerina-icp';

function getICPUrl(): string {
    return vscode.workspace.getConfiguration('ballerina').get<string>('icpUrl') || 'https://localhost:9445';
}

function getICPCredentials(): { username: string; password: string } {
    const config = vscode.workspace.getConfiguration('ballerina');
    return {
        username: config.get<string>('icpUsername') || 'admin',
        password: config.get<string>('icpPassword') || 'admin',
    };
}

let icpTaskExecution: vscode.TaskExecution | undefined;
let isRunning = false;
let statusBarItem: vscode.StatusBarItem;

/**
 * Returns whether the ICP server is currently running.
 */
export function isICPServerRunning(): boolean {
    return isRunning;
}

/**
 * Prompts the user to start the ICP server if it's not running.
 * Returns true if the server is running (or was just started), false if the user declined.
 */
export async function ensureICPServerRunning(): Promise<boolean> {
    if (isRunning) {
        return true;
    }

    const action = await vscode.window.showWarningMessage(
        'ICP is enabled for this project but the ICP server is not running.',
        'Start ICP Server',
        'Run Anyway'
    );

    if (action === 'Start ICP Server') {
        await vscode.commands.executeCommand(ICP_START_COMMAND);
        if (isRunning) {
            const icpUrl = getICPUrl();
            const { username, password } = getICPCredentials();
            const credentialsHint = (username === 'admin' && password === 'admin')
                ? ' (default credentials: admin/admin)'
                : '';
            vscode.window.showInformationMessage(
                `ICP server started. Access it at ${icpUrl}${credentialsHint}`,
                'Open in Browser'
            ).then((selection) => {
                if (selection === 'Open in Browser') {
                    vscode.env.openExternal(vscode.Uri.parse(icpUrl));
                }
            });
        }
        return isRunning;
    }

    return action === 'Run Anyway';
}

function updateStatusBar(): void {
    if (isRunning) {
        statusBarItem.text = '$(server-process) ICP: Running';
        statusBarItem.tooltip = 'Integration Control Plane is running. Click to stop.';
        statusBarItem.command = ICP_STOP_COMMAND;
    } else {
        statusBarItem.text = '$(server-environment) ICP: Stopped';
        statusBarItem.tooltip = 'Integration Control Plane is stopped. Click to start.';
        statusBarItem.command = ICP_START_COMMAND;
    }
}

function setICPState(running: boolean): void {
    isRunning = running;
    vscode.commands.executeCommand('setContext', 'ballerina.icpRunning', running);
    updateStatusBar();
}

function createICPTask(icpPath: string): vscode.Task {
    const taskDefinition: vscode.TaskDefinition = {
        type: 'shell',
        task: 'start-icp-server',
    };

    const shellExecution = new vscode.ShellExecution(
        { value: icpPath, quoting: vscode.ShellQuoting.Strong },
        []
    );

    const task = new vscode.Task(
        taskDefinition,
        vscode.TaskScope.Workspace,
        ICP_TASK_NAME,
        ICP_TASK_SOURCE,
        shellExecution
    );

    task.isBackground = true;
    task.presentationOptions = {
        reveal: vscode.TaskRevealKind.Always,
        panel: vscode.TaskPanelKind.Dedicated,
        clear: true,
    };

    return task;
}

export function activateICP(ballerinaExtInstance: BallerinaExtension) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    setICPState(false);
    statusBarItem.show();

    const startCommand = vscode.commands.registerCommand(ICP_START_COMMAND, async () => {
        if (isRunning) {
            vscode.window.showWarningMessage('ICP server is already running.');
            return;
        }

        const icpPath = await resolveICPPath();
        if (!icpPath) {
            return;
        }

        const task = createICPTask(icpPath);
        icpTaskExecution = await vscode.tasks.executeTask(task);
        setICPState(true);
    });

    const stopCommand = vscode.commands.registerCommand(ICP_STOP_COMMAND, () => {
        if (!isRunning || !icpTaskExecution) {
            vscode.window.showWarningMessage('ICP server is not running.');
            return;
        }

        icpTaskExecution.terminate();
        icpTaskExecution = undefined;
        setICPState(false);
    });

    const taskEndListener = vscode.tasks.onDidEndTask((e) => {
        if (e.execution === icpTaskExecution) {
            icpTaskExecution = undefined;
            setICPState(false);
        }
    });

    ballerinaExtInstance.context.subscriptions.push(
        statusBarItem,
        startCommand,
        stopCommand,
        taskEndListener
    );
}
