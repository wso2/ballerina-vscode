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

import { By, EditorView, VSBrowser, WebDriver, WebView, Workbench, until } from 'vscode-extension-tester';
import { join } from 'path';
import { before, describe } from 'mocha';
import { clickOnActivity, waitForWebview, waitUntilTextContains, waitForMultipleElementsLocated, waitUntil, verifyTerminalText, wait, enableDndMode } from './util';
import { expect } from 'chai';
import { DND_PALETTE_COMMAND, EXPLORER_ACTIVITY } from './constants';
import { ExtendedEditorView } from './utils/ExtendedEditorView';
import { SwaggerView } from './utils/SwaggerView';

export const RUN_OUTPUT = 'Running executable';
export const REQUEST_RECIEVED_OUTPUT = 'request received';

describe('Swagger view UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data', 'helloServicePackage');
    const FILE_NAME = 'hello_service.bal';
    let driver: WebDriver;
    let browser: VSBrowser;

    before(async () => {
        await VSBrowser.instance.openResources(PROJECT_ROOT, `${PROJECT_ROOT}/${FILE_NAME}`);
        await VSBrowser.instance.waitForWorkbench();
        browser = VSBrowser.instance;
        driver = browser.driver;
    });

    it('Test tryit button', async () => { // TODO: Fix this test #2266
        await driver.wait(until.elementLocated(By.className("codelens-decoration")), 360000);
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
        
        // switch to swagger window
        await waitForWebview("Swagger");
        const swaggerWebView = await new EditorView().openEditor('Swagger', 1) as WebView;
        const swaggerView = new SwaggerView(swaggerWebView);
        await swaggerWebView.switchToFrame();

        // expand get
        await swaggerView.expandGet();

        // click try it
        await swaggerView.clickTryItOut(driver);

        // cilck execute
        await swaggerView.clickExecute();

        // Verify request receival
        await swaggerWebView.switchBack();
        await verifyTerminalText(REQUEST_RECIEVED_OUTPUT);
        await swaggerWebView.switchToFrame();

        // check response
        const response = await swaggerView.getResponse();
        expect(response).is.equal('"Hello, World!"');
    });
});
