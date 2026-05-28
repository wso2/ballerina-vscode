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
import { Frame, Page } from '@playwright/test';
import { Form } from '@wso2/playwright-vscode-tester';
import { BI_INTEGRATOR_LABEL } from '../utils/helpers';

export interface ServiceMethod {
    name: string;
    returnType: string;
    type: 'Resource' | 'Remote';
}

export interface ServiceVariable {
    name: string;
    type: string;
}

// Centralized wait configuration
const WAIT_CONFIG = {
    SHORT: 1000,
    MEDIUM: 3000,
    LONG: 10000,
    DEFAULT_VISIBLE_TIMEOUT: 10000
} as const;


export class ServiceClassEditorUtils {
    constructor(private page: Page, private artifactWebView: Frame) { }

    // Centralized wait utilities
    private async waitForElement(selector: string, timeout = WAIT_CONFIG.DEFAULT_VISIBLE_TIMEOUT) {
        const element = this.artifactWebView.locator(selector);
        await element.waitFor({ state: 'visible', timeout });
        return element;
    }

    private async waitForElementByTestId(testId: string, timeout = WAIT_CONFIG.DEFAULT_VISIBLE_TIMEOUT) {
        const element = this.artifactWebView.getByTestId(testId);
        await element.waitFor({ state: 'visible', timeout });
        return element;
    }

    private async waitForButton(name: string, timeout = WAIT_CONFIG.DEFAULT_VISIBLE_TIMEOUT) {
        const button = this.artifactWebView.getByRole('button', { name });
        await button.waitFor({ state: 'visible', timeout });
        return button;
    }

    private async waitForTextbox(name: string, timeout = WAIT_CONFIG.DEFAULT_VISIBLE_TIMEOUT) {
        // vscode-text-area web components expose the label via a custom `arialabel` attribute
        // rather than a standard `aria-label`. The fillable element is the <textarea> inside
        // the shadow DOM, which Playwright pierces automatically via a descendant CSS selector.
        const textbox = this.artifactWebView.getByRole('textbox', { name })
            .or(this.artifactWebView.locator(`vscode-text-area[arialabel="${name}"] textarea`));
        await textbox.waitFor({ state: 'visible', timeout });
        return textbox;
    }

    // Handle type completion consistently
    private async handleTypeCompletion(inputElement: any) {
        await this.page.waitForTimeout(WAIT_CONFIG.MEDIUM);
        const completion = this.artifactWebView.getByTestId('add-type-completion');

        if (await completion.isVisible()) {
            await inputElement.press('Escape');
        }
    }

    async waitForTypeEditor(): Promise<void> {
        await this.page.waitForTimeout(WAIT_CONFIG.MEDIUM);
        await this.page.waitForLoadState('domcontentloaded');
        await this.waitForElementByTestId('type-editor-container', WAIT_CONFIG.LONG);
    }

    async createServiceClass(name: string, methods: ServiceMethod[] = [], variables: ServiceVariable[] = []) {
        const form = new Form(this.page, BI_INTEGRATOR_LABEL, this.artifactWebView);
        await form.switchToFormView(false, this.artifactWebView);

        await form.fill({
            values: {
                'Name': {
                    type: 'input',
                    value: name,
                },
                'Kind': {
                    type: 'dropdown',
                    value: 'Service Class',
                }
            }
        });

        await form.submit('Save');

        // Wait for 3 seconds
        await this.page.waitForTimeout(3000);

        // Wait for the service class node to appear
        await this.waitForElementByTestId(`type-node-${name}-menu`, WAIT_CONFIG.LONG);

        // Edit the service class
        const serviceNode = this.artifactWebView.getByTestId(`type-node-${name}-menu`);
        await serviceNode.getByRole('img').click();
        await this.artifactWebView.getByText('Edit', { exact: true }).click();

        // Add methods and variables
        for (const method of methods) {
            await this.addMethod(method.name, method.returnType, method.type);
        }

        for (const variable of variables) {
            await this.addVariable(variable.name, variable.type);
        }

        return form;
    }

    async deleteVariable(variableName: string): Promise<void> {
        const deleteButton = this.artifactWebView.getByTestId(`delete-variable-button-${variableName}`).locator('i');
        await deleteButton.click({ force: true });

        const okayButton = await this.waitForButton('Okay');
        await okayButton.click({ force: true });
    }

    async editMethod(methodName: string, newName: string): Promise<void> {
        const editButton = this.artifactWebView.getByTestId(`edit-method-button-${methodName}`).locator('i');
        await editButton.click();

        const resourcePathField = await this.waitForTextbox('Resource Path*The resource');
        await resourcePathField.fill(newName);

        const saveButton = await this.waitForButton('Save');
        await saveButton.click();
        await this.artifactWebView.waitForTimeout(WAIT_CONFIG.MEDIUM);
    }

    async renameServiceClass(newName: string): Promise<void> {
        const editButton = await this.waitForButton(' Edit');
        await editButton.click();
        await this.page.waitForTimeout(WAIT_CONFIG.SHORT);

        const renameButton = this.artifactWebView.getByTitle('Rename').locator('i');
        await renameButton.click();
        await this.page.waitForTimeout(WAIT_CONFIG.SHORT);

        const classNameField = await this.waitForTextbox('Class Name*The name of the');
        await classNameField.click();
        await classNameField.fill(newName);

        // Save changes with proper waits
        const firstSaveButton = this.artifactWebView.getByRole('button', { name: 'Save' }).first();
        await firstSaveButton.click();
        await this.page.waitForTimeout(WAIT_CONFIG.SHORT);

        const secondSaveButton = this.artifactWebView.getByRole('button', { name: 'Save' });
        await secondSaveButton.click();
        await this.page.waitForTimeout(WAIT_CONFIG.SHORT);
    }

    async addMethod(name: string, returnType: string, type: 'Resource' | 'Remote'): Promise<void> {
        const methodButton = await this.waitForButton(' Method');
        await methodButton.click();

        await this.artifactWebView.getByText(type).click();

        // Handle different input fields based on method type
        const inputFieldName = type === 'Remote'
            ? 'Function Name*The name of the'
            : 'Resource Path*The resource';

        const nameField = await this.waitForTextbox(inputFieldName);
        await nameField.fill(name);

        // Handle return type
        const returnBox = await this.waitForTextbox('Return Type');
        await returnBox.click();
        await this.artifactWebView.getByText(returnType, { exact: true }).click();

        await this.handleTypeCompletion(returnBox);

        const saveButton = await this.waitForButton('Save');
        await saveButton.click();
    }

    async addVariable(name: string, type: string): Promise<void> {
        const variableButton = await this.waitForButton(' Variable');
        await variableButton.click();

        const nameField = await this.waitForTextbox('Variable Name*The name of the variable');
        await nameField.fill(name);

        const typeField = await this.waitForTextbox('Variable Type');
        await typeField.click();
        await typeField.fill(type);
        await this.page.waitForTimeout(WAIT_CONFIG.SHORT);
        await this.artifactWebView.getByText(type, { exact: true }).click();

        await this.handleTypeCompletion(typeField);

        const saveButton = await this.waitForButton('Save');
        await saveButton.click();
    }
}
