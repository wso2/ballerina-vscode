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

    private constructor() {
        this._panel = TraceDetailsWebview.createWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
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

    public static show(trace: Trace): void {
        if (!TraceDetailsWebview.instance || !TraceDetailsWebview.instance._panel) {
            // Create new instance if it doesn't exist or was disposed
            TraceDetailsWebview.instance = new TraceDetailsWebview();
        }
        
        // Update the trace and reveal the panel
        const instance = TraceDetailsWebview.instance;
        instance._trace = trace;
        instance._panel!.reveal();
        instance.updateWebview();
    }

    private updateWebview(): void {
        if (!this._panel || !this._trace) {
            return;
        }

        this._panel.webview.html = this.getWebviewContent(this._trace, this._panel.webview);
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

    private getWebviewContent(trace: Trace, webView: Webview): string {
        const traceData = this.convertTraceToTraceData(trace);
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
            function loadedScript() {
                function renderTraceDetails() {
                    if (window.traceVisualizer && window.traceVisualizer.renderWebview) {
                        const container = document.getElementById("webview-container");
                        if (container) {
                            window.traceVisualizer.renderWebview(${JSON.stringify(traceData)}, container);
                        }
                    } else {
                        console.error("TraceVisualizer not loaded");
                        setTimeout(renderTraceDetails, 100);
                    }
                }
                renderTraceDetails();
            }
        `;

        const webViewOptions: WebViewOptions = {
            ...getComposerWebViewOptions("TraceVisualizer", webView, {devHost:'http://localhost:9001'}),
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

