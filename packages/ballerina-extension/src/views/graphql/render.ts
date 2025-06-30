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

import { Webview } from 'vscode';
import { getLibraryWebViewContent, WebViewOptions, getComposerWebViewOptions } from '../../utils';

export function render(data: any, webView: Webview)
    : string {

    const body = `<div id="graphql-view" class="graphql-container"><div class="loader" /></div>`;
    const bodyCss = "graphql";
    const styles = `
        .loader {
            border: 3px solid var(--vscode-editor-background);
            border-top: 3px solid var(--vscode-button-background);
            border-radius: 50%;
            width: 28px;
            height: 28px;
            animation: spin 1s linear infinite;
            margin: auto;
            margin-top: 38%;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        body {
            padding: 0;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
    `;
    const scripts = `
             function loadedScript() {
                window.Graphql.renderGraphql(${JSON.stringify(data)});
             }
         `;
    const webViewOptions: WebViewOptions = {
        ...getComposerWebViewOptions("Graphql", webView, { disableComDebug: true }), body, scripts, styles, bodyCss,
    };

    return getLibraryWebViewContent(webViewOptions, webView);
}
