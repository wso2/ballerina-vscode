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
import { expect, test } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, logStep, newProjectPath, page, toggleNotifications } from '../utils/helpers';
import { switchToIFrame, Form } from '@wso2/playwright-vscode-tester';

type WebView = NonNullable<Awaited<ReturnType<typeof switchToIFrame>>>;

const BASE_URL = 'http://localhost:9090';
const GREETING_BODY = '{message: "Hello, Ballerina!"}';
const GREETING_JSON = '"message":"Hello, Ballerina!"';

async function getWebView(): Promise<WebView> {
    const webview = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
    if (!webview) {
        throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
    }
    return webview;
}

async function clickVisibleText(webview: WebView, text: string) {
    const target = webview.getByText(text, { exact: true }).last();
    await target.waitFor({ state: 'attached', timeout: 30000 });
    try {
        await target.click({ force: true, timeout: 5000 });
    } catch {
        await target.evaluate((element) => (element as HTMLElement).click());
    }
}

/**
 * Click an action button on a VS Code notification toast (e.g. "Run Integration",
 * "Test") by polling frequently. These toasts appear then collapse out of the DOM
 * after ~10s, so the poll must be fast and start before the toast is expected.
 * Clicks are plain (not force) — a forced click on a toast button fails with
 * "outside of the viewport".
 */
async function clickNotificationButton(name: string, timeoutMs: number) {
    const deadline = Date.now() + timeoutMs;
    const btn = page.page.locator('.notifications-toasts').getByRole('button', { name, exact: true }).first();
    while (Date.now() < deadline) {
        if (await btn.isVisible({ timeout: 400 }).catch(() => false)) {
            await btn.scrollIntoViewIfNeeded().catch(() => {});
            if (await btn.click({ timeout: 4000 }).then(() => true, () => false)) {
                return;
            }
        }
        await page.page.waitForTimeout(400);
    }
    throw new Error(`Notification action "${name}" not found within ${timeoutMs}ms`);
}

async function fetchEndpoint(url: string): Promise<{ status: number; body: string; headers: Headers }> {
    const response = await fetch(url, { method: 'GET' });
    return { status: response.status, body: await response.text(), headers: response.headers };
}

async function waitForEndpoint(url: string, timeoutMs: number): Promise<{ status: number; body: string; headers: Headers }> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            return await fetchEndpoint(url);
        } catch {
            await page.page.waitForTimeout(1000);
        }
    }
    throw new Error(`Timed out waiting for ${url}`);
}

/**
 * Add a Return node returning a fixed JSON literal so the resource compiles and
 * serves a deterministic body. Opening the node panel from the diagram add
 * button is retried because the synthetic click occasionally does not register.
 */
async function addLiteralReturnNode(webview: WebView, expression: string) {
    logStep('Add Return node with a fixed JSON value');
    for (let attempt = 0; attempt < 10; attempt++) {
        const addButton = webview.locator('[data-testid="empty-node-add-button-1"]').first();
        if (await addButton.waitFor({ state: 'visible', timeout: 1000 }).then(() => true, () => false)) {
            await addButton.hover({ force: true }).catch(() => {});
            await addButton.click({ force: true, timeout: 3000 }).catch(() => {});
        }
        await page.page.waitForTimeout(1000);
        if (await webview.getByText('Return', { exact: true }).isVisible().catch(() => false)) {
            break;
        }
        await webview.locator('[data-testid]').evaluateAll((elements) => {
            const isVisible = (element: Element) => {
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            };
            const target = elements.find((element) => {
                const id = element.getAttribute('data-testid') || '';
                return isVisible(element) && id.startsWith('empty-node-add-button');
            });
            if (!target) {
                return;
            }
            for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
                target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
            }
        });
        await page.page.waitForTimeout(1000);
        if (await webview.getByText('Return', { exact: true }).isVisible().catch(() => false)) {
            break;
        }
        if (attempt === 9) {
            throw new Error('Node panel did not open from the diagram add button');
        }
    }
    await webview.getByText('Return', { exact: true }).click({ force: true });
    await expect(webview.getByText('Return value.', { exact: true })).toBeVisible({ timeout: 30000 });

    // Type the literal into the CodeMirror expression editor. cmView.dispatch does
    // not sync the form's React state, and the first keystrokes are dropped unless
    // focus has settled, so click + wait + delayed typing is required.
    const cm = webview.locator('[data-testid="ex-editor-expression"] .cm-content');
    await cm.click({ force: true });
    await page.page.waitForTimeout(1000);
    await page.page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.page.keyboard.press('Backspace');
    await page.page.waitForTimeout(400);
    await page.page.keyboard.type(expression, { delay: 25 });
    await expect.poll(async () => cm.textContent(), { timeout: 10000 }).toBe(expression);

    // The helper panel can open on focus and cover Save; dismiss it if present.
    await webview.getByRole('button', { name: 'Close Helper Panel' }).click({ force: true }).catch(() => {});
    await webview.getByRole('button', { name: 'Save' }).click({ force: true });
    await expect.poll(() => fs.readFileSync(path.join(newProjectPath, 'main.bal'), 'utf8'), { timeout: 30000 })
        .toContain(`return ${expression};`);
}

/**
 * Trigger the service-level Try It flow and wait for the generated Hurl file.
 * First use surfaces a quick pick to choose the Hurl client vs the AI client.
 */
/**
 * Drive Try It entirely from the Service Designer toolbar button — no palette
 * run command. On a service that is not running, the button flow is:
 *   Try It  ->  "how to try it" quick pick (Hurl vs AI, first use only)
 *           ->  "requires a running service" warning -> Run Integration (starts it)
 *           ->  post-run "Test with Try It Client?" prompt -> Test (builds notebook)
 * The notebook is not generated automatically after the auto-start; the "Test"
 * confirmation is what generates and opens it.
 */
