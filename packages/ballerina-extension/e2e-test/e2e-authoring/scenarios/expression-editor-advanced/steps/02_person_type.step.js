{
  await ensureWorkbench();

  // Navigate to the type diagram via the project explorer "Types" inline action
  // (the tree row itself has no click command — proven in type-editor scenarios).
  const sidebar = window.locator('#workbench\\.parts\\.sidebar');
  const typesItem = sidebar.locator(
    'div[role="treeitem"][aria-label="Types"], div[role="treeitem"][aria-label^="Types, "]'
  ).first();
  await typesItem.waitFor({ state: 'visible', timeout: 30000 });
  await typesItem.hover();
  const viewDiagram = typesItem.locator('a.action-label[aria-label*="View Type Diagram"]').first();
  await viewDiagram.waitFor({ state: 'visible', timeout: 10000 });
  await viewDiagram.click();
  console.log('clicked "View Type Diagram"');

  await window.waitForTimeout(3000);
  const frame = await getBIWebview();
  const addTypeBtn = frame.getByRole('button', { name: 'Add Type' });
  await addTypeBtn.waitFor({ state: 'visible', timeout: 30000 });
  await addTypeBtn.click({ force: true });
  console.log('clicked Add Type');
  await window.waitForTimeout(2000);

  const nameInput = frame.getByRole('textbox', { name: 'Name' }).first();
  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  await nameInput.fill('Person');
  console.log('filled type name: Person');

  // Field 1: "name" with the default type (string)
  const addFieldBtn = frame.locator('[data-testid="add-field-button"]');
  await addFieldBtn.waitFor({ state: 'visible', timeout: 15000 });
  await addFieldBtn.click();
  let idField = frame.locator('[data-testid="identifier-field"]').last();
  await idField.dblclick();
  await idField.type('name');
  console.log('added field: name (default type)');

  // Field 2: "age" — discover the type cell so we can set it to int
  await addFieldBtn.click();
  idField = frame.locator('[data-testid="identifier-field"]').last();
  await idField.dblclick();
  await idField.type('age');
  console.log('added field: age');
  console.log('testids now:', JSON.stringify(await listTestIds().catch(() => [])));

  // Try to edit the age field's type to int via the type cell + helper panel
  const typeCell = frame.locator('[data-testid="type-field"]').last();
  if (await typeCell.isVisible({ timeout: 3000 }).catch(() => false)) {
    await typeCell.dblclick();
    await window.waitForTimeout(1000);
    console.log('after type-cell dblclick snapshot:\n' + (await snapshot('int|string|Primitive').catch(() => '')));
    const intOption = frame.locator('.unq-modal-overlay').getByText('int', { exact: true }).last();
    if (await intOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await intOption.click({ force: true });
      console.log('selected int for age');
    } else {
      await typeCell.type('int');
      console.log('typed int into type cell (helper option not found)');
    }
  } else {
    console.log('no [data-testid="type-field"] cell found — age keeps default type');
  }

  const saveBtn = frame.getByRole('button', { name: 'Save' }).first();
  await saveBtn.waitFor({ state: 'visible', timeout: 15000 });
  await saveBtn.click({ force: true });
  console.log('clicked Save');

  const typeNode = frame.locator('[data-testid="type-node-Person"]');
  await typeNode.waitFor({ timeout: 30000 });
  console.log('type-node-Person visible in diagram');

  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  const typesBal = path.join(state.integrationDir, 'types.bal');
  console.log('types.bal:\n' + fs.readFileSync(typesBal, 'utf8'));
}
