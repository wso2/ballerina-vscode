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
import { existsSync, mkdirSync, rmSync } from 'fs';
import { before, describe, it } from 'mocha';
import { join } from 'path';
import { By, EditorView, InputBox, VSBrowser, WebDriver, Workbench, until } from 'vscode-extension-tester';
import { waitUntil } from './util';

describe('Open ballerina samples in VSCode from URL', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data');
    let browser: VSBrowser;
    let driver: WebDriver;
    let workbench: Workbench;

    const samplesDownloadDirectory = `${PROJECT_ROOT}/sampleDownloadFolder`;

    before(async () => {
        // Delete files and folders in this folder
        rmSync(samplesDownloadDirectory, { recursive: true, force: true });
        // Create folder if not present
        if (!existsSync(samplesDownloadDirectory)) {
            mkdirSync(samplesDownloadDirectory);
        }
        browser = VSBrowser.instance;
        driver = browser.driver;
        workbench = new Workbench();
        await new EditorView().closeAllEditors();
        await browser.openResources(samplesDownloadDirectory);
        await browser.waitForWorkbench();
        // Re-locate the editor group container element
        await driver.wait(until.elementLocated(By.css('.editor-group-container')), 30000);
    });

    it('Open URL to download first sample on first time and change directory', async () => {

        // Use Developer URL to execute a URL
        const url = 'vscode://wso2.ballerina/open-file?gist=18e6c62b7ef307d7064ed4ef39e4d0d8&file=functions.bal';
        await executeURLdownload(workbench, url);

        // Open Downloaded file
        const openFile = await waitUntil(By.linkText('Open'));
        await openFile.click();

        // Click on change directory
        const changePathBtn = await waitUntil(By.linkText('Change Directory'));
        await changePathBtn.click();

        // Wait for OK button to be appeared
        const okButton = await waitUntil(By.linkText('OK'));

        const input = await InputBox.create();

        // Set the new downloads path
        await input.clear();

        await input.setText(samplesDownloadDirectory);

        // Save the new download path
        await okButton.click();

        // Check if the file has been downloaded to the new location
        await executeURLdownload(workbench, url);

        // Open Downloaded file
        const openFileSecond = await waitUntil(By.linkText('Open'));
        await openFileSecond.click();
        await waitUntil(By.linkText('Change Directory'));

        expect(existsSync(`${samplesDownloadDirectory}/functions.bal`), "Second assert with functions.bal").to.be.true;
        await new EditorView().closeAllEditors();
    });

    it('Open URL to download second sample file', async () => {
        // Use Developer URL to excecute a URL
        const url = 'vscode://wso2.ballerina/open-file?gist=8ada14df03d5d8841d03ce4b92819b2b&file=hello_world.bal';
        await executeURLdownload(workbench, url);
        // Open Downloaded file
        const openFile = await waitUntil(By.linkText('Open'));
        await openFile.click();
        await waitUntil(By.linkText('Change Directory'));

        expect(existsSync(`${samplesDownloadDirectory}/hello_world.bal`)).to.be.true;
        await new EditorView().closeAllEditors();
    });

    it('Open URL to download a not valid sample file', async () => {
        // Use Developer URL to excecute a URL
        const url = 'vscode://wso2.ballerina/open-file?gist=1b94f48ad579969bc7c6a79549684dca&file=PeopleManagementService.bal';
        await executeURLdownload(workbench, url);
        expect(existsSync(`${samplesDownloadDirectory}/PeopleManagementService.bal`)).to.be.not.true;
    });

    it('Open URL to download github sample file', async () => {
        // Use Developer URL to excecute a URL
        const url = 'vscode://wso2.ballerina/open-file?repoFileUrl=https://github.com/wso2/choreo-sample-apps/blob/main/ballerina/greeter/service.bal';
        await executeURLdownload(workbench, url);

        // Open Downloaded file
        const openFile = await waitUntil(By.linkText('Open'));
        await openFile.click();
        await waitUntil(By.linkText('Change Directory'));

        expect(existsSync(`${samplesDownloadDirectory}/service.bal`)).to.be.true;
        await new EditorView().closeAllEditors();
    });

    it('Open URL to download not valid github sample file', async () => {
        // Use Developer URL to excecute a URL
        const url = 'vscode://wso2.ballerina/open-file?repoFileUrl=https://github.com/jclark/semtype/blob/master/main.bal';
        await executeURLdownload(workbench, url);
        expect(existsSync(`${samplesDownloadDirectory}/main.bal`)).to.be.not.true;
    });

    it('Open URL to download a not valid sample file', async () => {
        // Use Developer URL to excecute a URL
        const url = 'vscode://wso2.ballerina/open-file?gist=1b94f48ad579969bc7c6a79549684dca&file=PeopleManagementService.bal';
        await executeURLdownload(workbench, url);
        expect(existsSync(`${samplesDownloadDirectory}/PeopleManagementService.bal`)).to.be.not.true;
    });

    it('Open URL to download github sample file', async () => {
        // Use Developer URL to excecute a URL
        const url = 'vscode://wso2.ballerina/open-file?repoFileUrl=https://github.com/wso2/choreo-sample-apps/blob/main/ballerina/greeter/service.bal';
        await executeURLdownload(workbench, url);

        // Open Downloaded file
        const openFile = await waitUntil(By.linkText('Open'));
        await openFile.click();
        await waitUntil(By.linkText('Change Directory'));

        expect(existsSync(`${samplesDownloadDirectory}/service.bal`)).to.be.true;
    });

    it('Open URL to download not valid github sample file', async () => {
        // Use Developer URL to excecute a URL
        const url = 'vscode://wso2.ballerina/open-file?repoFileUrl=https://github.com/jclark/semtype/blob/master/main.bal';
        await executeURLdownload(workbench, url);
        expect(existsSync(`${samplesDownloadDirectory}/main.bal`)).to.be.not.true;
    });

    it('Open URL to download git repo', async () => {
        // Use Developer URL to excecute a URL
        const url = 'vscode://wso2.ballerina/open-repo?repoUrl=https://github.com/wso2/choreo-sample-apps';
        await executeURLdownload(workbench, url);

        // Confirm Clone
        const openFile = await waitUntil(By.linkText('Clone Now'));
        await openFile.click();

        const cloneDialog = await waitUntil(By.className('monaco-dialog-box'), 30000).findElement(By.linkText('Cancel'));
        await cloneDialog.click();

        expect(existsSync(`${samplesDownloadDirectory}/choreo-sample-apps/README.md`)).to.be.true;
        await new EditorView().closeAllEditors();
    });

    it('Open URL to download existing git repo and open file', async () => {
        // Use Developer URL to excecute a URL
        const url = 'vscode://wso2.ballerina/open-repo?repoUrl=https://github.com/wso2/choreo-sample-apps&openFile=ballerina/greeter/service.bal';
        await executeURLdownload(workbench, url);

        // Confirm Existing
        const openFile = await waitUntil(By.linkText('Open'));
        await openFile.click();

        const editorView = new EditorView();
        const editorTitle = await editorView.getOpenEditorTitles();
        expect(editorTitle).to.includes('service.bal');        
        await new EditorView().closeAllEditors();
    });

    after(async () => {
        // Delete files and folders in this folder
        rmSync(samplesDownloadDirectory, { recursive: true, force: true });
    });

});


const executeURLdownload = async (workbench, url: string) => {
    await workbench.executeCommand("Developer: Open URL");
    const commandInput = await InputBox.create();
    await commandInput.setText(url);
    await commandInput.confirm();
    // URL Open verification
    const vscodeVerify = await waitUntil(By.className('monaco-dialog-box')).findElement(By.linkText('Open'));
    await vscodeVerify.click();
}

