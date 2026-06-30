{
  // Open alpha_runner's package overview (focuses the project) and run it.
  const tree = window.getByRole('tree').locator('div').first();
  const alpha = tree.locator(`div[role="treeitem"][aria-label='alpha_runner']`);
  await alpha.waitFor({ timeout: 30000 });
  await alpha.hover();
  const openOverview = window.getByRole('button', { name: 'Open Overview' }).first();
  await openOverview.waitFor({ timeout: 10000 });
  await openOverview.click();
  await window.waitForTimeout(2500);

  const runButton = window.locator('ul.actions-container[role="toolbar"] li.action-item a[role="button"][aria-label="Run Integration"]').first();
  await runButton.waitFor({ timeout: 10000 });
  await runButton.click();

  // Answer the integration picker if the run was treated as workspace-level.
  const picker = window.locator('.quick-input-widget').first();
  const pickerShown = await picker.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  if (pickerShown) {
    await window.keyboard.type('alpha_runner');
    await window.waitForTimeout(500);
    await window.keyboard.press('Enter');
  }

  await window.locator('.xterm-screen', { hasText: 'alpha_runner started' }).first().waitFor({ timeout: 60000 });
  console.log('alpha_runner is running');
}
