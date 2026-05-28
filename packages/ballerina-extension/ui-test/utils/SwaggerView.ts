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

import { waitForMultipleElementsLocated, waitUntil, waitUntilTextContains } from "../util";
import { By, WebView, WebDriver } from "vscode-extension-tester";

export class SwaggerView {
    swaggerView: WebView;

    constructor(treeItem: WebView) {
        this.swaggerView = treeItem;
    }

    async expandGet() {
        await waitUntil(By.className("operation-tag-content"), 30000 );
        const operationTag = By.className("operation-tag-content");
        const getTab = await this.swaggerView.findWebElement(operationTag);
        await getTab.click();
    }

    async clickTryItOut(driver: WebDriver) {
        const tryItOutButton = By.className("try-out__btn");
        await waitForMultipleElementsLocated([tryItOutButton]);
        const tryIt = (await this.swaggerView.findWebElements(By.className("try-out__btn")))[0];
        await tryIt.click();
    }

    async clickExecute() {
        const execute = (await this.swaggerView.findWebElements(By.className("opblock-control__btn")))[0];
        await execute.click();
    }

    async getResponse() {
        await waitUntil(By.className("highlight-code"), 30000 );
        const codeBlock = await this.swaggerView.findWebElement(By.className("highlight-code"));
        const responseBox = await codeBlock.findElement(By.css("code"));
        const response = await responseBox.findElement(By.css("span"));
        return response.getText();
    }
}
