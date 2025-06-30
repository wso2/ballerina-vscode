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

import { wait, waitUntil } from "../util";
import { By, Input, VSBrowser, WebView, until } from "vscode-extension-tester";


export class ResourceForm {

    private static Driver() {
        return VSBrowser.instance.driver;
    }

    // Select the HTTP Method
    static async selectHttpMethod(webview: WebView, method: string) {
        // Find and click on the MuiSelect component to open the dropdown
        const selectComponent = await webview.findWebElement(By.className('MuiSelect-selectMenu'));
        await selectComponent.click();
        await wait(500);
        // Find the option based on the optionText
        const option = await selectComponent.findElement(By.xpath(`//*[contains(text(), '${method}')]`));
        await option.click();

    }

    // Update the resource path 
    static async updateResourcePath(webview: WebView, path: string) {
        // Resource path input update
        const resourcePath = await waitUntil(By.xpath("//input[@value='path']")) as Input;
        await resourcePath.click();
        await resourcePath.sendKeys(path);
        // Wait for changes from LS
        await wait(3000);
    }

    // Add a new query param
    static async addQueryParam(webview: WebView) {
        const addQueryBtn = await webview.findWebElement(By.xpath("//*[@data-test-id='query-param-add-button']"));
        await addQueryBtn.click();
        // Wait for changes from LS
        await this.waitForDisableEnableElement(webview);
    }


    static async addBodyParam(webview: WebView, type: string, typeName: string, newType?: boolean) {
        // Click add parameter button
        const addParamBtn = await webview.findWebElement(By.xpath("//*[@data-test-id='param-add-button']"));
        await addParamBtn.click();
        // Wait for changes from LS
        await this.waitForDisableEnableElement(webview);

        // Param save button
        const paramFormSaveBtn = By.xpath("//*[@data-testid='path-segment-add-btn']");
        const saveParambtn = await waitUntil(paramFormSaveBtn);

        // Wait for param form
        const paramForm = By.xpath("//*[@data-testid='Select TypeQuery']");
        await waitUntil(paramForm);

        // Get the type input element
        const typeInput = await webview.findWebElement(By.xpath("//input[@value='string?']"));
        // clear the input add new Record "Foo"
        await typeInput.click();
        const clearBtn = await typeInput.findElement(By.xpath("//*[@title='Clear']"));
        await clearBtn.click();
        await typeInput.sendKeys(type);

        if (newType) {
            // Wait for diagnostic
            const getDiagnosticsMsg = By.xpath("//*[@data-testid='expr-diagnostics']");
            await waitUntil(getDiagnosticsMsg);

            // Click "Create Record"
            const createRecordBtn = await waitUntil(By.xpath("//*[contains(text(), 'Create Record')]"));
            await createRecordBtn.click();
            await this.Driver().wait(until.stalenessOf(createRecordBtn));
            // Wait for changes from LS
            await this.waitForDisableEnableElement(webview);
        }

        const paramInput = await webview.findWebElement(By.xpath("//input[@value='param']"));
        await paramInput.click();
        await paramInput.sendKeys(typeName);
        // Wait for changes from LS
        await this.waitForDisableEnableElement(webview);

        // Click save parameter
        await this.Driver().wait(until.elementIsEnabled(saveParambtn));
        await saveParambtn.click();

        // Wait for param item
        const getParamItem = By.xpath(`//*[@data-testid='${type} ${typeName}-item']`);
        await waitUntil(getParamItem);

    }

    static async addResponseParam(webview: WebView, type: string, newType?: boolean, returnType?: string) {
        // Click add response
        const addBtn = By.xpath("//*[@data-test-id='response-add-button']");
        const responseAddBtn = await webview.findWebElement(addBtn);
        await responseAddBtn.click();

        if (returnType) {
            // Get return type input
            const returnTypeInput = await webview.findWebElement(By.xpath("//*[@id='param-type-selector']"));
            await returnTypeInput.click();

            // Find the option based on the optionText
            const option = await webview.findWebElement(By.xpath(`//*[contains(text(), '${returnType}')]`));
            await option.click();
        }
        if (type) {
            // Get empty input value
            const responseTypeInput = await webview.findWebElement(By.xpath("//*[@data-testid='type-select-dropdown']"));
            await responseTypeInput.click();

            // Find and click on the input element of the Autocomplete component
            const input = await responseTypeInput.findElement(By.className('MuiAutocomplete-input'));
            await input.sendKeys(type);
            await wait(3000);
        }

        if (newType) {
            // Wait for diagnostic
            const getDiagnosticsMsg = By.xpath("//*[@data-testid='expr-diagnostics']");
            await waitUntil(getDiagnosticsMsg);

            // Click "Create Record"
            const createRecordBtn = await waitUntil(By.xpath("//*[contains(text(), 'Create Record')]"));
            await createRecordBtn.click();
            await this.Driver().wait(until.stalenessOf(createRecordBtn));
            await wait(3000);
        }

        const responseSaveBtn = await webview.findWebElement(By.xpath("//*[@data-testid='path-segment-add-btn']"));
        await this.Driver().wait(until.elementIsEnabled(responseSaveBtn));
        await responseSaveBtn.click();
        await this.waitForDisableEnableElement(webview);
    }

    static async saveResource(webview: WebView, method: string) {

        const resourceSaveBtn = await waitUntil(By.xpath("//*[@data-testid='save-btn']"));
        resourceSaveBtn.click();

        // Wait for new resource
        const resource = By.xpath(`//*[@class='function-box ${method.toLowerCase()}']`);
        await waitUntil(resource);
    }

    private static async waitForDisableEnableElement(webview: WebView) {
        // Resource Save button
        const resourceSaveBtn = await webview.findWebElement(By.xpath("//*[@data-testid='save-btn']"));
        await this.Driver().wait(until.elementIsDisabled(resourceSaveBtn));
        await this.Driver().wait(until.elementIsEnabled(resourceSaveBtn));
    }

}


