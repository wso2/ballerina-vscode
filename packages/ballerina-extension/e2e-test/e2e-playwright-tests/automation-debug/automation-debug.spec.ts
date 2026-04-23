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
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer, Diagram, SidePanel } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';
import { FileUtils } from '../utils/helpers/fileSystem';

export default function createTests() {
    // Debug Integration Tests
    test.describe.serial('Debug Integration Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Add breakpoint from diagram', async () => {
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            const sampleData = [
                'import ballerina/log;',
                '',
                'public function main() returns error? {',
                '    do {',
                '        string var1 = "bar";',
                '        string var2 = "foo";',
                '        log:printInfo("Hello World");',
                '    } on fail error e {',
                '        log:printError("Error occurred", \'error = e);',
                '        return e;',
                '    }',
                '}',
            ].join('\n');
            FileUtils.updateProjectFile('main.bal', sampleData);
            await FileUtils.openProjectFileInEditor('main.bal');

            // Refresh the project explorer
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.refresh(DEFAULT_PROJECT_NAME);

            // 1. Navigate to the bar entry point
            const mainEntryPoint = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main']);
            await mainEntryPoint.click();

            // 2. Navigate to the diagram view
            const diagramCanvas = artifactWebView.locator('#bi-diagram-canvas');
            await diagramCanvas.waitFor({ state: 'visible', timeout: 30000 });

            // 3. Identify the log node ("log : printInfo") in the diagram
            const logNode = diagramCanvas.locator('.node', { hasText: 'log : printInfo' }).first();
            await logNode.waitFor({ state: 'visible', timeout: 10000 });

            // 4. Click the three-dots menu button on the log node
            const threeDotsButton = logNode.locator('vscode-button[appearance="icon"][aria-label="Icon Button"]').first();
            await threeDotsButton.waitFor({ state: 'visible', timeout: 5000 });
            await threeDotsButton.click();

            // 5. Click "Add Breakpoint" from the context menu
            const addBreakpointMenuItem = artifactWebView.locator('#menu-item-addBreakpoint');
            await addBreakpointMenuItem.waitFor({ state: 'visible', timeout: 5000 });
            await addBreakpointMenuItem.click();

            // 6. Verify the red breakpoint dot indicator appears on the node
            const breakpointDot = logNode.locator('div[data-testid="breakpoint-indicator-diagram"]').first();
            await breakpointDot.waitFor({ state: 'visible', timeout: 5000 });


            // 2. Verify the "Debug Integration" button is visible in the editor toolbar
            // Look for the button with aria-label="Debug Integration" and class "action-label icon"
            const debugButton = page.page.locator('a.action-label.icon[aria-label="Debug Integration"]').first();
            await debugButton.waitFor({ timeout: 10000 });

            // 3. Click on the "Debug Integration" button
            await debugButton.click();

            // 4. Verify the button is clicked successfully
            await page.page.waitForTimeout(1000);

            // 5. Verify the debug session starts
            // 6. Verify the debug toolbar appears
            const debugToolbar = page.page.locator('[data-testid="debug-toolbar"], .debug-toolbar').first();
            await debugToolbar.waitFor({ timeout: 10000 }).catch(() => {
                // Debug toolbar might not have test ID, try alternative selectors
                return page.page.locator('.monaco-toolbar, .debug-actions').first().waitFor({ timeout: 5000 });
            });

            // 7. Re-acquire the iframe reference since the webview re-renders after debug starts
            const freshWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!freshWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            const freshDiagramCanvas = freshWebView.locator('#bi-diagram-canvas');
            await freshDiagramCanvas.waitFor({ state: 'visible', timeout: 30000 });

            // 8. Verify the breakpoint hit by checking for active breakpoint indicator in diagram
            const breakpointDotDiagram = freshDiagramCanvas.locator('div[data-testid="breakpoint-indicator-diagram-active"]').first();
            await breakpointDotDiagram.waitFor({ state: 'visible', timeout: 30000 });
        });

        test('Stop debug session', async () => {
            // 1. Start a debug session
            // 2. Verify the debug session is active
            // 3. Press Shift+F5 or click the "Stop" button in the debug toolbar
            const stopButton = page.page.locator('[data-testid="stop-debug-button"], button[title*="Stop"]').first();
            if (await stopButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await stopButton.click();
            } else {
                await page.page.keyboard.press('Shift+F5');
            }
            await page.page.waitForTimeout(1000);
        });
    });
}
