const FLOW_NODES_BASE_SOURCE = [
  'int count = 1',
  'string msg = "started"',
  'log:printInfo',
  'log:printDebug'
];

const FLOW_NODES_IF_SOURCE = [
  'if count > 10',
  'else'
];

const FLOW_NODES_LOGGING_SOURCE = [
  'log:printError("sample error log")',
  'log:printWarn("sample warn log")'
];

const FLOW_NODES_MATCH_SOURCE = [
  'match count',
  '1 =>'
];

const FLOW_NODES_WHILE_SOURCE = [
  'while count < 3'
];

globalThis.addAutomationArtifact = async () => {
  const frame = await getBIWebview();
  await frame.getByRole('button', { name: /Add Artifact/i }).click({ force: true });
  await frame.locator('#automation').first().click({ force: true });
  await frame.getByRole('heading', { name: /Create New Automation/i }).waitFor({ timeout: 30000 });
  await frame.getByRole('button', { name: 'Create' }).click({ force: true });
  await frame.locator('[data-testid="bi-diagram-canvas"], #bi-diagram-canvas').waitFor({ timeout: 60000 });
};

globalThis.dismissHelperPanel = async () => {
  await ensureWorkbench();
  await window.keyboard.press('Escape');
  await window.waitForTimeout(300);
  await window.keyboard.press('Escape');
  await window.waitForTimeout(300);
};

