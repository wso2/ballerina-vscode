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
import { initTest, logStep, page, toggleNotifications } from '../utils/helpers';
import { ProjectExplorer } from '../utils/pages';

const RUN_BUTTON_SELECTOR = 'ul.actions-container[role="toolbar"] li.action-item a[role="button"][aria-label="Run Integration"]';
const RESTART_PROMPT_TEXT = 'This integration is already running';

// Two-package Ballerina workspace; each package is a long-running automation
// printing a unique marker ("<name> started") and sleeping ~5 min.
const WORKSPACE_TEMPLATE = path.join(__dirname, '..', 'data', 'concurrent_run_workspace');
const ALPHA = 'alpha_runner';
const BETA = 'beta_runner';

// Opens an integration's own overview so the Run button targets THAT
// integration. Selecting the tree node only highlights it — the focused
// project (and the Run target) changes only when the package overview is
// opened via the node's inline "Open Overview" action.
async function openIntegration(name: string) {
    logStep(`Opening overview of integration '${name}'`);
    const projectExplorer = new ProjectExplorer(page.page);
    const node = await projectExplorer.findItem([name]);
    await node!.hover();
    const openOverview = page.page.getByRole('button', { name: 'Open Overview' }).first();
    await openOverview.waitFor({ timeout: 10000 });
    await openOverview.click();
    // Let the package overview load and the focused project settle before
    // the Run button is used (Run targets the focused project).
    await page.page.waitForTimeout(2500);
}

async function clickRunButton(integrationName?: string) {
    logStep(`Clicking Run Integration${integrationName ? ` (target: ${integrationName})` : ''}`);
    const runButton = page.page.locator(RUN_BUTTON_SELECTOR).first();
    await runButton.waitFor({ timeout: 10000 });
    await runButton.click();

    // If a run is launched from the workspace overview, the "Select an
    // integration to run" quickpick appears (items are project paths).
    // Answer it with the wanted integration. NOTE: must use waitFor —
    // isVisible() returns immediately, before the picker renders.
    if (integrationName) {
        const picker = page.page.locator('.quick-input-widget').first();
        const pickerVisible = await picker
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        if (pickerVisible) {
            logStep(`Answering integration picker with '${integrationName}'`);
            await page.page.keyboard.type(integrationName);
            await page.page.waitForTimeout(500);
            await page.page.keyboard.press('Enter');
            await picker.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
        } else {
            logStep('No integration picker shown (focused project run)');
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
            logStep('Waiting for alpha_runner output');
            await terminalWithText(`${ALPHA} started`).waitFor({ timeout: 60000 });
            logStep('alpha_runner is running');
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

            logStep('No prompts shown; waiting for beta_runner output');
            await terminalWithText(`${BETA} started`).waitFor({ timeout: 60000 });
            logStep('beta_runner is running concurrently');
        });

        test('Both integrations keep running in separate terminals', async () => {
            // With two task terminals the terminal tabs list is visible; one
            // dedicated terminal per integration ("Ballerina Run - <package>").
            logStep('Verifying both task terminals exist');
            const alphaTab = page.page.locator('.terminal-tabs-entry', { hasText: ALPHA }).first();
            const betaTab = page.page.locator('.terminal-tabs-entry', { hasText: BETA }).first();
            await alphaTab.waitFor({ timeout: 15000 });
            await betaTab.waitFor({ timeout: 15000 });

            logStep('Switching to alpha terminal to verify intact output');
            // Switching back to the first run shows its output untouched —
            // starting the second integration did not kill or steal it.
            await alphaTab.click();
            await terminalWithText(`${ALPHA} started`).waitFor({ timeout: 10000 });
            logStep('Both integrations confirmed alive in dedicated terminals');
        });

        test('Re-running the same integration prompts restart', async () => {
            await openIntegration(BETA);
            await clickRunButton(BETA);

            logStep('Waiting for the same-integration restart prompt');
            const notification = restartNotification();
            await notification.waitFor({ timeout: 15000 });
            await notification.getByRole('button', { name: 'No', exact: true }).click();
            await notification.waitFor({ state: 'detached', timeout: 10000 });

            logStep('Verifying both integrations survived the declined restart');
            // Declining must leave both integrations running.
            const alphaTab = page.page.locator('.terminal-tabs-entry', { hasText: ALPHA }).first();
            const betaTab = page.page.locator('.terminal-tabs-entry', { hasText: BETA }).first();
            await alphaTab.waitFor({ timeout: 10000 });
            await betaTab.waitFor({ timeout: 10000 });
            logStep('Same-integration restart prompt verified');
        });
    });
}
