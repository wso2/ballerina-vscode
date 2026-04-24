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

import { Frame, Locator, Page } from '@playwright/test';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { BI_INTEGRATOR_LABEL } from '../utils/helpers';

/**
 * Utility class for type editor test operations
 */
export class TypeEditorUtils {
    constructor(private page: Page, private webView: Frame) { }

    /**
     * Wait for element to be visible and interactable
     */
    async waitForElement(locator: Locator, timeout: number = 60000): Promise<void> {
        await locator.waitFor({ state: 'visible', timeout });
    }

    /**
     * Fill an identifier field (double-click and type)
     */
    async fillIdentifierField(index: number = 0, value: string): Promise<void> {
        const field = this.webView.locator('[data-testid="identifier-field"]').nth(index);
        await this.waitForElement(field);
        await field.dblclick();
        await field.type(value);
    }

    /**
     * Fill a type field (double-click and type)
     */
    async fillTypeField(index: number = 0, value: string, title?: string): Promise<void> {
        const field = this.webView.locator('[data-testid="type-field"]').nth(index);
        await this.waitForElement(field);
        await field.dblclick();
        await field.type(value);
        let iframe;
        try {
            // This is due to an implementation issue with the type dropdown in the type editor
            iframe = await switchToIFrame(BI_INTEGRATOR_LABEL, this.page);
            if (!iframe) {
                throw new Error(`${BI_INTEGRATOR_LABEL} iframe not found`);
            }
            const dropdownOptions = iframe.getByText(value, { exact: true });
            const optionCount = await dropdownOptions.count();

            if (optionCount === 1) {
                await dropdownOptions.first().click();
            } else if (optionCount > 1) {
                // In case of dropdown appear
                await dropdownOptions.nth(1).click();
            } else {
                throw new Error(`No dropdown option found for value: ${value}`);
            }
        } catch (error) {
            console.error('Error switching to iframe:', error);
            throw error;
        }
        if (title) {
            await iframe.getByText(title).click();
        }
    }

    /**
     * Add a new enum member with the given name
     */
    async addEnumMember(memberName: string): Promise<void> {
        const addButton = this.webView.locator('[data-testid="add-member-button"]');
        await addButton.click();

        // Get the last identifier field (newly added)
        const memberFields = this.webView.locator('[data-testid="identifier-field"]');
        const count = await memberFields.count();
        await this.fillIdentifierField(count - 1, memberName);
    }

    /**
     * Delete an enum member by index
     */
    async deleteEnumMember(index: number): Promise<void> {
        const deleteButton = this.webView.locator(`[data-testid="delete-member-${index}"]`);
        await this.waitForElement(deleteButton);
        await deleteButton.click();
    }

    /**
     * Add a new record field with name and type
     */
    async addRecordField(fieldName: string, fieldType: string): Promise<void> {
        const addButton = this.webView.locator('[data-testid="add-field-button"]');
        await this.waitForElement(addButton);
        await addButton.click();

        // Fill the newly added field (last in the form)
        const identifierFields = this.webView.locator('[data-testid="identifier-field"]');

        const fieldCount = await identifierFields.count();
        const lastIndex = fieldCount - 1;

        await this.fillIdentifierField(lastIndex, fieldName);
        await this.fillTypeField(lastIndex, fieldType, 'Fields');
    }

    /**
     * Add a function to service class
     */
    async addFunction(functionName: string, returnType: string, sectionName?: string): Promise<void> {
        console.log(`Adding function: ${functionName} with return type: ${returnType}`);
        const addButton = this.webView.locator('[data-testid="function-add-button"]');
        await this.waitForElement(addButton);
        await addButton.click();
        console.log('Clicked Add Function button');

        // Fill the newly added function (last in the form)
        const identifierFields = this.webView.locator('[data-testid="identifier-field"]');

        const fieldCount = await identifierFields.count();
        const lastIndex = fieldCount - 1;

        await this.fillIdentifierField(lastIndex, functionName);
        console.log(`Filled function name: ${functionName}`);
        await this.fillTypeField(lastIndex, returnType, sectionName);
        console.log(`Filled return type: ${returnType}`);
    }

    /**
     * Create a type using the form with name and kind
     */
    async createType(name: string, kind: 'Enum' | 'Union' | 'Record' | 'Service Class'): Promise<Form> {
        const form = new Form(this.page, BI_INTEGRATOR_LABEL, this.webView);
        await form.switchToFormView(false, this.webView);

        await form.fill({
            values: {
                'Name': {
                    type: 'input',
                    value: name,
                },
                'Kind': {
                    type: 'dropdown',
                    value: kind,
                }
            }
        });

        return form;
    }

