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

import { EditorView, VSBrowser, WebView, Workbench, InputBox } from 'vscode-extension-tester';
import { join } from 'path';
import { describe } from 'mocha';
import { clickOnActivity, waitForWebview, verifyTerminalText, wait, enableDndMode } from './util';
import { expect } from 'chai';
import { DND_PALETTE_COMMAND, EXPLORER_ACTIVITY } from './constants';
import { ExtendedEditorView } from './utils/ExtendedEditorView';
import { GraphqlTryItView } from './utils/GraphqlTryitView';

export const RUN_OUTPUT = 'Running executable';
export const REQUEST_RECIEVED_OUTPUT = 'request received';

describe('GraphQL UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data', 'graphqlServicePackage');
    const FILE_NAME = 'graphql_service.bal';
    let workbench : Workbench;
    
    beforeEach(async () => {
        await VSBrowser.instance.openResources(PROJECT_ROOT, `${PROJECT_ROOT}/${FILE_NAME}`);
        await VSBrowser.instance.waitForWorkbench();
        workbench = new Workbench();
        await enableDndMode(workbench);
    });

    it('Test tryit button', async () => {
        await clickOnActivity(EXPLORER_ACTIVITY);

        // Click on `Run` code lens to run service
        const editorView = new ExtendedEditorView(new EditorView());
        const runLens = await editorView.getCodeLens("Run");
        await runLens.click();
        await verifyTerminalText(RUN_OUTPUT);

        // Click on `Try it` code lens to open up swagger
        await wait(3000);
        const lens = await editorView.getCodeLens("Try it");
        await lens.click();

        // Confirm path
        await wait(3000); // Pause for a while server to start. It may take some time to server to respond initially
        const inputBox = new InputBox();
        await inputBox.confirm();
        
        // switch to swagger window
        await waitForWebview("Graphql");
        const graphqlWebView = await new EditorView().openEditor('Graphql') as WebView;
        const graphqlView = new GraphqlTryItView(graphqlWebView);
        await graphqlWebView.switchToFrame();

        await graphqlView.clickExplorer();
        await graphqlView.selectQueryVariable();
        await graphqlView.verifyQueryGeneration();
        await wait(100); // Pause for a while to let the query execute (GraphQL Libary not giving the expected result when there is no delay)
        await graphqlView.execute();
        const response =  await graphqlView.getResponse();
        expect(parseFloat(response)).is.greaterThan(0);
    });

    afterEach(async () => {
        workbench.executeCommand(DND_PALETTE_COMMAND);
    });
});
