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

import { test } from '@playwright/test';
import { addArtifact, BI_INTEGRATOR_LABEL, getWebview, initTest, page, verifyGeneratedSource } from '../utils/helpers';
import { Form } from '@wso2/playwright-vscode-tester';
import { TypeEditorUtils } from './TypeEditorUtils';
import path from 'path';

export default function createTests() {
    test.describe('Type Editor Tests', {
        tag: '@group1',
    }, async () => {
        initTest();

        test('Create Types from Scratch', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating types from scratch in test attempt: ', testAttempt);

            // Navigate to type editor
            await addArtifact('Type', 'type');

            // Wait for page to be stable before accessing iframe
            await page.page.waitForLoadState('networkidle');

            // Get webview directly from utils
            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            const typeUtils = new TypeEditorUtils(page.page, artifactWebView);

            // Wait for type editor to be ready
            await typeUtils.waitForTypeEditor();

            // ENUM: Role
            const enumName = `Role${testAttempt}`;

            // Create enum with members, delete one, then save
            const enumForm = await typeUtils.createEnumType(enumName, ['Admin', 'Engineer', 'Sales', 'Marketing']);
            await typeUtils.deleteEnumMember(1); // Delete 'Engineer'
            await typeUtils.saveAndWait(enumForm);
            await typeUtils.verifyTypeNodeExists(enumName);

            // UNION: Id
            await typeUtils.clickAddType();
            const unionName = `Id${testAttempt}`;
            const unionForm = await typeUtils.createUnionType(unionName, ['int', 'string']);
            await typeUtils.saveAndWait(unionForm);
            await typeUtils.verifyTypeNodeExists(unionName);

            // RECORD: Organization
            await typeUtils.clickAddType();
            const organizationName = `Organization${testAttempt}`;
            const organizationForm = await typeUtils.createRecordType(organizationName, [
                { name: 'id', type: unionName },
                { name: 'name', type: 'string' },
                { name: 'location', type: 'string' }
            ]);
            
            // Test Advanced Options functionality
            console.log('Expanding Advanced Options...');
            await typeUtils.toggleDropdown('Advanced Options'); 
        
            console.log('Testing Allow Additional Fields checkbox...');
            await typeUtils.setCheckbox('Allow Additional Fields', true); 
            await typeUtils.saveAndWait(organizationForm);
            await typeUtils.verifyTypeNodeExists(organizationName);
            await typeUtils.verifyTypeLink(organizationName, 'id', unionName);


            // RECORD: Employee (initially with just id field)
            await typeUtils.clickAddType();
            const recordName = `Employee${testAttempt}`;
            const recordForm = await typeUtils.createRecordType(recordName, [
                { name: 'id', type: unionName }
            ]);
            await typeUtils.saveAndWait(recordForm);
            await typeUtils.verifyTypeNodeExists(recordName);

            // Verify link
            await typeUtils.verifyTypeLink(recordName, 'id', unionName);

            // Edit Employee type to add role field
            await typeUtils.editType(recordName);
            await typeUtils.addRecordField('role', enumName);
            const editForm = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await typeUtils.saveAndWait(editForm);
            await typeUtils.verifyTypeLink(recordName, 'role', enumName);

            // Add name field to Employee record
            await typeUtils.editType(recordName);
            await typeUtils.addRecordField('name', 'string' );

            // Toggle drop down
            await typeUtils.toggleFieldOptionsByChevron(2);
            await typeUtils.setCheckbox('Readonly', true);
        
            // Test Advanced Options functionality
            console.log('Expanding Advanced Options...');
            await typeUtils.toggleDropdown('Advanced Options');      
            
            console.log('Testing Is Readonly Type checkbox...');
            await typeUtils.setCheckbox('Is Readonly Type', true);

            await typeUtils.saveAndWait(recordForm);
            await typeUtils.verifyTypeNodeExists(recordName);

            // Create Service Class: Project
            await typeUtils.clickAddType();
            const serviceClassName = `Project${testAttempt}`;
            const serviceForm = await typeUtils.createServiceClass(serviceClassName, [
                { name: 'employeeDetails', returnType: recordName }
            ]);
            await typeUtils.saveAndWait(serviceForm);
            await typeUtils.verifyTypeNodeExists(serviceClassName);
            await typeUtils.verifyTypeLink(serviceClassName, 'employeeDetails', recordName);

            // Verify the generated types.bal matches testOutput.bal
            const expectedFilePath = path.join(__dirname, 'testOutput.bal');
            await verifyGeneratedSource('types.bal', expectedFilePath);                 

        });
    });
}
