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
import { addArtifact, BI_INTEGRATOR_LABEL, DEFAULT_PROJECT_NAME, getWebview, initTest, page } from '../utils/helpers';
import { ServiceClassEditorUtils } from './serviceEditorUtils';
import { FileUtils } from '../utils/helpers/fileSystem';
import { ProjectExplorer } from '../utils/pages';

export default function createTests() {
    test.describe.serial('Service Class Tests', {
    }, async () => {
        initTest();
        test('Create Service Class', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;

            const sampleData = [
                'type Resource record {|',
                '    string name;',
                '    int age;',
                '|};',
                '',
                'type Remote record {|',
                '    string action;',
                '    boolean status;',
                '|};',
            ].join('\n');
            FileUtils.updateProjectFile('types.bal', sampleData);
            await FileUtils.openProjectFileInEditor('types.bal');

            // Refresh the project explorer
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.refresh(DEFAULT_PROJECT_NAME);

            console.log('Creating a new Service Class in test attempt: ', testAttempt);

            // Creating a Service Class
            await addArtifact('Type', 'type');

            // Wait for page to be stable before accessing iframe
            await page.page.waitForLoadState('networkidle');

            // Get webview directly from utils
            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            const serviceClassUtils = new ServiceClassEditorUtils(page.page, artifactWebView);

            // Wait for type editor to be ready
            await serviceClassUtils.waitForTypeEditor();

            const sampleName = `MyService${testAttempt}`;
            // Create service class
            const serviceForm = await serviceClassUtils.createServiceClass(sampleName, [
                { name: 'name', returnType: 'string', type: 'Resource' },
                { name: 'age', returnType: 'int', type: 'Remote' }
            ], [
                { name: 'firstName', type: 'string' },
                { name: 'id', type: 'int' }
            ]);

            // await serviceClassUtils.renameServiceClass(`Service${testAttempt}`); // TODO: Fix this test as after the rename the positions are not correct.
            await serviceClassUtils.editMethod('name', 'fullName');
            await serviceClassUtils.deleteVariable('id');
        });
    });
}
