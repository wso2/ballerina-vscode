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

import { WebviewView, WebviewPanel, window } from 'vscode';
import { Messenger } from 'vscode-messenger';
import { StateMachine } from './stateMachine';
import { stateChanged, getVisualizerLocation, VisualizerLocation, projectContentUpdated, aiStateChanged, sendAIStateEvent, popupStateChanged, getPopupVisualizerState, PopupVisualizerLocation, breakpointChanged, AIMachineEventType, ArtifactData, onArtifactUpdatedNotification, onArtifactUpdatedRequest, currentThemeChanged } from '@wso2/ballerina-core';
import { VisualizerWebview } from './views/visualizer/webview';
import { registerVisualizerRpcHandlers } from './rpc-managers/visualizer/rpc-handler';
import { registerLangClientRpcHandlers } from './rpc-managers/lang-client/rpc-handler';
import { registerLibraryBrowserRpcHandlers } from './rpc-managers/library-browser/rpc-handler';
import { registerServiceDesignerRpcHandlers } from './rpc-managers/service-designer/rpc-handler';
import { registerCommonRpcHandlers } from './rpc-managers/common/rpc-handler';
import { registerPersistDiagramRpcHandlers } from './rpc-managers/persist-diagram/rpc-handler';
import { registerGraphqlDesignerRpcHandlers } from './rpc-managers/graphql-designer/rpc-handler';
import { registerRecordCreatorRpcHandlers } from './rpc-managers/record-creator/rpc-handler';
import { registerBiDiagramRpcHandlers } from './rpc-managers/bi-diagram/rpc-handler';
import { registerAiPanelRpcHandlers } from './rpc-managers/ai-panel/rpc-handler';
import { AiPanelWebview } from './views/ai-panel/webview';
import { AIStateMachine } from './views/ai-panel/aiMachine';
import path from 'path';
import { StateMachinePopup } from './stateMachinePopup';
import { registerAiAgentRpcHandlers } from './rpc-managers/ai-agent/rpc-handler';
import { registerConnectorWizardRpcHandlers } from './rpc-managers/connector-wizard/rpc-handler';
import { registerSequenceDiagramRpcHandlers } from './rpc-managers/sequence-diagram/rpc-handler';
import { registerInlineDataMapperRpcHandlers } from './rpc-managers/inline-data-mapper/rpc-handler';
import { registerTestManagerRpcHandlers } from './rpc-managers/test-manager/rpc-handler';
import { registerIcpServiceRpcHandlers } from './rpc-managers/icp-service/rpc-handler';
import { ballerinaExtInstance } from './core';
import { registerAgentChatRpcHandlers } from './rpc-managers/agent-chat/rpc-handler';
import { ArtifactsUpdated, ArtifactNotificationHandler } from './utils/project-artifacts-handler';

export class RPCLayer {
    static _messenger: Messenger = new Messenger();

    constructor(webViewPanel: WebviewPanel | WebviewView) {
        if (isWebviewPanel(webViewPanel)) {
            RPCLayer._messenger.registerWebviewPanel(webViewPanel as WebviewPanel);
            StateMachine.service().onTransition((state) => {
                RPCLayer._messenger.sendNotification(stateChanged, { type: 'webview', webviewType: VisualizerWebview.viewType }, state.value);
            });
            // Popup machine transition
            StateMachinePopup.service().onTransition((state) => {
                RPCLayer._messenger.sendNotification(popupStateChanged, { type: 'webview', webviewType: VisualizerWebview.viewType }, state.value);
            });
            window.onDidChangeActiveColorTheme((theme) => {
                RPCLayer._messenger.sendNotification(currentThemeChanged, { type: 'webview', webviewType: VisualizerWebview.viewType }, theme.kind);
            });
        } else {
            RPCLayer._messenger.registerWebviewView(webViewPanel as WebviewView);
            AIStateMachine.service().onTransition((state) => {
                RPCLayer._messenger.sendNotification(aiStateChanged, { type: 'webview', webviewType: AiPanelWebview.viewType }, state.value);
            });
        }
    }

    static create(webViewPanel: WebviewPanel | WebviewView) {
        return new RPCLayer(webViewPanel);
    }

