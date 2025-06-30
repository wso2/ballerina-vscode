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
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { before, describe, it } from 'mocha';
import { join } from 'path';
import { By, EditorView, Key, VSBrowser, WebDriver, Window, Workbench } from 'vscode-extension-tester';
import { areVariablesIncludedInString, wait, waitForBallerina, waitUntil } from './util';
import { ExtendedEditorView } from './utils/ExtendedEditorView';


const expectedConfigs = [
    'foo',
    'bar',
    'isAdmin',
    'age',
    'port',
    'height',
    'salary',
    'name',
    'book',
    'switches',
    'ports',
    'rates',
    'colors',
    'person',
    'people',
    'personx',
    'input',
    'peopex',
    'users',
    'userTeams',
    'country',
    'code',
    'data',
    'url',
    'authConfig'
];

describe('VSCode Config Creation Using Command UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data');
    let browser: VSBrowser;
    let driver: WebDriver;
    let window: Window;
    let workbench: Workbench;


    const configFilePath = `${PROJECT_ROOT}/configServicePackage/Config.toml`;

    before(async () => {
        // Check if the file exists
        if (existsSync(configFilePath)) {
            // If the file exists, delete it
            unlinkSync(configFilePath);
        }

        browser = VSBrowser.instance;
        driver = browser.driver;
        // Close all open tabs
        await new EditorView().closeAllEditors();
        workbench = new Workbench();
        await browser.openResources(PROJECT_ROOT, `${PROJECT_ROOT}/configServicePackage/service.bal`);
        await browser.waitForWorkbench();
        await waitForBallerina();
    });

    it('Open command palette to select config create command', async () => {
        const editorView = new ExtendedEditorView(new EditorView());
        expect(await editorView.getAction("Run")).is.not.undefined;

        await workbench.executeCommand("Ballerina: Create Config.toml");

        await waitUntil(By.xpath("//*[contains(text(), 'Successfully updated')]"), 30000);

        // Check if the config file has been generated
        expect(existsSync(configFilePath)).to.be.true;

        // Read the generated config file and expected config file
        const generatedConfigContent = readFileSync(configFilePath, 'utf8').replace(/\s/g, '');

        // Compare the generated config file with the expected config file
        expect(areVariablesIncludedInString(expectedConfigs, generatedConfigContent)).to.true;

    });

    after(async () => {
        // Check if the file exists
        if (existsSync(configFilePath)) {
            // If the file exists, delete it
            unlinkSync(configFilePath);
        }
    });

});
