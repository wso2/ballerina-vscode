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

import { waitUntil, waitUntilElementIsEnabled } from "../util";
import { By, VSBrowser, until } from "vscode-extension-tester";

export class ServiceDesigner {

    static async waitForServiceDesigner() {
        const serviceDesignView = By.xpath("//*[@data-testid='service-design-view']");
        await waitUntil(serviceDesignView, 30000);
    }

    static async clickAddResource(webview) {
        const driver = VSBrowser.instance.driver;
        // Click on add new resource button
        const addResourceBtn = await webview.findWebElement(By.xpath("//*[@data-testid='add-resource-btn']"));
        await addResourceBtn.click();

        // Wait for resource form
        const resourceForm = By.xpath("//*[@data-testid='resource-form']");
        await waitUntil(resourceForm, 30000);

        const resourceSaveBtn = By.xpath("//*[@data-testid='save-btn']");
        waitUntilElementIsEnabled(resourceSaveBtn);

    }

}
