{
  const frame = await getBIWebview();

  // Continue in the open Declare Variable form: set type int, then build a
  // function call through autocomplete. NOTE: the multi-mode expression editor
  // has no '('-triggered signature-help popup — function insertion help is
  // completion-driven (placeholder args from extractArgsFromFunction).
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.fill({
    values: {
      'Type': { type: 'textarea', value: 'int', additionalProps: { clickLabel: true } }
    }
  });
  await dismissHelperPanel();
  console.log('type set to int');

  // Clear the expression and type a method access up to a partial name
  const expr = frame.locator('[data-testid="side-panel"] .cm-content').last();
  await expr.click();
  await window.waitForTimeout(500);
  const cmCount = await frame.locator('.cm-content').count();
  await cmFill('', cmCount - 1);
  await window.waitForTimeout(300);
  await window.keyboard.type('"Hello World".le', { delay: 80 });

  // Completion list must appear with the length() candidate. Click the
  // option — Enter can race the list's selection state.
  const option = frame.locator('.cm-tooltip-autocomplete [role="option"]', { hasText: 'length' }).first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  console.log('completion list visible with length()');
  await option.click({ force: true });

  const deadline = Date.now() + 15000;
  let value = '';
  while (Date.now() < deadline) {
    value = await expr.innerText().catch(() => '');
    if (value.includes('"Hello World".length()')) break;
    await window.waitForTimeout(500);
  }
  if (!value.includes('"Hello World".length()')) {
    throw new Error(`completion did not insert call, got: ${JSON.stringify(value)}`);
  }
  console.log('completion inserted full call:', value.trim());

  await dismissHelperPanel();
  await saveOpenFlowNodeForm();
  console.log('saved Declare Variable greeting');

  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  const source = fs.readFileSync(path.join(state.integrationDir, 'automation.bal'), 'utf8');
  if (!source.includes('"Hello World".length()')) {
    throw new Error(`automation.bal missing expected declaration:\n${source}`);
  }
  console.log('automation.bal contains: int greeting = "Hello World".length()');
}
