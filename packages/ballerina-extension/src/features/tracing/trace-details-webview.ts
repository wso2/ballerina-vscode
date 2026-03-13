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
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { Uri, ViewColumn, Webview } from 'vscode';
import { extension } from '../../BalExtensionContext';
import { Trace, TraceServer } from './trace-server';
import { getLibraryWebViewContent, getComposerWebViewOptions, WebViewOptions } from '../../utils/webview-utils';
import { convertTraceToEvalset, convertTracesToEvalset } from './trace-converter';
import { EvalThread, EvalSet } from '@wso2/ballerina-core';
import { getCurrentProjectRoot } from '../../utils/project-utils';
import { ensureEvalsetsDirectory, validateEvalsetName, findExistingEvalsets } from '../test-explorer/evalset-utils';

// TraceData interface matching the trace-visualizer component
interface TraceData {
    traceId: string;
    spans: SpanData[];
    resource: ResourceData;
    scope: ScopeData;
    firstSeen: string;
    lastSeen: string;
}

interface SpanData {
    spanId: string;
    traceId: string;
    parentSpanId: string;
    name: string;
    kind: string | number;
    startTime?: string;
    endTime?: string;
    attributes?: AttributeData[];
}

interface ResourceData {
    name: string;
    attributes: AttributeData[];
}

interface ScopeData {
    name: string;
    version?: string;
    attributes?: AttributeData[];
}

interface AttributeData {
    key: string;
    value: string;
}

export class TraceDetailsWebview {
    private static instance: TraceDetailsWebview | undefined;
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    private _trace: Trace | undefined;
    private _isAgentChat: boolean = false;
    private _focusSpanId: string | undefined;
    private _sessionId: string | undefined;
    private _traceUpdateUnsubscribe: (() => void) | undefined;

    private constructor() {
        this._panel = TraceDetailsWebview.createWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this.setupMessageHandler();
        this.subscribeToTraceUpdates();
    }

