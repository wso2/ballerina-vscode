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
import * as path from 'path';
import fs from 'fs';
import { BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, logStep, newProjectPath, page, toggleNotifications } from '../utils/helpers';
import { switchToIFrame } from '@wso2/playwright-vscode-tester';

type WebView = NonNullable<Awaited<ReturnType<typeof switchToIFrame>>>;

const BASE_URL = 'http://localhost:9090';
const GREETING_JSON = '"message":"Hello, Ballerina!"';

// Fixture with an HTTP service already defined in service.bal (pre-baked, per
// the e2e-writer rule that scenarios must not modify Ballerina sources at
// runtime). Unlike http-try-it.spec.ts, this suite does NOT create the
// project/service through the UI — it opens the existing project directly
// and exercises Try It against the already-defined service.
const PROJECT_TEMPLATE = path.join(__dirname, '..', 'data', 'http_try_it_existing_project');

async function getWebView(): Promise<WebView> {
    const webview = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
    if (!webview) {
        throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
    }
    return webview;
}

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
 * The Overview's architecture diagram discovers the pre-existing service from
 * source and renders a "http:Service" node; clicking it opens the Service
 * Designer, which already shows the Try It button (no artifact creation).
 */
async function openServiceDesignerForExistingService(webview: WebView) {
    logStep('Open Service Designer for the pre-existing HTTP service');
    const serviceNode = webview.getByText('http:Service', { exact: false }).first();
    await serviceNode.waitFor({ timeout: 30000 });
    await serviceNode.click({ force: true });
    await webview.getByText('Try It', { exact: true }).first().waitFor({ timeout: 30000 });
}

/**
 * Drive Try It entirely from the Service Designer toolbar button. Since the
 * service was never run in this session, the button flow auto-starts it:
 *   Try It -> Hurl-vs-AI pick (first use only) -> "Run Integration"
 *          -> "Test with Try It Client?" -> notebook opens.
 */
async function tryItAutoStartAndWaitForHurl(webview: WebView): Promise<string> {
    logStep('Click the Service Designer Try It button');
    await webview.getByRole('button', { name: /Try It/ }).first().click({ force: true });
    await page.page.waitForTimeout(1500);

    const hurlOption = page.page.getByRole('option', { name: /Try It.*Hurl Client/ }).first();
    if (await hurlOption.isVisible({ timeout: 8000 }).catch(() => false)) {
        logStep('Select the Hurl client from the Try It quick pick');
        await hurlOption.click({ force: true });
    }

    logStep('Let Try It auto-start the integration via "Run Integration"');
    await clickNotificationButton('Run Integration', 30000);

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
    test.describe.serial('HTTP Try It Existing Service Tests', {}, async () => {
        initTest(true, true, undefined, undefined, PROJECT_TEMPLATE);

        test('Try It works against a pre-existing HTTP service without any authoring step', async () => {
            const webview = await getWebView();

            // initTest turns on Do Not Disturb, which suppresses the notification
            // toasts the Try It auto-start flow relies on. Surface them first.
            await toggleNotifications(false);

            await openServiceDesignerForExistingService(webview);

            const hurl = await tryItAutoStartAndWaitForHurl(webview);
            logStep('Verify the generated TryIt.hurl request cell');
            expect(hurl).toContain(`GET ${BASE_URL}/greeting`);

            logStep('Verify the notebook opened');
            await expect(page.page.locator('.tabs-container .tab', { hasText: 'TryIt.hurl' }).first())
                .toBeVisible({ timeout: 30000 });

            logStep('Verify the pre-existing service auto-started is serving');
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
