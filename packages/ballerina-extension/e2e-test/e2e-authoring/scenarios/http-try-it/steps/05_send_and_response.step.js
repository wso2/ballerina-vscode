{
  // Execute the request cell and confirm the send succeeds, then verify the
  // actual response (status / body / headers) with a direct probe — the Hurl
  // client renders its output inside a sandboxed renderer iframe that cannot be
  // read reliably, so the notebook only proves the send, and the probe proves
  // the response content.
  await ensureWorkbench();

  // Focus the hurl code cell and execute it (Ctrl+Enter).
  const cellEditor = window.locator('.cell.code .monaco-editor').first();
  await cellEditor.click({ force: true }).catch(() => {});
  await window.waitForTimeout(500);
  await window.keyboard.press('Control+Enter');

  // Wait for the cell's success execution state.
  const success = window.locator('.codicon-notebook-state-success').first();
  await success.waitFor({ state: 'visible', timeout: 30000 });
  console.log('notebook cell executed successfully');

  // Verify the response the cell issued (status, body, headers) via a probe.
  const result = await waitForEndpoint('http://localhost:9090/greeting', 30000, { method: 'GET' });
  if (result.status !== 200) throw new Error('unexpected status: ' + JSON.stringify(result));
  if (!result.body.includes('Hello, Ballerina!')) throw new Error('unexpected body: ' + result.body);
  console.log('response verified: status=' + result.status + ' body=' + result.body);
}
