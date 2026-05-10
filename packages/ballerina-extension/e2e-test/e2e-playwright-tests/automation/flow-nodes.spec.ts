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
import { expect, test, Frame } from '@playwright/test';
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { Diagram, SidePanel } from '../utils/pages';
import { FileUtils } from '../utils/helpers/fileSystem';

const EXPECTED_SOURCE = [
    'int count = 1',
    'string msg = "started"',
    'log:printInfo',
    'log:printDebug',
    'if count > 10',
    'else',
];

function expectSourceFragments(source: string) {
    const missing = EXPECTED_SOURCE.filter((expected) => !source.includes(expected));
    expect(missing, `Missing source fragments:\n${missing.join('\n')}`).toEqual([]);
}

async function dismissHelperPanel() {
    await page.page.keyboard.press('Escape');
    await page.page.waitForTimeout(300);
    await page.page.keyboard.press('Escape');
    await page.page.waitForTimeout(300);
}

async function saveForm(webview: Frame) {
    await dismissHelperPanel();
    await webview.getByRole('button', { name: 'Save' }).last().click({ force: true });
    await webview.locator('[data-testid="bi-diagram-canvas"]').waitFor({ state: 'visible', timeout: 60000 });
    await page.page.waitForTimeout(1000);
}

export default function createTests() {
    test.describe.serial('Automation Flow Nodes Tests', {}, async () => {
        initTest();

        test('Flow Nodes builds Statement and Control nodes from diagram', async () => {
            await addArtifact('Automation', 'automation');

            const artifactWebView = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page, 30000);
            if (!artifactWebView) {
                throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
            }

            await artifactWebView.getByRole('heading', { name: /Create New Automation/i }).waitFor({ timeout: 10000 });
            await artifactWebView.getByRole('button', { name: 'Create' }).click();
            await artifactWebView.locator('[data-testid="bi-diagram-canvas"]').waitFor({ state: 'visible', timeout: 30000 });

            const diagram = new Diagram(page.page);
            await diagram.init();
            const sidePanel = new SidePanel(artifactWebView, page.page);
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);

            await diagram.clickAddButtonByIndex(1);
            await sidePanel.init();
            await sidePanel.expandSection('Logging');
            await sidePanel.clickNode('Log Info');
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'msg': {
                        type: 'cmEditor',
                        value: 'flow started',
                        additionalProps: { switchMode: 'primary-mode', clickLabel: true, window: page.page }
                    }
                }
            });
            await saveForm(artifactWebView);

            await diagram.clickHoverAddButtonByIndex(1);
            await sidePanel.init();
            await sidePanel.clickNode('Declare Variable');
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Name*Name of the variable': { type: 'input', value: 'count' },
                    'Type': { type: 'textarea', value: 'int', additionalProps: { clickLabel: true } },
                    'expression': { type: 'cmEditor', value: '1', additionalProps: { clickLabel: true } }
                }
            });
            await saveForm(artifactWebView);

            await diagram.clickHoverAddButtonByIndex(2);
            await sidePanel.init();
            await sidePanel.clickNode('Declare Variable');
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Name*Name of the variable': { type: 'input', value: 'msg' },
                    'Type': { type: 'textarea', value: 'string', additionalProps: { clickLabel: true } },
                    'expression': { type: 'cmEditor', value: '"started"', additionalProps: { clickLabel: true } }
                }
            });
            await saveForm(artifactWebView);

            await diagram.clickHoverAddButtonByIndex(3);
            await sidePanel.init();
            await sidePanel.expandSection('Logging');
            await sidePanel.clickNode('Log Debug');
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'msg': {
                        type: 'cmEditor',
                        value: 'string `initial ${count} ${msg}`',
                        additionalProps: { switchMode: 'primary-mode', clickLabel: true, window: page.page }
                    }
                }
            });
            await saveForm(artifactWebView);

            await diagram.clickHoverAddButtonByIndex(4);
            await sidePanel.init();
            await sidePanel.expandSection('Control');
            await sidePanel.clickNode('If');
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'branch-0': { type: 'cmEditor', value: 'count > 10', additionalProps: { clickLabel: true } }
                }
            });
            await artifactWebView.getByText('Add Else Block', { exact: true }).click({ force: true });
            await saveForm(artifactWebView);

            expectSourceFragments(FileUtils.readProjectFile('automation.bal'));
        });
    });
}
