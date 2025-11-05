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

export class TraceWindowWebview {
    public static currentPanel: TraceWindowWebview | undefined;
    public static readonly viewType = 'ballerina.trace-window';
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    private _logEntries: LogEntry[] = [];

    constructor() {
        this._panel = TraceWindowWebview.createWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        
        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'clear':
                        this._logEntries = [];
                        this.updateWebview();
                        break;
                    case 'export':
                        this.exportLogs();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private static createWebview(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            TraceWindowWebview.viewType,
            "Ballerina Trace Window",
            ViewColumn.Beside,
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

    public getWebview(): vscode.WebviewPanel | undefined {
        return this._panel;
    }

    public addLogEntry(message: string, category: 'stderr' | 'stdout' | 'stdlog') {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            message: message,
            category: category,
            level: category === 'stderr' ? 'error' : 'info'
        };
        this._logEntries.push(entry);
        this.updateWebview();
    }

    private updateWebview() {
        if (this._panel) {
            this._panel.webview.postMessage({
                command: 'updateLogs',
                logs: this._logEntries
            });
        }
    }

    private async exportLogs() {
        try {
            const logsContent = this._logEntries
                .map(entry => `[${entry.timestamp}] [${entry.level}] ${entry.message}`)
                .join('\n');
            
            if (logsContent.trim()) {
                const doc = await vscode.workspace.openTextDocument({
                    content: logsContent,
                    language: 'plaintext'
                });
                await vscode.window.showTextDocument(doc);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to export logs: ' + error);
        }
    }

    private getWebviewContent(webView: vscode.Webview): string {
        const logsHtml = this._logEntries.map((log, index) => 
            `<div class="log-entry ${log.level}">
                <span class="timestamp">${log.timestamp}</span>
                <span class="level">[${log.level}]</span>
                <span class="message">${this.escapeHtml(log.message)}</span>
            </div>`
        ).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ballerina Trace Window</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .header {
            padding: 10px;
            background-color: var(--vscode-titleBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h3 {
            margin: 0;
            font-size: 14px;
        }
        .controls {
            display: flex;
            gap: 10px;
        }
        button {
            padding: 4px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .log-container {
            padding: 10px;
            overflow-y: auto;
            height: calc(100vh - 80px);
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
        }
        .log-entry {
            margin-bottom: 4px;
            padding: 4px;
            border-left: 3px solid transparent;
        }
        .log-entry.error {
            border-left-color: var(--vscode-errorForeground);
            color: var(--vscode-errorForeground);
        }
        .log-entry.info {
            border-left-color: var(--vscode-textLink-foreground);
        }
        .log-entry.success {
            border-left-color: var(--vscode-testing-iconPassed);
        }
        .timestamp {
            color: var(--vscode-descriptionForeground);
            margin-right: 10px;
            font-size: 10px;
        }
        .level {
            font-weight: bold;
            margin-right: 8px;
        }
        .message {
            white-space: pre-wrap;
            word-break: break-word;
        }
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            margin-top: 50px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h3>Ballerina Trace Logs</h3>
        <div class="controls">
            <button id="exportBtn">Export</button>
            <button id="clearBtn">Clear</button>
        </div>
    </div>
    <div class="log-container" id="logContainer">
        ${this._logEntries.length === 0 ? '<div class="empty-state">No trace logs yet. Start debugging or running your Ballerina program to see logs here.</div>' : logsHtml}
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const logContainer = document.getElementById('logContainer');
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function renderLogs(logs) {
            if (logs.length === 0) {
                logContainer.innerHTML = '<div class="empty-state">No trace logs yet. Start debugging or running your Ballerina program to see logs here.</div>';
            } else {
                logContainer.innerHTML = logs.map(log => 
                    \`<div class="log-entry \${log.level}">
                        <span class="timestamp">\${log.timestamp}</span>
                        <span class="level">[\${log.level}]</span>
                        <span class="message">\${escapeHtml(log.message)}</span>
                    </div>\`
                ).join('');
                // Auto-scroll to bottom
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'updateLogs':
                    renderLogs(message.logs);
                    break;
            }
        });
        
        // Handle button clicks
        document.getElementById('exportBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'export' });
        });
        
        document.getElementById('clearBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'clear' });
        });
    </script>
</body>
</html>`;
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

    public dispose() {
        TraceWindowWebview.currentPanel = undefined;
        this._panel?.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }

        this._panel = undefined;
    }
}

interface LogEntry {
    timestamp: string;
    message: string;
    category: 'stderr' | 'stdout' | 'stdlog';
    level: 'error' | 'info' | 'success';
}

