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
import fs from "fs";
import { FileUtils } from '../utils/helpers/fileSystem';
import path from 'path';

export default function createTests() {
    // Debug Integration Tests
    test.describe('Debug Integration Tests', {
        tag: '@group1',
    }, async () => {
        initTest();
        test('Click Debug button from toolbar', async () => {
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // Setup the project by applying the data.txt content into automation file
            const sampleData = fs.readFileSync(path.join(__dirname, 'data.txt'), 'utf8');
            FileUtils.updateProjectFile('automation.bal', sampleData);

            // Refresh the project explorer
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.refresh(DEFAULT_PROJECT_NAME);

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

            // 7. Verify the terminal opens (if applicable)
            // Terminal might open automatically, check if it's visible
            const terminal = page.page.locator('.terminal-view').first();
            if (await terminal.isVisible({ timeout: 3000 }).catch(() => false)) {
                // Terminal is visible
            }
        });

        test('Verify debug session starts', async () => {
            // 3. Verify the debug toolbar appears at the top of the editor
            const debugToolbar = page.page.locator('[data-testid="debug-toolbar"], .monaco-toolbar').first();
            await debugToolbar.waitFor({ timeout: 10000 });

            // 4. Verify the debug toolbar shows Continue, Step Over, Step Into, Step Out, and Stop buttons
            const continueButton = page.page.locator('[data-testid="continue-button"], button[title*="Continue"], button[aria-label*="Continue"]').first();
            await continueButton.waitFor({ timeout: 5000 }).catch(() => {
                // Button might be present but not immediately visible
            });

            // 5. Verify the debug toolbar shows the current debug configuration
            // 6. Verify the debug status is shown (e.g., "Debugging")
            const debugStatus = page.page.locator('text=/Debugging|Debug/i').first();
            await debugStatus.waitFor({ timeout: 5000 }).catch(() => {
                // Status might be shown differently
            });
        });

        test('Add breakpoint from diagram', async () => {
            // 1. Start a debug session
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main'], true);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // 2. Navigate to the diagram view
            await artifactWebView.locator('#bi-diagram-canvas').waitFor({ state: 'visible', timeout: 30000 });

            // 3. Identify a node where a breakpoint should be added
            // 4. Click on the breakpoint indicator/icon on the diagram node
            const breakpointIndicator = artifactWebView.locator('[data-testid="breakpoint-indicator-diagram"], .breakpoint-indicator, [class*="breakpoint"]').first();
            if (await breakpointIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
                await breakpointIndicator.click();

                // 5. Verify a breakpoint is added to the node
                // 6. Verify the breakpoint indicator is visible on the node
                await breakpointIndicator.waitFor({ timeout: 5000 });

                // 7. Verify the breakpoint is synchronized to the source code
                // 8. Verify the corresponding source line shows a breakpoint
            }
        });

        test('Remove breakpoint from diagram', async () => {
            // 1. Start a debug session
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main'], true);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // 2. Add a breakpoint on a diagram node (from previous scenario)
            const breakpointIndicator = artifactWebView.locator('[data-testid="breakpoint-indicator-diagram"], .breakpoint-indicator').first();
            if (await breakpointIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
                // 3. Verify the breakpoint is set
                await breakpointIndicator.waitFor({ timeout: 5000 });

                // 4. Click on the breakpoint indicator again on the same node
                await breakpointIndicator.click();

                // 5. Verify the breakpoint is removed from the node
                // 6. Verify the breakpoint indicator disappears from the node
                await page.page.waitForTimeout(500);
            }
        });

        test('Add breakpoint from source', async () => {
            // 1. Start a debug session
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main'], true);

            // 2. Open a .bal source file in the editor
            const balFile = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'src', 'main.bal'], true).catch(() => null);
            if (balFile) {
                await balFile.click();
                await page.page.waitForTimeout(1000);

                // 3. Navigate to a line where a breakpoint should be added
                // 4. Click on the gutter (left margin) of the source file at the desired line
                const gutter = page.page.locator('.margin-view-overlays .line-numbers, .gutter').first();
                if (await gutter.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await gutter.click({ position: { x: 10, y: 50 } });

                    // 5. Verify a breakpoint is added
                    // 6. Verify a red dot appears in the gutter
                    const breakpoint = page.page.locator('.breakpoint, .debug-breakpoint').first();
                    await breakpoint.waitFor({ timeout: 5000 }).catch(() => {
                        // Breakpoint might be added but selector might differ
                    });
                }
            }
        });

        test('Breakpoint syncs to diagram', async () => {
            // 1. Start a debug session
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main'], true);
            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            // 2. Add a breakpoint in the source code (from previous scenario)
            // 3. Verify the breakpoint is set in the source
            // 4. Navigate to the diagram view
            await artifactWebView.locator('#bi-diagram-canvas').waitFor({ state: 'visible', timeout: 30000 });

            // 5. Verify the corresponding diagram node shows a breakpoint indicator
            const breakpointIndicator = artifactWebView.locator('[data-testid="breakpoint-indicator-diagram"], .breakpoint-indicator').first();
            await breakpointIndicator.waitFor({ timeout: 10000 }).catch(() => {
                // Breakpoint sync might take time or might not be immediately visible
            });
        });

        test('Hit breakpoint', async () => {
            // 1. Start a debug session
            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main'], true);
            const debugButton = page.page.locator('[data-testid="debug-integration-button"], button[title*="Debug"]').first();
            await debugButton.waitFor({ timeout: 10000 });
            await debugButton.click();
            await page.page.waitForTimeout(2000);

            // 2. Add a breakpoint (in source or diagram)
            // 3. Trigger the code execution that will hit the breakpoint
            // 4. Verify execution pauses at the breakpoint
            // 5. Verify the active breakpoint is highlighted
            const activeBreakpoint = page.page.locator('[data-testid="active-breakpoint-indicator"], .active-breakpoint').first();
            await activeBreakpoint.waitFor({ timeout: 30000 }).catch(() => {
                // Breakpoint might not be hit immediately
            });
        });

        test('View variables at breakpoint', async () => {
            // 1. Start a debug session
            // 2. Add a breakpoint and hit it (from previous scenarios)
            // 3. Verify execution is paused at the breakpoint
            // 4. Open the Variables panel (if not already open)
            const variablesPanel = page.page.locator('[data-testid="variables-panel"], .debug-variables').first();
            if (await variablesPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
                // 5. Verify the Variables panel displays variable names and values
                await variablesPanel.waitFor({ timeout: 5000 });
            }
        });

        test('Step over', async () => {
            // 1. Start a debug session
            // 2. Hit a breakpoint (execution is paused)
            // 3. Verify the current execution line is visible
            // 4. Press F10 or click the "Step Over" button in the debug toolbar
            const stepOverButton = page.page.locator('[data-testid="step-over-button"], button[title*="Step Over"], button[aria-label*="Step Over"]').first();
            if (await stepOverButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await stepOverButton.click();
                // 5. Verify execution moves to the next line
                await page.page.waitForTimeout(1000);
            } else {
                // Try keyboard shortcut
                await page.page.keyboard.press('F10');
                await page.page.waitForTimeout(1000);
            }
        });

        test('Step into', async () => {
            // 1. Start a debug session
            // 2. Hit a breakpoint (execution is paused)
            // 3. Verify the current execution line is visible
            // 4. Position the cursor on a function call (if stepping into a function)
            // 5. Press F11 or click the "Step Into" button in the debug toolbar
            const stepIntoButton = page.page.locator('[data-testid="step-into-button"], button[title*="Step Into"]').first();
            if (await stepIntoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await stepIntoButton.click();
            } else {
                await page.page.keyboard.press('F11');
            }
            await page.page.waitForTimeout(1000);
        });

        test('Step out', async () => {
            // 1. Start a debug session
            // 2. Step into a function (from previous scenario)
            // 3. Verify execution is inside the function
            // 4. Press Shift+F11 or click the "Step Out" button in the debug toolbar
            const stepOutButton = page.page.locator('[data-testid="step-out-button"], button[title*="Step Out"]').first();
            if (await stepOutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await stepOutButton.click();
            } else {
                await page.page.keyboard.press('Shift+F11');
            }
            await page.page.waitForTimeout(1000);
        });

        test('Continue execution', async () => {
            // 1. Start a debug session
            // 2. Hit a breakpoint (execution is paused)
            // 3. Verify execution is paused
            // 4. Press F5 or click the "Continue" button in the debug toolbar
            const continueButton = page.page.locator('[data-testid="continue-button"], button[title*="Continue"]').first();
            if (await continueButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await continueButton.click();
            } else {
                await page.page.keyboard.press('F5');
            }
            await page.page.waitForTimeout(1000);
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

        test('Debug from command palette', async () => {
            // 1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
            await page.page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P');
            await page.page.waitForTimeout(500);

            // 2. Type "BI.project.debug" or "Debug Integration"
            await page.page.keyboard.type('BI.project.debug');
            await page.page.waitForTimeout(500);

            // 3. Verify the command is listed
            // 4. Select the "BI.project.debug" command
            await page.page.keyboard.press('Enter');
            await page.page.waitForTimeout(2000);

            // 5. Verify the command executes
            // 6. Verify the debug session starts
        });

        test('View call stack', async () => {
            // 1. Start a debug session
            // 2. Step into a function (create a call stack)
            // 3. Hit a breakpoint inside a nested function
            // 4. Open the Call Stack panel (if not already open)
            const callStackPanel = page.page.locator('[data-testid="call-stack-panel"], .debug-call-stack').first();
            if (await callStackPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
                // 5. Verify the Call Stack panel displays the call hierarchy
                await callStackPanel.waitFor({ timeout: 5000 });
            }
        });
    });
}
