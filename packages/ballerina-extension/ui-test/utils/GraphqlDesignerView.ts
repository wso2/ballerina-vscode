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

import { ExtendedEditorView } from "./ExtendedEditorView";
import { By, EditorView, Key, WebDriver, WebView } from "vscode-extension-tester";
import {
    clickListItem,
    clickWebElement,
    getElementByXPathUsingTestID, getElementByXPathUsingTitle, getInputElementByXPathUsingValue,
    switchToIFrame,
    waitForElementToAppear,
    waitUntil, waitUntilVisible
} from "../util";

interface FieldData {
    name: string;
    type: string;
}

export class GraphqlDesignerView {
    static async verifyGraphqlDesignerCanvasLoad(driver: WebDriver) {
        const extendedEditorView = new ExtendedEditorView(new EditorView());
        const lens = await extendedEditorView.getCodeLens('Visualize');
        await lens.click();

        await switchToIFrame('Overview Diagram', driver);
        await waitUntil(getElementByXPathUsingTestID("graphql-canvas-widget-container"), 30000);
    }

    static async verifyNodeHeader(rootHead: string) {
        await waitForElementToAppear(rootHead);
    }

    static async verifyFieldsAndTypesInNode(nodeHeader: string, fieldList: FieldData[]) {
        for (const field of fieldList) {
            await waitUntil(By.xpath(
                `//*[contains(@data-testid, '${nodeHeader}')]//*[contains(@data-testid, '${field.name}')]//*[contains(@data-testid, '${field.type}')]`
            ));
        }
    }

    static async verifyFieldsInNode(nodeHeader: string, fieldList: string[]) {
        for (const field of fieldList) {
            await waitUntil(By.xpath(
                `//*[contains(@data-testid, '${nodeHeader}')]//*[contains(@data-testid, '${field}')]`
            ));

        }
    }

    static async verifyLinks(linkList: string[]) {
        for (const link of linkList) {
            await waitForElementToAppear(link);
        }
    }

    static async verifyNodeHeaderList(nodeHeaderList: string[]) {
        for (const nodeHeader of nodeHeaderList) {
            await waitForElementToAppear(nodeHeader);
        }
    }

    static async clickOperationFilterOption(webview: WebView, operationFilterOption: string) {
        await clickWebElement(webview, getElementByXPathUsingTestID("operation-filter"));
        await clickListItem(webview, "operation-type", operationFilterOption);
    }

    static async openNodeMenu(webview: WebView, nodeTestId: string, menuTestId: string) {
        const options = await webview.findWebElement(By.xpath(`//div[contains(@data-testid, '${nodeTestId}')]/*[contains(@data-testid, '${menuTestId}')]`));
        await waitUntilVisible(options);
        await options.click();
    }

    static async selectNodeToFilter(webview: WebView, currentSelection: string, valueToSelect: string, clearInput: boolean = false) {
        const nodeFilter = await webview.findWebElement(getInputElementByXPathUsingValue(currentSelection));
        await nodeFilter.click();
        if (clearInput) {
            await clickWebElement(webview, getElementByXPathUsingTitle("Clear"));
            await nodeFilter.sendKeys(valueToSelect, Key.DOWN, Key.ENTER);
        } else {
            await nodeFilter.sendKeys(valueToSelect, Key.DOWN, Key.ENTER);
        }
    }

    static async openSubGraph(webview: WebView) {
        await clickWebElement(webview, getElementByXPathUsingTestID("show-subgraph-menu"));
    }
}
