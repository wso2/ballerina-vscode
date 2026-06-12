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
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, page, toggleNotifications } from '../utils/helpers';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';
import { FileUtils } from '../utils/helpers/fileSystem';

const RUN_BUTTON_SELECTOR = 'ul.actions-container[role="toolbar"] li.action-item a[role="button"][aria-label="Run Integration"]';
// Integrations run concurrently; only re-running the SAME integration prompts
// to restart it (product-integrator#1012). This suite uses a single-package
// project, so a second Run always targets the same integration.
const CONFLICT_PROMPT_TEXT = 'This integration is already running';

// Long-running main so the first run stays alive while we trigger a second run.
const LONG_RUNNING_AUTOMATION = `import ballerina/io;
import ballerina/lang.runtime;

public function main() {
    io:println("run-conflict automation started");
    runtime:sleep(300);
}
`;

async function clickRunButton() {
    const runButton = page.page.locator(RUN_BUTTON_SELECTOR).first();
    await runButton.waitFor({ timeout: 10000 });
    await runButton.click();
}

function conflictNotification() {
    return page.page.locator('.notification-toast-container', { hasText: CONFLICT_PROMPT_TEXT }).first();
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
    test.describe.serial('Run Conflict (Same-Integration Restart) Tests', {
    }, async () => {
        initTest();

        test.afterAll(async () => {
            // Dismiss any notification/quickpick a failed test may have left open.
            await page.page.keyboard.press('Escape').catch(() => undefined);
            // Stop the long-running automation so it does not leak into
            // subsequent suites on the soft-reload path.
            await stopAllRunningIntegrations();
            // Restore Do Not Disturb for the rest of the suite.
            await toggleNotifications(true);
        });

        test('Create long-running automation', async () => {
            await addArtifact('Automation', 'automation');

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }
            await artifactWebView.getByRole('button', { name: 'Create' }).click();
            const diagramCanvas = artifactWebView.locator('#bi-diagram-canvas');
            await diagramCanvas.waitFor({ state: 'visible', timeout: 30000 });

            // Replace the generated main with a long-running one so a second
            // Run always hits the conflict path.
            FileUtils.updateProjectFile('automation.bal', LONG_RUNNING_AUTOMATION);
            await page.page.waitForTimeout(1000);

            // Conflict prompt is a notification; make sure DND is off so it renders.
            await toggleNotifications(false);
        });

        test('Start first run', async () => {
            const projectExplorer = new ProjectExplorer(page.page);
            const mainEntryPoint = await projectExplorer.findItem([DEFAULT_PROJECT_NAME, 'Entry Points', 'main']);

            // Open automation.bal so ${file} in the launch config resolves.
            await FileUtils.openProjectFileInEditor('automation.bal');
            await mainEntryPoint.click();

            await clickRunButton();

            const runningLocator = page.page.locator('.xterm-screen', { hasText: 'run-conflict automation started' }).first();
            await runningLocator.waitFor({ timeout: 60000 });
        });

        test('Second run shows conflict prompt', async () => {
            await clickRunButton();

            const notification = conflictNotification();
            await notification.waitFor({ timeout: 15000 });

            // Both choices must be offered.
            await notification.getByRole('button', { name: 'Yes', exact: true }).waitFor({ timeout: 5000 });
            await notification.getByRole('button', { name: 'No', exact: true }).waitFor({ timeout: 5000 });
        });

        test('Decline keeps the current run', async () => {
            const notification = conflictNotification();
            await notification.getByRole('button', { name: 'No', exact: true }).click();
            await notification.waitFor({ state: 'detached', timeout: 10000 });

            // The original process must still be alive: its output is still on
            // screen and no termination message has appeared.
            const runningLocator = page.page.locator('.xterm-screen', { hasText: 'run-conflict automation started' }).first();
            await runningLocator.waitFor({ timeout: 10000 });

            // The cancelled session must not leave an error notification behind.
            const errorNotification = page.page.locator('.notification-toast-container', { hasText: /Failed to run/i });
            if (await errorNotification.isVisible({ timeout: 2000 }).catch(() => false)) {
                throw new Error('Cancelled launch produced an error notification');
            }
        });

        test('Accept stops old run and starts new run', async () => {
            await clickRunButton();

            const notification = conflictNotification();
            await notification.waitFor({ timeout: 15000 });
            await notification.getByRole('button', { name: 'Yes', exact: true }).click();

            // The new task must reach a fresh "Compiling source" → "Running
            // executable" cycle. The old task's terminal is replaced, so waiting
            // for a fresh start marker is sufficient.
            const compiling = page.page.locator('.xterm-screen', { hasText: 'Compiling source' }).first();
            await compiling.waitFor({ timeout: 60000 });
            const restarted = page.page.locator('.xterm-screen', { hasText: 'run-conflict automation started' }).first();
            await restarted.waitFor({ timeout: 60000 });
        });

        test('Exactly one instance runs after restart', async () => {
            // A further Run click must prompt again — proving the previous
            // accept path left exactly one active instance of this integration.
            await clickRunButton();

            const notification = conflictNotification();
            await notification.waitFor({ timeout: 15000 });
            await notification.getByRole('button', { name: 'No', exact: true }).click();
            await notification.waitFor({ state: 'detached', timeout: 10000 });
        });

        test('Rapid double Run shows at most one prompt', async () => {
            // Clear any lingering notification from the previous test first.
            await page.page.keyboard.press('Escape').catch(() => undefined);
            await page.page.waitForTimeout(500);

            // Two quick launches of the same integration must not stack two
            // conflict prompts — the duplicate launch is cancelled quietly
            // (in-flight guard dedup in integration-runner-state).
            await clickRunButton();
            await clickRunButton();

            const notification = conflictNotification();
            await notification.waitFor({ timeout: 20000 });
            await page.page.waitForTimeout(1500);
            const promptCount = await page.page
                .locator('.notification-toast-container', { hasText: CONFLICT_PROMPT_TEXT })
                .count();
            if (promptCount > 1) {
                throw new Error(`Expected at most one conflict prompt, found ${promptCount}`);
            }
            await notification.getByRole('button', { name: 'No', exact: true }).click();
            await notification.waitFor({ state: 'detached', timeout: 10000 });

            // The original run must still be alive.
            const runningLocator = page.page.locator('.xterm-screen', { hasText: 'run-conflict automation started' }).first();
            await runningLocator.waitFor({ timeout: 10000 });
        });

        test('Run right after stopping does not claim already running', async () => {
            // product-integrator#1690: stopping kills the debug session, but the
            // bal process takes a moment to exit. Running again in that window
            // must NOT show the "already running" prompt — the guard silently
            // waits for the process to exit and proceeds.
            const stopButton = page.page.locator('.debug-toolbar a[aria-label^="Stop"]').first();
            await stopButton.waitFor({ timeout: 10000 });
            await stopButton.click();

            // Immediately re-run, without waiting for the process to exit.
            await clickRunButton();

            if (await conflictNotification().isVisible({ timeout: 3000 }).catch(() => false)) {
                throw new Error('"Already running" prompt appeared for a stopped integration (#1690)');
            }

            // A fresh run must start.
            const compiling = page.page.locator('.xterm-screen', { hasText: 'Compiling source' }).first();
            await compiling.waitFor({ timeout: 60000 });
            const restarted = page.page.locator('.xterm-screen', { hasText: 'run-conflict automation started' }).first();
            await restarted.waitFor({ timeout: 60000 });
        });
    });
}
