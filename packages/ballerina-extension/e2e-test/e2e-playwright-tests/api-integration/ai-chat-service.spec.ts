
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
    test.describe('AI Chat Agent Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        let sampleName: string;
        test('Create AI Chat Agent', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new AI Chat Agent in test attempt: ', testAttempt);
            // Creating a AI Chat Agent
            await addArtifact('AI Chat Agent', 'ai-agent-card');
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            sampleName = `sample${testAttempt}`;
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    "NameName of the agent (e.g. 'Customer Support Assistant', 'Sales Advisor', 'Data Analyst')": {
                        type: 'input',
                        value: sampleName,
                    }
                }
            });
            await form.submit('Create');
            console.log('AI Chat Agent creation form submitted');

            // Check if the diagram canvas is visible
            const diagramCanvas = artifactWebView.locator('#bi-diagram-canvas');
            await diagramCanvas.waitFor({ state: 'visible', timeout: 240000 });

            const diagramTitle = artifactWebView.locator('h2', { hasText: 'AI Chat Agent' });
            await diagramTitle.waitFor();

            // Check if the agent call node is visible
            const agentCallNode = artifactWebView.locator('[data-testid="agent-call-node"]');
            await agentCallNode.waitFor();

            // Check if the AI Chat Agent is created in the project explorer
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `AI Agent Services - /${sampleName}`], true);

            const updateArtifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!updateArtifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
        });

        test('Delete AI Chat Agent', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting a AI Chat Agent in test attempt: ', testAttempt);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            const projectExplorer = new ProjectExplorer(page.page);
            const serviceTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `AI Agent Services - /${sampleName}`], true);
            await serviceTreeItem.click({ button: 'right' });
            const deleteButton = page.page.getByRole('button', { name: 'Delete' }).first();
            await deleteButton.waitFor({ timeout: 5000 });
            await deleteButton.click();
            await page.page.waitForTimeout(500);
            await expect(serviceTreeItem).not.toBeVisible({ timeout: 10000 });
        });
    });
}
