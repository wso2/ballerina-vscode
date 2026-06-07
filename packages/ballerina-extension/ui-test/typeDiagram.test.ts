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

import { before, describe, it } from 'mocha';
import { join } from 'path';
import { EditorView, VSBrowser, Workbench } from 'vscode-extension-tester';


import { ExtendedTypeDiagram } from './utils/ExtendedTypeDiagram';

describe('VSCode type diagram Webview UI Tests', () => {
    const TEST_PROJECT = join(__dirname, '..', '..', 'ui-test', 'data', "typeDiagram", "greeter");
    const WORSPACE_FILE = join(TEST_PROJECT, "greeter.code-workspace");
    const SERVICE_FILE = join(TEST_PROJECT, "service.bal");
    let editor: EditorView;
    let browser: VSBrowser;
    let workbench: Workbench;
    let typeDiagram: ExtendedTypeDiagram;
    let typeEditorView: EditorView;


    before(async () => {
        workbench = new Workbench();
        browser = VSBrowser.instance;
        await browser.openResources(WORSPACE_FILE, SERVICE_FILE);
        await browser.waitForWorkbench();
        typeEditorView = new EditorView();
        typeDiagram = new ExtendedTypeDiagram(typeEditorView);
    });

    it('Open the type diagram', async () => {
        await typeDiagram.openDigaram(workbench, browser);
        await typeDiagram.clickItem("type-switcher", 20000);
        await typeDiagram.clickItem("Types");
    });

    it('Check for rendered components', async () => {
        await typeDiagram.getItems("entity-head-Order");
        await typeDiagram.getItems("entity-head-Customer");
        await typeDiagram.getItems("entity-head-LineItemOrder");

        await typeDiagram.getItems("entity-link-Order-Customer");
        await typeDiagram.getItems("entity-link-Order-LineItemOrder");
    });
});
