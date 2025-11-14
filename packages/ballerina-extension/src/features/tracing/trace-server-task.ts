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
 * software distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as vscode from 'vscode';
import { TraceServer } from './trace-server';
import { OTLP_PORT } from './constants';


/**
 * Creates a VS Code task that starts the trace server Express application
 * Uses CustomExecution to run the server inside the extension host
 * @returns A VS Code Task that starts the trace server
 */
export function createTraceServerTask(): vscode.Task {
    const taskDefinition: vscode.TaskDefinition = {
        type: 'custom',
        task: 'start-trace-server'
    };

    // Create CustomExecution that runs the server in the extension host
    const execution = new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
        return new TraceServerPseudoterminal();
    });

    const task = new vscode.Task(
        taskDefinition,
        vscode.TaskScope.Workspace,
        'Start Trace Server',
        'ballerina-tracing',
        execution
    );

    // Configure task presentation
    task.presentationOptions = {
        reveal: vscode.TaskRevealKind.Always,
        panel: vscode.TaskPanelKind.New,
        showReuseMessage: false,
        clear: false,
        echo: true,
        focus: false
    };

    // Set task as a background task (keeps running)
    task.isBackground = true;
    task.problemMatchers = [];

    return task;
}

/**
 * Pseudoterminal implementation for the trace server task
 * This runs the Express server inside the extension host
 */
class TraceServerPseudoterminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();
    private serverStarted = false;

    readonly onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    readonly onDidClose: vscode.Event<number> = this.closeEmitter.event;

    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.writeLine('🚀 Starting Trace Server...');
        this.writeLine('');

        // Start the trace server
        TraceServer.start(OTLP_PORT)
            .then(() => {
                this.serverStarted = true;
                this.writeLine(`📡 OTLP Tracing server started successfully on port ${OTLP_PORT}`);
                this.writeLine('Do not close this terminal window. It will be used to receive OTLP traces.');
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                this.writeLine(`❌ Failed to start trace server: ${message}`);
                
                // Check if port is already in use
                if (message.includes('EADDRINUSE') || message.includes('address already in use')) {
                    this.writeLine('');
                    this.writeLine(`⚠️  Port ${OTLP_PORT} is already in use.`);
                    this.writeLine('   The server may already be running.');
                    if (TraceServer.isRunning()) {
                        this.writeLine('   Server is already running in this extension.');
                    }
                }
                
                this.writeLine('');
                // Close with error code
                setTimeout(() => {
                    this.closeEmitter.fire(1);
                }, 1000);
            });
    }

    close(): void {
        if (this.serverStarted) {
            this.writeLine('');
            this.writeLine('👋 Shutting down trace server...');
            
            TraceServer.stop()
                .then(() => {
                    this.writeLine('✅ Trace server stopped');
                    this.closeEmitter.fire(0);
                })
                .catch((error) => {
                    const message = error instanceof Error ? error.message : String(error);
                    this.writeLine(`⚠️  Error stopping server: ${message}`);
                    this.closeEmitter.fire(1);
                });
        } else {
            this.closeEmitter.fire(0);
        }
    }

    handleInput(data: string): void {
        // Handle Ctrl+C (EOF) to close the terminal
        if (data === '\x03') { // Ctrl+C
            this.close();
        }
    }

    private writeLine(text: string): void {
        this.writeEmitter.fire(text + '\r\n');
    }
}

/**
 * Executes the trace server task
 * @param workspaceFolder Optional workspace folder
 * @returns Promise that resolves when the task is executed
 */
export async function executeTraceServerTask(): Promise<void> {
    const task = createTraceServerTask();
    try {
        const taskExecution = await vscode.tasks.executeTask(task);
        console.log('Trace server task executed');
        return;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to execute trace server task: ${message}`);
        throw error;
    }
}

