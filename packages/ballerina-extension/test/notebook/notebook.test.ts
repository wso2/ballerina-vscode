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

import { assert, expect } from "chai";
import path from "path";
import { commands, NotebookCell } from "vscode";
import { MIME_TYPE_JSON, MIME_TYPE_TABLE } from "./constants";
import {
    assertContainsMimeTypes, assertHasTextOutputInVSCode, closeActiveWindows,
    openNotebook, runAllCellsInActiveNotebook, saveActiveNotebook
} from "./utils";

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const DATA_ROOT = path.join(PROJECT_ROOT, 'test', 'data');
const sampleBalnotebook = path.join(DATA_ROOT, "sample.balnotebook");

interface TestData {
    cellid: number;
    outputLength: number;
    mimeTypes: string[];
}

suite("Ballerina Notebook Tests", function () {
    this.timeout(20000);

    teardown(async function () {
        await commands.executeCommand('notebook.clearAllCellsOutputs');
        await saveActiveNotebook();
        await closeActiveWindows();
    });

    test.skip("Verify output & metadata when re-opening", async () => {
        const balnotebook = await openNotebook(sampleBalnotebook);
        await commands.executeCommand('notebook.clearAllCellsOutputs');

        let cell1: NotebookCell;
        let cell2: NotebookCell;
        let cell3: NotebookCell;
        let cell4: NotebookCell;
        let cell5: NotebookCell;

        const initializeCells = () => {
            cell1 = balnotebook.getCells()![0]!;
            cell2 = balnotebook.getCells()![1]!;
            cell3 = balnotebook.getCells()![2]!;
            cell4 = balnotebook.getCells()![3]!;
            cell5 = balnotebook.getCells()![4]!;
        }
        initializeCells();

        const verifyCellMetadata = () => {
            assert.lengthOf(cell1.outputs, 1, 'Incorrect output for cell 1');
            assert.lengthOf(cell2.outputs, 0, 'Incorrect output for cell 2');
            assert.lengthOf(cell3.outputs, 0, 'Incorrect output for cell 3');
            assert.lengthOf(cell4.outputs, 0, 'Incorrect output for cell 4');
            assert.lengthOf(cell5.outputs, 1, 'Incorrect output for cell 5');

            assertHasTextOutputInVSCode(cell1, '120');

            expect(cell1.executionSummary?.executionOrder).to.be.greaterThan(0, 'Execution count should be > 0');
            expect(cell2.executionSummary?.executionOrder).to.be.greaterThan(
                cell1.executionSummary?.executionOrder!,
                'Execution count > cell 1'
            );
            expect(cell3.executionSummary?.executionOrder).to.be.equal(undefined, 'Empty cell should not have an execution number');
        }

        await runAllCellsInActiveNotebook(balnotebook, true);
        verifyCellMetadata();

        // Save and close this notebook.
        await saveActiveNotebook();
        await closeActiveWindows();

        // Reopen the notebook & validate the metadata.
        await openNotebook(sampleBalnotebook);
        initializeCells();
        verifyCellMetadata();
    });

    test.skip("Verify code execution", async () => {
        const testDataList: TestData[] = [
            {
                cellid: 0,
                outputLength: 1,
                mimeTypes: ['text/plain']
            },
            {
                cellid: 1,
                outputLength: 0,
                mimeTypes: []
            },
            {
                cellid: 2,
                outputLength: 0,
                mimeTypes: []
            },
            {
                cellid: 3,
                outputLength: 0,
                mimeTypes: []
            },
            {
                cellid: 4,
                outputLength: 1,
                mimeTypes: ['text/plain', MIME_TYPE_JSON]
            },
            {
                cellid: 5,
                outputLength: 0,
                mimeTypes: []
            },
            {
                cellid: 6,
                outputLength: 1,
                mimeTypes: ['text/plain', MIME_TYPE_JSON]
            },
            {
                cellid: 7,
                outputLength: 0,
                mimeTypes: []
            },
            {
                cellid: 8,
                outputLength: 1,
                mimeTypes: ['text/plain', MIME_TYPE_TABLE]
            }
        ];

        const balnotebook = await openNotebook(sampleBalnotebook);
        await runAllCellsInActiveNotebook(balnotebook, true);
        const notebookCells = balnotebook.getCells()!;
        for (const testData of testDataList) {
            const cell = notebookCells[testData.cellid]!;
            assert.lengthOf(cell.outputs, testData.outputLength, `Incorrect output for cell ${testData.cellid}`);
            assertContainsMimeTypes(cell, testData.mimeTypes);
        }
    });
});
