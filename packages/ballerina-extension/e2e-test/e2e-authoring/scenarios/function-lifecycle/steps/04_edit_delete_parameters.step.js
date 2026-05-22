{
  // Add a Return node to the function body: return firstName
  const frame = await getBIWebview();

  const canvas = frame.locator('[data-testid="bi-diagram-canvas"], #bi-diagram-canvas');
  await canvas.waitFor({ timeout: 15000 });
  await frame.waitForTimeout(1000);

  // Add Return node returning firstName
  await addReturnNode('firstName');
  await frame.waitForTimeout(500);
  console.log('added return node: return firstName');
}
