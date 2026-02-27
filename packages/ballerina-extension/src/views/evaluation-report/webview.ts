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

    private getDarkModeStyles(): string {
        return `<style id="vscode-dark-mode-overrides">
body.vscode-dark,
body.vscode-high-contrast {
    background-color: var(--vscode-editor-background, #1e1e1e) !important;
    color: var(--vscode-editor-foreground, #cccccc) !important;
}

body.vscode-dark .header-section,
body.vscode-dark .coverage-content thead,
body.vscode-dark .eval-runs-cell,
body.vscode-dark .summary-card.progress-card,
body.vscode-dark .eval-matrix-header,
body.vscode-dark .eval-outcome-id {
    background: var(--vscode-sideBar-background, #252526) !important;
}

body.vscode-dark .eval-failure-message,
body.vscode-dark .eval-page-summary,
body.vscode-dark .eval-page-section,
body.vscode-dark .test-error-controls,
body.vscode-dark table{
    background: var(--vscode-sideBar-background, #252526) !important;
    border-color: var(--vscode-panel-border, #3e3e42) !important;
}

body.vscode-dark .eval-list-item-header,
body.vscode-dark .eval-list-item-error {
    background-color: var(--vscode-editor-background, #1e1e1e) !important;
}

body.vscode-dark .eval-list-item.failed .eval-list-item-header:hover {
    background-color: var(--vscode-list-hoverBackground, #2a2d2e) !important;
}

body.vscode-dark .row.card {
    background-color: transparent !important;
}

body.vscode-dark .card,
body.vscode-dark .summary-card,
body.vscode-dark .table thead,
body.vscode-dark .header-section,
body.vscode-dark .eval-matrix td,
body.vscode-dark .eval-matrix th,
body.vscode-dark .eval-list-item,
body.vscode-dark .test-error-controls,
body.vscode-dark .eval-section-title,
body.vscode-dark .eval-summary-card,
body.vscode-dark .coverage-content code:last-child > span {
    border-color: var(--vscode-panel-border, #3e3e42) !important;
}

body.vscode-dark .project,
body.vscode-dark .title_projectname,
body.vscode-dark .eval-breadcrumb-test,
body.vscode-dark .eval-stat-value,
body.vscode-dark .eval-summary-name,
body.vscode-dark .eval-section-title,
body.vscode-dark .eval-list-item-title {
    color: var(--vscode-editor-foreground, #cccccc) !important;
}

body.vscode-dark .module-content .title,
body.vscode-dark .table,
body.vscode-dark .table td span.link,
body.vscode-dark .expand-indicator,
body.vscode-dark .eval-runs-summary,
body.vscode-dark .eval-breadcrumb-module,
body.vscode-dark .eval-breadcrumb-separator,
body.vscode-dark .eval-stat-label,
body.vscode-dark .eval-summary-title,
body.vscode-dark .eval-run-label,
body.vscode-dark .eval-expand-icon {
    color: var(--vscode-descriptionForeground, #9d9d9d) !important;
}
    

body.vscode-dark .total {
    background: var(--vscode-badge-background, #4d4d4d) !important;
    color: var(--vscode-badge-foreground, #ffffff) !important;
}

body.vscode-dark code.lineNumbers {
    background-color: var(--vscode-textBlockQuote-background, #2a2d2e) !important;
    color: var(--vscode-descriptionForeground, #9d9d9d) !important;
}

body.vscode-dark .eval-error-content {
    background-color: rgba(247, 75, 90, 0.08) !important;
    color: var(--vscode-editor-foreground, #cccccc) !important;
}

body.vscode-dark header {
    margin-bottom: 0 !important;
    margin-top: 0 !important;
    padding-top: 1.5em;
    padding-bottom: 1em;
}

body.vscode-dark .table td,
body.vscode-dark .table th {
    border-color: var(--vscode-panel-border, #3e3e42) !important;
    background-color: transparent !important;
    color: var(--vscode-editor-foreground, #cccccc);
}

body.vscode-dark .table thead tr {
    background-color: var(--vscode-sideBar-background, #252526) !important;
}
body.vscode-dark .table thead th {
    color: var(--vscode-editor-foreground, #cccccc) !important;
    border-color: var(--vscode-panel-border, #3e3e42) !important;
}

body.vscode-dark .table-striped tbody tr:nth-of-type(odd) {
    background-color: rgba(255, 255, 255, 0.04) !important;
}
body.vscode-dark .table-striped tbody tr:nth-of-type(even) {
    background-color: transparent !important;
}

body.vscode-dark .table .PASSED,
body.vscode-dark .table .PASSED td {
    color: #24a2b7 !important;
}
body.vscode-dark .table .FAILURE,
body.vscode-dark .table .FAILURE td {
    color: #f74b5a !important;
}

body.vscode-dark .table td span.link {
    border-bottom-color: var(--vscode-descriptionForeground, #9d9d9d) !important;
}
</style>`;
    }

    private processHtmlContent(reportContent: string, reportDir: Uri): string {
        // First, inject VS Code API script and dark mode styles
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
            </script>${this.getDarkModeStyles()}</head>`
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
            light: Uri.file(path.join(extension.context.extensionPath, "resources", "icons", "light-icon.svg")),
            dark: Uri.file(path.join(extension.context.extensionPath, "resources", "icons", "dark-icon.svg")),
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
