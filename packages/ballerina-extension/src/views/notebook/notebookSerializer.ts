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

import { TextDecoder, TextEncoder } from 'util';
import {
    CancellationToken, NotebookCellData, NotebookCellExecutionSummary, NotebookCellKind,
    NotebookCellOutput, NotebookCellOutputItem, NotebookData, NotebookSerializer
} from 'vscode';
import { ballerinaExtInstance } from "../../core";
import { CMP_NOTEBOOK, sendTelemetryEvent, TM_EVENT_CLOSE_NOTEBOOK, TM_EVENT_OPEN_NOTEBOOK } from "../../features/telemetry";

/**
 * Data structure to store infomation of notebook cells
 */
interface RawNotebookCell {
    language: string;
    value: string;
    kind: NotebookCellKind;
    outputs: RawCellOutput[][];
    executionSummary?: NotebookCellExecutionSummary;
    metadata?: { [key: string]: any };
}

interface RawCellOutput {
    mime: string;
    value: any;
}

/**
 * Enables the editor to open notebook files and 
 * handles how the content of notebook is written into a file
 */
export class BallerinaNotebookSerializer implements NotebookSerializer {
    async deserializeNotebook(content: Uint8Array, _token: CancellationToken): Promise<NotebookData> {
        sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_OPEN_NOTEBOOK, CMP_NOTEBOOK);
        var contents = new TextDecoder().decode(content);

        let raw: RawNotebookCell[];
        try {
            raw = <RawNotebookCell[]>JSON.parse(contents);
        } catch {
            raw = [];
        }

        const cells = raw.map(
            item => {
                let cellData: NotebookCellData = new NotebookCellData(item.kind, item.value, item.language);
                cellData.outputs = this.getCellOutputs(item.outputs);
                cellData.executionSummary = item.executionSummary;
                cellData.metadata = item.metadata;
                return cellData;
            }
        );

        return new NotebookData(cells);
    }

    async serializeNotebook(data: NotebookData, _token: CancellationToken): Promise<Uint8Array> {
        sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_CLOSE_NOTEBOOK, CMP_NOTEBOOK);
        let contents: RawNotebookCell[] = [];
        for (const cell of data.cells) {
            contents.push({
                kind: cell.kind,
                language: cell.languageId,
                value: cell.value,
                outputs: this.getRawCellOutputs(cell.outputs),
                executionSummary: cell.executionSummary,
                metadata: cell.metadata
            });
        }
        return new TextEncoder().encode(JSON.stringify(contents));
    }

    // Helper function to get standard notebook cell outputs for raw cell output
    getCellOutputs(rawCellOutputs: RawCellOutput[][]): NotebookCellOutput[] {
        let cellOutputs: NotebookCellOutput[] = [];
        for (let output of rawCellOutputs) {
            let cellOutputItems: NotebookCellOutputItem[] = [];
            for (let item of output) {
                let data = new TextEncoder().encode(item.value);
                cellOutputItems.push(new NotebookCellOutputItem(data, item.mime));
            }
            if (cellOutputItems) {
                cellOutputs.push(new NotebookCellOutput(cellOutputItems));
            }
        }
        return cellOutputs;
    }

    // Helper function to get raw cell outputs for standard notebook cell output
    getRawCellOutputs(cellOutputs: NotebookCellOutput[] | undefined): RawCellOutput[][] {
        let rawCellOutputs: RawCellOutput[][] = [];
        for (const output of cellOutputs ?? []) {
            let rawCellOutputItems: RawCellOutput[] = [];
            for (const item of output.items) {
                let outputItemContent = new TextDecoder().decode(item.data);
                rawCellOutputItems.push({
                    mime: item.mime,
                    value: outputItemContent
                });
            }
            if (rawCellOutputItems) {
                rawCellOutputs.push(rawCellOutputItems);
            }
        }
        return rawCellOutputs;
    }
}
