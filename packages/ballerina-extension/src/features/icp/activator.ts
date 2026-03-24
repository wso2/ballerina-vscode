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
const ICP_TERMINAL_NAME = 'ICP Server';

let icpTerminal: vscode.Terminal | undefined;
let isRunning = false;
let statusBarItem: vscode.StatusBarItem;

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

        icpTerminal = vscode.window.createTerminal({ name: ICP_TERMINAL_NAME });
        icpTerminal.show(true);
        icpTerminal.sendText(icpPath, true);
        setICPState(true);
    });

    const stopCommand = vscode.commands.registerCommand(ICP_STOP_COMMAND, () => {
        if (!isRunning || !icpTerminal) {
            vscode.window.showWarningMessage('ICP server is not running.');
            return;
        }

        icpTerminal.dispose();
        icpTerminal = undefined;
        setICPState(false);
    });

    const terminalCloseListener = vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === icpTerminal) {
            icpTerminal = undefined;
            setICPState(false);
        }
    });

    ballerinaExtInstance.context.subscriptions.push(
        statusBarItem,
        startCommand,
        stopCommand,
        terminalCloseListener
    );
}
