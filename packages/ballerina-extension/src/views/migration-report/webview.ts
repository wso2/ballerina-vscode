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

export class MigrationReportWebview {
    public static currentPanel: MigrationReportWebview | undefined;
    private _panel: WebviewPanel;
    private _disposables: Disposable[] = [];

    private constructor(panel: WebviewPanel, reportContent: string) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        const htmlWithStyleRemoval = reportContent.replace(
            "</head>",
            `<script>
                document.addEventListener('DOMContentLoaded', function() {
                    const defaultStyles = document.getElementById('_defaultStyles');
                    if (defaultStyles) {
                        defaultStyles.remove();
                    }
                });
            </script></head>`
        );

        this._panel.webview.html = htmlWithStyleRemoval;
    }

    public static createOrShow(fileName: string, reportContent: string): void {
        if (MigrationReportWebview.currentPanel) {
            MigrationReportWebview.currentPanel._panel.reveal(ViewColumn.Active);
            MigrationReportWebview.currentPanel.updateContent(reportContent);
            return;
        }

        const panel = window.createWebviewPanel(
            "migrationReport",
            `Migration Report`,
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

        MigrationReportWebview.currentPanel = new MigrationReportWebview(panel, reportContent);
    }

    private updateContent(reportContent: string): void {
        const htmlWithStyleRemoval = reportContent.replace(
            "</head>",
            `<script>
                document.addEventListener('DOMContentLoaded', function() {
                    const defaultStyles = document.getElementById('_defaultStyles');
                    if (defaultStyles) {
                        defaultStyles.remove();
                    }
                });
            </script></head>`
        );

        this._panel.webview.html = htmlWithStyleRemoval;
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
