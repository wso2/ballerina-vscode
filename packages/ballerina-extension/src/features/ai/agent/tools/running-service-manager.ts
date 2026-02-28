// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import * as vscode from 'vscode';
import * as child_process from 'child_process';

export interface RunningService {
    taskId: string;
    terminal: vscode.Terminal;
    process: child_process.ChildProcess;
    logs: string[];
    logCursor: number;
    packagePath: string;
    startedAt: number;
    exited: boolean;
    exitCode: number | null;
}

/**
 * Creates a VS Code terminal backed by a child process via Pseudoterminal.
 * Output from the child process is both displayed in the terminal AND buffered
 * in `logs` for LLM consumption — no proposed API required.
 */
export function createProcessTerminal(
    name: string,
    command: string,
    args: string[],
    cwd: string,
    logs: string[]
): { terminal: vscode.Terminal; process: child_process.ChildProcess } {
    const writeEmitter = new vscode.EventEmitter<string>();
    const closeEmitter = new vscode.EventEmitter<number | void>();

    const proc = child_process.spawn(command, args, {
        cwd,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    let processExited = false;

    const handleData = (data: Buffer) => {
        const text = data.toString();
        // Buffer clean text for LLM consumption
        logs.push(removeAnsiEscapeCodes(text));
        // Write raw text to terminal for user (convert \n to \r\n for terminal display)
        writeEmitter.fire(text.replace(/\n/g, '\r\n'));
    };

    proc.stdout?.on('data', handleData);
    proc.stderr?.on('data', handleData);

    // When the process exits, write a message but keep the terminal open
    // so the user can inspect the output.
    proc.on('close', (code) => {
        processExited = true;
        writeEmitter.fire(`\r\n\r\n[Process exited with code ${code ?? 'unknown'}]\r\n`);
    });

    const pty: vscode.Pseudoterminal = {
        onDidWrite: writeEmitter.event,
        onDidClose: closeEmitter.event,
        open: () => { },
        close: () => {
            // Called when the user closes the terminal tab
            if (!proc.killed) {
                proc.kill('SIGTERM');
            }
        },
        handleInput: (data: string) => {
            if (processExited) {
                // Process is done; close the terminal on any keypress
                closeEmitter.fire(undefined);
                return;
            }
            if (data === '\x03') {
                proc.kill('SIGINT');
            } else {
                proc.stdin?.write(data);
            }
        },
    };

    const terminal = vscode.window.createTerminal({ name, pty });

    return { terminal, process: proc };
}

export class RunningServicesManager {
    private services = new Map<string, RunningService>();

    get(taskId: string): RunningService | undefined {
        return this.services.get(taskId);
    }

    register(service: RunningService): void {
        this.services.set(service.taskId, service);
    }

    remove(taskId: string): boolean {
        return this.services.delete(taskId);
    }

    stopAll(): void {
        for (const service of this.services.values()) {
            if (!service.process.killed) {
                service.process.kill('SIGTERM');
            }
            service.terminal.dispose();
        }
        this.services.clear();
    }

    dispose(): void {
        this.stopAll();
    }
}

function removeAnsiEscapeCodes(text: string): string {
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

export const runningServicesManager = new RunningServicesManager();
