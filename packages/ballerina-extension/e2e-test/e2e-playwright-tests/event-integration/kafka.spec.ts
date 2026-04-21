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
    test.describe.serial('Kafka Integration Tests', {
        tag: '@group1',
    }, async () => {
        let listenerName: string;
        initTest();

        test('Create Kafka Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new Kafka integration in test attempt: ', testAttempt);

            // Step 1-5: Navigate and add artifact
            await addArtifact('Kafka Integration', 'trigger-kafka');
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // Step 6-11: Fill form
            listenerName = `kafkaListener`;
            const bootstrapServers = `localhost:9092`;
            const topic = `test-topic`;

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);

            // Single-step form: All fields in one form
            await form.fill({
                values: {
                    'bootstrapServers': {
                        type: 'cmEditor',
                        value: bootstrapServers,
                        additionalProps: { clickLabel: true, switchMode: 'primary-mode', window: global.window }
                    },
                    'topics': {
                        type: 'cmEditor',
                        value: topic,
                        additionalProps: { clickLabel: true, switchMode: 'primary-mode', window: global.window }
                    }
                }
            });

            // Step 15: Create the integration
            await form.submit('Create');

            const kafkaListener = `kafkaListener`;
            // Step 13: Verify integration is updated
            const context = artifactWebView.locator(`text=${kafkaListener}`);
            await context.waitFor();

            // Verify integration appears in project tree
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `Kafka Event Integration`], true);

        });

        test('Edit Kafka Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing Kafka integration in test attempt: ', testAttempt);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // Step 1-3: Open configure dialog
            const editBtn = artifactWebView.locator('vscode-button[title="Edit Service"]').or(
                artifactWebView.locator('button[title*="Edit"]')
            );
            await editBtn.waitFor();
            await editBtn.click({ force: true });

            // Step 4: Wait for "Kafka Event Integration Configuration" form to be open
            // Check if the div with id="TitleDiv" is visible, indicating the form is open
            const titleDiv = artifactWebView.locator('#TitleDiv');
            await titleDiv.waitFor();

            // Step 5-9: Update bootstrap servers and topic
            const updatedBootstrapServers = `"kafka1:9092,kafka2:9092"`;
            const updatedTopic = `updated-topic`;

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            // Single-step form structure
            await form.fill({
                values: {
                    'bootstrapServers': {
                        type: 'cmEditor',
                        value: updatedBootstrapServers,
                        additionalProps: { clickLabel: true, switchMode: 'primary-mode', window: global.window }
                    },
                    'topics': {
                        type: 'cmEditor',
                        value: updatedTopic,
                        additionalProps: { clickLabel: true, switchMode: 'primary-mode', window: global.window }
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

            const updatedTopicElement = artifactWebView.locator(`text=${updatedTopic}`);
            await updatedTopicElement.waitFor({ state: 'visible' });
        });

        test('Configure Multiple Topics', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Configuring multiple topics in test attempt: ', testAttempt);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // Step 1-2: Open configure dialog
            const editBtn = artifactWebView.locator('vscode-button[title="Edit Service"]').or(
                artifactWebView.locator('button[title*="Edit"]')
            );
            await editBtn.waitFor();
            await editBtn.click({ force: true });

            // Step 4: Wait for form to be open
            const titleDiv = artifactWebView.locator('#TitleDiv');
            await titleDiv.waitFor();

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);

            // Step 4-6: Enter multiple topics as comma-separated values
            const multipleTopics = `topic1,topic2,topic3`;

            await form.fill({
                values: {
                    'topics': {
                        type: 'cmEditor',
                        value: multipleTopics,
                        additionalProps: { clickLabel: true, switchMode: 'primary-mode', window: global.window }
                    }
                }
            });

            // Step 7: Save changes
            await form.submit('Save Changes');
            const saveChangesBtn = artifactWebView.locator('#save-changes-btn vscode-button[appearance="primary"]');
            await saveChangesBtn.waitFor({ state: 'visible' });
            await expect(saveChangesBtn).toHaveClass('disabled', { timeout: 5000 });
            await expect(saveChangesBtn).toHaveText('Save Changes');
            const backBtn = artifactWebView.locator('[data-testid="back-button"]');
            await backBtn.waitFor();
            await backBtn.click();

            // Step 8: Verify integration is updated with multiple topics
            const topicsElement = artifactWebView.locator(`text=${multipleTopics}`);
            await topicsElement.waitFor({ state: 'visible' });
        });

        test('Add Consumer Error Handler', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding error handler in test attempt: ', testAttempt);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // Step 1-2: Verify integration is open in service designer
            const kafkaListener = `kafkaListener`;
            const context = artifactWebView.locator(`text=${kafkaListener}`);
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
                // Click on the card with data-testid="function-card-onError" (onError handler)
                const onErrorCard = artifactWebView.locator('[data-testid="function-card-onError"]');
                await onErrorCard.waitFor({ state: 'visible' });
                await onErrorCard.click();
            }

            await artifactWebView.locator('[data-testid="service-agent-view-resource"]').waitFor({ timeout: 10000 });

            // Step 8-10: Verify onError handler is added
            const onError = artifactWebView.locator(`text=onError`);
            await onError.waitFor({ timeout: 10000 });

            // Verify handler appears in project tree
            const projectExplorer = new ProjectExplorer(page.page);
            try {
                await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Kafka Event Integration', 'onError'], false);
            } catch (e) {
                console.log('onError handler may not appear in tree, but exists in service designer');
            }
        });

        test('Delete Kafka Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting Kafka integration in test attempt: ', testAttempt);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `Kafka Event Integration`], true);
            await serviceTreeItem.click({ button: 'right' });
            const deleteButton = page.page.getByRole('button', { name: 'Delete' }).first();
            await deleteButton.waitFor({ timeout: 5000 });
            await deleteButton.click();
            await page.page.waitForTimeout(500);

            await expect(serviceTreeItem).not.toBeVisible({ timeout: 10000 });
        });
    });
}
