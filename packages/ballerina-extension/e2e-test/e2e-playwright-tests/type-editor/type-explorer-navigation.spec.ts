/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { BI_INTEGRATOR_LABEL, DEFAULT_PROJECT_NAME, getWebview, initTest, logStep, page, verifyGeneratedSource, vscode } from '../utils/helpers';
import { ProjectExplorer } from '../utils/pages';
import { TypeEditorUtils } from './TypeEditorUtils';
import path from 'path';

/**
 * Hover the "Types" node in the project explorer and click one of its inline
 * actions ("View Type Diagram" or "Add Type"). The Types category node has no
 * click command of its own — navigation only happens through these actions.
 */
async function clickTypesInlineAction(actionLabel: string): Promise<void> {
    const typesItem = page.page.locator(ProjectExplorer.treeItemSelector('Types')).first();
    await typesItem.waitFor({ state: 'visible', timeout: 15000 });
    await typesItem.hover();
    const action = typesItem.locator(`a.action-label[aria-label*="${actionLabel}"]`).first();
    await action.waitFor({ state: 'visible', timeout: 10000 });
    await action.click();
}

export default function createTests() {
    test.describe.serial('Type Editor Explorer Navigation', {
    }, async () => {
        initTest();

        test('Navigate to Type Diagram via Project Explorer', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            logStep(`Navigate to type diagram via explorer — attempt ${testAttempt}`);

            logStep('Locating Types node in project explorer');
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.init();
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Types']);

            logStep('Clicking "View Type Diagram" inline action');
            await clickTypesInlineAction('View Type Diagram');

            logStep('Verifying type diagram view is shown');
            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            await artifactWebView.locator('[data-testid="type-diagram"]').waitFor({ state: 'visible', timeout: 30000 });
            await artifactWebView.getByRole('button', { name: 'Add Type' }).waitFor({ state: 'visible', timeout: 30000 });
        });

        test('Create Type from Type Diagram', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            const customerName = `Customer${testAttempt}`;

            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            const typeUtils = new TypeEditorUtils(page.page, artifactWebView);

            logStep('Opening Add Type panel from type diagram');
            await typeUtils.clickAddType();

            logStep(`Creating record type ${customerName} with field "id"`);
            const form = await typeUtils.createRecordType(customerName, [
                { name: 'id', type: 'string' }
            ]);
            await typeUtils.saveAndWait(form);

            logStep(`Verifying type node ${customerName}`);
            await typeUtils.verifyTypeNodeExists(customerName);
        });

        test('Create Field Type via Helper Panel Create New Type', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            const orderName = `Order${testAttempt}`;
            const addressName = `Address${testAttempt}`;

            logStep('Clicking home button in top navigation bar');
            let artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            await artifactWebView.locator('[data-testid="home-button"]').click();

            logStep('Verifying integration overview (home) view');
            await artifactWebView.getByRole('button', { name: 'Add Artifact' }).waitFor({ state: 'visible', timeout: 30000 });

            logStep('Clicking "Add Type" (+) inline action on Types node');
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.init();
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Types']);
            await clickTypesInlineAction('Add Type');

            logStep('Verifying New Type panel opened on the type diagram');
            artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            const typeUtils = new TypeEditorUtils(page.page, artifactWebView);
            await artifactWebView.locator('[data-testid="type-editor-container"]').waitFor({ state: 'visible', timeout: 30000 });

            logStep(`Setting type name ${orderName}`);
            const nameInput = artifactWebView.getByRole('textbox', { name: 'Name' }).first();
            await nameInput.waitFor({ state: 'visible', timeout: 15000 });
            await nameInput.fill(orderName);

            logStep('Adding field "customer" and opening the helper panel');
            await artifactWebView.locator('[data-testid="add-field-button"]').click();
            const identifierFields = artifactWebView.locator('[data-testid="identifier-field"]');
            await typeUtils.fillIdentifierField(await identifierFields.count() - 1, 'customer');
            const typeField = artifactWebView.locator('[data-testid="type-field"]').last();
            await typeField.dblclick();

            logStep('Clicking "Create New Type" in the helper panel');
            const createNewTypeBtn = artifactWebView.getByRole('button', { name: 'Create New Type' });
            await createNewTypeBtn.waitFor({ state: 'visible', timeout: 15000 });
            await createNewTypeBtn.click();

            // The popup is a nested type editor: its testids duplicate the main
            // panel's, so every locator must be scoped to the modal overlay.
            logStep(`Creating type ${addressName} from the popup`);
            const popup = artifactWebView.locator('.unq-modal-overlay').last();
            const popupName = popup.getByRole('textbox', { name: 'Name' }).last();
            await popupName.waitFor({ state: 'visible', timeout: 15000 });
            await popupName.fill(addressName);
            await popup.locator('[data-testid="type-create-save"]').last().click({ force: true });

            logStep('Verifying the new type was auto-assigned to the field');
            const fieldTypeInput = artifactWebView.getByRole('textbox', { name: 'Text field' }).last();
            await expect(fieldTypeInput).toHaveValue(addressName, { timeout: 15000 });

            logStep('Reopening the helper panel and selecting the created type');
            await typeField.dblclick();
            // Click only within the overlay — a bare getByText would hit the
            // Address node already rendered in the diagram behind the panel.
            const addressOption = artifactWebView.locator('.unq-modal-overlay').getByText(addressName, { exact: true }).first();
            await addressOption.waitFor({ state: 'visible', timeout: 15000 });
            await addressOption.click({ force: true });
            await expect(fieldTypeInput).toHaveValue(addressName, { timeout: 15000 });

            logStep('Adding field "note" and marking it optional');
            await artifactWebView.locator('[data-testid="add-field-button"]').click();
            await typeUtils.fillIdentifierField(await identifierFields.count() - 1, 'note');
            // The optional toggle sits next to the type field; its icon colour
            // flips from descriptionForeground (inactive) to button-background
            // (active) when enabled
            const optionalBtn = artifactWebView.locator('vscode-button[title="Set as an Optional Field"]').last();
            await optionalBtn.waitFor({ state: 'visible', timeout: 15000 });
            await expect(optionalBtn.locator('g[fill="var(--vscode-descriptionForeground)"]').first()).toBeAttached();
            await optionalBtn.click();
            logStep('Verifying optional toggle icon colour changed');
            await expect(optionalBtn.locator('g[fill="var(--vscode-button-background)"]').first()).toBeAttached({ timeout: 10000 });

            logStep(`Saving ${orderName}`);
            await artifactWebView.locator('[data-testid="type-create-save"]').first().click({ force: true });

            logStep('Verifying diagram nodes and field link');
            await typeUtils.verifyTypeNodeExists(orderName);
            await typeUtils.verifyTypeNodeExists(addressName);
            await typeUtils.verifyTypeLink(orderName, 'customer', addressName);

            logStep('Verifying generated types.bal');
            const expectedFilePath = path.join(__dirname, 'explorerNavigationOutput.bal');
            const substitutions = testAttempt === 1 ? undefined : {
                'Customer1': `Customer${testAttempt}`,
                'Order1': orderName,
                'Address1': addressName,
            };
            await verifyGeneratedSource('types.bal', expectedFilePath, substitutions);
        });

        test('Edit Type Name via Node Menu', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            const addressName = `Address${testAttempt}`;
            const locationName = `Location${testAttempt}`;

            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            const typeUtils = new TypeEditorUtils(page.page, artifactWebView);

            logStep(`Opening Edit panel for leaf type ${addressName} via node menu`);
            await typeUtils.editType(addressName);

            // The type name field is readonly — the Rename pencil switches it
            // to an editable field with its own Cancel/Save pair
            logStep(`Renaming ${addressName} to ${locationName}`);
            await artifactWebView.locator('vscode-button[title="Rename"]').first().click();
            const editableInput = artifactWebView.locator('input[aria-label*="Type name"]:not([readonly])').first();
            await editableInput.waitFor({ state: 'visible', timeout: 10000 });
            await editableInput.fill(locationName);
            // The rename Save comes first in the DOM; the panel's bottom Save
            // is disabled while renaming
            await artifactWebView.getByRole('button', { name: 'Save' }).first().click({ force: true });

            logStep('Verifying diagram shows renamed node');
            await typeUtils.verifyTypeNodeExists(locationName);
            await expect(artifactWebView.locator(`[data-testid="type-node-${addressName}"]`)).toHaveCount(0);

            logStep('Closing edit panel');
            await artifactWebView.locator('[data-testid="close-panel-btn"]').first().click({ force: true }).catch(() => { });

            logStep('Verifying generated types.bal after rename');
            const expectedFilePath = path.join(__dirname, 'explorerRenameOutput.bal');
            const substitutions = testAttempt === 1 ? undefined : {
                'Customer1': `Customer${testAttempt}`,
                'Order1': `Order${testAttempt}`,
                'Location1': locationName,
            };
            await verifyGeneratedSource('types.bal', expectedFilePath, substitutions);
        });

        test('Delete Type via Node Menu', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            const orderName = `Order${testAttempt}`;

            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);

            logStep(`Deleting parent type ${orderName} via node menu`);
            const menuButton = artifactWebView.locator(`[data-testid="type-node-${orderName}-menu"]`);
            await menuButton.waitFor({ state: 'visible', timeout: 15000 });
            await menuButton.click();
            const deleteItem = artifactWebView.getByText('Delete', { exact: true });
            await deleteItem.waitFor({ state: 'visible', timeout: 10000 });
            await deleteItem.click({ force: true });

            logStep('Confirming deletion dialog');
            const confirmBtn = artifactWebView.getByRole('button', { name: 'Delete', exact: true });
            await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
            await confirmBtn.click({ force: true });

            logStep('Verifying node removed from diagram');
            await artifactWebView.locator(`[data-testid="type-node-${orderName}"]`).waitFor({ state: 'detached', timeout: 30000 });

            logStep('Verifying generated types.bal after delete');
            const expectedFilePath = path.join(__dirname, 'explorerDeleteOutput.bal');
            const substitutions = testAttempt === 1 ? undefined : {
                'Customer1': `Customer${testAttempt}`,
                'Location1': `Location${testAttempt}`,
            };
            await verifyGeneratedSource('types.bal', expectedFilePath, substitutions);
        });

        test('Focused View Shows Only Selected Type', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            const customerName = `Customer${testAttempt}`;
            const locationName = `Location${testAttempt}`;

            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            const typeUtils = new TypeEditorUtils(page.page, artifactWebView);

            logStep(`Opening Focused View for ${customerName} via node menu`);
            const menuButton = artifactWebView.locator(`[data-testid="type-node-${customerName}-menu"]`);
            await menuButton.waitFor({ state: 'visible', timeout: 15000 });
            await menuButton.click();
            const focusItem = artifactWebView.getByText('Focused View', { exact: true });
            await focusItem.waitFor({ state: 'visible', timeout: 10000 });
            await focusItem.click({ force: true });

            logStep('Verifying only the focused type is rendered in the diagram');
            await typeUtils.verifyTypeNodeExists(customerName);
            // The other type must disappear from the diagram (the project
            // explorer tree still lists it — this check is diagram-only)
            await expect(artifactWebView.locator(`[data-testid="type-node-${locationName}"]`)).toHaveCount(0, { timeout: 15000 });
        });

        test('Source View Opens Editor With Type Selected', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            const customerName = `Customer${testAttempt}`;

            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);

            logStep(`Opening Source for ${customerName} via node menu`);
            const menuButton = artifactWebView.locator(`[data-testid="type-node-${customerName}-menu"]`);
            await menuButton.waitFor({ state: 'visible', timeout: 15000 });
            await menuButton.click();
            const sourceItem = artifactWebView.getByText('Source', { exact: true });
            await sourceItem.waitFor({ state: 'visible', timeout: 10000 });
            await sourceItem.click({ force: true });

            // goToSource opens types.bal in an editor group beside the diagram
            // and sets editor.selection to the type's range
            logStep('Verifying types.bal opened beside the diagram');
            const tab = page.page.locator('.tab[aria-label*="types.bal"]').first();
            await tab.waitFor({ state: 'visible', timeout: 30000 });

            logStep('Verifying the editor has a selection');
            // Monaco renders selected ranges as .selected-text overlay divs
            await page.page.locator('.monaco-editor .selected-text').first().waitFor({ state: 'attached', timeout: 15000 });

            logStep('Verifying the selected code belongs to the type (via clipboard)');
            // Focusing the editor through its tab does not alter the selection;
            // copying it lets us read the exact selected text
            await vscode.evaluate(({ clipboard }: any) => clipboard.writeText('SENTINEL'));
            await tab.click();
            await page.page.waitForTimeout(500);
            await page.page.keyboard.press(process.platform === 'darwin' ? 'Meta+C' : 'Control+C');
            await page.page.waitForTimeout(500);
            const clip = await vscode.evaluate(({ clipboard }: any) => clipboard.readText());
            expect(clip).toContain(customerName);
        });

    });
}