globalThis.clickNextDiagramPlus = async () => {
  const frame = await getBIWebview();
  const canvas = frame.locator('[data-testid="bi-diagram-canvas"], #bi-diagram-canvas');
  await canvas.waitFor({ timeout: 30000 });
  await canvas.evaluate((element) => {
    element.scrollIntoView({ block: 'start', inline: 'nearest' });
    const scrollable = element.closest('[style*="overflow"]') || element.parentElement;
    scrollable?.scrollTo?.({ top: 0, behavior: 'instant' });
    window.scrollTo(0, 0);
  }).catch(() => {});
  await frame.waitForTimeout(500);

  const clickedId = await frame.locator('[data-testid]').evaluateAll((elements) => {
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

  await frame.waitForTimeout(1000);
  const text = await frame.locator('body').innerText().catch(() => '');
  if (!text.includes('Statement') && !text.includes('Control') && !text.includes('Logging')) {
    throw new Error(`node palette did not open after clicking diagram plus "${clickedId}"\n${text}`);
  }
};

globalThis.selectFlowNode = async (nodeLabel, category) => {
  const frame = await getBIWebview();
  await clickNextDiagramPlus();
  const panel = frame.locator('[data-testid="side-panel"]').first();
  await panel.waitFor({ state: 'visible', timeout: 30000 });

  const search = panel.locator('input[placeholder*="Search"], input[type="text"]').first();
  if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
    await search.fill(nodeLabel);
    await frame.waitForTimeout(1200);
  } else if (category) {
    const categoryHeader = panel.getByText(category, { exact: true }).first();
    if (await categoryHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categoryHeader.click({ force: true }).catch(() => {});
    }
  }

  let node = panel.getByText(nodeLabel, { exact: true }).last();
  if (!await node.isVisible({ timeout: 5000 }).catch(() => false)) {
    if (category) {
      const categoryHeader = panel.getByText(category, { exact: true }).first();
      if (await categoryHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
        await categoryHeader.click({ force: true }).catch(() => {});
        await frame.waitForTimeout(500);
      }
    }
    node = panel.getByText(nodeLabel, { exact: true }).last();
  }
  try {
    await node.waitFor({ state: 'visible', timeout: 30000 });
  } catch (error) {
    const text = await frame.locator('body').innerText().catch(() => '');
    throw new Error(`node "${nodeLabel}" was not visible in palette: ${error.message}\n${text}`);
  }
  await node.click({ force: true });
  await frame.waitForTimeout(1000);
};

globalThis.saveOpenFlowNodeForm = async () => {
  const frame = await getBIWebview();
  await dismissHelperPanel();
  const save = frame.getByRole('button', { name: 'Save' }).last();
  await save.waitFor({ timeout: 30000 });
  await save.click({ force: true });
  await frame.locator('[data-testid="bi-diagram-canvas"], #bi-diagram-canvas').waitFor({ timeout: 60000 });
  await frame.waitForTimeout(1000);
};

globalThis.fillFlowNodeForm = async (values) => {
  const frame = await getBIWebview();
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.switchToFormView(false, frame);
  await form.fill({ values });
  await dismissHelperPanel();
};

globalThis.addDeclareVariableNode = async (name, type, expression) => {
  await selectFlowNode('Declare Variable', 'Statement');
  await fillFlowNodeForm({
    'Name*Name of the variable': { type: 'input', value: name },
    'Type': { type: 'textarea', value: type, additionalProps: { clickLabel: true } },
    'expression': { type: 'cmEditor', value: expression, additionalProps: { clickLabel: true } }
  });
  await saveOpenFlowNodeForm();
};

globalThis.addLogNode = async (nodeLabel, message) => {
  await selectFlowNode(nodeLabel, 'Logging');
  await fillFlowNodeForm({
    'msg': {
      type: 'cmEditor',
      value: message,
      additionalProps: { switchMode: 'primary-mode', clickLabel: true, window }
    }
  });
  await saveOpenFlowNodeForm();
};

globalThis.addIfElseNode = async (condition) => {
  const frame = await getBIWebview();
  await selectFlowNode('If', 'Control');
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.switchToFormView(false, frame);
  await cmFill(condition, 0);
  const panel = frame.locator('[data-testid="side-panel"]').first();
  await panel.evaluate((element) => element.scrollTo({ top: element.scrollHeight, behavior: 'instant' })).catch(() => {});
  await frame.waitForTimeout(500);
  const addElse = panel.getByText('Add Else Block', { exact: true }).first();
  await addElse.waitFor({ state: 'visible', timeout: 10000 });
  await addElse.evaluate((element) => {
    const clickable = element.closest('button, vscode-button, a, [role="button"]') || element;
    clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  });
  await panel.getByText('Remove Else Block', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await saveOpenFlowNodeForm();
};

globalThis.addMatchNode = async (target, firstPattern = '1') => {
  const frame = await getBIWebview();
  await selectFlowNode('Match', 'Control');
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.switchToFormView(false, frame);
  await cmFill(target, 0);
  await cmFill(firstPattern, 1);

  const panel = frame.locator('[data-testid="side-panel"]').first();
  await panel.evaluate((element) => element.scrollTo({ top: element.scrollHeight, behavior: 'instant' })).catch(() => {});
  await frame.waitForTimeout(500);

  // Add Case 2
  const addCase = panel.getByText('Add Case', { exact: true }).first();
  if (await addCase.isVisible({ timeout: 5000 }).catch(() => false)) {
    await addCase.evaluate((element) => {
      const clickable = element.closest('button, vscode-button, a, [role="button"]') || element;
      clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
    await frame.waitForTimeout(300);
  }

  // Add Default case
  const addDefault = panel.getByText('Add Default', { exact: true }).first();
  if (await addDefault.isVisible({ timeout: 5000 }).catch(() => false)) {
    await addDefault.evaluate((element) => {
      const clickable = element.closest('button, vscode-button, a, [role="button"]') || element;
      clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
    await frame.waitForTimeout(300);
  }

  await saveOpenFlowNodeForm();
};

globalThis.addWhileNode = async (condition) => {
  const frame = await getBIWebview();
  await selectFlowNode('While', 'Control');
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.switchToFormView(false, frame);
  await cmFill(condition, 0);
  await saveOpenFlowNodeForm();
};

globalThis.addGenericFlowNode = async (nodeLabel, category, values = {}) => {
  await selectFlowNode(nodeLabel, category);
  if (Object.keys(values).length > 0) {
    await fillFlowNodeForm(values);
  }
  await saveOpenFlowNodeForm();
};

globalThis.verifyFlowNodesSource = async (expected = FLOW_NODES_BASE_SOURCE) => {
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  const source = fs.readFileSync(path.join(state.integrationDir, 'automation.bal'), 'utf8');
  const missing = expected.filter((fragment) => !source.includes(fragment));
  if (missing.length > 0) {
    throw new Error(`automation.bal is missing expected flow source:\n${missing.join('\n')}\n\n${source}`);
  }
  console.log(`verified ${expected.length} source fragments`);
};

globalThis.verifyFlowNodesBaseSource = async () => verifyFlowNodesSource(FLOW_NODES_BASE_SOURCE);
globalThis.verifyFlowNodesIfSource = async () => verifyFlowNodesSource([...FLOW_NODES_BASE_SOURCE, ...FLOW_NODES_IF_SOURCE]);
globalThis.verifyFlowNodesLoggingSource = async () => verifyFlowNodesSource([
  ...FLOW_NODES_BASE_SOURCE,
  ...FLOW_NODES_IF_SOURCE,
  ...FLOW_NODES_LOGGING_SOURCE
]);
globalThis.verifyFlowNodesMatchSource = async () => verifyFlowNodesSource([
  ...FLOW_NODES_BASE_SOURCE,
  ...FLOW_NODES_IF_SOURCE,
  ...FLOW_NODES_MATCH_SOURCE
]);
globalThis.verifyFlowNodesWhileSource = async () => verifyFlowNodesSource([
  ...FLOW_NODES_BASE_SOURCE,
  ...FLOW_NODES_IF_SOURCE,
  ...FLOW_NODES_LOGGING_SOURCE,
  ...FLOW_NODES_WHILE_SOURCE
]);