async function tryItAutoStartAndWaitForHurl(webview: WebView): Promise<string> {
    logStep('Click the toolbar Try It button');
    await webview.getByText('Try It', { exact: true }).first().waitFor({ timeout: 30000 });
    await webview.getByRole('button', { name: /Try It/ }).first().click({ force: true });
    await page.page.waitForTimeout(1500);

    const hurlOption = page.page.getByRole('option', { name: /Try It.*Hurl Client/ }).first();
    if (await hurlOption.isVisible({ timeout: 8000 }).catch(() => false)) {
        logStep('Select the Hurl client from the Try It quick pick');
        await hurlOption.click({ force: true });
    }

    logStep('Let Try It auto-start the integration via "Run Integration"');
    await clickNotificationButton('Run Integration', 30000);

    // Once the run starts, the notebook is produced by one of two racing flows:
    // the button's own post-start continuation, OR a debug-session hook that
    // re-prompts "N service(s) found ... Test with Try It Client?" and builds it
    // when confirmed (config-provider.ts). Which wins varies, and the info toast
    // collapses in ~10s. So poll for the generated file while dismissing the
    // Test prompt (and any re-shown Hurl pick) whenever either surfaces.
    logStep('Confirm "Test with Try It Client?" / wait for the notebook');
    const hurlPath = path.join(newProjectPath, 'target', 'TryIt.hurl');
    const deadline = Date.now() + 180000;
    let openedCenterAt = 0;
    while (Date.now() < deadline && !fs.existsSync(hurlPath)) {
        for (const container of ['.notifications-toasts', '.notifications-center']) {
            const testBtn = page.page.locator(container).getByRole('button', { name: 'Test', exact: true }).first();
            if (await testBtn.isVisible({ timeout: 300 }).catch(() => false)) {
                await testBtn.click({ timeout: 3000 }).catch(() => {});
                break;
            }
        }
        if (await hurlOption.isVisible({ timeout: 300 }).catch(() => false)) {
            await hurlOption.click({ force: true }).catch(() => {});
        }
        // The Test toast collapses into the center; surface it periodically.
        if (Date.now() - openedCenterAt > 8000) {
            await page.executePaletteCommand('Notifications: Show Notifications').catch(() => {});
            openedCenterAt = Date.now();
        }
        await page.page.waitForTimeout(1000);
    }
    if (!fs.existsSync(hurlPath)) {
        throw new Error('TryIt.hurl was not generated after Run Integration / Test');
    }
    return fs.readFileSync(hurlPath, 'utf8');
}

export default function createTests() {
    test.describe.serial('HTTP Try It Tests', {}, async () => {
        initTest();

        test('HTTP Try It generates a Hurl notebook and returns a live response', async () => {
            logStep('Create HTTP Service artifact');
            await addArtifact('HTTP Service', 'http-service-card');
            let webview = await getWebView();

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, webview);
            await form.switchToFormView(false, webview);
            await form.fill({ values: { 'Service Base Path*': { type: 'input', value: '/' } } });
            await form.submit('Create');

            logStep('Add GET /greeting resource');
            await webview.getByRole('button', { name: /Add Resource/i }).first().click({ force: true });
            await clickVisibleText(webview, 'GET');
            const resourcePathInput = webview.getByRole('textbox', { name: /Resource Path/i })
                .or(webview.locator('[data-testid="resource-path-input"]'));
            await resourcePathInput.first().waitFor({ timeout: 10000 });
            await resourcePathInput.first().fill('greeting');
            await clickVisibleText(webview, 'Save');
            await webview.locator('[data-testid="bi-diagram-canvas"]').waitFor({ timeout: 30000 });

            await addLiteralReturnNode(webview, GREETING_BODY);

            logStep('Open the Service Designer (toolbar Try It lives here)');
            await page.page.getByRole('treeitem', { name: /HTTP Service/ }).first().click({ force: true }).catch(() => {});
            await page.page.waitForTimeout(2500);
            webview = await getWebView();

            // initTest turns on Do Not Disturb, which suppresses the notification
            // toasts the Try It auto-start flow relies on. Surface them first.
            await toggleNotifications(false);

            // The Try It button starts the service itself (Run Integration) — no
            // palette BI.project.run — and its "Test" prompt builds the notebook.
            const hurl = await tryItAutoStartAndWaitForHurl(webview);
            logStep('Verify the generated TryIt.hurl request cell');
            expect(hurl).toContain(`GET ${BASE_URL}/greeting`);

            logStep('Verify the notebook opened');
            await expect(page.page.locator('.tabs-container .tab', { hasText: 'TryIt.hurl' }).first())
                .toBeVisible({ timeout: 30000 });

            logStep('Verify the service Try It auto-started is serving');
            const running = await waitForEndpoint(`${BASE_URL}/greeting`, 120000);
            expect(running.status).toBe(200);
            expect(running.body).toContain(GREETING_JSON);

            logStep('Execute the request cell and confirm the send succeeds');
            await page.page.locator('.cell.code .monaco-editor').first().click({ force: true }).catch(() => {});
            await page.page.waitForTimeout(500);
            await page.page.keyboard.press('Control+Enter');
            await expect(page.page.locator('.codicon-notebook-state-success').first())
                .toBeVisible({ timeout: 30000 });

            logStep('Verify the response status, body and headers');
            const response = await fetchEndpoint(`${BASE_URL}/greeting`);
            expect(response.status).toBe(200);
            expect(response.body).toContain(GREETING_JSON);
            expect(response.headers.get('content-type') ?? '').toContain('application/json');
        });
    });
}
