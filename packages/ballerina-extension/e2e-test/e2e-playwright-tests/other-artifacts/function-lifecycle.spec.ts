
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
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, logStep, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { SidePanel, ProjectExplorer } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';

export default function createTests() {
    test.describe.serial('Function Lifecycle Tests', {
    }, async () => {
        let functionName = '';
        initTest();

        test('Create Function Artifact', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            logStep(`Creating function in attempt ${testAttempt}`);

            await addArtifact('Function Artifact', 'bi-function');
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            functionName = `calculateSum${testAttempt}`;
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

            // Confirm function exists in the sidebar tree. This also ensures
            // VS Code has transitioned to the function diagram view so that
            // the next serial test starts with bi-diagram-canvas visible.
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, functionName]);

            logStep(`Created function: ${functionName}`);
        });

        test('Add 2 Parameters and Return Type', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            logStep(`Adding parameters in attempt ${testAttempt}`);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // Wait for the diagram canvas before clicking edit
            const canvas = artifactWebView.locator('[data-testid="bi-diagram-canvas"], #bi-diagram-canvas');
            await canvas.waitFor({ timeout: 60000 });
            await artifactWebView.waitForTimeout(1000);

            // Open function configuration form
            const editBtn = artifactWebView.locator('#bi-edit');
            await editBtn.waitFor({ timeout: 10000 });
            await editBtn.click({ force: true });
            await artifactWebView.waitForTimeout(2000);

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await artifactWebView.waitForTimeout(1000);

            // Helper: add one parameter and wait for it to appear in the list
            const addOneParam = async (type: string, name: string) => {
                const addParamBtn = artifactWebView.locator('[data-testid="bi-add-parameter"]');
                await addParamBtn.waitFor({ timeout: 10000 });
                await addParamBtn.click({ force: true });
                await artifactWebView.waitForTimeout(1000);

                const paramEditor = artifactWebView.locator('[data-testid="bi-param-editor"]');
                await paramEditor.waitFor({ timeout: 10000 });

                const typeInput = paramEditor.locator('vscode-text-area').first().locator('textarea');
                await typeInput.waitFor({ timeout: 5000 });
                await typeInput.click();
                await artifactWebView.waitForTimeout(500);
                await typeInput.pressSequentially(type);
                await artifactWebView.waitForTimeout(800);

                const typeHelperItem = artifactWebView.locator(`[data-testid="type-helper-item-${type}"]`);
                const helperVisible = await typeHelperItem.isVisible({ timeout: 3000 }).catch(() => false);
                if (helperVisible) {
                    await typeHelperItem.click({ force: true });
                } else {
                    await typeInput.press('Escape');
                }
                await artifactWebView.waitForTimeout(500);

                const nameInput = paramEditor.locator('#variable').getByRole('textbox');
                await nameInput.waitFor({ timeout: 5000 });
                await nameInput.click();
                await artifactWebView.waitForTimeout(300);
                await nameInput.selectText();
                await nameInput.pressSequentially(name);
                await artifactWebView.waitForTimeout(800);

                const addBtn = paramEditor.getByRole('button', { name: /^Add$/ }).first();
                await addBtn.waitFor({ timeout: 5000 });
                await addBtn.click({ force: true });

                await artifactWebView.locator(`[data-testid="${name}-item"]`).waitFor({ timeout: 60000 });
                await artifactWebView.waitForTimeout(500);
                logStep(`Added parameter: ${name} (${type})`);
            };

            await addOneParam('string', 'firstName');
            await addOneParam('string', 'lastName');

            // Set return type to string (matches 1st parameter type)
            await form.fill({
                values: {
                    'Return Type': { type: 'textarea', value: 'string', additionalProps: { clickLabel: true } }
                }
            });
            await artifactWebView.waitForTimeout(800);
            const returnTypeHelper = artifactWebView.locator('[data-testid="type-helper-item-string"]');
            const returnHelperVisible = await returnTypeHelper.isVisible({ timeout: 3000 }).catch(() => false);
            if (returnHelperVisible) {
                await returnTypeHelper.click({ force: true });
            } else {
                await artifactWebView.locator('vscode-text-area').nth(1).locator('textarea').press('Escape').catch(() => {});
            }
            await artifactWebView.waitForTimeout(500);
            logStep('Set return type: string');

            // Save the function form
            await form.submit('Save');
            await canvas.waitFor({ timeout: 60000 });
            logStep('Saved function: firstName (string), lastName (string), return type string');
        });

        test('Add Return Body', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            logStep(`Adding return body in attempt ${testAttempt}`);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            const canvas = artifactWebView.locator('[data-testid="bi-diagram-canvas"], #bi-diagram-canvas');
            await canvas.waitFor({ timeout: 60000 });
            await artifactWebView.waitForTimeout(1000);
            logStep('Function flow diagram ready');

            // Add a Return node — hover the diagram link to reveal the add button.
            // The function body start→end link uses data-testid="diagram-link-undefined"
            // (not a numeric index), so clickHoverAddButtonByIndex(0) won't find it.
            // Instead, target the first link-add-button by prefix.
            const link = canvas.locator('[data-testid^="diagram-link-"]').first();
            await link.waitFor({ timeout: 60000 });
            await link.hover();
            await artifactWebView.waitForTimeout(500);
            const addBtn = canvas.locator('[data-testid^="link-add-button-"]').first();
            await addBtn.waitFor({ state: 'visible', timeout: 5000 });
            await addBtn.click({ force: true });
            await artifactWebView.waitForTimeout(500);

            const sidePanel = new SidePanel(artifactWebView, page.page);
            await sidePanel.init();
            await sidePanel.clickNode('Return');
            await artifactWebView.waitForTimeout(1000);

            // Fill return expression via CodeMirror API — keyboard.type loses the first
            // character because CM needs a tick to register focus after click.
            const returnForm = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await returnForm.switchToFormView(false, artifactWebView);
            await artifactWebView.evaluate(() => {
                const el = document.querySelectorAll('.cm-content')[0];
                if (!el) throw new Error('CodeMirror .cm-content not found');
                const view = (el as any).cmView?.view;
                if (!view) throw new Error('CodeMirror view instance not found');
                view.focus();
                view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'firstName' } });
            });
            await artifactWebView.waitForTimeout(300);

            // Dismiss any helper panel and save
            await page.page.keyboard.press('Escape');
            await artifactWebView.waitForTimeout(300);
            await artifactWebView.getByRole('button', { name: 'Save' }).last().click({ force: true });
            await canvas.waitFor({ timeout: 60000 });

            logStep('Added return node: return firstName');
        });

        test('Edit Parameter Type — Trigger Type Mismatch', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            logStep(`Editing parameter type in attempt ${testAttempt}`);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            const canvasSelector = '[data-testid="bi-diagram-canvas"], #bi-diagram-canvas';
            const canvas = artifactWebView.locator(canvasSelector);
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);

            // Open edit form from canvas
            await canvas.waitFor({ timeout: 60000 });
            await artifactWebView.waitForTimeout(1000);
            const editBtn = artifactWebView.locator('#bi-edit');
            await editBtn.waitFor({ timeout: 10000 });
            await editBtn.click({ force: true });
            await artifactWebView.waitForTimeout(1500);
            await form.switchToFormView(false, artifactWebView);
            await artifactWebView.waitForTimeout(1000);

            // Change firstName type: string → int (name unchanged)
            const firstNameItem = artifactWebView.locator('[data-testid="firstName-item"]');
            await firstNameItem.waitFor({ timeout: 10000 });
            await firstNameItem.click({ force: true });
            await artifactWebView.waitForTimeout(1000);

            const paramEditor = artifactWebView.locator('[data-testid="bi-param-editor"]');
            await paramEditor.waitFor({ timeout: 10000 });

            const typeInput = paramEditor.locator('vscode-text-area').first().locator('textarea');
            await typeInput.waitFor({ timeout: 5000 });
            await typeInput.click();
            await typeInput.selectText();
            await artifactWebView.waitForTimeout(300);
            await typeInput.pressSequentially('int');
            await artifactWebView.waitForTimeout(800);

            const typeHelperInt = artifactWebView.locator('[data-testid="type-helper-item-int"]');
            const helperVisible = await typeHelperInt.isVisible({ timeout: 3000 }).catch(() => false);
            if (helperVisible) {
                await typeHelperInt.click({ force: true });
            } else {
                await typeInput.press('Escape');
            }
            await artifactWebView.waitForTimeout(500);

            const mainSaveBtn = paramEditor.getByRole('button', { name: /^Save$/ }).last();
            await mainSaveBtn.waitFor({ timeout: 5000 });
            await mainSaveBtn.click({ force: true });
            await artifactWebView.locator('[data-testid="firstName-item"]').waitFor({ timeout: 10000 });
            logStep('Changed firstName type: string → int');

            // Delete lastName parameter
            const lastNameItem = artifactWebView.locator('[data-testid="lastName-item"]');
            await lastNameItem.waitFor({ timeout: 10000 });
            await lastNameItem.hover();
            await artifactWebView.waitForTimeout(300);

            const trashBtn = lastNameItem.locator('.codicon-trash').first();
            await trashBtn.waitFor({ timeout: 5000 });
            await trashBtn.click({ force: true });
            await artifactWebView.waitForTimeout(500);

            const confirmBtn = artifactWebView.getByRole('button', { name: /^Delete$/ }).first();
            const isConfirmVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
            if (isConfirmVisible) {
                await confirmBtn.click({ force: true });
                await artifactWebView.waitForTimeout(500);
            }
            logStep('Deleted parameter: lastName');

            // Save WITHOUT updating return type → type mismatch: firstName is int, return type is string
            await form.submit('Save');
            await canvas.waitFor({ timeout: 60000 });
            logStep('Saved: firstName is int, return type still string');
        });

        test('Verify Return Node Error', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            logStep(`Verifying return node error in attempt ${testAttempt}`);

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            const canvas = artifactWebView.locator('[data-testid="bi-diagram-canvas"], #bi-diagram-canvas');
            await canvas.waitFor({ timeout: 60000 });
            // Allow the language server to compute and push diagnostics
            await artifactWebView.waitForTimeout(5000);

            // The error icon appears on the Return node when there is a type mismatch
            // (fw-error-outline-rounded is a stable WSO2 design-system icon class)
            const errorIcon = canvas.locator('i.fw-error-outline-rounded');
            await expect(errorIcon).toBeVisible({ timeout: 10000 });

            logStep('Verified: return node shows error — return type string ≠ firstName int');
        });

        test('Delete Function Artifact', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            logStep(`Deleting function in attempt ${testAttempt}`);

            // Use WSO2 Integrator activity panel with right-click → Delete
            const projectExplorer = new ProjectExplorer(page.page);
            const functionTreeItem = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Functions', functionName]);
            await functionTreeItem.click({ button: 'right' });

            const deleteBtn = page.page.getByRole('button', { name: 'Delete' }).first();
            await deleteBtn.waitFor({ timeout: 5000 });
            await deleteBtn.click();
            await page.page.waitForTimeout(500);

            await expect(functionTreeItem).not.toBeVisible({ timeout: 10000 });
            logStep(`Deleted function: ${functionName}`);
        });
    });
}
