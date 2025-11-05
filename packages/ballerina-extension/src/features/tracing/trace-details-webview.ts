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
import { Uri, ViewColumn } from 'vscode';
import { extension } from '../../BalExtensionContext';
import { Trace, Span } from './trace-server';

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
                localResourceRoots: [Uri.file(path.join(extension.context.extensionPath, 'resources'))],
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

        this._panel.webview.html = this.getWebviewContent(this._trace);
    }

    private getWebviewContent(trace: Trace): string {
        const traceInfoHtml = this.formatTraceInfo(trace);
        const spansHtml = this.formatSpans(trace);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trace Details</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-size: 13px;
            line-height: 1.5;
        }
        .header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 18px;
            color: var(--vscode-textLink-foreground);
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 5px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 8px;
            margin-bottom: 15px;
        }
        .info-label {
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
        }
        .info-value {
            font-family: 'Consolas', 'Monaco', monospace;
            word-break: break-all;
        }
        .attributes {
            margin-top: 10px;
        }
        .attribute-item {
            padding: 4px 0;
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding-left: 10px;
            margin-bottom: 5px;
        }
        .attribute-key {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
        }
        .attribute-value {
            font-family: 'Consolas', 'Monaco', monospace;
            margin-left: 10px;
        }
        .span-item {
            margin-bottom: 15px;
            padding: 12px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-editor-background);
        }
        .span-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .span-name {
            font-weight: 600;
            font-size: 14px;
            color: var(--vscode-textLink-foreground);
        }
        .span-kind {
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 3px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .span-details {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            font-family: 'Consolas', 'Monaco', monospace;
        }
        .span-details div {
            margin: 4px 0;
        }
        .span-children {
            margin-left: 30px;
            margin-top: 10px;
            border-left: 2px solid var(--vscode-panel-border);
            padding-left: 15px;
        }
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 40px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Trace Details</h1>
    </div>
    
    ${traceInfoHtml}
    
    <div class="section">
        <div class="section-title">Spans (${trace.spans.length} total)</div>
        ${trace.spans.length > 0 ? spansHtml : '<div class="empty-state">No spans found in this trace.</div>'}
    </div>
</body>
</html>`;
    }

    private formatTraceInfo(trace: Trace): string {
        const duration = trace.lastSeen.getTime() - trace.firstSeen.getTime();
        
        const resourceAttributesHtml = trace.resource.attributes && trace.resource.attributes.length > 0
            ? `<div class="attributes">
                ${trace.resource.attributes.map(attr => `
                    <div class="attribute-item">
                        <span class="attribute-key">${this.escapeHtml(attr.key)}:</span>
                        <span class="attribute-value">${this.escapeHtml(attr.value)}</span>
                    </div>
                `).join('')}
            </div>`
            : '<div style="color: var(--vscode-descriptionForeground); font-style: italic;">No attributes</div>';

        const scopeAttributesHtml = trace.scope.attributes && trace.scope.attributes.length > 0
            ? `<div class="attributes">
                ${trace.scope.attributes.map(attr => `
                    <div class="attribute-item">
                        <span class="attribute-key">${this.escapeHtml(attr.key)}:</span>
                        <span class="attribute-value">${this.escapeHtml(attr.value)}</span>
                    </div>
                `).join('')}
            </div>`
            : '<div style="color: var(--vscode-descriptionForeground); font-style: italic;">No attributes</div>';

        return `
            <div class="section">
                <div class="section-title">Trace Information</div>
                <div class="info-grid">
                    <div class="info-label">Trace ID:</div>
                    <div class="info-value">${this.escapeHtml(trace.traceId)}</div>
                    
                    <div class="info-label">First Seen:</div>
                    <div class="info-value">${trace.firstSeen.toLocaleString()}</div>
                    
                    <div class="info-label">Last Seen:</div>
                    <div class="info-value">${trace.lastSeen.toLocaleString()}</div>
                    
                    <div class="info-label">Duration:</div>
                    <div class="info-value">${duration}ms</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Resource</div>
                <div class="info-grid">
                    <div class="info-label">Name:</div>
                    <div class="info-value">${this.escapeHtml(trace.resource.name)}</div>
                </div>
                <div style="margin-top: 10px;">
                    <div class="info-label" style="margin-bottom: 8px;">Attributes:</div>
                    ${resourceAttributesHtml}
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Instrumentation Scope</div>
                <div class="info-grid">
                    <div class="info-label">Name:</div>
                    <div class="info-value">${this.escapeHtml(trace.scope.name)}</div>
                    ${trace.scope.version ? `
                    <div class="info-label">Version:</div>
                    <div class="info-value">${this.escapeHtml(trace.scope.version)}</div>
                    ` : ''}
                </div>
                ${trace.scope.attributes && trace.scope.attributes.length > 0 ? `
                <div style="margin-top: 10px;">
                    <div class="info-label" style="margin-bottom: 8px;">Attributes:</div>
                    ${scopeAttributesHtml}
                </div>
                ` : ''}
            </div>
        `;
    }

    private formatSpans(trace: Trace): string {
        // Build span hierarchy
        const spanMap = new Map<string, Span>();
        const rootSpans: Span[] = [];
        
        trace.spans.forEach(span => {
            spanMap.set(span.spanId, span);
        });
        
        trace.spans.forEach(span => {
            const parentSpanId = span.parentSpanId || '';
            if (!parentSpanId || 
                parentSpanId === '0000000000000000' || 
                parentSpanId === '' ||
                !spanMap.has(parentSpanId)) {
                rootSpans.push(span);
            }
        });

        const formatSpan = (span: Span, indent: number = 0): string => {
            const childSpans = trace.spans.filter(s => s.parentSpanId === span.spanId);
            const spanKind = this.getSpanKindLabel(span.kind);
            
            return `
                <div class="span-item" style="margin-left: ${indent * 20}px;">
                    <div class="span-header">
                        <span class="span-name">${this.escapeHtml(span.name)}</span>
                        <span class="span-kind">${this.escapeHtml(spanKind)}</span>
                    </div>
                    <div class="span-details">
                        <div><strong>Span ID:</strong> ${this.escapeHtml(span.spanId)}</div>
                        <div><strong>Trace ID:</strong> ${this.escapeHtml(span.traceId)}</div>
                        ${span.parentSpanId && span.parentSpanId !== '0000000000000000' 
                            ? `<div><strong>Parent Span ID:</strong> ${this.escapeHtml(span.parentSpanId)}</div>`
                            : '<div><strong>Parent:</strong> Root Span</div>'}
                        ${childSpans.length > 0 ? `<div><strong>Child Spans:</strong> ${childSpans.length}</div>` : ''}
                    </div>
                    ${childSpans.length > 0 ? `
                        <div class="span-children">
                            ${childSpans.map(child => formatSpan(child, indent + 1)).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        };

        return rootSpans.map(span => formatSpan(span, 0)).join('');
    }

    private getSpanKindLabel(kind: string | number): string {
        if (typeof kind === 'string') {
            return kind;
        }
        const kindMap: { [key: number]: string } = {
            0: 'UNSPECIFIED',
            1: 'INTERNAL',
            2: 'SERVER',
            3: 'CLIENT',
            4: 'PRODUCER',
            5: 'CONSUMER'
        };
        return kindMap[kind] || `UNKNOWN(${kind})`;
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
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

