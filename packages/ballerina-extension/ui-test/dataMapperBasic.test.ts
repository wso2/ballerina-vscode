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
import { before, describe, it } from 'mocha';
import { join } from 'path';
import { By, VSBrowser, WebView, EditorView, TextEditor, WebDriver, TerminalView } from 'vscode-extension-tester';
import { clickOnActivity, switchToIFrame } from './util';
import { EXPLORER_ACTIVITY } from "./constants";
import { ExtendedEditorView } from "./utils/ExtendedEditorView";
import { DataMapper } from "./utils/DataMapper";

describe('VSCode Data mapper Webview UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data');
    const FILE_NAME = 'data_mapper.bal';
    let ORIGINAL_CONTENT = '';
    let webview: WebView;
    let browser: VSBrowser;
    let driver: WebDriver;

    const NEW_JSON_FOR_RECORD_NAME = 'ImportedRecord';
    const NEW_JSON_FOR_RECORD = `{"st1":"string"}`;
    const EXPECTED_NEW_RECORD_FROM_JSON = `type ImportedRecord record {
        string st1;
    };`;
    const EXPECTED_TRANSFORM_FUNCTION = `function transform(ImportedRecord importedRecord, Input input) returns Output => {
        st1: input.st1
    };`;

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

    it('Open data mapper using code lens', async () => {
        // Wait and click on `Visualize` code lens to open up data mapper
        const editorView = new ExtendedEditorView(new EditorView());
        const lens = await editorView.getCodeLens('Visualize');
        await lens?.click();

        // Wait for the data mapper to load
        await switchToIFrame('Overview Diagram', driver);
        await DataMapper.getConfigForm();
    });

    it('Configure data mapper transform function', async () => {
        webview = new WebView();

        await DataMapper.addNewInputRecord(webview, NEW_JSON_FOR_RECORD_NAME, NEW_JSON_FOR_RECORD);

        await DataMapper.addExitingInputRecord(webview, 'Input');
        await DataMapper.addExitingOutputRecord(webview, 'Output');

        await DataMapper.saveConfig(webview);

        await DataMapper.waitTillInputsAndOutputRender(['input', 'importedRecord'], 'mappingConstructor.Output');
        await DataMapper.fitToScreen();
    });

    it('Create mapping between data mapper nodes', async () => {
        webview = new WebView();
        await DataMapper.createMappingUsingFields(webview, 'input.st1', 'Output.st1');
    });

    it('Test input output filtering', async () => {
        await DataMapper.filterFields(webview, 'st1');

        await DataMapper.waitTillInputFieldIsDisappeared(webview, 'input.d1');

        // Verify that only the filtered fields are visible
        await DataMapper.shouldOnlyHaveFilteredFields(webview, 'input.', 2);
        await DataMapper.shouldOnlyHaveFilteredFields(webview, 'importedRecord.', 2);
        await DataMapper.shouldOnlyHaveFilteredFields(webview, 'mappingConstructor.Output.', 1);
    });

    it('Verify data mapper generated code is correct', async () => {
        await webview.switchBack();

        await new EditorView().openEditor(FILE_NAME);

        // Check if generated code equals expected code
        const text = await new TextEditor().getText();
        expect(text.replace(/\s/g, '')).to.include(EXPECTED_NEW_RECORD_FROM_JSON.replace(/\s/g, ''));
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
