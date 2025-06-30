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

import { waitUntil } from "../util";
import { By, WebView } from "vscode-extension-tester";

export class GraphqlTryItView {
    graphqlView: WebView;

    constructor(treeItem: WebView) {
        this.graphqlView = treeItem;
    }

    async clickExplorer() {
        const explorerSelector = By.xpath("//button[@title='Toggle Explorer']");
        const explorerBtn = await waitUntil(explorerSelector, 10000);
        await explorerBtn.click();
    }

    async selectQueryVariable() {
        const allBtnSelector = By.className("graphiql-explorer-field-view");
        const allBtn = await waitUntil(allBtnSelector);
        await allBtn.click();

        const querySelector = By.xpath("//div[@class='graphiql-explorer-node graphiql-explorer-active']//span");
        const queryBtn = await waitUntil(querySelector, 10000);
        await queryBtn.click();
    }

    async verifyQueryGeneration() {
        await waitUntil(By.xpath("//section[@class='query-editor']//span[@class='cm-property']"), 10000);
    }

    async execute() {
        const executeBtnSelector = By.xpath("//button[@class='execute-button']");
        const executeBtn = await waitUntil(executeBtnSelector, 10000);
        await executeBtn.click();
    }

    async getResponse() {
        const activeSelector = By.xpath("//span[@class='cm-number']");
        const activeResponse = await waitUntil(activeSelector, 10000);
        const response = await activeResponse.getText();
        return response;
    }
}
