{
  const frame = await getBIWebview();

  // Open the three-dots menu on the parent node (Order) and choose Delete
  const menuBtn = frame.locator('[data-testid="type-node-Order-menu"]');
  await menuBtn.waitFor({ state: 'visible', timeout: 15000 });
  await menuBtn.click();
  const deleteItem = frame.getByText('Delete', { exact: true });
  await deleteItem.waitFor({ state: 'visible', timeout: 10000 });
  await deleteItem.click({ force: true });
  console.log('clicked Delete in node menu');

  // Confirmation dialog: "Are you sure you want to delete Order?"
  const confirmBtn = frame.getByRole('button', { name: 'Delete', exact: true });
  await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
  await confirmBtn.click({ force: true });
  console.log('confirmed deletion');

  await frame.locator('[data-testid="type-node-Order"]').waitFor({ state: 'detached', timeout: 30000 });
  console.log('Order node removed from diagram');

  // Verify source no longer contains the deleted type
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  const typesBal = path.join(state.integrationDir, 'types.bal');
  const deadline = Date.now() + 30000;
  let source = fs.readFileSync(typesBal, 'utf8');
  while (Date.now() < deadline) {
    source = fs.readFileSync(typesBal, 'utf8');
    if (!source.includes('Order')) break;
    await window.waitForTimeout(1000);
  }
  if (source.includes('Order')) throw new Error('types.bal still contains Order after delete:\n' + source);
  if (!source.includes('type Customer record')) throw new Error('types.bal missing Customer record after delete:\n' + source);
  if (!source.includes('type Location record')) throw new Error('types.bal missing Location record after delete:\n' + source);
  console.log('types.bal verified: Order deleted, Customer and Location remain');
}
