{
  // Open beta_runner's overview and run it WHILE alpha_runner is running.
  const tree = window.getByRole('tree').locator('div').first();
  const beta = tree.locator(`div[role="treeitem"][aria-label='beta_runner']`);
  await beta.waitFor({ timeout: 30000 });
  await beta.hover();
  const openOverview = window.getByRole('button', { name: 'Open Overview' }).first();
  await openOverview.waitFor({ timeout: 10000 });
  await openOverview.click();
  await window.waitForTimeout(2500);

  const runButton = window.locator('ul.actions-container[role="toolbar"] li.action-item a[role="button"][aria-label="Run Integration"]').first();
  await runButton.waitFor({ timeout: 10000 });
  await runButton.click();

  const picker = window.locator('.quick-input-widget').first();
  const pickerShown = await picker.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  if (pickerShown) {
    await window.keyboard.type('beta_runner');
    await window.waitForTimeout(500);
    await window.keyboard.press('Enter');
  }

  // Neither our restart prompt nor VS Code's task modal may appear.
  const restartPrompt = window.locator('.notification-toast-container', { hasText: 'This integration is already running' });
  if (await restartPrompt.isVisible({ timeout: 1000 }).catch(() => false)) {
    throw new Error('Restart prompt appeared for a DIFFERENT integration');
  }
  const taskModal = window.locator('.monaco-dialog-box', { hasText: /already active/i });
  if (await taskModal.isVisible({ timeout: 1000 }).catch(() => false)) {
    throw new Error('VS Code "task is already active" modal appeared');
  }

  await window.locator('.xterm-screen', { hasText: 'beta_runner started' }).first().waitFor({ timeout: 60000 });
  console.log('beta_runner is running concurrently with alpha_runner');
}
