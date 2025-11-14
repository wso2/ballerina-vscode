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

import { Disposable, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { extension } from "../../BalExtensionContext";
import path from "path";
import { MigrateIntegrationRpcManager } from "../../rpc-managers/migrate-integration/rpc-manager";

export class MigrationReportWebview {
    public static currentPanel: MigrationReportWebview | undefined;
    private _panel: WebviewPanel;
    private _disposables: Disposable[] = [];

    private constructor(panel: WebviewPanel, reportContent: string) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Get the singleton RPC manager
        const rpcManager = MigrateIntegrationRpcManager.getInstance();

        // Set up message listener to handle clicks from webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                if (message.type === 'openSubProjectReport') {
                    // Forward the message to the RPC manager
                    rpcManager.openSubProjectReport({
                        projectName: message.projectName
                    }).catch(error => {
                        console.error("Failed to open sub-project report:", error);
                    });
                }
            },
            null,
            this._disposables
        );

        const htmlWithScripts = reportContent.replace(
            "</head>",
            `<script>
                const vscode = acquireVsCodeApi();
                document.addEventListener('DOMContentLoaded', function() {
                    const defaultStyles = document.getElementById('_defaultStyles');
                    if (defaultStyles) {
                        defaultStyles.remove();
                    }

                    // Handle project report links in aggregate reports
                    const projectLinks = document.querySelectorAll('a.project-link');
                    projectLinks.forEach(link => {
                        link.addEventListener('click', function(event) {
                            event.preventDefault();
                            // Extract project name from id attribute (e.g., "narvareapi_ballerina" -> "narvareapi")
                            const projectName = this.id || this.textContent.trim();

                            // Validate project name to prevent XSS - allow only alphanumeric, hyphen, underscore
                            if (/^[a-zA-Z0-9_\-]+$/.test(projectName) && projectName.length > 0) {
                                // Send message to extension via VS Code webview API
                                vscode.postMessage({
                                    type: 'openSubProjectReport',
                                    projectName: projectName
                                });
                            } else {
                                console.error('Invalid project name format:', projectName);
                            }
                        });
                    });
                });
            </script></head>`
        );

        this._panel.webview.html = htmlWithScripts;
    }

    public static createOrShow(fileName: string, reportContent: string): void {
        // For the aggregate report (default name), reuse the panel if it exists
        const isAggregateReport = fileName === "migration-report.html";

        if (isAggregateReport && MigrationReportWebview.currentPanel) {
            MigrationReportWebview.currentPanel._panel.reveal(ViewColumn.Active);
            MigrationReportWebview.currentPanel.updateContent(reportContent);
            return;
        }

        const panel = window.createWebviewPanel(
            isAggregateReport ? "migrationReport" : `migrationReport-${Date.now()}`,
            isAggregateReport ? `Migration Report` : `Migration Report - ${fileName}`,
            ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        panel.iconPath = {
            light: Uri.file(path.join(extension.context.extensionPath, "resources", "icons", "light-icon.svg")),
            dark: Uri.file(path.join(extension.context.extensionPath, "resources", "icons", "dark-icon.svg")),
        };

        const webview = new MigrationReportWebview(panel, reportContent);

        // Only set as currentPanel if it's the aggregate report
        if (isAggregateReport) {
            MigrationReportWebview.currentPanel = webview;
        }
    }

    private updateContent(reportContent: string): void {
        const htmlWithScripts = reportContent.replace(
            "</head>",
            `<script>
                const vscode = acquireVsCodeApi();
                document.addEventListener('DOMContentLoaded', function() {
                    const defaultStyles = document.getElementById('_defaultStyles');
                    if (defaultStyles) {
                        defaultStyles.remove();
                    }

                    // Handle project report links in aggregate reports
                    const projectLinks = document.querySelectorAll('a.project-link');
                    projectLinks.forEach(link => {
                        link.addEventListener('click', function(event) {
                            event.preventDefault();
                            // Extract project name from id attribute (e.g., "narvareapi_ballerina" -> "narvareapi")
                            const projectName = this.id || this.textContent.trim();

                            // Validate project name to prevent XSS - allow only alphanumeric, hyphen, underscore
                            if (/^[a-zA-Z0-9_\-]+$/.test(projectName) && projectName.length > 0) {
                                // Send message to extension via VS Code webview API
                                vscode.postMessage({
                                    type: 'openSubProjectReport',
                                    projectName: projectName
                                });
                            } else {
                                console.error('Invalid project name format:', projectName);
                            }
                        });
                    });
                });
            </script></head>`
        );

        this._panel.webview.html = htmlWithScripts;
    }

    public dispose(): void {
        MigrationReportWebview.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
