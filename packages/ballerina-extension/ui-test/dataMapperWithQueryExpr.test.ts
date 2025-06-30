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
// tslint:disable: no-unused-expression
import { before, describe, it } from 'mocha';
import { join } from 'path';
import { By, VSBrowser, WebView, EditorView, TextEditor, WebDriver, TerminalView } from 'vscode-extension-tester';
import { clickOnActivity,switchToIFrame, wait } from './util';
import { EXPLORER_ACTIVITY } from "./constants";
import { ExtendedEditorView } from "./utils/ExtendedEditorView";
import { expect } from "chai";
import { DataMapper } from "./utils/DataMapper";
import { ProjectOverview } from "./utils/ProjectOverview";

describe('VSCode Data mapper Webview UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data');
    const FILE_NAME = 'data_mapper.bal';
    let ORIGINAL_CONTENT = '';
    let webview: WebView;
    let browser: VSBrowser;
    let driver: WebDriver;
    const EXPECTED_TRANSFORM_FUNCTION = `function transform2(Input input) returns Output => {
        Assets: from var AssetsItem in input.Assets
            select {
                Type: AssetsItem.Type + AssetsItem.Id,
                Id: ,
                Confirmed:
            }
    };
    `;

    before(async () => {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
        const terminalView = new TerminalView();
        await terminalView.killTerminal();

        browser = VSBrowser.instance;
        driver = browser.driver;
        await browser.openResources(PROJECT_ROOT, `${PROJECT_ROOT}/${FILE_NAME}`);
        await clickOnActivity(EXPLORER_ACTIVITY);

        ORIGINAL_CONTENT = await new TextEditor().getText();
    });

    it('Open data mapper using project overview', async () => {
        // Click on show diagram button
        const extendedEditorView = new ExtendedEditorView(new EditorView());
        expect(await extendedEditorView.getAction("Show Diagram")).is.not.undefined;
        const showDiagram = await extendedEditorView.getAction("Show Diagram");
        await showDiagram!.click();

        // Wait for the data mapper to load
        await switchToIFrame('Overview Diagram', driver);

        await ProjectOverview.selectElement('transform2');

        await DataMapper.waitTillLinkRender('input.Assets', 'Output.Assets');
        await DataMapper.fitToScreen();
    });

    it('Create mapping using query expression', async () => {
        await DataMapper.clickOnConvertToQuery('input.Assets', 'Output.Assets');
    });

    it('Navigate into query expression', async () => {
        await DataMapper.navigateIntoQueryExpr('Output.Assets');
        await DataMapper.waitTillInputsAndOutputRender(['expandedQueryExpr.source.AssetsItem'], 'mappingConstructor');
    });

    it('Create mapping within query expression', async () => {
        // Create mapping between input field and output field
        webview = new WebView();
        await DataMapper.createMappingUsingPorts(webview, 'expandedQueryExpr.source.AssetsItem.Type', 'Type');

        // This wait is required to enable clicking on another field for creating another mapping
        await wait(1000);

        // Create another mapping to the same output field
        await DataMapper.createMappingUsingFields(webview, 'expandedQueryExpr.source.AssetsItem.Id', 'Type');

        // Wait for the mapping change to take place
        await DataMapper.shouldVisibleLinkConnector(['AssetsItem.Type', 'AssetsItem.Id']);
    });

    it('Verify data mapper generated code is correct', async () => {
        await webview.switchBack();

        await new EditorView().openEditor(FILE_NAME);

        // Check if generated code equals expected code
        const text = await new TextEditor().getText();
        expect(text.replace(/\s/g, '')).to.include(EXPECTED_TRANSFORM_FUNCTION.replace(/\s/g, ''));
    });

    after(async () => {
        await webview.switchBack();

        await new EditorView().openEditor(FILE_NAME);

        // Revert content back to the original state
        const textEditor = new TextEditor();

        await textEditor.setText(ORIGINAL_CONTENT);
        await textEditor.save();
    });
});
