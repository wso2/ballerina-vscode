{
  await ensureWorkbench();
  await window.keyboard.press('Escape').catch(() => {});
  const gitPrompt = window.locator('.notification-toast-container', { hasText: 'git repository was found' });
  if (await gitPrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await gitPrompt.getByRole('button', { name: 'Never' }).click().catch(() => {});
  }
  await openIntegratorActivity();
  await window.waitForTimeout(2000);
  const sideBar = window.locator('#workbench\\.parts\\.sidebar');
  const tree = sideBar.getByRole('tree').first();
  await tree.waitFor({ timeout: 60000 });
  const snap = await sideBar.ariaSnapshot();
  fs.writeFileSync(path.join(sessionDir, 'tree-snapshot.txt'), snap);
  console.log(snap);
}
