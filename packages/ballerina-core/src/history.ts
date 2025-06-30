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
import { VisualizerLocation } from "./state-machine-types";

export interface HistoryEntry {
    location: VisualizerLocation;
    uid?: string;
    dataMapperDepth?: number;
}

export class History {
    private historyStack: HistoryEntry[] = [];

    public get(): HistoryEntry[] {
        return [...this.historyStack];
    }

    public push(item: HistoryEntry): void {
        this.historyStack.push(item);
    }
    
    public pop(): void {
        this.historyStack.pop();
    }
    
    public select(index: number): void {
        if (index < 0 || index >= this.historyStack.length) return;
        this.historyStack = this.historyStack.slice(0, index + 1);
    }
    
    public clear(): void {
        this.historyStack = [];
    }
    
    public clearAndPopulateWith(historyEntry: HistoryEntry): void {
        this.historyStack = [historyEntry];
    }
    
    public updateCurrentEntry(historyEntry: HistoryEntry): void {
        if (this.historyStack.length === 0) return;
        const newHistory = [...this.historyStack];
        newHistory[newHistory.length - 1] = historyEntry;
        this.historyStack = newHistory;
    }
}
