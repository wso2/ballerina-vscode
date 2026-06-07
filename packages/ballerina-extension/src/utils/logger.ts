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
import { ENABLE_DEBUG_LOG } from '../core/preferences';
import path from 'path';
import os from 'os';
import fs from 'fs';

function createPersistedOutputChannel(name: string): vscode.OutputChannel {
    const channel = vscode.window.createOutputChannel(name);
    return {
        name: channel.name,
        append(value: string): void {
            channel.append(value);
            if (isDebugLogEnabled()) {
                persistDebugLogs(value);
            }
        },
        appendLine(value: string): void {
            channel.appendLine(value);
            if (isDebugLogEnabled()) {
                persistDebugLogs(value);
            }
        },
        replace(value: string): void {
            channel.replace(value);
            if (isDebugLogEnabled()) {
                persistDebugLogs(value);
            }
        },
        clear(): void {
            channel.clear();
        },
        show(columnOrPreserveFocus?: vscode.ViewColumn | boolean, preserveFocus?: boolean): void {
            if (typeof columnOrPreserveFocus === 'number') {
                channel.show(columnOrPreserveFocus, preserveFocus);
            } else {
                channel.show(columnOrPreserveFocus);
            }
        },
        hide(): void {
            channel.hide();
        },
        dispose(): void {
            channel.dispose();
        }
    };
}

export const outputChannel = createPersistedOutputChannel("Ballerina");
export const buildOutputChannel = vscode.window.createOutputChannel("Ballerina Build");

function isDebugLogEnabled(): boolean {
    return vscode.workspace.getConfiguration().get(ENABLE_DEBUG_LOG) === true;
}

function withNewLine(value: string) {
    if (typeof value === 'string' && !value.endsWith('\n')) {
        return value += '\n';
    }
    return value;
}

// This function will log the value to the Ballerina output channel only if debug log is enabled
export function debug(value: string): void {
    const output = withNewLine(value);
    console.log(output);
    if (isDebugLogEnabled()) {
        outputChannel.append(output);
    }
}

// This function will log the value to the Ballerina output channel
export function log(value: string): void {
    const output = withNewLine(value);
    console.log(output);
    outputChannel.append(output);
}

export function getOutputChannel() {
    if (isDebugLogEnabled()) {
        return outputChannel;
    }
}

/**
 * Persist debug logs to a file, keeping logs for up to 10 days.
 * Each day's logs are stored in a file named with the current date (YYYY-MM-DD.log).
 * When more than 10 log files exist, delete the oldest one.
 * Each log entry is appended to the corresponding day's file, prefixed with the current date and time.
 */
function persistDebugLogs(value: string): void {
    const homeDir = os.homedir();
    const logFolder = path.join(homeDir, '.ballerina', 'vscode-extension-logs');
    const date = new Date().toLocaleString();
    const logLine = `${date} ${value}`;
    const output = withNewLine(logLine);
    // Create destination folder if it doesn't exist
    if (!fs.existsSync(logFolder)) {
        fs.mkdirSync(logFolder, { recursive: true });
    }
    // Create log file if it doesn't exist
    const logFileDate = new Date().toISOString().split('T')[0];
    const fileName = `${logFileDate}.log`;
    if (!fs.existsSync(path.join(logFolder, fileName))) {
        fs.writeFileSync(path.join(logFolder, fileName), '');
    }
    const logFilePath = path.join(logFolder, fileName);
    fs.appendFileSync(logFilePath, output);

    // Remove the oldest log file if there are more than 10 log files
    const logFiles = fs.readdirSync(logFolder);
    if (logFiles.length > 10) {
        fs.unlinkSync(path.join(logFolder, logFiles[0]));
    }
}
