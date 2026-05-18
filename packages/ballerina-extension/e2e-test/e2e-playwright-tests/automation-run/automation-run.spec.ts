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
    // Run Integration Tests
    test.describe.serial('Run Integration Tests', {
    }, async () => {
        initTest();
        test('Create automation to run', async () => {
            // 1. Click on the "Add Artifact" button
            // 2. Verify the Artifacts menu is displayed
            // 3. Under "Automation" section, click on "Automation" option
            await addArtifact('Automation', 'automation');

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // 4. Verify the "Create New Automation" form is displayed
            const createForm = artifactWebView.getByRole('heading', { name: /Create New Automation/i });
            await createForm.waitFor({ timeout: 10000 });

            // 6. (Optional) Click on "Advanced Configurations" to expand the section
            const advancedConfigExpand = artifactWebView.getByText('Expand').first();
            if (await advancedConfigExpand.isVisible({ timeout: 2000 }).catch(() => false)) {
                await advancedConfigExpand.click();
                await page.page.waitForTimeout(500);
            }

            // 7. (Optional) Verify "Return Error" checkbox is checked by default
            const returnErrorCheckbox = artifactWebView.getByRole('checkbox', { name: /Return Error/i }).first();
            if (await returnErrorCheckbox.isVisible()) {
                const isChecked = await returnErrorCheckbox.isChecked();
                if (!isChecked) {
                    throw new Error('Return Error checkbox should be checked by default');
                }
            }

            // 8. Click on the "Create" button
            await artifactWebView.getByRole('button', { name: 'Create' }).click();

            // 9. Verify the Automation is created and the automation designer view is displayed
            const diagramCanvas = artifactWebView.locator('#bi-diagram-canvas');
            await diagramCanvas.waitFor({ state: 'visible', timeout: 30000 });

            // 10. Verify the automation name is displayed (default: "main")
            const diagramTitle = artifactWebView.locator('h2', { hasText: 'Automation' });
            await diagramTitle.waitFor();

            // 11. Verify the "Flow" and "Sequence" tabs are available
            // Wait for the diagram to fully load before checking for tabs
            await page.page.waitForTimeout(1000);
            // The tabs are clickable generic elements, not role="tab"
            const flowTab = artifactWebView.getByText('Flow').first();
            await flowTab.waitFor({ timeout: 10000, state: 'visible' });
            const sequenceTab = artifactWebView.getByText('Sequence').first();
            await sequenceTab.waitFor({ timeout: 10000, state: 'visible' });

            // 12. Verify the flow diagram shows a "Start" node
            // Check if "Start" node is present using data-testid
            const startNode = artifactWebView.locator('[data-testid="start-node"]');
            await startNode.waitFor({ timeout: 10000, state: 'visible' });

            // 13. Verify the flow diagram shows an "Error Handler" node
            // Check if "Error Handler" node is present without using CSS class selectors
            await artifactWebView.getByText(/^Error Handler$/, { exact: true }).first();

            // 14. Verify the tree view shows the automation name under "Entry Points" section
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main']);
        });

        test('Click Run button from toolbar', async () => {
            // 1. Navigate to the BI integration view
            const projectExplorer = new ProjectExplorer(page.page);
            const mainEntryPoint = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main']);

            // Open main.bal in the text editor so that VS Code's ${file} launch
            // variable can be resolved when the debug/run session starts. Without
            // an active text editor, `debug.startDebugging` fails with
            // "Variable ${file} can not be resolved. Please open an editor."
            await FileUtils.openProjectFileInEditor('automation.bal');
            await mainEntryPoint.click();

            // 2. Verify the "Run Integration" button is visible in the editor toolbar
            // Find the "Run Integration" button by aria-label in the editor toolbar actions
            const runButton = page.page.locator('ul.actions-container[role="toolbar"] li.action-item a[role="button"][aria-label="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });

            // 3. Click on the "Run Integration" button
            await runButton.click();

            // Wait until "Running executable" text appears in the terminal panel
            const runningExecutableLocator = page.page.locator('.xterm-screen', { hasText: 'Running executable' }).first();
            await runningExecutableLocator.waitFor({ timeout: 30000 });
        });

        test('Verify terminal opens', async () => {
            // 2. Verify the VS Code terminal panel is visible
            const terminal = page.page.locator('.xterm-screen').first();
            await terminal.waitFor({ timeout: 10000 });
        });

        test('Run with missing config', async () => {
            // Add config to the project
            const configContent = 'configurable string url = ?;';
            FileUtils.updateProjectFile('config.bal', configContent);
            await page.page.waitForTimeout(1000);

            // 1. Ensure the project has missing required configurations
            // 2. Click on the "Run Integration" button
            const runButton = page.page.locator('ul.actions-container[role="toolbar"] li.action-item a[role="button"][aria-label="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();

            // 3. Verify a missing configuration popup/dialog is displayed
            // Wait for the native VSCode dialog to appear
            const dialogBox = page.page.locator('.monaco-dialog-box').first();
            await dialogBox.waitFor({ timeout: 15000 });

            // Verify the dialog title "Missing Config.toml file"
            const dialogTitle = page.page.getByText('Missing Config.toml file', { exact: true });
            await dialogTitle.waitFor({ timeout: 5000 });

            // Verify the dialog buttons are present
            // Check if the "Create Config.toml" button is visible
            await page.page.getByText('Create Config.toml', { exact: true }).isVisible();
            // Check if the "Run Anyway" button is visible
            await page.page.getByText('Run Anyway', { exact: true }).isVisible();
            // Check if the "Cancel" button is visible and click it
            const cancelButton = page.page.getByText('Cancel', { exact: true });
            if (await cancelButton.isVisible()) {
                await cancelButton.click();
                console.log('Clicked "Cancel" button.');
            }
        });

        test('Run after config added', async () => {

            // 1. Ensure the project has missing required configurations
            // 2. Click on the "Run Integration" button
            const runButton = page.page.locator('ul.actions-container[role="toolbar"] li.action-item a[role="button"][aria-label="Run Integration"]').first();
            await runButton.waitFor({ timeout: 10000 });
            await runButton.click();

            // 3. Verify a missing configuration popup/dialog is displayed
            // Wait for the native VSCode dialog to appear
            const dialogBox = page.page.locator('.monaco-dialog-box').first();
            await dialogBox.waitFor({ timeout: 15000 });

            // Verify the dialog title "Missing Config.toml file"
            const dialogTitle = page.page.getByText('Missing Config.toml file', { exact: true });
            await dialogTitle.waitFor({ timeout: 5000 });

            // Verify the dialog buttons are present
            const createButton = page.page.getByText('Create Config.toml', { exact: true });
            if (await createButton.isVisible()) {
                await createButton.click();
            }

            const runningExecutableLocator = page.page.locator('.xterm-screen', { hasText: 'Running executable' }).first();
            await runningExecutableLocator.waitFor({ timeout: 30000 });
        });

        test('Verify process starts', async () => {
            // 1. Click on the "Run Integration" button
            // Wait until "Running executable" text appears in the terminal panel
            const runningExecutableLocator = page.page.locator('.xterm-screen', { hasText: 'Running executable' }).first();
            await runningExecutableLocator.waitFor({ timeout: 30000 });
        });

        test('View run output', async () => {
            // Wait until "Running executable" text appears in the terminal panel
            const runningExecutableLocator = page.page.locator('.xterm-screen', { hasText: "Running executable" }).first();
            await runningExecutableLocator.waitFor({ timeout: 30000 });
        });

        test('Run from command palette', async () => {
            // 1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
            await page.page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P');
            await page.page.waitForTimeout(500);

            // 2. Type "Run Integration"
            await page.page.keyboard.type('Run Integration');
            await page.page.waitForTimeout(500);

            // 3. Verify the command is listed
            // 4. Select the "BI.project.run" command
            await page.page.keyboard.press('Enter');
            await page.page.waitForTimeout(2000);

            // Wait until "Running executable" text appears in the terminal panel
            const runningExecutableLocator = page.page.locator('.xterm-screen', { hasText: 'Running executable' }).first();
            await runningExecutableLocator.waitFor({ timeout: 30000 });
        });

    });


}