    static init() {
        // ----- Main Webview RPC Methods
        RPCLayer._messenger.onRequest(getVisualizerLocation, () => getContext());
        registerVisualizerRpcHandlers(RPCLayer._messenger);
        registerLangClientRpcHandlers(RPCLayer._messenger);
        registerLibraryBrowserRpcHandlers(RPCLayer._messenger);
        registerServiceDesignerRpcHandlers(RPCLayer._messenger);
        registerCommonRpcHandlers(RPCLayer._messenger);
        registerPersistDiagramRpcHandlers(RPCLayer._messenger);
        registerGraphqlDesignerRpcHandlers(RPCLayer._messenger);
        registerRecordCreatorRpcHandlers(RPCLayer._messenger);
        registerBiDiagramRpcHandlers(RPCLayer._messenger);
        registerSequenceDiagramRpcHandlers(RPCLayer._messenger);
        registerConnectorWizardRpcHandlers(RPCLayer._messenger);
        registerTestManagerRpcHandlers(RPCLayer._messenger);
        registerAiAgentRpcHandlers(RPCLayer._messenger);
        registerIcpServiceRpcHandlers(RPCLayer._messenger);
        registerAgentChatRpcHandlers(RPCLayer._messenger);

        // ----- AI Webview RPC Methods
        registerAiPanelRpcHandlers(RPCLayer._messenger);
        RPCLayer._messenger.onRequest(sendAIStateEvent, (event: AIMachineEventType) => AIStateMachine.sendEvent(event));

        // ----- Inline Data Mapper Webview RPC Methods
        registerInlineDataMapperRpcHandlers(RPCLayer._messenger);

        // ----- Popup Views RPC Methods
        RPCLayer._messenger.onRequest(getPopupVisualizerState, () => getPopupContext());

        // ----- Artifact Updated Common Notification
        RPCLayer._messenger.onRequest(onArtifactUpdatedRequest, (artifactData: ArtifactData) => {
            // Get the notification handler instance
            const notificationHandler = ArtifactNotificationHandler.getInstance();
            // Subscribe to notifications
            const artifactUpdateUnsubscribe = notificationHandler.subscribe(ArtifactsUpdated.method, artifactData, (payload) => {
                RPCLayer._messenger.sendNotification(onArtifactUpdatedNotification, { type: 'webview', webviewType: VisualizerWebview.viewType }, payload.data);
                artifactUpdateUnsubscribe();
            });
        });
    }

}

async function getContext(): Promise<VisualizerLocation> {
    const context = StateMachine.context();
    return new Promise((resolve) => {
        resolve({
            documentUri: context.documentUri,
            view: context.view,
            identifier: context.identifier,
            position: context.position,
            syntaxTree: context.syntaxTree,
            isBI: context.isBI,
            projectUri: context.projectUri,
            serviceType: context.serviceType,
            type: context.type,
            isGraphql: context.isGraphql,
            addType: context.addType,
            focusFlowDiagramView: context.focusFlowDiagramView,
            metadata: {
                isBISupported: context.isBISupported,
                haveLS: StateMachine.langClient() && true,
                recordFilePath: path.join(context.projectUri, "types.bal"),
                enableSequenceDiagram: ballerinaExtInstance.enableSequenceDiagramView(),
                target: context.metadata?.target
            },
            scope: context.scope,
            org: context.org,
            package: context.package,
        });
    });
}

async function getPopupContext(): Promise<PopupVisualizerLocation> {
    const context = StateMachinePopup.context();
    return new Promise((resolve) => {
        resolve({
            documentUri: context.documentUri,
            view: context.view,
            recentIdentifier: context.recentIdentifier,
            identifier: context.identifier,
            metadata: context.metadata,
        });
    });
}

function isWebviewPanel(webview: WebviewPanel | WebviewView): boolean {
    const title = webview.title;
    return title === VisualizerWebview.webviewTitle;
}

export function notifyCurrentWebview() {
    RPCLayer._messenger.sendNotification(projectContentUpdated, { type: 'webview', webviewType: VisualizerWebview.viewType }, true);
}

export function notifyAiWebview() {
    RPCLayer._messenger.sendNotification(projectContentUpdated, { type: 'webview', webviewType: AiPanelWebview.viewType }, true);
}

export function notifyBreakpointChange() {
    RPCLayer._messenger.sendNotification(breakpointChanged, { type: 'webview', webviewType: VisualizerWebview.viewType }, true);
}
