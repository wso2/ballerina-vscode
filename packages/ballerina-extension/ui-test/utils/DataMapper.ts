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
import {
    waitForElementToDisappear,
    waitForMultipleElementsLocated,
    waitUntil,
    waitUntilElementIsEnabled
} from "../util";
import { By, VSBrowser, WebDriver, WebView } from "vscode-extension-tester";
import { expect } from "chai";

export class DataMapper {
    static getConfigForm() {
        return waitUntil(By.xpath("//*[@data-testid='data-mapper-form']"));
    }

    static async addNewInputRecord(webview: WebView, recordName: string, jsonStr: string) {
        const newInputRecord = await webview.findWebElement(By.xpath("//*[@data-testid='dm-inputs']//button[@data-testid='new-record']"));
        await newInputRecord.click();

        await this.createNewRecordFromJson(webview, recordName, jsonStr);
    }

    static async addNewOutputRecord(webview: WebView, recordName: string, jsonStr: string) {
        const newOutputRecord = await webview.findWebElement(By.xpath("//*[@data-testid='dm-output']//button[@data-testid='new-record']"));
        await newOutputRecord.click();

        await this.createNewRecordFromJson(webview, recordName, jsonStr);
    }

    static async createNewRecordFromJson(webview: WebView, recordName: string, jsonStr: string) {
        // Click on create record from json
        const importJsonBtn = await webview.findWebElement(By.xpath("//button[@data-testid='import-json']"));
        await importJsonBtn.click();

        // Wait for record form to load
        const recordForm = By.xpath("//*[@data-testid='record-form']");
        await waitUntil(recordForm);

        // Insert a name for the new record to be created
        const importJsonNameInput = await webview.findWebElement(By.xpath("//*[@data-testid='import-record-name']/*/input"));
        await importJsonNameInput.sendKeys(recordName);

        // Insert the json that needs to be converted as a record
        const importJsonJsonInput = await webview.findWebElement(By.xpath("//*[@class='textarea-wrapper']//textarea[1]"));
        await importJsonJsonInput.sendKeys(jsonStr);

        // Save the new record type
        const importJsonJsonSave = await webview.findWebElement(By.xpath("//button//*[contains(text(),'Save')]"));
        await importJsonJsonSave.click();

        // Wait until the new record gets added
        await waitForElementToDisappear(By.xpath("//*[@data-testid='test-preloader-vertical']"));
    }

    static async addExitingInputRecord(webview: WebView, recordName: string) {
        // Click existing records option for input type
        const existingInputRecord = await webview.findWebElement(By.xpath("//*[@data-testid='dm-inputs']//button[@data-testid='exiting-record']"));
        await existingInputRecord.click();

        // Await LS call to complete, to fetch all record types
        const lastInputCompletionItem = By.xpath("//*[@data-option-index='2']");
        await waitUntil(lastInputCompletionItem);

        // Select `Input` record as the input type
        const inputSelectionItem = await webview.findWebElement(By.xpath(`//li/*/*[contains(text(),"${recordName}")]`));
        await inputSelectionItem.click();

        // Click Add to proceed with the input type
        const inputAddButton = await webview.findWebElement(By.xpath("//button//*[contains(text(),'Add')]"));
        await inputAddButton.click();
    }

    static async addExitingOutputRecord(webview: WebView, recordName: string) {
        // Click existing records option for output type
        const existingOutputRecord = await webview.findWebElement(By.xpath("//*[@data-testid='dm-output']//button[@data-testid='exiting-record']"));
        await existingOutputRecord.click();

        // Await LS call to complete, to fetch all record types
        const lastOutputCompletionItem = By.xpath("//*[@data-option-index='2']");
        await waitUntil(lastOutputCompletionItem);

        // Select `Output` record as the output type
        const outputSelectionItem = await webview.findWebElement(By.xpath(`//li/*/*[contains(text(),"${recordName}")]`));
        await outputSelectionItem.click();

        // Click Update to proceed with the output type
        const outputUpdateButton = await webview.findWebElement(By.xpath("//button//*[contains(text(),'Update')]"));
        await outputUpdateButton.click();
    }

    static async saveConfig(webview: WebView) {
        // Click save button to create the data mapper transform function
        const saveButton = await webview.findWebElement(By.xpath("//button[@data-testid='save-btn']"));
        await saveButton.click();

        // Click continue button to proceed with the transform function creation
        const continueButton = await webview.findWebElement(By.xpath("//button[@data-testid='dm-save-popover-continue-btn']"));
        await continueButton.click();
    }

    static async createMappingUsingPorts(webview: WebView, sourceField: string, targetField: string) {
        // Select input field
        const inputPort = await webview.findWebElement(By.xpath(`//div[@data-name='${sourceField}.OUT']`));
        await inputPort.click();

        // Select output field
        const outputPort = await webview.findWebElement(By.xpath(`//div[@data-name='mappingConstructor.${targetField}.IN']`));
        await outputPort.click();

        await this.waitTillLinkRender(sourceField, targetField);
    }

