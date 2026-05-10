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
  await frame.mouse.wheel(0, -1200).catch(() => {});
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
  if (category) {
    const categoryHeader = frame.getByText(category, { exact: true }).first();
    if (await categoryHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categoryHeader.click({ force: true }).catch(() => {});
    }
  }
  let node = frame.getByText(nodeLabel, { exact: true }).last();
  if (!await node.isVisible({ timeout: 5000 }).catch(() => false)) {
    const search = frame.locator('input[placeholder*="Search"], input[type="text"]').first();
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill(nodeLabel);
      await frame.waitForTimeout(1000);
    }
    node = frame.getByText(nodeLabel, { exact: true }).last();
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
  await fillFlowNodeForm({
    'branch-0': { type: 'cmEditor', value: condition, additionalProps: { clickLabel: true } }
  });
  const addElse = frame.getByText('Add Else Block', { exact: true }).first();
  if (await addElse.isVisible({ timeout: 5000 }).catch(() => false)) {
    await addElse.click({ force: true });
  }
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
