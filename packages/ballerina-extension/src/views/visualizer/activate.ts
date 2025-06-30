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
import { PALETTE_COMMANDS } from '../../features/project/cmds/cmd-runner';
import { StateMachine, openView } from '../../stateMachine';
import { extension } from '../../BalExtensionContext';
import { BI_COMMANDS, EVENT_TYPE, MACHINE_VIEW, SHARED_COMMANDS } from '@wso2/ballerina-core';
import { ViewColumn } from 'vscode';
import { buildProjectArtifactsStructure } from '../../utils/project-artifacts';

export function activateSubscriptions() {
    const context = extension.context;
    context.subscriptions.push(
        vscode.commands.registerCommand(PALETTE_COMMANDS.SHOW_SOURCE, () => {
            const path = StateMachine.context().documentUri;
            if (!path) {
                return;
            }
            vscode.window.showTextDocument(vscode.Uri.file(path), { viewColumn: ViewColumn.Beside });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(PALETTE_COMMANDS.SHOW_ENTITY_DIAGRAM, (path, selectedRecord = "") => {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.ERDiagram, documentUri: path?.fsPath || vscode.window.activeTextEditor.document.uri.fsPath, identifier: selectedRecord });
        })
    );


    // <------------- Shared Commands ------------>
    context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.SHOW_VISUALIZER, (path: string | vscode.Uri, position, resetHistory = false) => {
            const documentPath = path ? (typeof path === "string" ? path : path.fsPath) : "";
            if (StateMachine.langClient() && StateMachine.context().isBISupported) { // This is added since we can't fetch new diagram data without bi supported ballerina version
                openView(EVENT_TYPE.OPEN_VIEW, { documentUri: documentPath || vscode.window.activeTextEditor?.document.uri.fsPath, position: position }, resetHistory);
            } else {
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BallerinaUpdateView }); // Redirect user to the ballerina update available page
            }

        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.GET_STATE_CONTEXT, () => {
            return StateMachine.context();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.FORCE_UPDATE_PROJECT_ARTIFACTS, () => {
            return buildProjectArtifactsStructure(StateMachine.context().projectUri, StateMachine.langClient(), true);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.OPEN_BI_WELCOME, () => {
            if (StateMachine.langClient()) {
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIWelcome });
            } else {
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.SetupView });
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(SHARED_COMMANDS.OPEN_BI_NEW_PROJECT, () => {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIProjectForm });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(BI_COMMANDS.OPEN_TYPE_DIAGRAM, () => {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.TypeDiagram });
        })
    );


    StateMachine.service().onTransition((state) => {
        vscode.commands.executeCommand('setContext', 'showBalGoToSource', state.context?.documentUri !== undefined);
    });

}
