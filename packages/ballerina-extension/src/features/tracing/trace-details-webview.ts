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
import { Uri, ViewColumn, Webview } from 'vscode';
import { extension } from '../../BalExtensionContext';
import { Trace } from './trace-server';
import { getLibraryWebViewContent, getComposerWebViewOptions, WebViewOptions } from '../../utils/webview-utils';

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

    private constructor() {
        this._panel = TraceDetailsWebview.createWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this.setupMessageHandler();
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
                            });
                        }
                        break;
                    case 'exportTrace':
                        if (message.data) {
                            await this.exportTrace(message.data);
                        }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private static createWebview(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            'ballerina.trace-details',
            'Trace Details',
            ViewColumn.Active,
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

    public static show(trace: Trace, isAgentChat: boolean = false, focusSpanId?: string): void {
        if (!TraceDetailsWebview.instance || !TraceDetailsWebview.instance._panel) {
            // Create new instance if it doesn't exist or was disposed
            TraceDetailsWebview.instance = new TraceDetailsWebview();
        }

        // Update the trace and reveal the panel
        const instance = TraceDetailsWebview.instance;
        instance._trace = trace;
        instance._isAgentChat = isAgentChat;
        instance._focusSpanId = focusSpanId;

        // Update title based on isAgentChat flag
        if (instance._panel) {
            instance._panel.title = isAgentChat ? 'Agent Chat Logs' : 'Trace Details';
        }

        instance._panel!.reveal();
        instance.updateWebview();
    }

    private updateWebview(): void {
        if (!this._panel || !this._trace) {
            return;
        }

        this._panel.webview.html = this.getWebviewContent(this._trace, this._panel.webview);

        // Send trace data immediately after updating HTML (in case webview is already loaded)
        // The webview will also request it if needed
        const traceData = this.convertTraceToTraceData(this._trace);
        this._panel.webview.postMessage({
            command: 'traceData',
            data: traceData,
            isAgentChat: this._isAgentChat,
            focusSpanId: this._focusSpanId,
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
                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(jsonContent, 'utf8'));
                vscode.window.showInformationMessage(`Trace exported to ${fileUri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export trace: ${error}`);
        }
    }

    private getWebviewContent(trace: Trace, webView: Webview): string {
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

            function renderTraceDetails() {
                if (window.traceVisualizer && window.traceVisualizer.renderWebview && traceData) {
                    const container = document.getElementById("webview-container");
                    if (container) {
                        window.traceVisualizer.renderWebview(traceData, isAgentChat, container, focusSpanId);
                    }
                } else if (!traceData) {
                    // Request trace data from extension
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

