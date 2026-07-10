{
  // Drive Try It entirely from the Service Designer toolbar button — no palette
  // run command. On a service that is not running, the button flow is:
  //   Try It -> Hurl-vs-AI pick -> "Run Integration" (starts the service)
  //          -> post-run "Test with Try It Client?" -> Test (builds the notebook)
  // Notification actions must be reached via the Notification Center (info
  // toasts collapse), and clicked plainly (force clicks fail "outside viewport").
  await ensureWorkbench();

  globalThis.clickNotificationButton = async (name, timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    const btn = window.locator('.notifications-toasts').getByRole('button', { name, exact: true }).first();
    while (Date.now() < deadline) {
      if (await btn.isVisible({ timeout: 400 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        if (await btn.click({ timeout: 4000 }).then(() => true, () => false)) return;
      }
      await window.waitForTimeout(400);
    }
    throw new Error(`Notification action "${name}" not found within ${timeoutMs}ms`);
  };

  // Navigate to the Service Designer (the toolbar Try It button lives here).
  const tree = window.getByRole('treeitem', { name: /HTTP Service/ }).first();
  await tree.click({ force: true }).catch(() => {});
  await window.waitForTimeout(2500);

  const frame = await getBIWebview();
  await frame.getByText('Try It', { exact: true }).first().waitFor({ timeout: 30000 });
  await frame.getByRole('button', { name: /Try It/ }).first().click({ force: true });
  await window.waitForTimeout(1500);

  const hurlOption = window.getByRole('option', { name: /Try It.*Hurl Client/ }).first();
  if (await hurlOption.isVisible({ timeout: 8000 }).catch(() => false)) {
    await hurlOption.click({ force: true });
  }

  await clickNotificationButton('Run Integration', 30000);
  console.log('clicked Run Integration (Try It auto-start)');

  // The notebook is produced by one of two racing flows after the run starts:
  // the button's continuation, or a debug-session hook re-prompting "Test with
  // Try It Client?". Poll for the file while clicking Test (toast or center)
  // whenever it surfaces.
  const hurlPath = path.join(newProjectPath, 'target', 'TryIt.hurl');
  const deadline = Date.now() + 180000;
  let openedCenterAt = 0;
  while (Date.now() < deadline && !fs.existsSync(hurlPath)) {
    for (const container of ['.notifications-toasts', '.notifications-center']) {
      const testBtn = window.locator(container).getByRole('button', { name: 'Test', exact: true }).first();
      if (await testBtn.isVisible({ timeout: 300 }).catch(() => false)) {
        await testBtn.click({ timeout: 3000 }).catch(() => {});
        break;
      }
    }
    if (await hurlOption.isVisible({ timeout: 300 }).catch(() => false)) {
      await hurlOption.click({ force: true }).catch(() => {});
    }
    if (Date.now() - openedCenterAt > 8000) {
      await extendedPage.executePaletteCommand('Notifications: Show Notifications').catch(() => {});
      openedCenterAt = Date.now();
    }
    await window.waitForTimeout(1000);
  }
  if (!fs.existsSync(hurlPath)) throw new Error('target/TryIt.hurl was not generated');

  const hurl = fs.readFileSync(hurlPath, 'utf8');
  if (!hurl.includes('GET http://localhost:9090/greeting')) {
    throw new Error('TryIt.hurl missing GET /greeting cell:\n' + hurl);
  }

  const running = await waitForEndpoint('http://localhost:9090/greeting', 120000, { method: 'GET' });
  if (running.status !== 200 || !running.body.includes('Hello, Ballerina!')) {
    throw new Error('service did not auto-start correctly: ' + JSON.stringify(running));
  }
  const host = await hostSnapshot();
  if (!/tab "TryIt\.hurl/.test(host)) throw new Error('TryIt.hurl notebook tab did not open');

  console.log('Try It auto-started the service and built the notebook:\n' + hurl);
}
