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

import { commands, Position, Uri, window } from "vscode";
import { join } from "path";
import { assert } from "chai";

const PROJECT_ROOT = join(__dirname, '..', '..', '..', 'test', 'data');

suite("Editor Tests", function () {
    suiteTeardown((done) => {
        commands.executeCommand('ballerina.stopLangServer');
        done();
    });

    test("Test string splitter", function (done): void {
        const uri = Uri.file(join(PROJECT_ROOT, 'string.bal'));

        commands.executeCommand('vscode.open', uri).then(async () => {
            await wait(15000);
            const editor = window.activeTextEditor;
            editor?.edit(editBuilder => {
                const startPosition: Position = new Position(0, 20);
                editBuilder.insert(startPosition, "\n");

            });
            await wait(5000);
            assert.strictEqual(editor.document.getText(), 'string st = "sample " +\n"giga string";\n', "Invalid string splitter");
            done();
        });
    });

});

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
