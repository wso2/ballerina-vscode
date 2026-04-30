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

import { ExtendedPage, switchToIFrame } from "@wso2/playwright-vscode-tester";
import { waitForBISidebarTreeView } from "./sidebar";

/**
 * Get webview frame with retry logic
 */
export async function getWebview(viewName: string, page: ExtendedPage) {
    try {
        await page.page.waitForLoadState('domcontentloaded');
        await page.page.waitForTimeout(1000);

        const webview = await switchToIFrame(viewName, page.page);
        if (webview) {
            return webview;
        } else {
            console.log(`switchToIFrame returned ${webview}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`Failed to access iframe:`, message);
    }
    throw new Error(`Failed to access iframe for ${viewName} after 1 attempt`);
}
