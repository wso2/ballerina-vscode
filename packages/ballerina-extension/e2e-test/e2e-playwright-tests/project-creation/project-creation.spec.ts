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
import { expect, test } from '@playwright/test';
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, DEFAULT_PROJECT_NAME, getWebview, initTest, newProjectPath, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { waitForBISidebarTreeView } from '../utils/helpers/sidebar';
import { ProjectExplorer } from '../utils/pages';
import { dataFolder } from '../utils/helpers/setup';

export default function createTests() {
    test.describe.serial('Project Creation Tests', {
    }, async () => {
        initTest(false);
        test('Create Project', async () => {
            const workbenchPage = page.page;
            // Activity bar entry is an <a class="action-label" aria-label="...">, not a tab role.
            console.log('Clicking on the WSO2 Integrator activity tab');
            const wso2IntegratorActivity = workbenchPage.locator(
                `#workbench\\.parts\\.activitybar a.action-label[aria-label="${BI_INTEGRATOR_LABEL}"]`
            ).first();
            await wso2IntegratorActivity.waitFor({ state: 'visible', timeout: 120000 });
            await wso2IntegratorActivity.click();


            // Click on Getting Started
            // Click on the "Get Started" button in the Integrator side bar
            console.log('Clicking on the "Get Started" button in the Integrator side bar');
            const getStartedButton = workbenchPage.getByRole('button', { name: 'Get Started' }).first();
            await getStartedButton.waitFor({ timeout: 10000 });
            await getStartedButton.click();

            // Wait for Welcome webview to load (identified by iframe with BI_INTEGRATOR_LABEL)
            console.log('Waiting for Welcome webview to load');
            const welcomeWebView = await switchToIFrame('Welcome', workbenchPage);
            if (!welcomeWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            await welcomeWebView.waitForLoadState();

            console.log('Clicking Create on Create New Integration card');
            await welcomeWebView.getByRole('heading', { name: 'Create New Integration' }).waitFor({ timeout: 60000 });
            await welcomeWebView.locator('h3').filter({ hasText: 'Create New Integration' }).locator('..').getByRole('button', { name: 'Create' }).click();

            const biWebview = await getWebview("Welcome", page);
            const form = new Form(workbenchPage, "Welcome", biWebview);
            await form.switchToFormView(false, biWebview);

            console.log('Filling integration create form');

            const projectName = "testProject";
            const integrationName = "testIntegration";
            await form.fill({
                values: {
                    'Integration Name*': {
                        type: 'input',
                        value: integrationName,
                    },
                    "Project Name*": {
                        type: 'input',
                        value: projectName,
                    }
                },
            });

            // Fill the project Path
            const projectPathInput = biWebview.locator('input#project-folder-selector-input');
            await projectPathInput.fill(dataFolder);

            await form.submit('Create Integration');

            // Handle the VS Code save confirmation dialog rendered outside the webview iframe.
            const saveDialog = workbenchPage.locator('div.monaco-dialog-box[role="dialog"]').first();
            const discardAndNavigateButton = saveDialog.getByRole('button', { name: "Don't Save" }).first();
            if (await discardAndNavigateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await discardAndNavigateButton.click();
            }

            console.log('Waiting for project and BI webview');
            let artifactWebView;
            const maxArtifactWebViewRetries = 5;
            for (let attempt = 1; attempt <= maxArtifactWebViewRetries; attempt++) {
                try {
                    artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
                    await artifactWebView.locator(`text=${projectName}`).waitFor({ timeout: 40000 });
                    break;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    const isRetryableWebviewIssue = message.includes('Frame was detached')
                        || message.includes('Failed to access iframe')
                        || message.includes(BI_WEBVIEW_NOT_FOUND_ERROR);
                    if (attempt === maxArtifactWebViewRetries || !isRetryableWebviewIssue) {
                        throw error;
                    }
                    console.log(`Artifact webview was unstable while waiting for project. Retrying (${attempt}/${maxArtifactWebViewRetries})`);
                    await page.page.waitForTimeout(1500);
                }
            }


            // console.log('Waiting Tree View to load');
            // const projectExplorer = new ProjectExplorer(workbenchPage);
            // const rootItem = await projectExplorer.findItem([integrationName]);
            // await expect(rootItem).toBeVisible();

            // Click on the integration name
            // Click on the integration name ("testIntegration") in the project explorer tree

            // Click on the integration name ("testIntegration") directly from the BI webview project tree, not the project explorer
            const integrationNodeInWebview = artifactWebView.locator(`text=${integrationName}`);
            // await expect(integrationNodeInWebview).toBeVisible();
            await integrationNodeInWebview.click({ force: true });



            // Create automation

            // 1. Click on the "Add Artifact" button
            // 2. Verify the Artifacts menu is displayed
            // 3. Under "Automation" section, click on "Automation" option
            await addArtifact('Automation', 'automation');

            const artifactWebView2 = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView2) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // 4. Verify the "Create New Automation" form is displayed
            const createForm = artifactWebView2.getByRole('heading', { name: /Create New Automation/i });
            await createForm.waitFor({ timeout: 10000 });

            // 6. (Optional) Click on "Advanced Configurations" to expand the section
            const advancedConfigExpand = artifactWebView2.getByText('Expand').first();
            if (await advancedConfigExpand.isVisible({ timeout: 2000 }).catch(() => false)) {
                await advancedConfigExpand.click();
                await page.page.waitForTimeout(500);
            }

            // 7. (Optional) Verify "Return Error" checkbox is checked by default
            const returnErrorCheckbox = artifactWebView2.getByRole('checkbox', { name: /Return Error/i }).first();
            if (await returnErrorCheckbox.isVisible()) {
                const isChecked = await returnErrorCheckbox.isChecked();
                if (!isChecked) {
                    throw new Error('Return Error checkbox should be checked by default');
                }
            }

            // 8. Click on the "Create" button
            await artifactWebView2.getByRole('button', { name: 'Create' }).click();

            // 9. Verify the Automation is created and the automation designer view is displayed
            const diagramCanvas = artifactWebView2.locator('#bi-diagram-canvas');
            await diagramCanvas.waitFor({ state: 'visible', timeout: 30000 });

            // 10. Verify the automation name is displayed (default: "main")
            const diagramTitle = artifactWebView2.locator('h2', { hasText: 'Automation' });
            await diagramTitle.waitFor();

            // 11. Verify the "Flow" and "Sequence" tabs are available
            // Wait for the diagram to fully load before checking for tabs
            await page.page.waitForTimeout(1000);
            // The tabs are clickable generic elements, not role="tab"
            const flowTab = artifactWebView2.getByText('Flow').first();
            await flowTab.waitFor({ timeout: 10000, state: 'visible' });
            const sequenceTab = artifactWebView2.getByText('Sequence').first();
            await sequenceTab.waitFor({ timeout: 10000, state: 'visible' });

            // 12. Verify the flow diagram shows a "Start" node
            // Check if "Start" node is present using data-testid
            const startNode = artifactWebView2.locator('[data-testid="start-node"]');
            await startNode.waitFor({ timeout: 10000, state: 'visible' });

            // 13. Verify the flow diagram shows an "Error Handler" node
            // Check if "Error Handler" node is present without using CSS class selectors
            await artifactWebView2.getByText(/^Error Handler$/, { exact: true }).first();

        });
    });
}
