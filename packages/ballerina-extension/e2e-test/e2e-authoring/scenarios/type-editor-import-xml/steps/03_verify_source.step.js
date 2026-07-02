{
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));

  // Step 16: Derive the actual type name from the diagram node
  const frame = await getBIWebview();
  const typeNode = frame.locator('[data-testid^="type-node-"]').first();
  await typeNode.waitFor({ timeout: 15000 });
  const testId = await typeNode.getAttribute('data-testid');
  const typeName = testId.replace('type-node-', '');
  console.log(`inferred type name: ${typeName}`);

  // Verify types.bal contains the inferred type name
  const candidates = [
    path.join(state.integrationDir, 'types.bal'),
    path.join(state.projectDir, 'types.bal'),
  ];
  let source = '';
  for (const p of candidates) {
    if (fs.existsSync(p)) { source = fs.readFileSync(p, 'utf8'); break; }
  }
  if (!source) throw new Error('types.bal not found');
  if (!source.includes(typeName)) {
    throw new Error(`types.bal does not contain "${typeName}".\n---\n${source}`);
  }
  // Verify child elements name and age were captured
  if (!source.includes('name') || !source.includes('age')) {
    throw new Error(`types.bal is missing expected fields from XML.\n---\n${source}`);
  }
  console.log(`source verified: ${typeName} record with name/age fields present`);

  // Step 17: Confirm diagram node still visible
  await typeNode.waitFor({ timeout: 10000 });
  console.log(`diagram verified: ${testId} present`);
}
