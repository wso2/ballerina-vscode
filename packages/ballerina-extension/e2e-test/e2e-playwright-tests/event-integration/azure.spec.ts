
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
    test.describe('Azure Integration Tests', {
        tag: '@group1',
    }, async () => {
        let listenerName: string;
        initTest();
        test('Create Azure Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('Azure Integration', 'trigger-asb');
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            // Create a new listener
            listenerName = `listenerAzure${testAttempt}`;
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'connectionString': {
                        type: 'cmEditor',
                        value: 'Endpoint=sb://test.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=test',
                        additionalProps: { clickLabel: true, switchMode: 'primary-mode', window: global.window }
                    },
                    'entityConfig': {
                        type: 'cmEditor',
                        value: `{ queueName: "testQueue" }`,
                        additionalProps: { clickLabel: true, switchMode: 'expression-mode', window: global.window }
                    }
                }
            });
            await form.submit('Create');

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `Azure Service Bus Event Integration`], true);

            const asbListener = `asbListener`;
            const context = artifactWebView.locator(`text=${asbListener}`);
            await context.waitFor();
        });

        test('Editing Azure Integration', async ({ }, testInfo) => {
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
            await form.fill({
                values: {
                    'connectionString': {
                        type: 'cmEditor',
                        value: 'Endpoint=sb://test.updated.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=test',
                        additionalProps: { clickLabel: true, switchMode: 'primary-mode', window: global.window }
                    },
                    'entityConfig': {
                        type: 'cmEditor',
                        value: `{ queueName: "updated-queue-name" }`,
                        additionalProps: { clickLabel: true, switchMode: 'expression-mode', window: global.window }
                    }
                }
            });
            await form.submit('Save Changes');

            const saveChangesBtn = artifactWebView.locator('#save-changes-btn vscode-button[appearance="primary"]');
            await saveChangesBtn.waitFor({ state: 'visible' });
            await expect(saveChangesBtn).toHaveClass('disabled', { timeout: 5000 });
            await expect(saveChangesBtn).toHaveText('Save Changes');

            const backBtn = artifactWebView.locator('[data-testid="back-button"]');
            await backBtn.waitFor();
            await backBtn.click();

            await editBtn.waitFor();

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `Azure Service Bus Event Integration`], true);

            const asbListener = `asbListener`;
            const context = artifactWebView.locator(`text=${asbListener}`);
            await context.waitFor({ state: 'visible' });
        });

        test('Delete Azure Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting Azure integration in test attempt: ', testAttempt);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `Azure Service Bus Event Integration`], true);
            await serviceTreeItem.click({ button: 'right' });
            const deleteButton = page.page.getByRole('button', { name: 'Delete' }).first();
            await deleteButton.waitFor({ timeout: 5000 });
            await deleteButton.click();
            await page.page.waitForTimeout(500);
            await expect(serviceTreeItem).not.toBeVisible({ timeout: 10000 });
        });
    });
}
