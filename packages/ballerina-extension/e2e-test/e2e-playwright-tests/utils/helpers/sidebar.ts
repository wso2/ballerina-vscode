/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { ExtendedPage } from "@wso2/playwright-vscode-tester";
import { BI_SIDEBAR_VIEW_ID } from "./constants";

/**
 * Wait until BI extension sidebar tree container is available.
 */
export async function waitForBISidebarTreeView(page: ExtendedPage, timeout: number = 30000): Promise<void> {
    const selectors = [
        `div.composite.viewlet#${BI_SIDEBAR_VIEW_ID} div.monaco-pane-view`,
        `div.composite.viewlet[id^="${BI_SIDEBAR_VIEW_ID}"] div.monaco-pane-view`,
        `div.composite.viewlet#${BI_SIDEBAR_VIEW_ID}`,
        `div.composite.viewlet[id^="${BI_SIDEBAR_VIEW_ID}"]`,
    ];

    const eachSelectorTimeout = Math.max(1000, Math.floor(timeout / selectors.length));
    for (const selector of selectors) {
        try {
            await page.page.waitForSelector(selector, { timeout: eachSelectorTimeout, state: 'attached' });
            return;
        } catch {
            // Try next selector variant.
        }
    }

    throw new Error(`BI sidebar tree view not found for id '${BI_SIDEBAR_VIEW_ID}'`);
}
