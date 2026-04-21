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

import { expect } from 'chai';
import { writeFile } from 'fs';
import { before, describe, it } from 'mocha';
import { join } from 'path';
import { VSBrowser, WebView, EditorView, TextEditor, WebDriver, ActivityBar, Workbench } from 'vscode-extension-tester';
import {
    switchToIFrame,
    waitUntil,
    getLabelElement,
    waitUntilElementIsEnabled,
    waitForBallerina,
    workbenchZoomOut,
} from './util';
import { ExtendedEditorView } from './utils/ExtendedEditorView';
import { ServiceDesigner } from './utils/ServiceDesigner';
import { ResourceForm } from './utils/ResourceForm';

describe('VSCode Service Designer Webview UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data', 'sampleService');
    const FILE_NAME = 'service.bal';
    let ORIGINAL_CONTENT = `import ballerina/http;

service /breakingbad on new http:Listener(9090) {


}
    `;
    let browser: VSBrowser;
    let driver: WebDriver;
    let webview: WebView;
    let workbench : Workbench;

    before(async () => {
        browser = VSBrowser.instance;
        workbench = new Workbench();
        driver = browser.driver;
        webview = new WebView();
        await browser.openResources(PROJECT_ROOT, `${PROJECT_ROOT}/${FILE_NAME}`);
        const textEditor = new TextEditor();
        await textEditor.setText(ORIGINAL_CONTENT);
        await textEditor.save();
        await browser.waitForWorkbench();

        // Re-locate the editor group container element
        await waitForBallerina();
        const explorerView = await new ActivityBar().getViewControl("Explorer");
        await explorerView.closeView();

        // Trigger the zoomOut command
        await workbenchZoomOut(workbench, 2);
    });

    it('Open service designer view using code lens', async () => {
        // wait till 'Visualize' code lens to appear
        const editorView = new ExtendedEditorView(new EditorView());
        const lens = await editorView.getCodeLens('Visualize');
        await lens.click();

        // Wait for the service design view to load
        await switchToIFrame('Overview Diagram', driver);
        await ServiceDesigner.waitForServiceDesigner();

        expect(getLabelElement(driver, '/breakingbad')).to.be.exist;
        expect(getLabelElement(driver, 'http:Listener(9090)')).to.be.exist;
        expect(getLabelElement(driver, 'Service list is empty')).to.be.exist;

    });

    it('Add a new get resource with a new record', async () => {

        await ServiceDesigner.clickAddResource(webview);

        await ResourceForm.updateResourcePath(webview, "characters");

        await ResourceForm.addResponseParam(webview, "Character[]", true);

        await ResourceForm.saveResource(webview, "GET");

        await webview.switchBack();
        await new EditorView().openEditor(FILE_NAME);

        const EXPECTED = `import ballerina/http;
        service /breakingbad on new http:Listener(9090) {
            resource function get characters() returns Character[] {
            }
        }
        type Character record {
        };
        `;

        // Check if generated code equals expected code
        const text = await new TextEditor().getText();
        expect(text.replace(/\s/g, '')).to.include(EXPECTED.replace(/\s/g, ''));
        expect(getLabelElement(driver, 'characters')).to.be.exist;
    });


    it('Add a new post resource with existing record', async () => {

        await switchToIFrame('Overview Diagram', driver);

        await ServiceDesigner.clickAddResource(webview);

        await ResourceForm.selectHttpMethod(webview, "POST");

        await ResourceForm.updateResourcePath(webview, "cooking");

        await ResourceForm.addResponseParam(webview, "Character");

        await ResourceForm.saveResource(webview, "POST");

        await webview.switchBack();

        await new EditorView().openEditor(FILE_NAME);
        const EXPECTED = `resource function post cooking() returns Character {}}`;
        // Check if generated code equals expected code
        const text = await new TextEditor().getText();
        expect(text.replace(/\s/g, '')).to.include(EXPECTED.replace(/\s/g, ''));
        expect(getLabelElement(driver, 'cooking')).to.be.exist;

    });

    it('Add a new post resource different return type', async () => {

        await switchToIFrame('Overview Diagram', driver);

        await ServiceDesigner.clickAddResource(webview);

        await ResourceForm.selectHttpMethod(webview, "POST");

        await ResourceForm.updateResourcePath(webview, "collecting");

        await ResourceForm.addResponseParam(webview, "Character", false, "Accept");

        await ResourceForm.addResponseParam(webview, "", false, "Not Found");

        await ResourceForm.saveResource(webview, "POST");

        await webview.switchBack();
        await new EditorView().openEditor(FILE_NAME);
        const EXPECTED = `resource function post collecting() returns record {|*http:Accepted; Character body;|}|http:NotFound {}}`;
        // Check if generated code equals expected code
        const text = await new TextEditor().getText();
        expect(text.replace(/\s/g, '')).to.include(EXPECTED.replace(/\s/g, ''));
        expect(getLabelElement(driver, 'collecting')).to.be.exist;

    });

    after(async () => {
        writeFile(`${PROJECT_ROOT}/${FILE_NAME}`, "", (err) => {
            if (err) {
                console.error('Error updating bal file:', err);
            } else {
                console.log('Bal file updated successfully!');
            }
        });
    });

});