    private setupMessageHandler(): void {
        if (!this._panel) {
            return;
        }

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'requestTraceData':
                        if (this._trace) {
                            const traceData = this.convertTraceToTraceData(this._trace);
                            this._panel!.webview.postMessage({
                                command: 'traceData',
                                data: traceData,
                                isAgentChat: this._isAgentChat,
                                focusSpanId: this._focusSpanId,
                                sessionId: this._sessionId,
                            });
                        }
                        break;
                    case 'exportTrace':
                        if (message.data) {
                            await this.exportTrace(message.data);
                        }
                        break;
                    case 'requestSessionTraces':
                        if (message.sessionId) {
                            await this.handleSessionTracesRequest(message.sessionId);
                        }
                        break;
                    case 'exportSession':
                        if (message.data) {
                            await this.exportSession(message.data.sessionTraces, message.data.sessionId);
                        }
                        break;
                    case 'exportTraceAsEvalset':
                        if (message.data) {
                            await this.exportTraceAsEvalset(message.data);
                        }
                        break;
                    case 'exportSessionAsEvalset':
                        if (message.data) {
                            await this.exportSessionAsEvalset(message.data.sessionTraces, message.data.sessionId);
                        }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private subscribeToTraceUpdates(): void {
        this._traceUpdateUnsubscribe = TraceServer.onTracesUpdated(() => {
            if (!this._trace && this._sessionId && this._panel) {
                this.refreshSessionTraces();
            }
        });
    }

    private async refreshSessionTraces(): Promise<void> {
        if (!this._sessionId || !this._panel) {
            return;
        }

        try {
            const sessionTraces = TraceServer.getTracesBySessionId(this._sessionId);
            const traces = sessionTraces.map(trace => this.convertTraceToTraceData(trace));

            // Send updated traces to the webview with isUpdate flag
            // This prevents forcing the view mode change on updates
            this._panel.webview.postMessage({
                command: 'sessionTraces',
                traces,
                sessionId: this._sessionId,
                isUpdate: true
            });
        } catch (error) {
            console.error('Failed to refresh session traces:', error);
        }
    }

    private static createWebview(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            'ballerina.trace-details',
            'Trace Details',
            ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    Uri.file(path.join(extension.context.extensionPath, 'resources', 'jslibs')),
                    Uri.file(path.join(extension.context.extensionPath, 'resources')),
                ],
                retainContextWhenHidden: true,
            }
        );
        panel.iconPath = {
            light: Uri.file(path.join(extension.context.extensionPath, 'resources', 'images', 'icons', 'ballerina.svg')),
            dark: Uri.file(path.join(extension.context.extensionPath, 'resources', 'images', 'icons', 'ballerina-inverse.svg'))
        };
        return panel;
    }

    public static show(trace: Trace, isAgentChat: boolean = false, focusSpanId?: string, sessionId?: string): void {
        if (!TraceDetailsWebview.instance || !TraceDetailsWebview.instance._panel) {
            // Create new instance if it doesn't exist or was disposed
            TraceDetailsWebview.instance = new TraceDetailsWebview();
        }

        // Update the trace and reveal the panel
        const instance = TraceDetailsWebview.instance;
        instance._trace = trace;
        instance._isAgentChat = isAgentChat;
        instance._focusSpanId = focusSpanId;
        instance._sessionId = sessionId;

        // Update title based on isAgentChat flag
        if (instance._panel) {
            instance._panel.title = 'Trace Logs';
        }

        vscode.commands.executeCommand('workbench.action.closeSidebar');

        instance._panel!.reveal(ViewColumn.One);
        instance.updateWebview();
    }

    public static async showSessionOverview(sessionId: string): Promise<void> {
        // Create or reuse webview instance
        if (!TraceDetailsWebview.instance || !TraceDetailsWebview.instance._panel) {
            TraceDetailsWebview.instance = new TraceDetailsWebview();
        }

        const instance = TraceDetailsWebview.instance;
        instance._trace = null;
        instance._isAgentChat = true;
        instance._sessionId = sessionId;

        vscode.commands.executeCommand('workbench.action.closeSidebar');

        instance._panel!.reveal(ViewColumn.One);
        instance.updateWebview();
    }

    private updateWebview(): void {
        if (!this._panel) {
            return;
        }

        this._panel.webview.html = this.getWebviewContent(this._trace, this._panel.webview);

        // Send trace data immediately after updating HTML (in case webview is already loaded)
        // The webview will also request it if needed
        const traceData = this._trace ? this.convertTraceToTraceData(this._trace) : null;
        this._panel.webview.postMessage({
            command: 'traceData',
            data: traceData,
            isAgentChat: this._isAgentChat,
            focusSpanId: this._focusSpanId,
            sessionId: this._sessionId
        });
    }

    private convertTraceToTraceData(trace: Trace): TraceData {
        return {
            traceId: trace.traceId,
            spans: trace.spans.map(span => ({
                spanId: span.spanId,
                traceId: span.traceId,
                parentSpanId: span.parentSpanId,
                name: span.name,
                kind: span.kind,
                startTime: span.startTime,
                endTime: span.endTime,
                attributes: span.attributes || [],
            })),
            resource: {
                name: trace.resource.name,
                attributes: trace.resource.attributes || [],
            },
            scope: {
                name: trace.scope.name,
                version: trace.scope.version,
                attributes: trace.scope.attributes || [],
            },
            firstSeen: trace.firstSeen.toISOString(),
            lastSeen: trace.lastSeen.toISOString(),
        };
    }

    private async exportTrace(traceData: TraceData): Promise<void> {
        try {
            const fileName = `trace-${traceData.traceId}.json`;
            // Default to ./traces inside the first workspace folder; fallback to home directory
            const wf = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
            let defaultUri: vscode.Uri;

            if (wf) {
                const tracesDirPath = path.join(wf.uri.fsPath, 'traces');
                const tracesDirUri = vscode.Uri.file(tracesDirPath);
                try {
                    // Ensure the traces directory exists (create if missing)
                    await vscode.workspace.fs.createDirectory(tracesDirUri);
                } catch (e) {
                    // Ignore errors and fall back to workspace root below
                }

                defaultUri = vscode.Uri.file(path.join(tracesDirPath, fileName));
            } else {
                defaultUri = vscode.Uri.file(path.join(os.homedir(), fileName));
            }

            const fileUri = await vscode.window.showSaveDialog({
                defaultUri,
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });

            if (fileUri) {
                const jsonContent = JSON.stringify(traceData, null, 2);
                await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(jsonContent));
                vscode.window.showInformationMessage(`Trace exported to ${fileUri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export trace: ${error}`);
        }
    }

    private async handleSessionTracesRequest(sessionId: string): Promise<void> {
        try {
            const sessionTraces = TraceServer.getTracesBySessionId(sessionId);

            // Convert to TraceData format
            const traces = sessionTraces.map(trace => this.convertTraceToTraceData(trace));

            // Send to webview
            this._panel?.webview.postMessage({
                command: 'sessionTraces',
                traces,
                sessionId
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch session traces: ${error}`);
        }
    }

    private async exportSession(sessionTraces: TraceData[], sessionId: string): Promise<void> {
        try {
            const fileName = `session-${sessionId}.json`;
            const wf = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
            let defaultUri: vscode.Uri;

            if (wf) {
                const tracesDirPath = path.join(wf.uri.fsPath, 'traces');
                const tracesDirUri = vscode.Uri.file(tracesDirPath);
                try {
                    await vscode.workspace.fs.createDirectory(tracesDirUri);
                } catch (e) {
                    // Ignore errors
                }

                defaultUri = vscode.Uri.file(path.join(tracesDirPath, fileName));
            } else {
                defaultUri = vscode.Uri.file(path.join(os.homedir(), fileName));
            }

            const fileUri = await vscode.window.showSaveDialog({
                defaultUri,
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });

            if (fileUri) {
                const jsonContent = JSON.stringify({
                    sessionId,
                    traces: sessionTraces
                }, null, 2);
                await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(jsonContent));
                vscode.window.showInformationMessage(`Session exported to ${fileUri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export session: ${error}`);
        }
    }

    private async exportTraceAsEvalset(traceData: TraceData): Promise<void> {
        const mode = await this.promptExportMode();
        if (!mode) { return; }

        if (mode === 'new') {
            await this.createNewEvalsetFromTrace(traceData);
        } else {
            await this.appendTraceToExistingEvalset(traceData);
        }
    }

    /**
     * Creates thread from traces
     */
    private createThreadFromTraces(
        sessionTraces: TraceData[],
        sessionId: string,
        threadName?: string
    ): EvalThread {
        const evalsetTraces = convertTracesToEvalset(sessionTraces);

        return {
            id: threadName || `thread-${sessionId.substring(0, 8)}`,
            description: '',
            traces: evalsetTraces,
            created_on: new Date().toISOString()
        };
    }

    /**
     * Creates thread from a single trace
     */
    private createThreadFromTrace(
        traceData: TraceData,
        threadName?: string
    ): EvalThread {
        const evalsetTrace = convertTraceToEvalset(traceData);

        return {
            id: threadName || `thread-${traceData.traceId.substring(0, 8)}`,
            description: '',
            traces: [evalsetTrace],
            created_on: new Date().toISOString()
        };
    }

    /**
     * Prompt for export mode (new vs append)
     */
    private async promptExportMode(): Promise<'new' | 'append' | undefined> {
        const mode = await vscode.window.showQuickPick([
            { label: 'Create new evalset', value: 'new' as const },
            { label: 'Append to existing evalset', value: 'append' as const }
        ], {
            placeHolder: 'How would you like to export this session?'
        });

        return mode?.value;
    }

    /**
     * Creates a new evalset
     */
    private async createNewEvalset(
        sessionTraces: TraceData[],
        sessionId: string
    ): Promise<void> {
        try {
            // 1. Ensure evalsets directory exists
            const evalsetsDir = await ensureEvalsetsDirectory();

            // 2. Prompt for name
            const name = await vscode.window.showInputBox({
                prompt: 'Enter evalset name',
                placeHolder: `session-${sessionId.substring(0, 8)}`,
                value: `session-${sessionId.substring(0, 8)}`,
                validateInput: (value) => validateEvalsetName(value, evalsetsDir)
            });

            if (!name) { return; } // User cancelled

            // 3. Create EvalSet with single thread
            const thread = this.createThreadFromTraces(sessionTraces, sessionId);
            const evalset: EvalSet = {
                id: crypto.randomUUID(),
                name: name,
                description: `Session export`,
                threads: [thread],
                created_on: new Date().toISOString()
            };

            // 4. Write file
            const filePath = path.join(evalsetsDir, `${name}.evalset.json`);
            const jsonContent = JSON.stringify(evalset, null, 2);
            const fileUri = vscode.Uri.file(filePath);

            await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(jsonContent));

            // 5. Success message with View option
            const action = await vscode.window.showInformationMessage(
                `Evalset created: ${name}.evalset.json`,
                'View'
            );

            if (action === 'View') {
                vscode.commands.executeCommand('ballerina.openEvalsetViewer', fileUri, thread.id);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to create evalset: ${errorMessage}`);
        }
    }

    /**
     * Creates a new evalset from a single trace
     */
    private async createNewEvalsetFromTrace(
        traceData: TraceData
    ): Promise<void> {
        try {
            // 1. Ensure evalsets directory exists
            const evalsetsDir = await ensureEvalsetsDirectory();

            // 2. Prompt for name
            const name = await vscode.window.showInputBox({
                prompt: 'Enter evalset name',
                placeHolder: `trace-${traceData.traceId.substring(0, 8)}`,
                value: `trace-${traceData.traceId.substring(0, 8)}`,
                validateInput: (value) => validateEvalsetName(value, evalsetsDir)
            });

            if (!name) { return; } // User cancelled

            // 3. Create EvalSet with single thread
            const thread = this.createThreadFromTrace(traceData);
            const evalset: EvalSet = {
                id: crypto.randomUUID(),
                name: name,
                description: `Single trace export`,
                threads: [thread],
                created_on: new Date().toISOString()
            };

            // 4. Write file
            const filePath = path.join(evalsetsDir, `${name}.evalset.json`);
            const jsonContent = JSON.stringify(evalset, null, 2);
            const fileUri = vscode.Uri.file(filePath);

            await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(jsonContent));

            // 5. Success message with View option
            const action = await vscode.window.showInformationMessage(
                `Evalset created: ${name}.evalset.json`,
                'View'
            );

            if (action === 'View') {
                vscode.commands.executeCommand('ballerina.openEvalsetViewer', fileUri, thread.id);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to create evalset: ${errorMessage}`);
        }
    }

    /**
     * Appends a single trace to an existing evalset as a new thread
     */
    private async appendTraceToExistingEvalset(
        traceData: TraceData
    ): Promise<void> {
        try {
            // 1. Ensure evalsets directory and find files
            const evalsetsDir = await ensureEvalsetsDirectory();
            const existingEvalsets = await findExistingEvalsets(evalsetsDir);

            if (existingEvalsets.length === 0) {
                vscode.window.showErrorMessage('No evalsets found. Create a new one first.');
                return;
            }

            // 2. Select evalset
            const selected = await vscode.window.showQuickPick(existingEvalsets, {
                placeHolder: 'Select an evalset to append to'
            });

            if (!selected) { return; } // User cancelled

            // 3. Prompt for thread name (quick pick: auto vs custom)
            const nameChoice = await vscode.window.showQuickPick([
                { label: 'Auto-generate thread name', value: 'auto' as const },
                { label: 'Enter custom thread name', value: 'custom' as const }
            ], {
                placeHolder: 'How would you like to name the new thread?'
            });

            if (!nameChoice) { return; } // User cancelled

            let threadName: string | undefined;
            if (nameChoice.value === 'custom') {
                threadName = await vscode.window.showInputBox({
                    prompt: 'Enter thread name',
                    value: `thread-${traceData.traceId.substring(0, 8)}`,
                    placeHolder: `thread-${traceData.traceId.substring(0, 8)}`
                });

                if (!threadName) { return; } // User cancelled
            }

            // 4. Read existing evalset
            const fileUri = vscode.Uri.file(selected.filePath);
            let evalset: EvalSet;

            try {
                const content = await vscode.workspace.fs.readFile(fileUri);
                evalset = JSON.parse(Buffer.from(content).toString('utf8'));
            } catch (parseError) {
                throw new Error('Invalid evalset file: corrupted or invalid JSON');
            }

            // Validate schema
            if (!evalset.threads || !Array.isArray(evalset.threads)) {
                throw new Error('Invalid evalset format: missing threads array');
            }

            // 5. Add new thread
            const newThread = this.createThreadFromTrace(traceData, threadName);
            evalset.threads.push(newThread);

            // 6. Write back
            const jsonContent = JSON.stringify(evalset, null, 2);
            await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(jsonContent));

            // 7. Success message with View option
            const action = await vscode.window.showInformationMessage(
                `Thread added to ${selected.label}.evalset.json`,
                'View'
            );

            if (action === 'View') {
                vscode.commands.executeCommand('ballerina.openEvalsetViewer', fileUri, newThread.id);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to append to evalset: ${errorMessage}`);
        }
    }

    /**
     * Appends traces to an existing evalset as a new thread
     */
    private async appendToExistingEvalset(
        sessionTraces: TraceData[],
        sessionId: string
    ): Promise<void> {
        try {
            // 1. Ensure evalsets directory and find files
            const evalsetsDir = await ensureEvalsetsDirectory();
            const existingEvalsets = await findExistingEvalsets(evalsetsDir);

            if (existingEvalsets.length === 0) {
                vscode.window.showErrorMessage('No evalsets found. Create a new one first.');
                return;
            }

            // 2. Select evalset
            const selected = await vscode.window.showQuickPick(existingEvalsets, {
                placeHolder: 'Select an evalset to append to'
            });

            if (!selected) { return; } // User cancelled

            // 3. Prompt for thread name (quick pick: auto vs custom)
            const nameChoice = await vscode.window.showQuickPick([
                { label: 'Auto-generate thread name', value: 'auto' },
                { label: 'Enter custom thread name', value: 'custom' }
            ], {
                placeHolder: 'How would you like to name the new thread?'
            });

            if (!nameChoice) { return; } // User cancelled

            let threadName: string | undefined;
            if (nameChoice.value === 'custom') {
                threadName = await vscode.window.showInputBox({
                    prompt: 'Enter thread name',
                    value: `thread-${sessionId.substring(0, 8)}`,
                    placeHolder: `thread-${sessionId.substring(0, 8)}`
                });

                if (!threadName) { return; } // User cancelled
            }

            // 4. Read existing evalset
            const fileUri = vscode.Uri.file(selected.filePath);
            let evalset: EvalSet;

            try {
                const content = await vscode.workspace.fs.readFile(fileUri);
                evalset = JSON.parse(Buffer.from(content).toString('utf8'));
            } catch (parseError) {
                throw new Error('Invalid evalset file: corrupted or invalid JSON');
            }

            // Validate schema
            if (!evalset.threads || !Array.isArray(evalset.threads)) {
                throw new Error('Invalid evalset format: missing threads array');
            }

            // 5. Add new thread
            const newThread = this.createThreadFromTraces(sessionTraces, sessionId, threadName);
            evalset.threads.push(newThread);

            // 6. Write back
            const jsonContent = JSON.stringify(evalset, null, 2);
            await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(jsonContent));

            // 7. Success message with View option
            const action = await vscode.window.showInformationMessage(
                `Thread added to ${selected.label}.evalset.json`,
                'View'
            );

            if (action === 'View') {
                vscode.commands.executeCommand('ballerina.openEvalsetViewer', fileUri, newThread.id);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to append to evalset: ${errorMessage}`);
        }
    }

    private async exportSessionAsEvalset(sessionTraces: TraceData[], sessionId: string): Promise<void> {
        const mode = await this.promptExportMode();
        if (!mode) { return; }

        if (mode === 'new') {
            await this.createNewEvalset(sessionTraces, sessionId);
        } else {
            await this.appendToExistingEvalset(sessionTraces, sessionId);
        }
    }

    private getWebviewContent(trace: Trace | null, webView: Webview): string {
        const body = `<div class="container" id="webview-container"></div>`;
        const bodyCss = ``;
        const styles = `
            .container {
                background-color: var(--vscode-editor-background);
                height: 100vh;
                width: 100%;
            }
        `;
        const scripts = `
            const vscode = acquireVsCodeApi();
            window.vscode = vscode; // Make vscode API available globally
            let traceData = null;
            let isAgentChat = false;
            let focusSpanId = undefined;
            let sessionId = false;

            // Expose API for React components to communicate with extension
            window.traceVisualizerAPI = {
                requestSessionTraces: (sessionId) => {
                    vscode.postMessage({
                        command: 'requestSessionTraces',
                        sessionId: sessionId
                    });
                },
                exportSession: (sessionTraces, sessionId) => {
                    vscode.postMessage({
                        command: 'exportSession',
                        data: { sessionTraces, sessionId }
                    });
                },
                exportTrace: (traceData) => {
                    vscode.postMessage({
                        command: 'exportTrace',
                        data: traceData
                    });
                },
                exportTraceAsEvalset: (traceData) => {
                    vscode.postMessage({
                        command: 'exportTraceAsEvalset',
                        data: traceData
                    });
                },
                exportSessionAsEvalset: (sessionTraces, sessionId) => {
                    vscode.postMessage({
                        command: 'exportSessionAsEvalset',
                        data: { sessionTraces, sessionId }
                    });
                }
            };

            function renderTraceDetails() {
                if (window.traceVisualizer && window.traceVisualizer.renderWebview) {
                    const container = document.getElementById("webview-container");
                    if (container) {
                        window.traceVisualizer.renderWebview(traceData, isAgentChat, container, focusSpanId, sessionId);
                    }
                } else if (!traceData && !sessionId) {
                    // Request trace data from extension only if we don't have sessionId
                    vscode.postMessage({ command: 'requestTraceData' });
                } else {
                    console.error("TraceVisualizer not loaded");
                    setTimeout(renderTraceDetails, 100);
                }
            }

            // Listen for messages from the extension
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'traceData':
                        traceData = message.data;
                        isAgentChat = message.isAgentChat || false;
                        focusSpanId = message.focusSpanId;
                        sessionId = message.sessionId || false;
                        renderTraceDetails();
                        break;
                }
            });

            // Listen for export requests from React component
            window.addEventListener('exportTrace', (event) => {
                if (event.detail && event.detail.traceData) {
                    vscode.postMessage({
                        command: 'exportTrace',
                        data: event.detail.traceData
                    });
                }
            });

            // Listen for session export requests from React component
            window.addEventListener('exportSession', (event) => {
                if (event.detail && event.detail.sessionTraces && event.detail.currentSessionId) {
                    vscode.postMessage({
                        command: 'exportSession',
                        data: {
                            sessionTraces: event.detail.sessionTraces,
                            sessionId: event.detail.currentSessionId
                        }
                    });
                }
            });

            // Listen for evalset export requests from React component
            window.addEventListener('exportTraceAsEvalset', (event) => {
                if (event.detail && event.detail.traceData) {
                    vscode.postMessage({
                        command: 'exportTraceAsEvalset',
                        data: event.detail.traceData
                    });
                }
            });

            // Listen for session evalset export requests from React component
            window.addEventListener('exportSessionAsEvalset', (event) => {
                if (event.detail && event.detail.sessionTraces && event.detail.currentSessionId) {
                    vscode.postMessage({
                        command: 'exportSessionAsEvalset',
                        data: {
                            sessionTraces: event.detail.sessionTraces,
                            sessionId: event.detail.currentSessionId
                        }
                    });
                }
            });

            function loadedScript() {
                // Request trace data when script is loaded
                vscode.postMessage({ command: 'requestTraceData' });
            }
        `;
        const options = process.env.TRACE_WEB_VIEW_DEV_HOST ? { devHost: process.env.TRACE_WEB_VIEW_DEV_HOST } : {};
        const webViewOptions: WebViewOptions = {
            ...getComposerWebViewOptions("TraceVisualizer", webView, options),
            body,
            scripts,
            styles,
            bodyCss,
        };

        return getLibraryWebViewContent(webViewOptions, webView);
    }


    public dispose(): void {
        // Unsubscribe from trace updates
        if (this._traceUpdateUnsubscribe) {
            this._traceUpdateUnsubscribe();
            this._traceUpdateUnsubscribe = undefined;
        }

        this._panel?.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }

        this._panel = undefined;
        this._trace = undefined;

        // Clear the static instance when disposed
        if (TraceDetailsWebview.instance === this) {
            TraceDetailsWebview.instance = undefined;
        }
    }
}
