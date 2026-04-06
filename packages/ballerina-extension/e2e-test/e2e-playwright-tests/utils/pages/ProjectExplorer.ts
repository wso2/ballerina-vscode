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

import { Locator, Page } from "@playwright/test";
import { BI_INTEGRATOR_LABEL } from "../helpers/constants";

export class ProjectExplorer {
    private explorer!: Locator;

    constructor(private page: Page) {
        this.explorer = this.page.getByRole('tree').locator('div').first();
    }

    public async init() {
        const activityBar = this.page.locator('#workbench\\.parts\\.activitybar');
        const wso2IntegratorActivityTab = activityBar.locator(`[role="tab"][aria-label="${BI_INTEGRATOR_LABEL}"]`).first();
        await wso2IntegratorActivityTab.click();
    }

    public async findItem(path: string[], click: boolean = false) {
        let currentItem;
        for (let i = 0; i < path.length; i++) {

            currentItem = this.explorer.locator(`div[role="treeitem"][aria-label='${path[i]}']`);
            await currentItem.waitFor();

            if (i < path.length - 1) {
                const isExpanded = await currentItem.getAttribute('aria-expanded');
                if (isExpanded === 'false') {
                    await currentItem.click();
                }
            } else {
                if (click) {
                    await currentItem.click();
                } else {
                    await currentItem.hover();
                }
            }
        }
        return currentItem;
    }

    public async goToOverview(projectName: string) {
        // wait for 1s
        const projectExplorerRoot = this.explorer.locator(`div[role="treeitem"][aria-label="${projectName}"]`);
        await projectExplorerRoot.waitFor();
        await projectExplorerRoot.hover();
        const locator = this.explorer.getByLabel('Open View');
        await locator.waitFor();
        await this.page.waitForTimeout(500); // To fix intermittent issues
        await locator.click();
    }

    public async refresh(projectName: string) {
        await this.page.getByRole('treeitem', { name: projectName }).hover();
        const refreshBtn = this.page.getByRole('button', { name: 'Refresh' });
        await refreshBtn.click();
    }
}
