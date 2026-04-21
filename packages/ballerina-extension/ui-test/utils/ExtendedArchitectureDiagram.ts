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
import { switchToIFrame, waitUntil } from "../util";
import { By, EditorView, VSBrowser, Workbench } from "vscode-extension-tester";
import { ExtendedEditorView } from "./ExtendedEditorView";

export class ExtendedAcrchitectureDiagram {
    editorView: EditorView;

    constructor(treeItem: EditorView) {
        this.editorView = treeItem;
    }

    async getItem(testId: string, timeout: number = 15000) {
        const path = By.xpath(`//*[@data-testid="${testId}"]`);
        return await waitUntil(path, timeout);
    }

    async getItemById(id: string, timeout: number = 15000) {
        const path = By.id(id);
        return await waitUntil(path, timeout);
    }

    async openDigaram(workbench: Workbench, browser: VSBrowser) {
        await browser.waitForWorkbench();
        const extdEditor = new ExtendedEditorView(this.editorView);
        await extdEditor.getCodeLens('Visualize');
        await workbench.executeCommand("Ballerina: Architecture View");
        await switchToIFrame('Architecture View', browser.driver);
    }

    async clickItem(testId: string, timeout: number = 15000) {
        const item = await this.getItem(testId, timeout);
        await item.click();
    }

    async clickItemById(testId: string, timeout: number = 15000) {
        const item = await this.getItemById(testId, timeout);
        await item.click();
    }

    async getInputs(testId: string, timeout: number = 15000) {
        const path = By.xpath(`//*[@data-testid="${testId}"]//input`);
        return await waitUntil(path, timeout);
    }

    async typeTest(testId: string, text: string, timeout: number = 15000) {
        const item = await this.getInputs(testId, timeout);
        await item.sendKeys(text);
    }

    async selectDropdownItem(testId: string, browser: VSBrowser, selectItem: string, timeout: number = 15000) {
        const dropdown = await this.getItem(testId, timeout);
        await dropdown.click();
        const optionPath = By.xpath(`//li[contains(text(), '${selectItem}')]`)
        const option = await waitUntil(optionPath);
        await browser.driver.executeScript("arguments[0].scrollIntoView();", option);
        // This sleep is to wait till the MUI menu item appearing
        await browser.driver.sleep(1000);
        await option.click();
    }

    async checkItem(testId: string, timeout: number = 15000) {
        const checkboxPath = await this.getItem(testId, timeout);
        checkboxPath.click();
    }

    async clickCreateBtn(testId: string, timeout: number = 15000) {
        const createComponentBtn = await this.getItem(testId, timeout);
        const classAttributeValue = await createComponentBtn.getAttribute('class');
        let isButtonDisabled = classAttributeValue.includes('Mui-disabled');
        while (isButtonDisabled === true) {
            isButtonDisabled = classAttributeValue.includes('Mui-disabled');
        };
        await createComponentBtn.click()
    }
}
