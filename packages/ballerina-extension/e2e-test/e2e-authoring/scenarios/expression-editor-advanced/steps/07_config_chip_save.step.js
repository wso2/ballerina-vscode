{
  const frame = await getBIWebview();
  const panel = frame.locator('[data-testid="side-panel"]').first();

  // Continue editing p (form open from step 06, Expression mode active).
  // Reopen the Record Configuration modal and create a configurable from the
  // helper pane, then reference it in the record value.
  const record = frame.locator('[data-testid="primary-mode"]');
  await record.click({ force: true });
  await window.waitForTimeout(1500);
  const preview = frame.locator('[data-testid="ex-editor-expression"] textarea, [data-testid="ex-editor-expression"] input, [data-testid="ex-editor-expression"] .cm-content').last();
  await preview.click({ force: true });
  await window.waitForTimeout(2500);
  const overlay = frame.locator('.unq-modal-overlay').last();
  await overlay.getByText('Select fields to construct the record').waitFor({ timeout: 15000 });

  // Focusing the modal's expression editor opens the helper pane menu
  const modalCm = overlay.locator('.cm-content').last();
  await modalCm.click({ force: true });
  await window.waitForTimeout(2000);
  await frame.getByText('Configurables', { exact: true }).last().waitFor({ timeout: 15000 });
  console.log('helper pane menu visible (Inputs/Variables/Configurables/Functions)');

  await frame.getByText('Configurables', { exact: true }).last().click({ force: true });
  await window.waitForTimeout(1500);
  const newConfig = frame.getByText('New Configurable', { exact: false }).last();
  await newConfig.waitFor({ state: 'visible', timeout: 15000 });
  await newConfig.click({ force: true });
  await window.waitForTimeout(2000);

  // Fill the inline New Configurable form: name, type, default value
  const nameBox = frame.getByRole('textbox', { name: /Variable Name/i }).last();
  await nameBox.click({ force: true });
  await window.keyboard.type('personName', { delay: 40 });
  await window.keyboard.press('Tab');
  await window.waitForTimeout(400);
  await window.keyboard.type('string', { delay: 40 });
  await window.waitForTimeout(800);
  await window.keyboard.press('Escape');
  const cms = frame.locator('.cm-content');
  const defaultCmIndex = (await cms.count()) - 2;
  await cms.nth(defaultCmIndex).click({ force: true });
  await window.keyboard.type('"Anne"', { delay: 40 });
  await window.waitForTimeout(800);
  await window.keyboard.press('Escape');
  const saveConfig = frame.getByRole('button', { name: 'Save' }).last();
  await saveConfig.waitFor({ state: 'visible', timeout: 10000 });
  await saveConfig.click({ force: true });
  await window.waitForTimeout(2500);
  console.log('created configurable personName');

  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  const configSource = fs.readFileSync(path.join(state.integrationDir, 'config.bal'), 'utf8');
  if (!configSource.includes('configurable string personName = "Anne"')) {
    throw new Error(`config.bal missing configurable:\n${configSource}`);
  }
  console.log('config.bal contains configurable');

  // Close the modal and switch to Expression mode to edit the record value.
  // IMPORTANT: the chip editor's form model only commits on real keyboard
  // input — cmFill alone leaves Save disabled. Clear with cmFill, then type.
  await frame.locator('.unq-modal-overlay').last().locator('vscode-button, button').first().click({ force: true });
  await window.waitForTimeout(1000);
  await frame.locator('[data-testid="expression-mode"]').click({ force: true });
  await window.waitForTimeout(2000);
  const fieldCm = panel.locator('.cm-content').first();
  await fieldCm.click({ force: true });
  await window.waitForTimeout(300);
  await cmFill('', 0);
  await window.waitForTimeout(500);
  await window.keyboard.type('{name: personName, age: 30}', { delay: 30 });
  await window.waitForTimeout(2500);

  // personName must render as a blue chip widget (fw-bi-variable icon,
  // blue background) as it is typed
  const chip = panel.locator('.cm-content span[contenteditable="false"]', { hasText: 'personName' }).first();
  await chip.waitFor({ state: 'visible', timeout: 15000 });
  const chipStyle = await chip.getAttribute('style');
  console.log('chip style:', chipStyle);
  if (!chipStyle.includes('rgba(59, 130, 246')) {
    throw new Error(`configurable chip is not blue: ${chipStyle}`);
  }
  const hasIcon = await chip.locator('i.fw-bi-variable').count();
  console.log('chip rendered blue with variable icon:', hasIcon > 0);

  await dismissHelperPanel();
  await saveOpenFlowNodeForm();
  console.log('saved p with configurable reference');

  const source = fs.readFileSync(path.join(state.integrationDir, 'automation.bal'), 'utf8');
  if (!source.includes('Person p = {name: personName, age: 30}')) {
    throw new Error(`automation.bal missing configurable reference:\n${source}`);
  }
  console.log('automation.bal: Person p = {name: personName, age: 30}');
}
