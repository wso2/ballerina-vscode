{
  const frame = await getBIWebview();

  // Wait for the flow diagram canvas before clicking edit
  const canvas = frame.locator('[data-testid="bi-diagram-canvas"], #bi-diagram-canvas');
  await canvas.waitFor({ timeout: 20000 });
  await frame.waitForTimeout(1500);

  // Open function configuration form
  const editBtn = frame.locator('#bi-edit');
  await editBtn.waitFor({ timeout: 10000 });
  await editBtn.click({ force: true });
  await frame.waitForTimeout(2000);

  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.switchToFormView(false, frame);
  await frame.waitForTimeout(1000);

  // Helper: add one parameter and wait for it to appear in the list
  const addOneParam = async (type, name) => {
    const addParamBtn = frame.locator('[data-testid="bi-add-parameter"]');
    await addParamBtn.waitFor({ timeout: 10000 });
    await addParamBtn.click({ force: true });
    await frame.waitForTimeout(1000);

    const paramEditor = frame.locator('[data-testid="bi-param-editor"]');
    await paramEditor.waitFor({ timeout: 10000 });

    const typeInput = paramEditor.locator('vscode-text-area').first().locator('textarea');
    await typeInput.waitFor({ timeout: 5000 });
    await typeInput.click();
    await frame.waitForTimeout(500);
    await typeInput.pressSequentially(type);
    await frame.waitForTimeout(800);

    const typeHelperItem = frame.locator(`[data-testid="type-helper-item-${type}"]`);
    const helperVisible = await typeHelperItem.isVisible({ timeout: 3000 }).catch(() => false);
    if (helperVisible) {
      await typeHelperItem.click({ force: true });
    } else {
      await typeInput.press('Escape');
    }
    await frame.waitForTimeout(500);

    const nameInput = paramEditor.locator('#variable').getByRole('textbox');
    await nameInput.waitFor({ timeout: 5000 });
    await nameInput.click();
    await frame.waitForTimeout(300);
    await nameInput.selectText();
    await nameInput.pressSequentially(name);
    await frame.waitForTimeout(800);

    const addBtn = paramEditor.getByRole('button', { name: /^Add$/ }).first();
    await addBtn.waitFor({ timeout: 5000 });
    await addBtn.click({ force: true });

    await frame.locator(`[data-testid="${name}-item"]`).waitFor({ timeout: 15000 });
    await frame.waitForTimeout(500);
    console.log(`added parameter: ${name} (${type})`);
  };

  await addOneParam('string', 'firstName');
  await addOneParam('string', 'lastName');

  // Set return type to string (same as 1st parameter type)
  await form.fill({
    values: {
      'Return Type': { type: 'textarea', value: 'string', additionalProps: { clickLabel: true } }
    }
  });
  await frame.waitForTimeout(800);
  const returnTypeHelper = frame.locator('[data-testid="type-helper-item-string"]');
  const returnHelperVisible = await returnTypeHelper.isVisible({ timeout: 3000 }).catch(() => false);
  if (returnHelperVisible) {
    await returnTypeHelper.click({ force: true });
  } else {
    await frame.locator('vscode-text-area').nth(1).locator('textarea').press('Escape').catch(() => {});
  }
  await frame.waitForTimeout(500);
  console.log('set return type: string');

  // Save the main function form
  await form.submit('Save');
  await canvas.waitFor({ timeout: 15000 });
  console.log('saved function: firstName (string), lastName (string), return type string');
}