    static async createMappingUsingFields(webview: WebView, sourceField: string, targetField: string) {
        // Wait for any previous mapping change to take place
        await waitUntilElementIsEnabled(By.xpath(`//div[@data-name='${sourceField}.OUT']`), 25000);

        // Select input field
        const inputField = await webview.findWebElement(By.xpath(`//div[@id='recordfield-${sourceField}']`));
        await inputField.click();

        // Select output field
        const outputField = await webview.findWebElement(By.xpath(`//div[@id='recordfield-mappingConstructor.${targetField}']`));
        await outputField.click();

        await this.waitTillLinkRender(sourceField, targetField);
    }

    static async filterFields(webview: WebView, filter: string) {
        const searchBox = await webview.findWebElement(By.xpath("//input[@placeholder='filter input and output fields']"));
        await searchBox.sendKeys(filter);

        await waitUntil(By.xpath("//*[@data-testid='search-highlight']"));
    }

    static async shouldOnlyHaveFilteredFields(webview: WebView, fieldPrefix: string, noOfFilteredFields: number) {
        const filteredFields = await VSBrowser.instance.driver.findElements(By.xpath(`//div[starts-with(@data-name, '${fieldPrefix}')]`));
        expect(filteredFields.length).to.equal(noOfFilteredFields);
    }

    static async fitToScreen() {
        const fitToScreenButtonElement = await waitUntilElementIsEnabled(By.xpath("//*[@data-testid='fit-to-screen']"));
        await fitToScreenButtonElement.click();
    }

    static async clickOnConvertToQuery(sourceField: string, targetField: string) {
        // Click on the link
        const link = By.xpath(`//*[@data-testid='link-from-${sourceField}.OUT-to-mappingConstructor.${targetField}.IN']`);
        const linkElement = await waitUntilElementIsEnabled(link);
        await linkElement.click();

        // Click on code action button
        const codeActionButtonLocator = By.xpath("//*[@data-testid='expression-label-code-action']");
        const codeActionButton = await waitUntil(codeActionButtonLocator);
        await codeActionButton.click();

        // Click on convert to query code action
        const codeAction = await waitUntilElementIsEnabled(By.xpath("//li[contains(text(), 'Convert to Query')]"));
        await codeAction.click();

        await this.waitTillQueryExprWidgetRender(sourceField, targetField);
    }

    static async navigateIntoQueryExpr(targetField: string) {
        const goToQueryExpressionButtonLocator = By.xpath(`//*[@data-testid='expand-query-${targetField}']`);
        const goToQueryExpressionButton = await waitUntilElementIsEnabled(goToQueryExpressionButtonLocator);
        await goToQueryExpressionButton.click();
    }

    static async shouldVisibleLinkConnector(inputFields: string[]) {
        const linkConnectorNode = By.xpath(`//*[@data-testid='link-connector-node-${inputFields.join(' + ')}']`);
        await waitUntilElementIsEnabled(linkConnectorNode);
    }

    static async waitTillInputsAndOutputRender(inputs: string[], output: string) {
        const locators = [By.xpath(`//*[@data-testid='${output}-node']`)];
        inputs.forEach(input => locators.push(By.xpath(`//*[@data-testid='${input}-node']`)));
        await waitForMultipleElementsLocated(locators);
    }

    static async waitTillLinkRender(sourceField: string, targetField: string) {
        await waitUntil(By.xpath(`//*[@data-testid='link-from-${sourceField}.OUT-to-mappingConstructor.${targetField}.IN']`));
    }

    static async waitTillInputFieldIsDisappeared(webview: WebView, field: string) {
        await waitForElementToDisappear(By.xpath(`//div[@data-name='${field}.OUT']`));
    }

    static async waitTillOutputFieldIsDisappeared(webview: WebView, field: string) {
        await waitForElementToDisappear(By.xpath(`//div[@data-name='mappingConstructor.${field}.IN']`));
    }

    static async waitTillQueryExprWidgetRender(sourceField: string, targetField: string) {
        const goToExprLocator = By.xpath(`//*[@data-testid='expand-query-${targetField}']`);
        const deleteExprLocator = By.xpath(`//*[@data-testid='delete-query-${targetField}']`);
        const sourceFieldToQueryExprNodeLink = By.xpath(`//*[@data-testid='link-from-${sourceField}.OUT-to-datamapper-intermediate-port']`);
        const queryExprNodeToTargetFieldLink = By.xpath(`//*[@data-testid='link-from-datamapper-intermediate-port-to-mappingConstructor.${targetField}.IN']`);

        await waitForMultipleElementsLocated([goToExprLocator, deleteExprLocator, sourceFieldToQueryExprNodeLink, queryExprNodeToTargetFieldLink]);
    }

}
