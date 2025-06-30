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
import { existsSync, readFileSync, unlinkSync, writeFile } from 'fs';
import { before, describe, it } from 'mocha';
import { join } from 'path';
import { By, EditorView, Key, TextEditor, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { areVariablesIncludedInString, wait, waitForBallerina, waitUntil } from './util';


const expectedConfigs = [
    'bar',
    'isAdmin',
    'url',
    'authConfig'
];


describe('VSCode Config Suggestions UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data', 'configServicePackageEdit');
    let browser: VSBrowser;
    let driver: WebDriver;

    const configFilePath = `${PROJECT_ROOT}/Config.toml`;

    const configContent = `# Configuration file for "configServicePackageEdit"
    # How to use see:
    # https://ballerina.io/learn/provide-values-to-configurable-variables/#provide-via-toml-syntax
    
    bar = 0.0	# Type of NUMBER
    
    url = ""	# Type of STRING
    
    # For more information refer https://lib.ballerina.io/ballerina/http/
    [authConfig]	# Type of OBJECT
    `;

    before(async () => {
        writeFile(configFilePath, configContent, (err) => {
            if (err) {
                console.error('Error updating config file:', err);
            } else {
                console.log('Config file updated successfully!');
            }
        });
        browser = VSBrowser.instance;
        driver = browser.driver;
        // Close all open tabs
        await new EditorView().closeAllEditors();
        await browser.openResources(PROJECT_ROOT, configFilePath);
        await browser.waitForWorkbench();

    });

    it('Click on suggestion to add configs to the file', async () => {

        const editor = new TextEditor();
        const line = await editor.getNumberOfLines();
        // Click on the end of the file
        await editor.moveCursor(line, 1);
        await wait(2000);

        await editor.typeText(Key.ENTER);
        await wait(2000);

        await editor.toggleContentAssist(true);
        await wait(2000);

        const isAdminLink = await waitUntil(By.linkText('isAdmin'));
        await isAdminLink.click();

        await editor.save();

        // Wait for the suggestion to be applied
        await wait(2000);

        // Read the updated config file and expected config file
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
