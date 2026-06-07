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

import { WebviewViewProvider, WebviewView, WebviewViewResolveContext, CancellationToken, ExtensionContext, Webview } from "vscode";
import { BallerinaExtension, ExtendedLangClient } from "../../core";
import { CMP_NOTEBOOK, sendTelemetryEvent, TM_EVENT_UPDATE_VARIABLE_VIEW } from "../../features/telemetry";
import { getComposerWebViewOptions, getLibraryWebViewContent, WebViewOptions } from "../../utils";

// let webviewRPCHandler: WebViewRPCHandler;

export class VariableViewProvider implements WebviewViewProvider {

	public static readonly viewType = 'ballerinaViewVariables';
	private ballerinaExtension: BallerinaExtension;

	constructor(extensionInstance: BallerinaExtension) {
		this.ballerinaExtension = extensionInstance;
	}

	public resolveWebviewView(webviewView: WebviewView, _context: WebviewViewResolveContext, _token: CancellationToken) {
		const context = <ExtensionContext>this.ballerinaExtension.context;
		const langClient = <ExtendedLangClient>this.ballerinaExtension.langClient;
		webviewView.webview.options = {
			enableScripts: true,
		};
		// webviewRPCHandler = WebViewRPCHandler.create(webviewView, langClient, []);
		const html = this.getHtmlForWebview(context, langClient, webviewView.webview);
		webviewView.webview.html = html;
	}

	private getHtmlForWebview(_context: ExtensionContext, _langClient: ExtendedLangClient, webView: Webview) {
		const body = `<div id="variables" class="variables-container" />`;
		const bodyCss = "variables";
		const styles = `
			.variables {
				background-color: transparent;
			}
		`;
		const scripts = `
				function loadedScript() {
					const langClient = getLangClient();
					function renderVariableValues() {
						variableView.renderVariableView(document.getElementById("variables"), 
						langClient.getNotebookVariables);
					}
					webViewRPCHandler.addMethod("updateVariableValues", (args) => {
						variableView.updateVariableValues();
						return Promise.resolve({});
					});
					renderVariableValues();
				}
			`;

		const webViewOptions: WebViewOptions = {
			...getComposerWebViewOptions("VariableView", webView),
			body, scripts, styles, bodyCss
		};

		return getLibraryWebViewContent(webViewOptions, webView);
	}

	public updateVariables() {
		sendTelemetryEvent(this.ballerinaExtension, TM_EVENT_UPDATE_VARIABLE_VIEW, CMP_NOTEBOOK);
		// if (webviewRPCHandler) {
		// 	webviewRPCHandler.invokeRemoteMethod("updateVariableValues", undefined, () => { });
		// }
	}

	public dispose() {
		this.ballerinaExtension.setNotebookVariableViewEnabled(false);
	}
}
