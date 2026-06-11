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
const CONFLICT_PROMPT_TEXT = 'There is already a running integration';

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

export default function createTests() {
    test.describe.serial('Run Conflict (Single-Instance) Tests', {
    }, async () => {
        initTest();

        test.afterAll(async () => {
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

        test('Exactly one integration runs after switch', async () => {
            // A further Run click must prompt again — proving the previous
            // accept path left exactly one active run slot.
            await clickRunButton();

            const notification = conflictNotification();
            await notification.waitFor({ timeout: 15000 });
            await notification.getByRole('button', { name: 'No', exact: true }).click();
            await notification.waitFor({ state: 'detached', timeout: 10000 });
        });
    });
}
