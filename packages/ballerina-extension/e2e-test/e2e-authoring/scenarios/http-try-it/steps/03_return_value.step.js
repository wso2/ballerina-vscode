{
  // Give GET /greeting a deterministic body by adding a Return node.
  const frame = await getBIWebview();
  const addButton = frame.locator('[data-testid="empty-node-add-button-1"]').first();
  await addButton.hover({ force: true }).catch(() => {});
  await addButton.click({ force: true, timeout: 3000 }).catch(() => {});
  await waitForText('Return', 30000);
  await frame.getByText('Return', { exact: true }).click({ force: true });
  await waitForText('Return value.', 30000);

  // cmFill (view.dispatch) does not sync the form's React state, so Save stays a
  // no-op. Real keyboard input does sync it, but the first keystrokes are lost
  // unless focus has settled — hence the click + wait + delayed typing.
  const cm = frame.locator('[data-testid="ex-editor-expression"] .cm-content');
  await cm.click({ force: true });
  await window.waitForTimeout(1000);
  await window.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await window.keyboard.press('Backspace');
  await window.waitForTimeout(400);
  await window.keyboard.type('{message: "Hello, Ballerina!"}', { delay: 25 });
  await window.waitForTimeout(600);

  const cmText = await cm.first().textContent();
  if (cmText !== '{message: "Hello, Ballerina!"}') {
    throw new Error(`expression editor mangled input: ${JSON.stringify(cmText)}`);
  }

  // The helper panel can open on focus and cover Save; dismiss it if present.
  await frame.getByRole('button', { name: 'Close Helper Panel' }).click({ force: true }).catch(() => {});
  await frame.getByRole('button', { name: 'Save' }).click({ force: true });
  await window.waitForTimeout(4000);

  const src = fs.readFileSync(path.join(newProjectPath, 'main.bal'), 'utf8');
  if (!src.includes('return {message: "Hello, Ballerina!"};')) {
    throw new Error('return value not saved:\n' + src);
  }
  console.log('GET /greeting now returns fixed JSON');
}
