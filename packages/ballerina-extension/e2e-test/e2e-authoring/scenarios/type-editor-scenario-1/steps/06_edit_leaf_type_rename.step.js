{
  const frame = await getBIWebview();

  // Open the three-dots menu on the leaf node (Address) and choose Edit
  const menuBtn = frame.locator('[data-testid="type-node-Address-menu"]');
  await menuBtn.waitFor({ state: 'visible', timeout: 15000 });
  await menuBtn.click();
  const editItem = frame.getByText('Edit', { exact: true });
  await editItem.waitFor({ state: 'visible', timeout: 10000 });
  await editItem.click({ force: true });
  await frame.locator('[data-testid="type-editor-container"]').waitFor({ state: 'visible', timeout: 30000 });
  console.log('Edit Type panel open for Address');

  // The type name field is readonly — click the Rename pencil to enter
  // rename mode (shows editable field + its own Cancel/Save pair)
  await frame.locator('vscode-button[title="Rename"]').first().click();
  const editableInput = frame.locator('input[aria-label*="Type name"]:not([readonly])').first();
  await editableInput.waitFor({ state: 'visible', timeout: 10000 });
  await editableInput.fill('Location');
  // The rename Save comes first in the DOM; the panel's bottom Save is
  // disabled while renaming
  await frame.getByRole('button', { name: 'Save' }).first().click({ force: true });
  console.log('renamed Address -> Location');

  await frame.locator('[data-testid="type-node-Location"]').waitFor({ timeout: 30000 });
  const oldCount = await frame.locator('[data-testid="type-node-Address"]').count();
  if (oldCount) throw new Error('type-node-Address still present after rename');
  console.log('diagram updated: Location node present, Address node gone');

  // Close the edit panel so the diagram is fully visible for the next step
  await frame.locator('[data-testid="close-panel-btn"]').first().click({ force: true }).catch(() => {});

  // Verify source: renaming updates all references across the project
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  const typesBal = path.join(state.integrationDir, 'types.bal');
  const deadline = Date.now() + 30000;
  let source = '';
  while (Date.now() < deadline) {
    source = fs.existsSync(typesBal) ? fs.readFileSync(typesBal, 'utf8') : '';
    if (source.includes('type Location record')) break;
    await window.waitForTimeout(1000);
  }
  if (!source.includes('type Location record')) throw new Error('types.bal missing Location record:\n' + source);
  if (source.includes('type Address record')) throw new Error('types.bal still contains Address record:\n' + source);
  if (!source.includes('Location customer')) throw new Error('types.bal Order.customer reference not renamed:\n' + source);
  console.log('types.bal verified: Location record present, reference in Order updated');
}
