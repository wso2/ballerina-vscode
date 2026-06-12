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
import { test } from '@playwright/test';
import * as path from 'path';
import { initTest, page, toggleNotifications } from '../utils/helpers';
import { ProjectExplorer } from '../utils/pages';

const RUN_BUTTON_SELECTOR = 'ul.actions-container[role="toolbar"] li.action-item a[role="button"][aria-label="Run Integration"]';
const RESTART_PROMPT_TEXT = 'This integration is already running';

// Two-package Ballerina workspace; each package is a long-running automation
// printing a unique marker ("<name> started") and sleeping ~5 min.
const WORKSPACE_TEMPLATE = path.join(__dirname, '..', 'data', 'concurrent_run_workspace');
const ALPHA = 'alpha_runner';
const BETA = 'beta_runner';

async function openIntegration(name: string) {
    const projectExplorer = new ProjectExplorer(page.page);
    // Open the integration's overview ("Open View" inline action) so the
    // state machine focuses this project — merely selecting the tree item
    // leaves the view on the workspace overview, and Run would then open
    // the "Select an integration to run" picker instead of running.
    try {
        await projectExplorer.goToOverview(name);
    } catch {
        const item = await projectExplorer.findItem([name]);
        await item!.click();
    }
    // Let the focused-project state settle before the Run button is used.
    await page.page.waitForTimeout(1500);
}

async function clickRunButton(integrationName?: string) {
    const runButton = page.page.locator(RUN_BUTTON_SELECTOR).first();
    await runButton.waitFor({ timeout: 10000 });
    await runButton.click();

    // Workspace-level runs may open the "Select an integration to run"
    // quickpick (items are project paths). Answer it with the wanted
    // integration instead of letting it swallow the run.
    if (integrationName) {
        const picker = page.page.locator('.quick-input-widget').first();
        const pickerVisible = await picker.isVisible({ timeout: 3000 }).catch(() => false);
        if (pickerVisible) {
            await page.page.keyboard.type(integrationName);
            await page.page.waitForTimeout(500);
            await page.page.keyboard.press('Enter');
        }
    }
}

function restartNotification() {
    return page.page.locator('.notification-toast-container', { hasText: RESTART_PROMPT_TEXT }).first();
}

function terminalWithText(text: string) {
    return page.page.locator('.xterm-screen', { hasText: text }).first();
}

// Clicks the debug toolbar Stop button until no session remains (bounded).
async function stopAllRunningIntegrations() {
    for (let i = 0; i < 4; i++) {
        const stopButton = page.page.locator('.debug-toolbar a[aria-label^="Stop"]').first();
        if (!await stopButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            return;
        }
        await stopButton.click().catch(() => undefined);
        await page.page.waitForTimeout(1500);
    }
}

export default function createTests() {
    test.describe.serial('Concurrent Run Tests', {
    }, async () => {
        initTest(true, true, undefined, undefined, WORKSPACE_TEMPLATE);

        test.afterAll(async () => {
            // Dismiss any quickpick a failed test may have left open — an
            // abandoned picker steals focus from subsequent suites.
            await page.page.keyboard.press('Escape').catch(() => undefined);
            // Stop any still-running integrations so the long-running sleeps do
            // not leak into subsequent suites on the soft-reload path.
            await stopAllRunningIntegrations();
            // Restore Do Not Disturb for the rest of the suite.
            await toggleNotifications(true);
        });

        test('Run first integration', async () => {
            // Prompts (if any) are notifications; make sure DND is off so they render.
            await toggleNotifications(false);

            await openIntegration(ALPHA);
            await clickRunButton(ALPHA);
            await terminalWithText(`${ALPHA} started`).waitFor({ timeout: 60000 });
        });

        test('Run second integration concurrently without prompts', async () => {
            await openIntegration(BETA);
            await clickRunButton(BETA);

            // Neither our restart prompt nor VS Code's built-in
            // "task is already active / terminate" modal may appear (#1012).
            const vscodeTaskModal = page.page.locator('.monaco-dialog-box', { hasText: /already active/i });
            if (await vscodeTaskModal.isVisible({ timeout: 3000 }).catch(() => false)) {
                throw new Error('VS Code "task is already active" modal appeared — task identities collided');
            }
            if (await restartNotification().isVisible({ timeout: 1000 }).catch(() => false)) {
                throw new Error('Restart prompt appeared for a DIFFERENT integration — runs are not concurrent');
            }

            await terminalWithText(`${BETA} started`).waitFor({ timeout: 60000 });
        });

        test('Both integrations keep running in separate terminals', async () => {
            // With two task terminals the terminal tabs list is visible; one
            // dedicated terminal per integration ("Ballerina Run - <package>").
            const alphaTab = page.page.locator('.terminal-tabs-entry', { hasText: ALPHA }).first();
            const betaTab = page.page.locator('.terminal-tabs-entry', { hasText: BETA }).first();
            await alphaTab.waitFor({ timeout: 15000 });
            await betaTab.waitFor({ timeout: 15000 });

            // Switching back to the first run shows its output untouched —
            // starting the second integration did not kill or steal it.
            await alphaTab.click();
            await terminalWithText(`${ALPHA} started`).waitFor({ timeout: 10000 });
        });

        test('Re-running the same integration prompts restart', async () => {
            await openIntegration(BETA);
            await clickRunButton(BETA);

            const notification = restartNotification();
            await notification.waitFor({ timeout: 15000 });
            await notification.getByRole('button', { name: 'No', exact: true }).click();
            await notification.waitFor({ state: 'detached', timeout: 10000 });

            // Declining must leave both integrations running.
            const alphaTab = page.page.locator('.terminal-tabs-entry', { hasText: ALPHA }).first();
            const betaTab = page.page.locator('.terminal-tabs-entry', { hasText: BETA }).first();
            await alphaTab.waitFor({ timeout: 10000 });
            await betaTab.waitFor({ timeout: 10000 });
        });
    });
}
