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
import fs from 'fs';
import path from 'path';
import { expect, test, Frame } from '@playwright/test';
import { addArtifact, BI_INTEGRATOR_LABEL, BI_WEBVIEW_NOT_FOUND_ERROR, initTest, logStep, newProjectPath, page } from '../utils/helpers';
import { Form, switchToIFrame } from '@wso2/playwright-vscode-tester';
import { Diagram, SidePanel } from '../utils/pages';

let personTypeName = 'Person';
let greetingName = 'greeting';
let recordVarName = 'p';
let configName = 'personName';

function readGenerated(fileName: string): string {
    return fs.readFileSync(path.join(newProjectPath, fileName), 'utf8');
}

async function pollGenerated(fileName: string, fragment: string, timeoutMs = 30000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    let content = '';
    while (Date.now() < deadline) {
        try {
            content = readGenerated(fileName);
            if (content.includes(fragment)) {
                return content;
            }
        } catch {
            // file may not exist yet
        }
        await page.page.waitForTimeout(1000);
    }
    throw new Error(`${fileName} did not contain "${fragment}" within ${timeoutMs}ms:\n${content}`);
}

async function getWebviewFrame(): Promise<Frame> {
    const webview = await switchToIFrame(BI_INTEGRATOR_LABEL, page.page);
    if (!webview) {
        throw new Error(BI_WEBVIEW_NOT_FOUND_ERROR);
    }
    return webview;
}

// Set a CodeMirror editor's full content through the CM view API. NOTE: in the
// chip expression editor this renders but does NOT commit to the form model —
// follow up with real keyboard input for values that must be saved.
async function cmSet(frame: Frame, text: string, index: number): Promise<void> {
    await frame.evaluate(({ text, index }) => {
        const editors = document.querySelectorAll('.cm-content');
        const el = editors[index] as any;
        if (!el) { throw new Error(`CodeMirror editor not found at index ${index}`); }
        const view = el.cmView?.view;
        if (!view) { throw new Error('CodeMirror view instance not found'); }
        view.focus();
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    }, { text, index });
}

// Mode-switcher labels can render outside the viewport in the runner's window
// size — dispatch a DOM click instead of a pointer click.
async function domClick(locator: import('@playwright/test').Locator): Promise<void> {
    await locator.waitFor({ state: 'attached', timeout: 15000 });
    await locator.evaluate((el: HTMLElement) => el.click());
}

async function dismissHelperPanel(): Promise<void> {
    await page.page.keyboard.press('Escape');
    await page.page.waitForTimeout(300);
    await page.page.keyboard.press('Escape');
    await page.page.waitForTimeout(300);
}

async function saveOpenForm(frame: Frame): Promise<void> {
    await dismissHelperPanel();
    const save = frame.getByRole('button', { name: 'Save' }).last();
    await save.waitFor({ timeout: 30000 });
    await save.click({ force: true });
    await frame.getByTestId('bi-diagram-canvas').waitFor({ timeout: 60000 });
    await page.page.waitForTimeout(1000);
}

async function openNodePalette(frame: Frame): Promise<SidePanel> {
    const diagram = new Diagram(page.page);
    await diagram.init();
    // Click the last visible plus button on the flow (works for a growing flow)
    const canvas = frame.getByTestId('bi-diagram-canvas');
    await canvas.waitFor({ timeout: 30000 });

    // The diagram can still be re-rendering right after the previous node's
    // panel closes, so the add-button testids may not exist yet — poll for
    // a bounded time with a real delay between attempts (no busy-spin).
    const clickDeadline = Date.now() + 30000;
    let clicked = false;
    while (Date.now() < clickDeadline && !clicked) {
        clicked = await frame.locator('[data-testid]').evaluateAll((elements) => {
            const candidates = elements.filter((element) => {
                const id = element.getAttribute('data-testid') || '';
                return id.startsWith('link-add-button') || id.startsWith('empty-node-add-button');
            });
            const target = candidates.find((element) => (element.getAttribute('data-testid') || '').startsWith('empty-node-add-button'))
                || candidates[candidates.length - 2]
                || candidates[candidates.length - 1];
            if (!target) { return false; }
            for (const type of ['pointerover', 'mouseover', 'mouseenter', 'pointerenter', 'pointerdown', 'mousedown', 'mouseup', 'click']) {
                target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
            }
            return true;
        });
        if (!clicked) {
            await page.page.waitForTimeout(1000);
        }
    }
    if (!clicked) {
        throw new Error('no diagram add button found after 30s');
    }
    await page.page.waitForTimeout(1000);
    const sidePanel = new SidePanel(frame, page.page);
    await sidePanel.init();
    return sidePanel;
}

