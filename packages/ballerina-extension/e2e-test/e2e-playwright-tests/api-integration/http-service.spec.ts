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
import { test, expect } from '@playwright/test';
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';

export default function createTests() {
    test.describe.serial('HTTP Service Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        let serviceBasePath = '/';
        let editedPath = '';
        test('Create HTTP Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('HTTP Service', 'http-service-card');
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            const sampleName = `/sample${testAttempt}`;
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Service Base Path*': {
                        type: 'input',
                        value: sampleName,
                    }
                }
            });
            await form.submit('Create');
            // Check for both possible text matches to avoid strict mode violation
            const httpServiceLabel = artifactWebView.locator(`text=HTTP Service - ${sampleName}`);
            const servicePathLabel = artifactWebView.locator(`text=${sampleName}`).first();
            await Promise.race([
                httpServiceLabel.waitFor(),
                servicePathLabel.waitFor()
            ]);
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `HTTP Service - ${sampleName}`]);
            const updateArtifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!updateArtifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
        });

        test('Editing HTTP Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing a service in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            const editBtn = artifactWebView.locator('vscode-button[title="Edit Service"]');
            await editBtn.waitFor();
            await editBtn.click({ force: true });
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            serviceBasePath = `/editedSample${testAttempt}`;
            await form.fill({
                values: {
                    'Base Path*': {
                        type: 'input',
                        value: serviceBasePath,
                    }
                }
            });
            await form.submit('Save Changes');
            // Wait for the save changes button inside the container with id "save-changes-btn",
            // ensuring the disabled attribute is present and the button text is "Save Changes"
            const saveChangesBtn = artifactWebView.locator('#save-changes-btn vscode-button[appearance="primary"]');
            await saveChangesBtn.waitFor({ state: 'visible' });
            await expect(saveChangesBtn).toHaveClass('disabled', { timeout: 5000 });
            await expect(saveChangesBtn).toHaveText('Save Changes');
            // Click project tree button
            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', `HTTP Service - ${serviceBasePath}`]);
            await serviceTreeItem.click({ force: true });

            // Check for both possible text matches to avoid strict mode violation
            const httpServiceLabel = artifactWebView.locator(`text=HTTP Service - ${serviceBasePath}`);
            const servicePathLabel = artifactWebView.locator(`text=${serviceBasePath}`).first();
            await Promise.race([
                httpServiceLabel.waitFor(),
                servicePathLabel.waitFor()
            ]);
        });

        test('Add GET Resource to HTTP Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding GET resource in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            // Verify service is open in service designer - wait for service designer to load
            await page.page.waitForTimeout(2000);
            // Verify service is open in service designer
            // Scroll to Resources section and verify "No resources found" message
            const noResourcesMessage = artifactWebView.locator('text=/No resources found|Add a new resource/i');
            await noResourcesMessage.waitFor({ timeout: 10000 }).catch(() => {
                // Message might not be visible if resources already exist
            });

            // Click on "Add Resource" button
            const addResourceBtn = artifactWebView.getByRole('button', { name: /Add Resource/i }).or(
                artifactWebView.locator('button[aria-label*="Add Resource"]')
            ).or(
                artifactWebView.locator('vscode-button:has-text("Add Resource")')
            );
            await addResourceBtn.first().waitFor({ timeout: 10000 });
            await addResourceBtn.first().click();

            // Wait for HTTP method selection dialog to appear
            await page.page.waitForTimeout(1500);

            // Click on GET option - try multiple selector strategies
            const getMethodOption = artifactWebView.getByText('GET', { exact: true });
            await getMethodOption.waitFor({ timeout: 10000 });
            await getMethodOption.click();

            // Wait for resource configuration form to load
            await page.page.waitForTimeout(1500);

            // Fill resource path
            const resourcePath = `usersGET${testAttempt}`;
            const resourcePathInput = artifactWebView.getByRole('textbox', { name: /Resource Path/i }).or(
                artifactWebView.locator('input[placeholder*="path/foo"]').or(
                    artifactWebView.locator('input[name*="Resource Path"]')
                ).or(
                    artifactWebView.locator('[data-testid="resource-path-input"]')
                )
            );
            await resourcePathInput.first().waitFor({ timeout: 10000 });
            await resourcePathInput.first().pressSequentially(resourcePath, { delay: 100 });

            // Click Save button
            const saveBtn = artifactWebView.getByText('Save', { exact: true });
            await saveBtn.click({ force: true });

            await page.page.waitForTimeout(2000);
            // Try to detect if user got redirected to diagram view, otherwise click new resource under agent view
            const diagramCanvas = artifactWebView.locator('[data-testid="bi-diagram-canvas"]');
            const visualizerContainer = artifactWebView.locator('#visualizer-container');
            let didRedirect = true;
            try {
                await diagramCanvas.waitFor({ timeout: 10000 });
            } catch (e) {
                // Not redirected to diagram view, try clicking the new resource under agent view
                didRedirect = false;
            }

            if (!didRedirect) {
                // Find the new resource element in service agent view and click it to go to the diagram view
                const resourceRow = artifactWebView.locator(`[data-testid="service-agent-view-resource"]`).getByText(resourcePath, { exact: true });
                await resourceRow.first().waitFor({ timeout: 10000 });
                await resourceRow.first().click({ force: true });
                // Now wait for the diagram canvas to appear
                await diagramCanvas.waitFor({ timeout: 10000 });
            }

            // Verify the resource is added in the diagram view
            const resourceElement = visualizerContainer.getByText(resourcePath, { exact: true });
            await resourceElement.waitFor({ timeout: 30000 });
        });

        test('Add POST Resource to HTTP Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding POST resource in test attempt: ', testAttempt);

            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', `HTTP Service - ${serviceBasePath}`]);
            await serviceTreeItem.click({ force: true });

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            // Click on "Add Resource" button
            const addResourceBtn = artifactWebView.getByRole('button', { name: /Resource/i }).or(
                artifactWebView.locator('button[aria-label*="Resource"]')
            ).or(
                artifactWebView.locator('vscode-button:has-text("Resource")')
            );
            await addResourceBtn.first().waitFor({ timeout: 10000 });
            await addResourceBtn.first().click({ force: true });

            await page.page.waitForTimeout(1000);

            // Click on POST option
            const postMethodOption = artifactWebView.getByText('POST', { exact: true });
            await postMethodOption.waitFor({ timeout: 10000 });
            await postMethodOption.click();

            await page.page.waitForTimeout(1000);

            // Fill resource path
            const resourcePath = `usersPOST${testAttempt}`;
            const resourcePathInput = artifactWebView.getByRole('textbox', { name: /Resource Path/i }).or(
                artifactWebView.locator('input[placeholder*="path/foo"]').or(
                    artifactWebView.locator('input[name*="Resource Path"]')
                )
            );
            await resourcePathInput.first().waitFor({ timeout: 10000 });
            await resourcePathInput.first().pressSequentially(resourcePath, { delay: 100 });

            // Verify Responses section shows default 200 response
            const response200 = artifactWebView.locator('text=/200|Response.*200/i');
            await response200.first().waitFor({ timeout: 5000 }).catch(() => {
                // Response section might be structured differently
            });

            // Click Save button
            const saveBtn = artifactWebView.getByText('Save', { exact: true });
            await saveBtn.click();
            await page.page.waitForTimeout(1000);

            // Try to detect if user got redirected to diagram view, otherwise click new resource under agent view
            const diagramCanvas = artifactWebView.locator('[data-testid="bi-diagram-canvas"]');
            const visualizerContainer = artifactWebView.locator('#visualizer-container');
            let didRedirect = true;
            try {
                await diagramCanvas.waitFor({ timeout: 10000 });
            } catch (e) {
                // Not redirected to diagram view, try clicking the new resource under agent view
                didRedirect = false;
            }

            if (!didRedirect) {
                // Find the new resource element in service agent view and click it to go to the diagram view
                const resourceRow = artifactWebView.locator(`[data-testid="service-agent-view-resource"]`).getByText(resourcePath, { exact: true });
                await resourceRow.first().waitFor({ timeout: 10000 });
                await resourceRow.first().click({ force: true });
                // Now wait for the diagram canvas to appear
                await diagramCanvas.waitFor({ timeout: 10000 });
            }
            // Verify the resource is added in the diagram view
            const resourceElement = visualizerContainer.getByText(resourcePath, { exact: true });
            await resourceElement.waitFor({ timeout: 30000 });
        });

        test('Edit Resource Path', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing resource path in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // Click on the edit id="bi-edit" button
            const editBtn = artifactWebView.locator('#bi-edit');
            await editBtn.waitFor();
            await editBtn.click({ force: true });

            await page.page.waitForTimeout(1000);

            editedPath = `usersEDIT${testAttempt}`;
            const resourcePathInput = artifactWebView.getByRole('textbox', { name: /Resource Path/i }).or(
                artifactWebView.locator('input[placeholder*="path/foo"]')
            );
            await resourcePathInput.first().waitFor({ timeout: 10000 });
            await resourcePathInput.first().fill(editedPath);

            const saveBtn = artifactWebView.getByText('Save', { exact: true });
            await saveBtn.click();

            // Verify resource path is updated
            const diagramCanvas = artifactWebView.locator('[data-testid="bi-diagram-canvas"]');
            await diagramCanvas.waitFor({ timeout: 10000 });
            const visualizerContainer = artifactWebView.locator('#visualizer-container');
            const resourceElement = visualizerContainer.getByText(editedPath, { exact: true });
            await resourceElement.waitFor({ timeout: 10000 });
        });

        test('Delete Resource from Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting resource in test attempt: ', testAttempt);
            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', `HTTP Service - ${serviceBasePath}`]);
            await serviceTreeItem.click({ force: true });

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            // Click on the bi-delete button under the correct service-agent-view-resource of editedPath
            // Find the resource node with the editedPath and click its delete button
            const resourceItems = artifactWebView.locator('[data-testid="service-agent-view-resource"]');
            const resourceCountBefore = await resourceItems.count();

            // Find the resource containing the editedPath text
            let resourceItem = null;
            for (let i = 0; i < resourceCountBefore; i++) {
                const resourceElement = resourceItems.nth(i);
                const hasText = await resourceElement.getByText(editedPath, { exact: true })
                    .isVisible({ timeout: 2000 })
                    .catch(() => false);
                if (hasText) {
                    resourceItem = resourceElement;
                    break;
                }
            }
            if (!resourceItem) {
                throw new Error(`Resource with path "${editedPath}" not found`);
            }

            // Click the delete button inside that resource node
            const deleteButton = resourceItem.locator('#bi-delete');
            await deleteButton.waitFor({ timeout: 10000 });
            await deleteButton.click({ force: true });

            // Wait for the confirmation dialog and click the "Okay" button
            const okButton = artifactWebView.locator('[data-testid="dm-save-popover-continue-btn"]');
            await okButton.waitFor({ timeout: 10000 });
            await okButton.click();

            // Wait for the resource to be removed
            await page.page.waitForTimeout(2000);

            // There should be only 1 resource-agent-view-resource left
            const resourceCountAfter = await resourceItems.count();
            expect(resourceCountAfter).toBe(1);
        });

        test('Delete HTTP Service', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting HTTP service in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // Verify service exists in project explorer
            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', `HTTP Service - ${serviceBasePath}`]);
            await expect(serviceTreeItem).toBeVisible();

            // Find delete button in toolbar or context menu
            // 2. Right-click on the automation item in the tree view to open context menu
            await serviceTreeItem.click({ button: 'right' });

            // 3. Click on the "Delete" button in the context menu
            await page.page.waitForTimeout(500); // Wait for context menu to appear
            const deleteButton = page.page.getByRole('button', { name: 'Delete' }).first();
            await deleteButton.waitFor({ timeout: 5000 });
            await deleteButton.click();

            // Verify service is removed
            await page.page.waitForTimeout(2000);
            await expect(serviceTreeItem).not.toBeVisible({ timeout: 10000 });
        });

        test('Create HTTP Service with Custom Listener', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating service with custom listener in test attempt: ', testAttempt);
            await addArtifact('HTTP Service', 'http-service-card');
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            serviceBasePath = `/customListenerService${testAttempt}`;
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);

            // Fill base path
            await form.fill({
                values: {
                    'Service Base Path*': {
                        type: 'input',
                        value: serviceBasePath,
                    }
                }
            });

            // Expand Advanced Configurations
            // Click the 'Expand' button in the Advanced Configurations section
            const advancedConfigBtn = artifactWebView.getByText('Expand', { exact: true });
            await advancedConfigBtn.waitFor({ timeout: 10000 });
            await advancedConfigBtn.click();
            await page.page.waitForTimeout(500);

            // Click Custom Listener radio button
            // Click on the "Custom Listener" radio option. The locator targets <vscode-radio> with the appropriate accessible label.
            const customListenerRadio = artifactWebView.getByRole('radio', { name: 'Custom Listener' });
            await customListenerRadio.waitFor({ timeout: 10000 });
            await customListenerRadio.click({ force: true });
            await page.page.waitForTimeout(500);

            // Fill custom listener fields if available
            // Fill the Listener Name (required field) in the form
            const listenerNameInput = artifactWebView.locator('input[name="listenerVarName"]');
            const listenerNameExists = await listenerNameInput.isVisible({ timeout: 2000 }).catch(() => false);
            if (listenerNameExists) {
                await listenerNameInput.pressSequentially(`customHttpListener${testAttempt}`, { delay: 100 });
            }

            // Submit form
            await form.submit('Create');

            // Verify service is created
            const httpServiceLabel = artifactWebView.locator(`text=HTTP Service - ${serviceBasePath}`);
            const servicePathLabel = artifactWebView.locator(`text=${serviceBasePath}`).first();
            await Promise.race([
                httpServiceLabel.waitFor(),
                servicePathLabel.waitFor()
            ]);
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `HTTP Service - ${serviceBasePath}`]);
        });

    });
}
