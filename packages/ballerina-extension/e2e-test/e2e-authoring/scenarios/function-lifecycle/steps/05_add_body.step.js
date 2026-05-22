{
  // Edit function: change firstName type string → int, delete lastName
  // Leave return type as string → causes type mismatch on return node
  const frame = await getBIWebview();
  const canvasSelector = '[data-testid="bi-diagram-canvas"], #bi-diagram-canvas';
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);

  // Open edit form from diagram canvas
  const canvas = frame.locator(canvasSelector);
  await canvas.waitFor({ timeout: 15000 });
  await frame.waitForTimeout(1000);
  const editBtn = frame.locator('#bi-edit');
  await editBtn.waitFor({ timeout: 10000 });
  await editBtn.click({ force: true });
  await frame.waitForTimeout(1500);
  await form.switchToFormView(false, frame);
  await frame.waitForTimeout(1000);

  // Open firstName param editor
  const firstNameItem = frame.locator('[data-testid="firstName-item"]');
  await firstNameItem.waitFor({ timeout: 10000 });
  await firstNameItem.click({ force: true });
  await frame.waitForTimeout(1000);

  const paramEditor = frame.locator('[data-testid="bi-param-editor"]');
  await paramEditor.waitFor({ timeout: 10000 });

  // Change type from string to int (name unchanged, no pencil needed)
  const typeInput = paramEditor.locator('vscode-text-area').first().locator('textarea');
  await typeInput.waitFor({ timeout: 5000 });
  await typeInput.click();
  await typeInput.selectText();
  await frame.waitForTimeout(300);
  await typeInput.pressSequentially('int');
  await frame.waitForTimeout(800);

  const typeHelperInt = frame.locator('[data-testid="type-helper-item-int"]');
  const helperVisible = await typeHelperInt.isVisible({ timeout: 3000 }).catch(() => false);
  if (helperVisible) {
    await typeHelperInt.click({ force: true });
  } else {
    await typeInput.press('Escape');
  }
  await frame.waitForTimeout(500);

  // Save type change
  const mainSaveBtn = paramEditor.getByRole('button', { name: /^Save$/ }).last();
  await mainSaveBtn.waitFor({ timeout: 5000 });
  await mainSaveBtn.click({ force: true });
  await frame.locator('[data-testid="firstName-item"]').waitFor({ timeout: 10000 });
  console.log('changed firstName type: string → int');

  // Delete lastName parameter
  const lastNameItem = frame.locator('[data-testid="lastName-item"]');
  await lastNameItem.waitFor({ timeout: 10000 });
  await lastNameItem.hover();
  await frame.waitForTimeout(300);

  const trashBtn = lastNameItem.locator('.codicon-trash').first();
  await trashBtn.waitFor({ timeout: 5000 });
  await trashBtn.click({ force: true });
  await frame.waitForTimeout(500);

  const confirmBtn = frame.getByRole('button', { name: /^Delete$/ }).first();
  const isConfirmVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
  if (isConfirmVisible) {
    await confirmBtn.click({ force: true });
    await frame.waitForTimeout(500);
  }
  console.log('deleted parameter: lastName');

  // Save function WITHOUT changing return type → type mismatch: firstName is int, return type is string
  await form.submit('Save');
  await canvas.waitFor({ timeout: 15000 });
  console.log('saved: firstName is int, return type still string → type mismatch expected on return node');
}