export default function createTests() {
    test.describe.serial('Expression Editor Advanced Tests', {
    }, async () => {
        initTest();

        test('Create Person Type via Type Diagram', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            personTypeName = `Person${testAttempt}`;
            logStep(`Creating record type ${personTypeName} (attempt ${testAttempt})`);

            // The "Types" tree row has no click command — use its hover action
            // to reveal the "View Type Diagram" inline action, then click it.
            const typesItem = page.page.locator(
                'div[role="treeitem"][aria-label="Types"], div[role="treeitem"][aria-label^="Types, "]'
            ).first();
            await typesItem.waitFor({ state: 'visible', timeout: 30000 });
            await typesItem.hover({ timeout: 15000 });
            const viewDiagram = typesItem.locator('a.action-label[aria-label*="View Type Diagram"]').first();
            await viewDiagram.waitFor({ state: 'visible', timeout: 15000 });
            await viewDiagram.click({ timeout: 15000 });

            // Fetch the webview frame fresh — the type diagram is a distinct
            // view from the integration overview and can replace the webview
            // iframe, so a frame captured before navigation can go stale.
            const frame = await getWebviewFrame();
            const addTypeBtn = frame.getByRole('button', { name: 'Add Type' });
            // First type-diagram load is slow while the language server warms up
            await addTypeBtn.waitFor({ state: 'visible', timeout: 120000 });
            logStep('Opened type diagram via project explorer');
            await addTypeBtn.click({ force: true });
            await page.page.waitForTimeout(2000);

            const nameInput = frame.getByRole('textbox', { name: 'Name' }).first();
            await nameInput.waitFor({ state: 'visible', timeout: 15000 });
            await nameInput.fill(personTypeName);

            const addFieldBtn = frame.getByTestId('add-field-button');
            await addFieldBtn.waitFor({ state: 'visible', timeout: 15000 });
            await addFieldBtn.click();
            let idField = frame.getByTestId('identifier-field').last();
            await idField.dblclick();
            await idField.type('name');

            await addFieldBtn.click();
            idField = frame.getByTestId('identifier-field').last();
            await idField.dblclick();
            await idField.type('age');
            const typeCell = frame.getByTestId('type-field').last();
            const intOption = frame.locator('.unq-modal-overlay').getByText('int', { exact: true }).last();
            const typePopupDeadline = Date.now() + 30000;
            while (Date.now() < typePopupDeadline) {
                await typeCell.dblclick({ timeout: 5000 }).catch(() => { });
                if (await intOption.isVisible({ timeout: 5000 }).catch(() => false)) { break; }
            }
            await intOption.waitFor({ state: 'visible', timeout: 5000 });
            await intOption.click({ force: true });
            logStep('Filled type fields: name (string), age (int)');

            await frame.getByRole('button', { name: 'Save' }).first().click({ force: true });
            await frame.getByTestId(`type-node-${personTypeName}`).waitFor({ timeout: 30000 });
            logStep('Type node visible in diagram');

            const typesSource = await pollGenerated('types.bal', `type ${personTypeName} record {|`);
            expect(typesSource).toContain('string name;');
            expect(typesSource).toContain('int age;');
            logStep('types.bal verified');

            // Back to the overview for the next test
            const home = frame.getByTestId('home-button').first();
            await home.waitFor({ state: 'visible', timeout: 15000 });
            await home.click({ force: true });
            await frame.getByText('Add Artifact').first().waitFor({ timeout: 60000 });
            logStep('Returned to integration overview');
        });

        test('Expand Editor and Completion Driven Function Call', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            greetingName = `greeting${testAttempt}`;
            logStep(`Declaring variable ${greetingName} through expanded editor + completions`);

            await addArtifact('Automation', 'automation');
            const frame = await getWebviewFrame();
            const createBtn = frame.getByRole('button', { name: 'Create' });
            await createBtn.waitFor({ state: 'visible', timeout: 60000 });
            await createBtn.click({ timeout: 10000 });
            await frame.getByTestId('bi-diagram-canvas').waitFor({ timeout: 60000 });
            logStep('Automation created');

            const sidePanel = await openNodePalette(frame);
            await sidePanel.clickNode('Declare Variable');
            await page.page.waitForTimeout(1000);
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, frame);
            await form.switchToFormView(false, frame);
            await form.fill({
                values: {
                    'Name*Name of the variable': { type: 'input', value: greetingName }
                }
            });
            logStep('Declare Variable form open');

            // Expand the expression editor, type there, collapse, verify preserved
            const panel = frame.getByTestId('side-panel');
            const expr = panel.locator('.cm-content').last();
            await expr.waitFor({ state: 'visible', timeout: 15000 });
            await expr.click();
            await page.page.waitForTimeout(1000);
            const expandBtn = frame.locator('[title="Expand Editor"]').last();
            await expandBtn.waitFor({ state: 'visible', timeout: 15000 });
            await expandBtn.click({ force: true });
            await page.page.waitForTimeout(1500);
            logStep('Expanded editor open');

            const cmCount = await frame.locator('.cm-content').count();
            await cmSet(frame, '"Hello World"', cmCount - 1);
            await page.page.waitForTimeout(500);
            const minimize = frame.locator('[title="Minimize Editor"], [title="Minimize"]').last();
            await minimize.waitFor({ state: 'visible', timeout: 15000 });
            await minimize.click({ force: true });
            await expect(panel.locator('.cm-content').last()).toContainText('Hello World', { timeout: 15000 });
            logStep('Expanded-editor value preserved after collapse');

            // Type is int since the final expression is .length()
            await form.fill({
                values: {
                    'Type': { type: 'textarea', value: 'int', additionalProps: { clickLabel: true } }
                }
            });
            await dismissHelperPanel();

            // Completion-driven function call (no signature-help popup exists
            // in the multi-mode editor — insertion help is completion-based)
            const exprCm = panel.locator('.cm-content').last();
            await exprCm.click();
            await page.page.waitForTimeout(500);
            await cmSet(frame, '', (await frame.locator('.cm-content').count()) - 1);
            await page.page.waitForTimeout(300);
            await page.page.keyboard.type('"Hello World".le', { delay: 80 });
            const option = frame.locator('.cm-tooltip-autocomplete [role="option"]', { hasText: 'length' }).first();
            await option.waitFor({ state: 'visible', timeout: 15000 });
            logStep('Completion list visible');
            await option.click({ force: true });
            await expect(exprCm).toContainText('"Hello World".length()', { timeout: 15000 });
            logStep('Completion inserted the full call');

            await saveOpenForm(frame);
            await pollGenerated('automation.bal', `int ${greetingName} = "Hello World".length()`);
            logStep('automation.bal verified');
        });

        test('Record Config Editor with Configurable Chip', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            recordVarName = `p${testAttempt}`;
            configName = `personName${testAttempt}`;
            logStep(`Declaring ${recordVarName}:${personTypeName} and wiring configurable ${configName}`);

            const frame = await getWebviewFrame();
            const panel = frame.getByTestId('side-panel');

            // Create the record variable with a typed literal (the Record mode
            // switcher only appears when editing the saved node)
            const sidePanel = await openNodePalette(frame);
            await sidePanel.clickNode('Declare Variable');
            await page.page.waitForTimeout(1000);
            const form = new Form(page.page, BI_INTEGRATOR_LABEL, frame);
            await form.switchToFormView(false, frame);
            await form.fill({
                values: {
                    'Name*Name of the variable': { type: 'input', value: recordVarName },
                    'Type': { type: 'textarea', value: personTypeName, additionalProps: { clickLabel: true } }
                }
            });
            await dismissHelperPanel();
            const expr = panel.locator('.cm-content').last();
            await expr.click();
            await page.page.waitForTimeout(500);
            await cmSet(frame, '{name: "Anne", age: 30}', (await frame.locator('.cm-content').count()) - 1);
            await page.page.waitForTimeout(1500);
            await saveOpenForm(frame);
            await pollGenerated('automation.bal', `${personTypeName} ${recordVarName} = {name: "Anne", age: 30}`);
            logStep('Record variable saved with typed literal');

            // Reopen the node — Record / Expression mode switcher must appear
            const node = frame.getByText(new RegExp(`${recordVarName} = \\{name`)).last();
            await node.waitFor({ state: 'visible', timeout: 15000 });
            await node.click({ force: true });
            const recordMode = frame.getByTestId('primary-mode');
            const expressionMode = frame.getByTestId('expression-mode');
            await recordMode.waitFor({ state: 'visible', timeout: 15000 });
            expect(await recordMode.innerText()).toBe('Record');
            expect(await expressionMode.innerText()).toBe('Expression');
            logStep('Record/Expression mode switcher visible on edit');

            // Record mode → focus preview → Record Configuration modal. The
            // panel re-renders after the mode switch, so retry the focus click
            // until the modal actually appears.
            const overlay = frame.locator('.unq-modal-overlay').last();
            const modalMarker = overlay.getByText('Select fields to construct the record');
            const modalDeadline = Date.now() + 90000;
            while (Date.now() < modalDeadline) {
                if (await modalMarker.isVisible({ timeout: 1000 }).catch(() => false)) { break; }
                // (Re)assert Record mode — the click can be swallowed while the
                // panel re-renders — then focus the preview editor. The modal
                // opens on focus, so dispatch a real DOM focus as well.
                await domClick(recordMode).catch(() => { });
                await page.page.waitForTimeout(1000);
                const preview = frame.locator('[data-testid="ex-editor-expression"] textarea, [data-testid="ex-editor-expression"] input, [data-testid="ex-editor-expression"] .cm-content').last();
                await preview.click({ force: true, timeout: 5000 }).catch(() => { });
                await preview.evaluate((el: HTMLElement) => el.focus()).catch(() => { });
                await page.page.waitForTimeout(1500);
            }
            await modalMarker.waitFor({ timeout: 5000 });
            const branchText = await overlay.getByTestId('parameter-branch').first().innerText();
            expect(branchText).toContain('name');
            expect(branchText).toContain('age');
            logStep('Record Configuration modal open with field tree');

            // Helper pane menu from the modal's expression editor
            const modalCm = overlay.locator('.cm-content').last();
            await modalCm.click({ force: true });
            await frame.getByText('Configurables', { exact: true }).last().waitFor({ timeout: 15000 });
            await frame.getByText('Configurables', { exact: true }).last().click({ force: true });
            await page.page.waitForTimeout(1500);
            const newConfig = frame.getByText('New Configurable', { exact: false }).last();
            await newConfig.waitFor({ state: 'visible', timeout: 15000 });
            await newConfig.click({ force: true });
            await page.page.waitForTimeout(2000);
            logStep('New Configurable form open');

            const configNameBox = frame.getByRole('textbox', { name: /Variable Name/i }).last();
            await configNameBox.click({ force: true });
            await page.page.keyboard.type(configName, { delay: 40 });
            await page.page.keyboard.press('Tab');
            await page.page.waitForTimeout(400);
            await page.page.keyboard.type('string', { delay: 40 });
            await page.page.waitForTimeout(800);
            await page.page.keyboard.press('Escape');
            const cms = frame.locator('.cm-content');
            await cms.nth((await cms.count()) - 2).click({ force: true });
            await page.page.keyboard.type('"Anne"', { delay: 40 });
            await page.page.waitForTimeout(800);
            await page.page.keyboard.press('Escape');
            const saveConfig = frame.getByRole('button', { name: 'Save' }).last();
            await saveConfig.click({ force: true });
            await pollGenerated('config.bal', `configurable string ${configName} = "Anne"`);
            logStep('config.bal has the new configurable');

            // Close the modal and set the record value through the keyboard —
            // programmatic CM edits do not commit to the form model
            await frame.locator('.unq-modal-overlay').last().locator('vscode-button, button').first().click({ force: true });
            await page.page.waitForTimeout(1000);
            await domClick(expressionMode);
            await page.page.waitForTimeout(2000);
            const fieldCm = panel.locator('.cm-content').first();
            await fieldCm.click({ force: true });
            await cmSet(frame, '', 0);
            await page.page.waitForTimeout(500);
            await page.page.keyboard.type(`{name: ${configName}, age: 30}`, { delay: 30 });
            await page.page.waitForTimeout(2500);

            // The configurable renders as a blue chip widget
            const chip = panel.locator('.cm-content span[contenteditable="false"]', { hasText: configName }).first();
            await chip.waitFor({ state: 'visible', timeout: 15000 });
            const chipStyle = await chip.getAttribute('style');
            expect(chipStyle).toContain('rgba(59, 130, 246');
            expect(await chip.locator('i.fw-bi-variable').count()).toBeGreaterThan(0);
            logStep('Configurable rendered as blue chip');

            await saveOpenForm(frame);
            await pollGenerated('automation.bal', `${personTypeName} ${recordVarName} = {name: ${configName}, age: 30}`);
            logStep('automation.bal has the configurable reference');
        });

        test('MySQL Query with SQL Mode Toggle', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            logStep(`Adding MySQL connection + query (attempt ${testAttempt})`);

            const frame = await getWebviewFrame();
            const panel = frame.getByTestId('side-panel');

            const sidePanel = await openNodePalette(frame);
            await panel.getByText('Add Connection', { exact: false }).first().click({ force: true });
            await page.page.waitForTimeout(3000);
            const search = panel.locator('input[placeholder*="Search"], input[type="text"]').first();
            if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
                await search.fill('mysql');
                await page.page.waitForTimeout(3000);
            }
            const card = frame.locator('#connector-mysql').first();
            await card.waitFor({ state: 'visible', timeout: 60000 });
            await card.click({ force: true });
            logStep('MySQL connector selected');

            const loading = frame.locator('text=Loading connector package...');
            await loading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => { });
            await loading.waitFor({ state: 'hidden', timeout: 300000 }).catch(() => { });
            const connNameBox = frame.getByRole('textbox', { name: /Connection Name/i }).first();
            await connNameBox.waitFor({ state: 'visible', timeout: 60000 });
            await frame.getByRole('button', { name: 'Save Connection' }).last().click({ force: true });
            await pollGenerated('connections.bal', 'final mysql:Client mysqlClient = check new ()', 300000);
            logStep('connections.bal has mysql:Client');

            // After saving, the side panel re-renders back to the connector
            // list with mysqlClient available — this can take a few seconds
            // longer than the source-file write. Only fall back to opening a
            // fresh node palette if the panel actually closed (diagram-only).
            const mysqlEntry = panel.getByText('mysqlClient', { exact: false }).first();
            if (!(await mysqlEntry.isVisible({ timeout: 20000 }).catch(() => false))) {
                if (!(await panel.isVisible({ timeout: 2000 }).catch(() => false))) {
                    await openNodePalette(frame);
                }
                await mysqlEntry.waitFor({ state: 'visible', timeout: 30000 });
            }
            await mysqlEntry.click({ force: true });
            await page.page.waitForTimeout(2500);
            await panel.getByText('Query', { exact: true }).first().click({ force: true });
            await page.page.waitForTimeout(3000);

            const sqlMode = frame.getByTestId('primary-mode');
            const exprMode = frame.getByTestId('expression-mode');
            await sqlMode.waitFor({ state: 'visible', timeout: 15000 });
            expect(await sqlMode.innerText()).toBe('SQL');
            expect(await exprMode.innerText()).toBe('Expression');
            logStep('SQL/Expression mode switcher visible');

            const cm = panel.locator('.cm-content').first();
            await cm.click({ force: true });
            await page.page.keyboard.type('SELECT * FROM users', { delay: 30 });
            await page.page.waitForTimeout(2000);
            await domClick(exprMode);
            await expect(panel.locator('.cm-content').first()).toContainText('`SELECT * FROM users`', { timeout: 15000 });
            logStep('Expression mode shows backtick template');
            await domClick(sqlMode);
            await expect(panel.locator('.cm-content').first()).toContainText('SELECT * FROM users', { timeout: 15000 });
            logStep('SQL mode restored raw statement');

            await saveOpenForm(frame);
            await pollGenerated('automation.bal', 'mysqlClient->query(`SELECT * FROM users`)');
            logStep('automation.bal has the query call');
        });

        test('AI Agent Prompt with Markdown Tools', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            logStep(`Adding AI agent with markdown prompt (attempt ${testAttempt})`);

            const frame = await getWebviewFrame();
            const panel = frame.getByTestId('side-panel');

            await openNodePalette(frame);
            await panel.getByText('AI', { exact: true }).first().click({ force: true });
            await page.page.waitForTimeout(2000);
            await panel.getByText('Agent', { exact: true }).last().click({ force: true });
            await page.page.waitForTimeout(2500);
            await panel.getByText('Add Agent', { exact: false }).last().click({ force: true });
            await panel.getByText('AI Agent', { exact: true }).first().waitFor({ timeout: 30000 });
            logStep('AI Agent form open');

            // Expand Instructions (second Expand Editor) → markdown toolbar
            const expandBtns = panel.locator('[title="Expand Editor"]');
            await expandBtns.nth(1).waitFor({ state: 'visible', timeout: 15000 });
            await expandBtns.nth(1).click({ force: true });
            await page.page.waitForTimeout(2500);
            for (const tool of ['Bold', 'Italic', 'Bulleted List', 'Numbered List', 'Blockquote']) {
                expect(await frame.locator(`[title="${tool}"]`).count(), `markdown toolbar missing ${tool}`).toBeGreaterThan(0);
            }
            logStep('Markdown toolbar present');

            const ed = frame.locator('.cm-content, [contenteditable="true"]').last();
            await ed.click({ force: true });
            await page.page.keyboard.type('You are a helpful assistant', { delay: 20 });
            await page.page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
            await frame.locator('[title="Bold"]').last().click({ force: true });
            await page.page.waitForTimeout(800);
            await page.page.keyboard.press('End');
            await page.page.keyboard.press('Enter');
            await frame.locator('[title="Bulleted List"]').last().click({ force: true });
            await page.page.waitForTimeout(500);
            await page.page.keyboard.type('Answer briefly', { delay: 20 });
            await page.page.waitForTimeout(800);
            const html = await ed.evaluate((el) => el.innerHTML);
            expect(html).toContain('<strong>You are a helpful assistant</strong>');
            expect(html).toContain('<li>');
            logStep('Bold + bulleted list applied in the rich prompt editor');

            await frame.locator('[title="Minimize Editor"], [title="Minimize"]').last().click({ force: true });
            await page.page.waitForTimeout(1500);

            // Fill required Query and save
            const queryEd = panel.locator('.cm-content, [contenteditable="true"]').last();
            await queryEd.click({ force: true });
            await page.page.keyboard.type('Summarize the user data', { delay: 20 });
            await page.page.waitForTimeout(1500);
            await page.page.keyboard.press('Escape');
            const save = panel.getByRole('button', { name: 'Save' }).last();
            await expect(save).toBeEnabled({ timeout: 15000 });
            await save.click({ force: true });
            logStep('Agent node saved');

            const agents = await pollGenerated('agents.bal', '**You are a helpful assistant**');
            expect(agents).toContain('* Answer briefly');
            await pollGenerated('automation.bal', '.run("Summarize the user data")');
            logStep('agents.bal markdown + automation.bal run call verified');
        });
    });
}
