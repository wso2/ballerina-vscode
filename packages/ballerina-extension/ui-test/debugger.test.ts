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

import { VSBrowser, BottomBarPanel, EditorView, ActivityBar, DebugView, DebugToolbar, Workbench } from "vscode-extension-tester";
import { wait, waitUntilTextContains } from "./util";
import { join } from "path";
import { expect } from "chai";
import { ExtendedEditorView } from "./utils/ExtendedEditorView";
import { fail } from "assert";
import { FOCUS_DEBUG_CONSOLE_COMMAND } from "./constants";

const expectedOut = "Running executable";
let workbench: Workbench;

describe('Debugger UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data', 'helloServicePackage');

    beforeEach(async () => {
        await VSBrowser.instance.openResources(PROJECT_ROOT, `${PROJECT_ROOT}/hello_service.bal`);
        workbench = new Workbench();
        await VSBrowser.instance.waitForWorkbench();
    });

    it('Test Debug Codelense', async () => {
        const editorView = new ExtendedEditorView(new EditorView());
        const lens = await editorView.getAction("Debug");
        expect(lens).is.not.undefined;
        await lens.click();

        await verifyDebugOutput();
    });

    it('Test run & debug', async () => {
        await new EditorView().closeAllEditors();
        const btn = await new ActivityBar().getViewControl('Run');
        const debugView = (await btn.openView()) as DebugView;

        await debugView.start();

        await verifyDebugOutput();
    });
});

async function verifyDebugOutput() {
    await workbench.executeCommand(FOCUS_DEBUG_CONSOLE_COMMAND);
    const terminal = await new BottomBarPanel().openDebugConsoleView();

    await waitUntilTextContains(terminal, expectedOut, 60000).catch((e) => {
        fail(e);
    }).finally(async () => {
        const bar = await DebugToolbar.create();
        await bar.stop();
        await wait(2000); // wait for debug session to end
    });
}

