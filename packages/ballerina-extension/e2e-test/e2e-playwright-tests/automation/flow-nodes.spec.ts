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
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, logStep, page } from '../utils/helpers';
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
    'match count',
    '1 =>',
    'log:printError("sample error log")',
    'log:printWarn("sample warn log")',
    'while count < 3',
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
    await webview.getByText(/Saving\.\.\./).waitFor({ state: 'hidden', timeout: 60000 }).catch(async (error) => {
        const panelText = await webview.getByTestId('side-panel').innerText({ timeout: 1000 }).catch(() => '');
        throw new Error(`Flow node form did not finish saving.\n${panelText}\n${error}`);
    });
    await webview.getByTestId('side-panel').waitFor({ state: 'hidden', timeout: 60000 }).catch(async (error) => {
        const panelText = await webview.getByTestId('side-panel').innerText({ timeout: 1000 }).catch(() => '');
        throw new Error(`Flow node form did not close after saving.\n${panelText}\n${error}`);
    });
    await webview.locator('[data-testid="bi-diagram-canvas"]').waitFor({ state: 'visible', timeout: 60000 });
    await page.page.waitForTimeout(1000);
}

async function selectNode(sidePanel: SidePanel, nodeTitle: string, sectionTitle?: string) {
    await sidePanel.init();
    if (sectionTitle) {
        await sidePanel.expandSection(sectionTitle);
    }
    await sidePanel.clickNode(nodeTitle);
}

async function fillFirstCodeMirror(webview: Frame, value: string) {
    await fillCodeMirror(webview, value, 0);
}

async function fillCodeMirror(webview: Frame, value: string, index: number) {
    await webview.evaluate(({ text, editorIndex }) => {
        const panel = document.querySelector('[data-testid="side-panel"]');
        const editors = [...(panel || document).querySelectorAll('.cm-content')] as Array<HTMLElement & { cmView?: { view?: any } }>;
        const visibleEditors = editors.filter((editor) => {
            const rect = editor.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
        const editor = visibleEditors[editorIndex];
        const view = editor?.cmView?.view;
        if (!view) {
            throw new Error('CodeMirror editor not found');
        }
        view.focus();
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    }, { text: value, editorIndex: index });
}

async function clickLinkButtonText(webview: Frame, text: string) {
    const linkText = webview.getByText(text, { exact: true }).first();
    await linkText.waitFor({ state: 'visible', timeout: 10000 });
    await linkText.evaluate((element) => {
        const clickable = element.closest('button, vscode-button, a, [role="button"]') || element;
        clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
}

async function clickNextDiagramPlus(webview: Frame) {
    await webview.locator('[data-testid="bi-diagram-canvas"]').waitFor({ state: 'visible', timeout: 30000 });
    const clickedId = await webview.locator('[data-testid]').evaluateAll((elements) => {
        const links = elements.filter((element) => {
            const id = element.getAttribute('data-testid') || '';
            return id.startsWith('diagram-link-');
        });
        for (const link of links) {
            for (const type of ['pointerover', 'mouseover', 'mouseenter', 'pointerenter']) {
                link.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
            }
        }

        const candidates = elements.filter((element) => {
            const id = element.getAttribute('data-testid') || '';
            return id.startsWith('link-add-button') || id.startsWith('empty-node-add-button');
        });
        const target = candidates.find((element) => (element.getAttribute('data-testid') || '').startsWith('empty-node-add-button'))
            || candidates[candidates.length - 2]
            || candidates[candidates.length - 1];
        if (!target) {
            return '';
        }
        for (const type of ['pointerover', 'mouseover', 'mouseenter', 'pointerenter']) {
            target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        }
        for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
            target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        }
        return target.getAttribute('data-testid') || '';
    });

    await webview.getByTestId('side-panel').waitFor({ state: 'visible', timeout: 30000 });
    if (!clickedId) {
        throw new Error('No diagram add button was available');
    }
}

export default function createTests() {
    test.describe.serial('Automation Flow Nodes Tests', {}, async () => {
        initTest();

        test('Flow Nodes builds Statement and Control nodes from diagram', async () => {
            logStep('Create Automation artifact');
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

            logStep('Add Log Info node');
            await diagram.clickAddButtonByIndex(1);
            await selectNode(sidePanel, 'Log Info', 'Logging');
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

            logStep('Add int count Declare Variable node');
            await diagram.clickHoverAddButtonByIndex(1);
            await selectNode(sidePanel, 'Declare Variable');
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Name*Name of the variable': { type: 'input', value: 'count' },
                    'Type': { type: 'textarea', value: 'int', additionalProps: { clickLabel: true } },
                    'expression': { type: 'cmEditor', value: '1', additionalProps: { clickLabel: true } }
                }
            });
            await saveForm(artifactWebView);

            logStep('Add string msg Declare Variable node');
            await diagram.clickHoverAddButtonByIndex(2);
            await selectNode(sidePanel, 'Declare Variable');
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'Name*Name of the variable': { type: 'input', value: 'msg' },
                    'Type': { type: 'textarea', value: 'string', additionalProps: { clickLabel: true } },
                    'expression': { type: 'cmEditor', value: '"started"', additionalProps: { clickLabel: true } }
                }
            });
            await saveForm(artifactWebView);

            logStep('Add Log Debug node');
            await diagram.clickHoverAddButtonByIndex(3);
            await selectNode(sidePanel, 'Log Debug', 'Logging');
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

            logStep('Add If node with Else block');
            await diagram.clickHoverAddButtonByIndex(4);
            await selectNode(sidePanel, 'If', 'Control');
            await form.switchToFormView(false, artifactWebView);
            await fillFirstCodeMirror(artifactWebView, 'count > 10');
            await clickLinkButtonText(artifactWebView, 'Add Else Block');
            await artifactWebView.getByText('Remove Else Block', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
            await saveForm(artifactWebView);

            logStep('Add Match node');
            await clickNextDiagramPlus(artifactWebView);
            await selectNode(sidePanel, 'Match', 'Control');
            await form.switchToFormView(false, artifactWebView);
            await fillCodeMirror(artifactWebView, 'count', 0);
            await fillCodeMirror(artifactWebView, '1', 1);
            await saveForm(artifactWebView);

            logStep('Add Log Error node');
            await clickNextDiagramPlus(artifactWebView);
            await selectNode(sidePanel, 'Log Error', 'Logging');
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'msg': {
                        type: 'cmEditor',
                        value: 'sample error log',
                        additionalProps: { switchMode: 'primary-mode', clickLabel: true, window: page.page }
                    }
                }
            });
            await saveForm(artifactWebView);

            logStep('Add Log Warn node');
            await clickNextDiagramPlus(artifactWebView);
            await selectNode(sidePanel, 'Log Warn', 'Logging');
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'msg': {
                        type: 'cmEditor',
                        value: 'sample warn log',
                        additionalProps: { switchMode: 'primary-mode', clickLabel: true, window: page.page }
                    }
                }
            });
            await saveForm(artifactWebView);

            logStep('Add While node');
            await clickNextDiagramPlus(artifactWebView);
            await selectNode(sidePanel, 'While', 'Control');
            await form.switchToFormView(false, artifactWebView);
            await fillFirstCodeMirror(artifactWebView, 'count < 3');
            await saveForm(artifactWebView);

            logStep('Verify generated automation.bal source');
            expectSourceFragments(FileUtils.readProjectFile('automation.bal'));
        });
    });
}
