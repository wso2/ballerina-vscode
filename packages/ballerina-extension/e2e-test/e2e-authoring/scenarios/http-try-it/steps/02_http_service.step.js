{
  // Create an HTTP service (base path "/") with a GET /greeting resource.
  let frame = await getBIWebview();
  await frame.getByRole('button', { name: /Add Artifact/i }).click({ force: true });
  await frame.locator('[data-testid="function-card-HTTP Service"]').first().click({ force: true });

  frame = await getBIWebview();
  await frame.getByRole('textbox', { name: /Service Base Path/i }).fill('/');
  await frame.getByRole('button', { name: 'Create' }).click({ force: true });
  await waitForText('Add Resource', 60000);

  frame = await getBIWebview();
  await frame.getByRole('button', { name: /Add Resource/i }).first().click({ force: true });
  await clickVisibleText(frame, 'GET');
  await frame.getByRole('textbox', { name: /Resource Path/i }).first().fill('greeting');
  await window.waitForTimeout(500);
  await frame.getByRole('button', { name: 'Save' }).click({ force: true });
  await frame.locator('[data-testid="bi-diagram-canvas"]').waitFor({ timeout: 60000 });
  await window.waitForTimeout(2000);

  const src = fs.readFileSync(path.join(newProjectPath, 'main.bal'), 'utf8');
  if (!src.includes('resource function get greeting()')) {
    throw new Error('GET /greeting resource not created:\n' + src);
  }
  console.log('created HTTP service with GET /greeting');
}
