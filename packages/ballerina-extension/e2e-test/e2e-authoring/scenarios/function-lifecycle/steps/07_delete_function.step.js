{
  // Delete the function artifact from the WSO2 Integrator activity panel
  const functionName = 'calculateSum';
  await window.waitForTimeout(500);

  // Ensure WSO2 Integrator activity tab is active
  const activityTab = window.locator('[role="tab"][aria-label="WSO2 Integrator"]').first();
  const isChecked = await activityTab.evaluate((el) => el.classList.contains('checked')).catch(() => false);
  if (!isChecked) {
    await activityTab.click();
    await window.waitForTimeout(500);
  }

  // Navigate to function tree item and right-click → Delete
  const explorer = window.getByRole('tree').locator('div').first();
  const functionTreeItem = explorer.locator(`div[role="treeitem"][aria-label='${functionName}']`);
  await functionTreeItem.waitFor({ timeout: 10000 });
  await functionTreeItem.click({ button: 'right' });
  await window.waitForTimeout(300);

  const deleteBtn = window.getByRole('button', { name: 'Delete' }).first();
  await deleteBtn.waitFor({ timeout: 5000 });
  await deleteBtn.click();
  await window.waitForTimeout(500);

  // Confirm deletion dialog if present
  const confirmBtn = window.getByRole('button', { name: /^Delete$/ }).first();
  const isConfirmVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
  if (isConfirmVisible) {
    await confirmBtn.click({ force: true });
    await window.waitForTimeout(500);
  }

  console.log(`deleted Function artifact: ${functionName}`);
}
