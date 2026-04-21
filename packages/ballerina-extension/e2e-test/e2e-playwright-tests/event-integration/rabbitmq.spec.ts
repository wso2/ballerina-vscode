
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
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';

export default function createTests() {
    test.describe.serial('RabbitMQ Integration Tests', {
        tag: '@group1',
    }, async () => {
        let listenerName: string;
        let queueName: string;
        initTest();
        test('Create RabbitMQ Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('RabbitMQ Integration', 'trigger-rabbitmq');
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            // Create a new listener
            listenerName = `rabbitmqListener`;
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);

            queueName = `myQueueName`;
            await form.fill({
                values: {
                    'basePath': {
                        type: 'cmEditor',
                        value: `"${queueName}"`,
                        additionalProps: { clickLabel: true, switchMode: 'expression-mode', window: global.window }
                    }
                }
            });
            await form.submit('Create');

            const selectedListener = artifactWebView.locator(`text=${listenerName}`);
            await selectedListener.waitFor();

            // Verify integration appears in project tree
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `RabbitMQ Event Integration - "${queueName}"`], true);
        });

        test('Add onMessage Handler', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding onMessage handler in test attempt: ', testAttempt);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // Step 1-2: Verify integration is open in service designer
            const context = artifactWebView.locator(`text=${listenerName}`);
            await context.waitFor();

            // Step 4: Click Add Handler button
            const addHandlerBtn = artifactWebView.locator('button:has-text("Add Handler")').or(
                artifactWebView.locator('button:has-text("Handler")')
            ).or(
                artifactWebView.locator('vscode-button').filter({ hasText: /Add Handler|Handler/i })
            ).or(
                artifactWebView.locator('[data-testid*="add-handler"], [data-testid*="handler"]')
            );

            if (await addHandlerBtn.count() > 0) {
                await addHandlerBtn.first().waitFor();
                await addHandlerBtn.first().click({ force: true });
                await page.page.waitForTimeout(1000);

                // Step 5-6: Verify handler selection dialog
                // Click on the card with data-testid="function-card-onMessage" (onMessage handler)
                const onMessageCard = artifactWebView.locator('[data-testid="function-card-onMessage"]');
                await onMessageCard.waitFor({ state: 'visible' });
                await onMessageCard.click();

                // From the side panel, click the "Define Content" button, then click the "Save" button.
                // Wait for the side panel containing "Message Handler Configuration" to appear
                const handlerConfigPanel = artifactWebView.locator('[data-testid="side-panel"]');
                await handlerConfigPanel.getByText('Message Handler Configuration').waitFor({ timeout: 10000 });

                // Step 7: Click on the Define Content button (by text only, no CSS classes)
                // Search for a button, div, or span with exact text "Define Content"
                let defineContentBtn = handlerConfigPanel.getByText('Define Content', { exact: true });
                if (await defineContentBtn.count() === 0) {
                    // fallback: find visible element with that text
                    defineContentBtn = handlerConfigPanel.locator(':text("Define Content")');
                }
                await defineContentBtn.first().waitFor({ state: 'visible', timeout: 5000 });
                await defineContentBtn.first().click();

                // Select the Default JSON Type from the model box
                // Click the "Continue with JSON Type" button shown in the center of the modal
                const continueWithJsonBtn = artifactWebView.getByText('Continue with JSON Type', { exact: true });
                await continueWithJsonBtn.waitFor({ state: 'visible', timeout: 5000 });
                await continueWithJsonBtn.click();

                // Click the "Save" button at the bottom of the panel
                const saveBtn = handlerConfigPanel.locator('vscode-button[appearance="primary"]').filter({ hasText: 'Save' });
                await saveBtn.first().waitFor({ state: 'visible', timeout: 5000 });
                await saveBtn.first().click();

                // Wait for the panel to disappear after save
                await handlerConfigPanel.getByText('Message Handler Configuration').waitFor({ state: 'detached', timeout: 10000 });
            }

            // Try to detect if user got redirected to diagram view, otherwise click new resource under agent view
            const diagramCanvas = artifactWebView.locator('[data-testid="bi-diagram-canvas"]');
            let didRedirect = true;
            try {
                await diagramCanvas.waitFor({ timeout: 10000 });
            } catch (e) {
                // Not redirected to diagram view, try clicking the new resource under agent view
                didRedirect = false;
            }

            if (!didRedirect) {
                // Find the new resource element in service agent view and click it to go to the diagram view
                const resourceRow = artifactWebView.locator(`[data-testid="service-agent-view-resource"]`).getByText("onMessage", { exact: true });
                await resourceRow.first().waitFor({ timeout: 10000 });
                await resourceRow.first().click({ force: true });
                // Now wait for the diagram canvas to appear
                await diagramCanvas.waitFor({ timeout: 10000 });
            }
            // Verify the selected handler name from the title bar area.
            const titleBarContainer = artifactWebView.locator('[data-testid="title-bar-container"]');
            await titleBarContainer.getByText('onMessage', { exact: true }).first()
                .waitFor({ state: 'visible', timeout: 30000 });
        });

        test('Editing RabbitMQ Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing a service in test attempt: ', testAttempt);

            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `RabbitMQ Event Integration - "${queueName}"`], true);
            await serviceTreeItem.click({ force: true });

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            const editBtn = artifactWebView.locator('vscode-button[title="Edit Service"]');
            await editBtn.waitFor();
            await editBtn.click({ force: true });

            queueName = `updated-queue-name`;
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Queue Name*The name of the queue': {
                        type: 'input',
                        value: `"${queueName}"`
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

            // Click back button
            const backBtn = artifactWebView.locator('[data-testid="back-button"]');
            await backBtn.waitFor();
            await backBtn.click();

            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `RabbitMQ Event Integration - "${queueName}"`], true);

            const updatedQueueNameElement = artifactWebView.locator(`text=${queueName}`);
            await updatedQueueNameElement.waitFor({ state: 'visible' });
        });

        test('Delete RabbitMQ Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting RabbitMQ integration in test attempt: ', testAttempt);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `RabbitMQ Event Integration - "${queueName}"`], true);
            await serviceTreeItem.click({ button: 'right' });
            const deleteButton = page.page.getByRole('button', { name: 'Delete' }).first();
            await deleteButton.waitFor({ timeout: 5000 });
            await deleteButton.click();
            await page.page.waitForTimeout(500);
            await expect(serviceTreeItem).not.toBeVisible({ timeout: 10000 });
        });
    });
}
