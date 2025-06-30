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

import { ExtensionContext, commands, window, Location, Uri, TextEditor, extensions } from 'vscode';
import { ballerinaExtInstance, BallerinaExtension } from './core';
import { activate as activateBBE } from './views/bbe';
import {
    activate as activateTelemetryListener, CMP_EXTENSION_CORE, sendTelemetryEvent,
    TM_EVENT_EXTENSION_ACTIVATE
} from './features/telemetry';
import { activateDebugConfigProvider } from './features/debugger';
import { activate as activateProjectFeatures } from './features/project';
import { activate as activateEditorSupport } from './features/editor-support';
import { activate as activateTesting } from './features/testing/activator';
import { activate as activateBITesting } from './features/test-explorer/activator';
import { StaticFeature, DocumentSelector, ServerCapabilities, InitializeParams, FeatureState } from 'vscode-languageclient';
import { ExtendedLangClient } from './core/extended-language-client';
import { activate as activateNotebook } from './views/notebook';
import { activate as activateLibraryBrowser } from './features/library-browser';
import { activate as activateBIFeatures } from './features/bi';
import { activate as activateERDiagram } from './views/persist-layer-diagram';
import { activateAiPanel } from './views/ai-panel';
import { debug, handleResolveMissingDependencies, log } from './utils';
import { activateUriHandlers } from './utils/uri-handlers';
import { StateMachine } from './stateMachine';
import { activateSubscriptions } from './views/visualizer/activate';
import { extension } from './BalExtensionContext';
import { ExtendedClientCapabilities } from '@wso2/ballerina-core';
import { RPCLayer } from './RPCLayer';
import { activateAIFeatures } from './features/ai/activator';
import { activateTryItCommand } from './features/tryit/activator';
import { activate as activateNPFeatures } from './features/natural-programming/activator';
import { activateAgentChatPanel } from './views/agent-chat/activate';

let langClient: ExtendedLangClient;
export let isPluginStartup = true;

// TODO initializations should be contributions from each component
function onBeforeInit(langClient: ExtendedLangClient) {
    class TraceLogsFeature implements StaticFeature {
        preInitialize?: (capabilities: ServerCapabilities<any>, documentSelector: DocumentSelector) => void;
        getState(): FeatureState {
            throw new Error('Method not implemented.');
        }
        fillInitializeParams?: ((params: InitializeParams) => void) | undefined;
        dispose(): void {
        }
        fillClientCapabilities(capabilities: ExtendedClientCapabilities): void {
            capabilities.experimental = capabilities.experimental || { introspection: false, showTextDocument: false };
            capabilities.experimental.introspection = true;
        }
        initialize(_capabilities: ServerCapabilities, _documentSelector: DocumentSelector | undefined): void {
        }
    }

    class ShowFileFeature implements StaticFeature {
        preInitialize?: (capabilities: ServerCapabilities<any>, documentSelector: DocumentSelector) => void;
        getState(): FeatureState {
            throw new Error('Method not implemented.');
        }
        fillInitializeParams?: ((params: InitializeParams) => void) | undefined;
        dispose(): void {

        }
        fillClientCapabilities(capabilities: ExtendedClientCapabilities): void {
            capabilities.experimental = capabilities.experimental || { introspection: false, showTextDocument: false };
            capabilities.experimental.showTextDocument = true;
        }
        initialize(_capabilities: ServerCapabilities, _documentSelector: DocumentSelector | undefined): void {
        }
    }

    class ExperimentalLanguageFeatures implements StaticFeature {
        getState(): FeatureState {
            throw new Error('Method not implemented.');
        }
        fillInitializeParams?: ((params: InitializeParams) => void) | undefined;
        dispose(): void {
        }
        fillClientCapabilities(capabilities: ExtendedClientCapabilities): void {
            capabilities.experimental = capabilities.experimental || { introspection: false, showTextDocument: false };
            capabilities.experimental.experimentalLanguageFeatures = ballerinaExtInstance.enabledExperimentalFeatures();
        }
        initialize(_capabilities: ServerCapabilities, _documentSelector: DocumentSelector | undefined): void {
        }
    }

    langClient.registerFeature(new TraceLogsFeature());
    langClient.registerFeature(new ShowFileFeature());
    langClient.registerFeature(new ExperimentalLanguageFeatures());
}

export async function activate(context: ExtensionContext) {
    extension.context = context;
    // Init RPC Layer methods
    RPCLayer.init();
    // Wait for the ballerina extension to be ready
    await StateMachine.initialize();
    // Then return the ballerina extension context
    return { ballerinaExtInstance, projectPath: StateMachine.context().projectUri };
}

