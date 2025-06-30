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

import { HistoryEntry } from "../../history";
import { ColorThemeKind } from "../../state-machine-types";
import { OpenViewRequest, UpdateUndoRedoMangerRequest } from "./interfaces";

export interface VisualizerAPI {
    openView: (params: OpenViewRequest) => void;
    getHistory: () => Promise<HistoryEntry[]>;
    addToHistory: (entry: HistoryEntry) => void;
    goBack: () => void;
    goHome: () => void;
    goSelected: (index: number) => void;
    undo: () => Promise<string>;
    redo: () => Promise<string>;
    addToUndoStack: (source: string) => void;
    updateUndoRedoManager: (params: UpdateUndoRedoMangerRequest) => void;
    getThemeKind: () => Promise<ColorThemeKind>;
}
