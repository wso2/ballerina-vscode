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
import {
    ColorThemeKind,
    HistoryEntry,
    UpdateUndoRedoMangerRequest,
    VisualizerAPI,
    OpenViewRequest,
    MACHINE_VIEW,
    PopupVisualizerLocation,
    VisualizerLocation,
    EVENT_TYPE,
    SHARED_COMMANDS
} from "@wso2/ballerina-core";
import { history, openView, undoRedoManager, updateView } from "../../stateMachine";
import { openPopupView } from "../../stateMachinePopup";
import { commands, window } from "vscode";

export class VisualizerRpcManager implements VisualizerAPI {

    openView(params: OpenViewRequest): Promise<void> {
        return new Promise(async (resolve) => {
            if (params.isPopup) {
                const view = params.location.view;
                if (view && view === MACHINE_VIEW.Overview) {
                    openPopupView(EVENT_TYPE.CLOSE_VIEW, params.location as PopupVisualizerLocation);
                } else {
                    openPopupView(params.type, params.location as PopupVisualizerLocation);
                }
            } else {
                openView(params.type, params.location as VisualizerLocation);
            }
        });
    }

    goBack(): void {
        history.pop();
        updateView();
    }

    async getHistory(): Promise<HistoryEntry[]> {
        return history.get();
    }

    goHome(): void {
        history.clear();
        commands.executeCommand(SHARED_COMMANDS.FORCE_UPDATE_PROJECT_ARTIFACTS).then(() => {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview }, true);
        });
    }

    goSelected(index: number): void {
        history.select(index);
        updateView();
    }

    addToHistory(entry: HistoryEntry): void {
        history.push(entry);
        updateView();
    }

    async undo(): Promise<string> {
        return undoRedoManager.undo();
    }

    async redo(): Promise<string> {
        return undoRedoManager.redo();
    }

    addToUndoStack(source: string): void {
        undoRedoManager.addModification(source);
    }

    updateUndoRedoManager(params: UpdateUndoRedoMangerRequest): void {
        undoRedoManager.updateContent(params.filePath, params.fileContent);
    }

    async getThemeKind(): Promise<ColorThemeKind> {
        return new Promise((resolve) => {
            resolve(window.activeColorTheme.kind);
        });
    }
}
