{
  // Verify that the Return node shows an error after the type mismatch:
  //   firstName is now int, but function return type is string
  // The new React-Flow diagram shows errors via i.fw-error-outline-rounded icon
  const frame = await getBIWebview();

  const canvas = frame.locator('[data-testid="bi-diagram-canvas"], #bi-diagram-canvas');
  await canvas.waitFor({ timeout: 15000 });
  // Give the language server time to compute diagnostics
  await frame.waitForTimeout(5000);

  // Look for the error icon on the Return node
  const errorIcon = canvas.locator('i.fw-error-outline-rounded');
  const isErrorVisible = await errorIcon.isVisible({ timeout: 10000 }).catch(() => false);
  if (!isErrorVisible) {
    const snap = await snapshot();
    console.log('ARIA snapshot:\n', snap.substring(0, 1500));
    throw new Error('Expected error icon on Return node (fw-error-outline-rounded) but none found — type mismatch not reflected in diagram');
  }
  console.log('verified: return node shows error icon — return type string ≠ firstName int');
}
