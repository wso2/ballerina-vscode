
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
    test.describe.serial('Function Artifact Tests', {
    }, async () => {
        let functionName = '';
        initTest();
        test('Create Function Artifact', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new function in test attempt: ', testAttempt);
            // Creating a HTTP Service
            await addArtifact('Function Artifact', 'bi-function');
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            functionName = `sample${testAttempt}`;
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Name*Name of the function': {
                        type: 'input',
                        value: functionName,
                    }
                }
            });
            await form.submit('Create');
            const context = artifactWebView.locator(`text=${functionName}`);
            await context.waitFor();
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `${functionName}`]);
            const updateArtifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!updateArtifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
        });

        test('Editing Function Artifact', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing a function in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            const editBtn = artifactWebView.locator('#bi-edit');
            await editBtn.waitFor();
            await editBtn.click({ force: true });

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Return Type': {
                        type: 'textarea',
                        value: 'string',
                        additionalProps: { clickLabel: true }
                    }
                }
            });
            await form.submit('Save');
            const context = artifactWebView.locator(`text=${functionName}`);
            await context.waitFor();
        });

        test('Delete Function Artifact', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting a function in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            const projectExplorer = new ProjectExplorer(page.page);
            const functionTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `Functions`, `${functionName}`]);
            await functionTreeItem.click({ button: 'right' });
            const deleteButton = page.page.getByRole('button', { name: 'Delete' }).first();
            await deleteButton.waitFor({ timeout: 5000 });
            await deleteButton.click();
            await page.page.waitForTimeout(500);
            await expect(functionTreeItem).not.toBeVisible({ timeout: 10000 });
        });
    });
}
