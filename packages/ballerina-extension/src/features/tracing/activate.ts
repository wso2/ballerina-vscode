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
import { BallerinaExtension } from '../../core';
import { TracerMachine } from './tracer-machine';
import { TraceTreeDataProvider } from './trace-tree-view';
import { TraceServer, Trace } from './trace-server';
import { TraceDetailsWebview } from './trace-details-webview';

export const TRACE_WINDOW_COMMAND = 'ballerina.showTraceWindow';
export const ENABLE_TRACING_COMMAND = 'ballerina.enableTracing';
export const DISABLE_TRACING_COMMAND = 'ballerina.disableTracing';
export const CLEAR_TRACES_COMMAND = 'ballerina.clearTraces';
export const SHOW_TRACE_DETAILS_COMMAND = 'ballerina.showTraceDetails';
export const TRACE_VIEW_ID = 'ballerina-traceView';

let treeDataProvider: TraceTreeDataProvider | undefined;
let treeView: vscode.TreeView<vscode.TreeItem> | undefined;

export function activateTracing(ballerinaExtInstance: BallerinaExtension) {
    const workspaceDirs: string[] = [];
    try {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            workspaceDirs.push(...folders.map(folder => folder.uri.fsPath));
        }
    } catch (_) {
        // ignore
    }

    // Initialize TracerMachine
    TracerMachine.initialize(workspaceDirs.length > 0 ? workspaceDirs : undefined);

    // Create TreeDataProvider
    treeDataProvider = new TraceTreeDataProvider();

    // Create and register TreeView in bottom panel (debug container)
    treeView = vscode.window.createTreeView(TRACE_VIEW_ID, {
        treeDataProvider: treeDataProvider,
        showCollapseAll: true
    });

    // Subscribe to TracerMachine state changes to update VS Code context
    TracerMachine.onUpdate(async (state: any) => {
        await updateContextFromState(state);
    });

    // Set initial context based on current state
    const initialState = TracerMachine.getState();
    updateContextFromState(initialState);

    // Register commands
    const showTraceWindowCommand = vscode.commands.registerCommand(TRACE_WINDOW_COMMAND, async () => {
        await showTraceWindow();
    });

    const enableTracingCommand = vscode.commands.registerCommand(ENABLE_TRACING_COMMAND, () => {
        TracerMachine.enable();
        // Focus the VS Code panel section
        vscode.commands.executeCommand('workbench.action.focusPanel');
        // Reveal/focus the ballerina-traceView (shows trace panel in panel)
        vscode.commands.executeCommand('workbench.view.extension.ballerina-traceView');
    });

    const disableTracingCommand = vscode.commands.registerCommand(DISABLE_TRACING_COMMAND, () => {
        TracerMachine.disable();
    });

    const clearTracesCommand = vscode.commands.registerCommand(CLEAR_TRACES_COMMAND, () => {
        // Clear traces from the server
        TraceServer.clearTraces();

        // The TraceServer.onTracesCleared callback will update the context and refresh the tree
    });

    const showTraceDetailsCommand = vscode.commands.registerCommand(
        SHOW_TRACE_DETAILS_COMMAND,
        (trace: Trace) => {
            showTraceDetails(trace);
        }
    );

    // Add all subscriptions
    ballerinaExtInstance.context.subscriptions.push(
        treeView,
        showTraceWindowCommand,
        enableTracingCommand,
        disableTracingCommand,
        clearTracesCommand,
        showTraceDetailsCommand,
        treeDataProvider
    );
}

/**
 * Update VS Code context based on TracerMachine state
 */
async function updateContextFromState(state: any): Promise<void> {
    const isEnabled = typeof state === 'string'
        ? state === 'enabled'
        : (typeof state === 'object' && state !== null && 'enabled' in state);

    await vscode.commands.executeCommand('setContext', 'ballerina.tracingEnabled', isEnabled);

    if (isEnabled) {
        // Check if traces exist
        const traces = TraceServer.getTraces();
        await vscode.commands.executeCommand('setContext', 'ballerina.tracesEmpty', traces.length === 0);
    }
}

/**
 * Show/reveal the trace window
 */
async function showTraceWindow(): Promise<void> {
    if (!treeView) {
        return;
    }

    try {
        // Show the view by executing the show command for the debug container
        // The trace view is in the debug container (bottom panel)
        await vscode.commands.executeCommand('workbench.view.debug');

        // Small delay to ensure the view is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // If there are traces, try to reveal the first one
        const traces = TraceServer.getTraces();
        if (traces.length > 0 && treeDataProvider) {
            const children = await treeDataProvider.getChildren();
            if (children && children.length > 0 && children[0]) {
                // Reveal the first trace node
                await treeView.reveal(children[0], { focus: true, select: false });
            }
        }
    } catch (error) {
        // If reveal fails, at least ensure the view is visible
        // The error might be due to getParent, but the view should still be shown
        console.error('Error revealing trace window:', error);
    }
}

/**
 * Show trace details in a webview
 */
function showTraceDetails(trace: Trace): void {
    try {
        TraceDetailsWebview.show(trace);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to show trace details: ${message}`);
    }
}