export async function activateBallerina(): Promise<BallerinaExtension> {
    debug('Active the Ballerina VS Code extension.');
    sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_EXTENSION_ACTIVATE, CMP_EXTENSION_CORE);
    ballerinaExtInstance.setContext(extension.context);
    // Enable URI handlers
    activateUriHandlers(ballerinaExtInstance);
    // Activate Subscription Commands
    activateSubscriptions();
    await ballerinaExtInstance.init(onBeforeInit).then(() => {
        // <------------ CORE FUNCTIONS ----------->
        // Activate Library Browser
        activateLibraryBrowser(ballerinaExtInstance);

        // Enable Ballerina Project related features
        activateProjectFeatures();

        // Enable Ballerina Debug Config Provider
        activateDebugConfigProvider(ballerinaExtInstance);

        // Activate editor support
        activateEditorSupport(ballerinaExtInstance);

        // <------------ MAIN FEATURES ----------->
        // Enable Ballerina by examples
        activateBBE(ballerinaExtInstance);

        //Enable BI Feature
        activateBIFeatures(ballerinaExtInstance);

        // Enable Ballerina Testing Explorer
        activateBITesting(ballerinaExtInstance);

        // Enable Ballerina Notebook
        activateNotebook(ballerinaExtInstance);

        // activateDesignDiagramView(ballerinaExtInstance);
        activateERDiagram(ballerinaExtInstance);

        // <------------ OTHER FEATURES ----------->
        // Enable Ballerina Telemetry listener
        activateTelemetryListener(ballerinaExtInstance);

        //activate ai panel
        activateAiPanel(ballerinaExtInstance);

        // Activate AI features
        activateAIFeatures(ballerinaExtInstance);

        // Activate Try It command
        activateTryItCommand(ballerinaExtInstance);

        // Activate natural programming features
        activateNPFeatures(ballerinaExtInstance);

        // Activate Agent Chat Panel
        activateAgentChatPanel(ballerinaExtInstance);

        langClient = <ExtendedLangClient>ballerinaExtInstance.langClient;
        // Register showTextDocument listener
        langClient.onNotification('window/showTextDocument', (location: Location) => {
            if (location.uri !== undefined) {
                window.showTextDocument(Uri.parse(location.uri.toString()), { selection: location.range });
            }
        });
        isPluginStartup = false;
    }).catch((e) => {
        log("Failed to activate Ballerina extension. " + (e.message ? e.message : e));
        const cmds: any[] = ballerinaExtInstance.extension.packageJSON.contributes.commands;

        // LS Extension fails
        commands.executeCommand('setContext', 'BI.status', 'noLS');

        if (e.message && e.message.includes('Error when checking ballerina version.')) {
            ballerinaExtInstance.showMessageInstallBallerina();
            ballerinaExtInstance.showMissingBallerinaErrInStatusBar();

            // TODO: Fix this properly
            // cmds.forEach((cmd) => {
            //     const cmdID: string = cmd.command;
            //     // This is to skip the command un-registration
            //     if (!(cmdID.includes("ballerina-setup") || cmdID.includes(SHARED_COMMANDS.OPEN_BI_WELCOME))) {
            //         commands.registerCommand(cmdID, () => {
            //             ballerinaExtInstance.showMessageInstallBallerina();
            //         });
            //     }
            // });
        }
        // When plugins fails to start, provide a warning upon each command execution
        else if (!ballerinaExtInstance.langClient) {
            // TODO: Fix this properly
            // cmds.forEach((cmd) => {
            //     const cmdID: string = cmd.command;
            //     // This is to skip the command un-registration
            //     if (!(cmdID.includes("ballerina-setup") || cmdID.includes(SHARED_COMMANDS.OPEN_BI_WELCOME))) {
            //         commands.registerCommand(cmdID, () => {
            //             const actionViewLogs = "View Logs";
            //             window.showWarningMessage("Ballerina extension did not start properly."
            //                 + " Please check extension logs for more info.", actionViewLogs)
            //                 .then((action) => {
            //                     if (action === actionViewLogs) {
            //                         const logs = ballerinaExtInstance.getOutPutChannel();
            //                         if (logs) {
            //                             logs.show();
            //                         }
            //                     }
            //                 });
            //         });
            //     }
            // });
        }
    }).finally(() => {
        if (ballerinaExtInstance.langClient) {
            handleResolveMissingDependencies(ballerinaExtInstance);
        }
    });
    return ballerinaExtInstance;
}

export function deactivate(): Thenable<void> | undefined {
    debug('Deactive the Ballerina VS Code extension.');
    if (!langClient) {
        return;
    }
    ballerinaExtInstance.telemetryReporter.dispose();
    return langClient.stop();
}