    /**
     * Save form and wait for completion
     */
    async saveAndWait(form: Form): Promise<void> {
        await form.submit('Save');
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Click Add Type button
     */
    async clickAddType(): Promise<void> {
        const addTypeButton = this.webView.getByRole('button', { name: 'Add Type' });
        await this.waitForElement(addTypeButton);
        await addTypeButton.click();
    }

    /**
     * Verify that a type node exists in the diagram
     */
    async verifyTypeNodeExists(typeName: string): Promise<void> {
        const typeElement = this.webView.locator(`[data-testid="type-node-${typeName}"]`);
        await this.waitForElement(typeElement);
    }

    /**
     * Verify that a link exists between two types
     */
    async verifyTypeLink(fromType: string, field: string, toType: string): Promise<void> {
        const linkTestId = `node-link-${fromType}/${field}-${toType}`;
        const linkElement = this.webView.locator(`[data-testid="${linkTestId}"]`);
        await this.waitForElement(linkElement);
    }

    /**
     * Edit an existing type by clicking its menu
     */
    async editType(typeName: string): Promise<void> {
        const menuButton = this.webView.locator(`[data-testid="type-node-${typeName}-menu"]`);
        await this.waitForElement(menuButton);
        await menuButton.click();

        const editMenuItem = this.webView.getByText('Edit', { exact: true });
        await this.waitForElement(editMenuItem);
        await editMenuItem.click();

        // Wait for type editor to load
        const typeEditorContent = this.webView.locator('[data-testid="type-editor-container"]');
        await this.waitForElement(typeEditorContent);
    }

    /**
     * Wait for type editor to be ready
     */
    async waitForTypeEditor(): Promise<void> {
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('domcontentloaded');

        const typeEditorContent = this.webView.locator('[data-testid="type-editor-container"]');
        await this.waitForElement(typeEditorContent);
    }

    /**
     * Create an enum type with multiple members
     */
    async createEnumType(enumName: string, members: string[]): Promise<Form> {
        const form = await this.createType(enumName, 'Enum');

        // Fill the first member (already exists)
        if (members.length > 0) {
            await this.fillIdentifierField(0, members[0]);
        }

        // Add additional members
        for (let i = 1; i < members.length; i++) {
            await this.addEnumMember(members[i]);
        }

        return form;
    }

    /**
     * Create a union type with specified types
     */
    async createUnionType(unionName: string, types: string[]): Promise<Form> {
        const form = await this.createType(unionName, 'Union');

        // Fill union types
        for (let i = 0; i < types.length; i++) {
            await this.fillTypeField(i, types[i], 'Members');
        }

        return form;
    }

    /**
     * Create a record type with specified fields
     */
    async createRecordType(recordName: string, fields: Array<{ name: string, type: string }>): Promise<Form> {
        const form = await this.createType(recordName, 'Record');

        // Add fields
        for (const field of fields) {
            await this.addRecordField(field.name, field.type);
        }
        return form;
    }

    /**
     * Create a service class with functions
     */
    async createServiceClass(className: string, functions: Array<{ name: string, returnType: string }>): Promise<Form> {
        const form = await this.createType(className, 'Service Class');

        // Add functions
        for (const func of functions) {
            await this.addFunction(func.name, func.returnType, 'Resource Methods');
        }

        return form;
    }

    /**
     * Toggle field options by clicking the chevron icon
     * @param fieldIndex Index of the field to toggle (default is 0 for the first field)
     */
    async toggleFieldOptionsByChevron(fieldIndex: number = 0): Promise<void> {
        // Find all field rows

        const chevronIcons = this.webView.locator('[data-testid="field-expand-btn"]');
        const chevronIcon = chevronIcons.nth(fieldIndex);

        try {
            await chevronIcon.waitFor({ state: 'visible', timeout: 3000 });

            // Scroll and force click
            await chevronIcon.scrollIntoViewIfNeeded();
            await chevronIcon.click({ force: true });
            console.log('Clicked chevron for field', fieldIndex);


            await this.page.waitForTimeout(300);
        } catch (error) {
            throw new Error(`Could not click chevron icon at field index ${fieldIndex}: ${error}`);
        }
    }


    /**
     * Toggle any dropdown/collapsible section by text
     */
    async toggleDropdown(dropdownText: string, waitTime: number = 500): Promise<void> {
        const dropdownToggle = this.webView.locator(`text=${dropdownText}`);
        await this.waitForElement(dropdownToggle);
        await dropdownToggle.click();
        
        // Wait for animation to complete
        await this.page.waitForTimeout(waitTime);
    }

    /**
     * Set any checkbox by its aria-label or name
     */
    async setCheckbox(checkboxName: string, checked: boolean): Promise<void> {
        const checkbox = this.webView.getByRole('checkbox', { name: checkboxName });
        console.log(`Setting checkbox "${checkboxName}" to ${checked}`);
        await this.waitForElement(checkbox);
        
        const ariaChecked = await checkbox.getAttribute('aria-checked');
        const isCurrentlyChecked = ariaChecked === 'true';
        
        if (isCurrentlyChecked !== checked) {
            await checkbox.click();
        }
    }
}
