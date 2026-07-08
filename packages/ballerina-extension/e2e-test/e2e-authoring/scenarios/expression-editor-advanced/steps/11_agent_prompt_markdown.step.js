{
  const frame = await getBIWebview();
  const panel = frame.locator('[data-testid="side-panel"]').first();

  // Expand the Instructions prompt field (second Expand Editor button)
  const expandBtns = panel.locator('[title="Expand Editor"]');
  await expandBtns.nth(1).waitFor({ state: 'visible', timeout: 15000 });
  await expandBtns.nth(1).click({ force: true });
  await window.waitForTimeout(2500);

  // The expanded prompt editor has a markdown toolbar
  for (const tool of ['Bold', 'Italic', 'Bulleted List', 'Numbered List', 'Blockquote']) {
    if ((await frame.locator(`[title="${tool}"]`).count()) === 0) {
      throw new Error(`markdown toolbar missing "${tool}"`);
    }
  }
  console.log('markdown toolbar present (Bold/Italic/Lists/Blockquote)');

  // Type, bold the text, then add a bulleted list line
  const ed = frame.locator('.cm-content, [contenteditable="true"]').last();
  await ed.click({ force: true });
  await window.waitForTimeout(500);
  await window.keyboard.type('You are a helpful assistant', { delay: 20 });
  await window.waitForTimeout(800);
  await window.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await frame.locator('[title="Bold"]').last().click({ force: true });
  await window.waitForTimeout(800);
  await window.keyboard.press('End');
  await window.keyboard.press('Enter');
  await frame.locator('[title="Bulleted List"]').last().click({ force: true });
  await window.waitForTimeout(500);
  await window.keyboard.type('Answer briefly', { delay: 20 });
  await window.waitForTimeout(800);

  // Rich editor renders WYSIWYG: <strong> and <ul><li>
  const html = await ed.evaluate((el) => el.innerHTML);
  if (!html.includes('<strong>You are a helpful assistant</strong>') || !html.includes('<li>')) {
    throw new Error(`markdown formatting not applied: ${html.slice(0, 400)}`);
  }
  console.log('bold + bulleted list applied in rich editor');

  await frame.locator('[title="Minimize Editor"], [title="Minimize"]').last().click({ force: true });
  await window.waitForTimeout(1500);

  // Fill the required Query field and save
  const queryEd = panel.locator('.cm-content, [contenteditable="true"]').last();
  await queryEd.click({ force: true });
  await window.waitForTimeout(500);
  await window.keyboard.type('Summarize the user data', { delay: 20 });
  await window.waitForTimeout(1500);
  await window.keyboard.press('Escape');
  const save = panel.getByRole('button', { name: 'Save' }).last();
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await save.isEnabled().catch(() => false)) break;
    await window.waitForTimeout(500);
  }
  await save.click({ force: true });
  await window.waitForTimeout(4000);
  console.log('agent node saved');

  // The markdown must reach the generated agent definition
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  const dl2 = Date.now() + 30000;
  let agents = '';
  while (Date.now() < dl2) {
    try {
      agents = fs.readFileSync(path.join(state.integrationDir, 'agents.bal'), 'utf8');
    } catch { agents = ''; }
    if (agents.includes('**You are a helpful assistant**')) break;
    await window.waitForTimeout(1000);
  }
  if (!agents.includes('**You are a helpful assistant**') || !agents.includes('* Answer briefly')) {
    throw new Error(`agents.bal missing markdown instructions:\n${agents}`);
  }
  const source = fs.readFileSync(path.join(state.integrationDir, 'automation.bal'), 'utf8');
  if (!source.includes('.run("Summarize the user data")')) {
    throw new Error(`automation.bal missing agent run call:\n${source}`);
  }
  console.log('agents.bal has markdown instructions; automation.bal has agent.run');
}
