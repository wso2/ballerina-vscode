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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    HistoryEntry,
    OpenViewRequest,
    UpdateUndoRedoMangerRequest,
    addToHistory,
    addToUndoStack,
    getThemeKind,
    getHistory,
    goBack,
    goHome,
    goSelected,
    openView,
    redo,
    undo,
    updateUndoRedoManager
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { VisualizerRpcManager } from "./rpc-manager";

export function registerVisualizerRpcHandlers(messenger: Messenger) {
    const rpcManger = new VisualizerRpcManager();
    messenger.onNotification(openView, (args: OpenViewRequest) => rpcManger.openView(args));
    messenger.onRequest(getHistory, () => rpcManger.getHistory());
    messenger.onNotification(addToHistory, (args: HistoryEntry) => rpcManger.addToHistory(args));
    messenger.onNotification(goBack, () => rpcManger.goBack());
    messenger.onNotification(goHome, () => rpcManger.goHome());
    messenger.onNotification(goSelected, (args: number) => rpcManger.goSelected(args));
    messenger.onRequest(undo, () => rpcManger.undo());
    messenger.onRequest(redo, () => rpcManger.redo());
    messenger.onNotification(addToUndoStack, (args: string) => rpcManger.addToUndoStack(args));
    messenger.onNotification(updateUndoRedoManager, (args: UpdateUndoRedoMangerRequest) => rpcManger.updateUndoRedoManager(args));
    messenger.onRequest(getThemeKind, () => rpcManger.getThemeKind());
}
