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

import { ExtendedLangClient } from '../../core/extended-language-client';
import { ExtensionContext, Webview } from 'vscode';
import { getLibraryWebViewContent, WebViewOptions, getComposerWebViewOptions } from '../../utils';

export function render(_context: ExtensionContext, _langClient: ExtendedLangClient, webView: Webview)
    : string {

    const body = `<div id="examples" class="examples-container" />`;
    const bodyCss = "examples";
    const styles = ``;
    const scripts = `
            function loadedScript() {
                    function openExample(url) {
                        webViewRPCHandler.invokeRemoteMethod("openExample", [url]);
                    }
                    const langClient = getLangClient();
                    function renderSamples() {
                        BBEViewer.renderSamplesList(document.getElementById("examples"), openExample,
                        langClient.getExamples, () => {});
                    }
                    renderSamples();
            }
        `;

    const webViewOptions: WebViewOptions = {
        ...getComposerWebViewOptions("BBEViewer", webView),
        body, scripts, styles, bodyCss
    };

    return getLibraryWebViewContent(webViewOptions, webView, "", "");
}

