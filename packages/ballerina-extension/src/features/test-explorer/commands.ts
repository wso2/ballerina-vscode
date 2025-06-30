'use strict';
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

import { commands, TestItem } from "vscode";
import { openView, StateMachine, history } from "../../stateMachine";
import { BI_COMMANDS, EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";
import { isTestFunctionItem } from "./discover";
import path from "path";
import { promises as fs } from 'fs';

export function activateEditBiTest() {
    // register run project tests handler
    commands.registerCommand(BI_COMMANDS.BI_EDIT_TEST_FUNCTION, async (entry: TestItem) => {
        if (!isTestFunctionItem(entry)) {
            return;
        }

        const fileName = entry.id.split(":")[1];
        const fileUri = path.resolve(StateMachine.context().projectUri, `tests`, fileName);
        if (fileUri) {
            const range = entry.range;
            openView(EVENT_TYPE.OPEN_VIEW, { documentUri: fileUri, 
                position: { startLine: range.start.line, startColumn: range.start.character, 
                    endLine: range.end.line, endColumn: range.end.character } });
            history.clear();
        }        
    });

    commands.registerCommand(BI_COMMANDS.BI_ADD_TEST_FUNCTION, () => {
        const fileUri = path.resolve(StateMachine.context().projectUri, `tests`, `tests.bal`);
        ensureFileExists(fileUri);
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BITestFunctionForm, 
            documentUri: fileUri, identifier: '', serviceType: 'ADD_NEW_TEST' });
    });

    commands.registerCommand(BI_COMMANDS.BI_EDIT_TEST_FUNCTION_DEF, (entry: TestItem) => {
        if (!isTestFunctionItem(entry)) {
            return;
        }

        const fileName = entry.id.split(":")[1];
        const fileUri = path.resolve(StateMachine.context().projectUri, `tests`, fileName);
        if (fileUri) {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BITestFunctionForm, 
                documentUri: fileUri, identifier: entry.label, serviceType: 'UPDATE_TEST' });
        }
    });
}

async function ensureFileExists(filePath: string) {
  try {
    await fs.access(filePath);
  } catch {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    await fs.writeFile(filePath, '', 'utf8');
    console.log('File created:', filePath);
  }
}
