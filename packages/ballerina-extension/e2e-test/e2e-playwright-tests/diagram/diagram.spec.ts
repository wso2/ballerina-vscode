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
import { test } from '@playwright/test';
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer, Diagram, SidePanel } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';

export default function createTests() {
    test.describe.serial('Automation Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Create Automation for Diagram', async () => {
            // 1. Click on the "Add Artifact" button
            // 2. Verify the Artifacts menu is displayed
            // 3. Under "Automation" section, click on "Automation" option
            await addArtifact('Automation', 'automation');

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // 8. Click on the "Create" button
            await artifactWebView.getByRole('button', { name: 'Create' }).click();

            // 9. Verify the Automation is created and the automation designer view is displayed
            const diagramCanvas = artifactWebView.locator('#bi-diagram-canvas');
            await diagramCanvas.waitFor({ state: 'visible', timeout: 30000 });

            // 10. Verify the automation name is displayed (default: "main")
            const diagramTitle = artifactWebView.locator('h2', { hasText: 'Automation' });
            await diagramTitle.waitFor();

            // 14. Verify the tree view shows the automation name under "Entry Points" section
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main'], false);

            // 15. Add first variable with value "foo"
            const diagram = new Diagram(page.page);
            await diagram.init();
            await diagram.clickAddButtonByIndex(1);

            const sidePanel = new SidePanel(artifactWebView, page.page);
            await sidePanel.init();
            await sidePanel.clickNode('Declare Variable');

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Name*Name of the variable': {
                        type: 'input',
                        value: 'var1',
                    },
                    'Type': {
                        type: 'textarea',
                        value: 'string',
                        additionalProps: { clickLabel: true }
                    },
                    'expression': {
                        type: 'cmEditor',
                        value: '"foo"',
                        additionalProps: { clickLabel: true }
                    }
                }
            });
            await artifactWebView.getByRole('button', { name: 'Save' }).click();
            await page.page.waitForTimeout(1000);

            // 16. Add second variable with value "bar"
            await diagram.clickHoverAddButtonByIndex(1);
            await sidePanel.clickNode('Declare Variable');

            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Name*Name of the variable': {
                        type: 'input',
                        value: 'var2',
                    },
                    'Type': {
                        type: 'textarea',
                        value: 'string',
                        additionalProps: { clickLabel: true }
                    },
                    'expression': {
                        type: 'cmEditor',
                        value: '"bar"',
                        additionalProps: { clickLabel: true }
                    }
                }
            });
            await artifactWebView.getByRole('button', { name: 'Save' }).click();
            await page.page.waitForTimeout(1000);

            // 17. Add if condition to check if variables are equal
            await diagram.clickHoverAddButtonByIndex(2);
            await sidePanel.clickNode('If');

            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'branch-0': {
                        type: 'cmEditor',
                        value: 'var1 == var2',
                        additionalProps: { clickLabel: true }
                    }
                }
            });

            // Click the add Else Block 
            // Click the "Add Else Block" button in the If configuration UI before saving
            // The "Add Else Block" is not a button, but a div with text.
            // So select it by its text using .getByText or .locator, and click it.
            const addElseBlockDiv = artifactWebView.getByText('Add Else Block', { exact: true });
            await addElseBlockDiv.click();
            await artifactWebView.getByRole('button', { name: 'Save' }).click();
            await page.page.waitForTimeout(1000);

            // 18. Add log statement in the if block (true case - Equal)
            // Wait for the if node to be fully rendered
            await page.page.waitForTimeout(1500);

            // Try to find and click the add button in the true branch of the if node
            // The if node should have add buttons for both true and false branches
            const diagramContainer = artifactWebView.locator('#bi-diagram-canvas');
            const ifTrueAddButtons = diagramContainer.locator('[data-testid*="if-true"], [data-testid*="if-block-true"], [data-testid*="empty-node-add-button"]').filter({ hasText: /^$/ }).first();

            await diagram.clickAddButtonByIndex(2);
            // Wait for the side panel to be visible before expanding logging section.
            await artifactWebView.getByTestId('side-panel').waitFor({ state: 'visible', timeout: 5000 });
            await sidePanel.expandSection('Logging');

            await sidePanel.clickNode('Log Info');

            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'msg': {
                        type: 'cmEditor',
                        value: 'Equal',
                        additionalProps: { switchMode: 'primary-mode', clickLabel: true, window: global.window }
                    }
                }
            });
            await artifactWebView.getByRole('button', { name: 'Save' }).click();
            await page.page.waitForTimeout(1000);

            // 19. Add log statement in the else block (false case - Not Equal)
            await page.page.waitForTimeout(2000);


            await diagram.clickAddButtonByIndex(2);

            // Wait for the side panel to be visible before expanding logging section.
            await artifactWebView.getByTestId('side-panel').waitFor({ state: 'visible', timeout: 5000 });
            await sidePanel.clickNode('Log Info');

            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'msg': {
                        type: 'cmEditor',
                        value: 'Not Equal',
                        additionalProps: { switchMode: 'primary-mode', clickLabel: true, window: global.window }
                    }
                }
            });
            await artifactWebView.getByRole('button', { name: 'Save' }).click();
            await page.page.waitForTimeout(1000);
        });
    });
}
