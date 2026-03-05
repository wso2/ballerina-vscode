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

import { Disposable, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { extension } from "../../BalExtensionContext";
import path from "path";
import * as fs from "fs";

export class EvaluationReportWebview {
    public static currentPanel: EvaluationReportWebview | undefined;
    private _panel: WebviewPanel;
    private _disposables: Disposable[] = [];

    private constructor(panel: WebviewPanel, reportContent: string, reportDir: Uri) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Convert local resource paths to webview URIs
        const processedHtml = this.processHtmlContent(reportContent, reportDir);

        this._panel.webview.html = processedHtml;
    }

    private processHtmlContent(reportContent: string, reportDir: Uri): string {
        // First, inject VS Code API script
        let html = reportContent.replace(
            "</head>",
            `<script>
                const vscode = acquireVsCodeApi();
                document.addEventListener('DOMContentLoaded', function() {
                    const defaultStyles = document.getElementById('_defaultStyles');
                    if (defaultStyles) {
                        defaultStyles.remove();
                    }
                });
            </script></head>`
        );

        // If </head> wasn't found, try injecting at the start of body
        if (html === reportContent) {
            html = reportContent.replace(
                /<body([^>]*)>/i,
                `<body$1><script>const vscode = acquireVsCodeApi();</script>`
            );
        }

        // Convert relative paths to webview URIs
        // Handle src="./..." or src="..." (relative paths)
        html = html.replace(/(?:src|href)=["'](?!http|https|data:)([^"']+)["']/gi, (match, relativePath) => {
            try {
                const resourcePath = Uri.joinPath(reportDir, relativePath);
                const webviewUri = this._panel.webview.asWebviewUri(resourcePath);
                return match.replace(relativePath, webviewUri.toString());
            } catch (e) {
                console.error('Failed to convert resource path:', relativePath, e);
                return match;
            }
        });

        return html;
    }

    public static async createOrShow(reportUri: Uri): Promise<void> {
        const reportPath = reportUri.fsPath;

        // Validate file exists
        if (!fs.existsSync(reportPath)) {
            window.showErrorMessage(`Evaluation report not found: ${reportPath}`);
            return;
        }

        // Read HTML content
        let reportContent: string;
        try {
            reportContent = fs.readFileSync(reportPath, 'utf8');
        } catch (error) {
            window.showErrorMessage(`Failed to read evaluation report: ${error}`);
            console.error('Failed to read evaluation report:', error);
            return;
        }

        const fileName = path.basename(reportPath);
        const reportDir = Uri.file(path.dirname(reportPath));

        // Dispose existing panel so the new one can be created with the correct localResourceRoots
        if (EvaluationReportWebview.currentPanel) {
            EvaluationReportWebview.currentPanel.dispose();
        }

        // Create new panel
        const panel = window.createWebviewPanel(
            "ballerinaEvaluationReport",
            `Evaluation Report - ${fileName}`,
            ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [reportDir],
            }
        );

        panel.iconPath = {
            light: Uri.file(path.join(extension.context.extensionPath, "resources", "icons", "dark-icon.svg")),
            dark: Uri.file(path.join(extension.context.extensionPath, "resources", "icons", "light-icon.svg")),
        };

        EvaluationReportWebview.currentPanel = new EvaluationReportWebview(panel, reportContent, reportDir);
    }

    private updateContent(reportContent: string, reportDir: Uri): void {
        const processedHtml = this.processHtmlContent(reportContent, reportDir);
        this._panel.webview.html = processedHtml;
    }

    public dispose(): void {
        EvaluationReportWebview.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
