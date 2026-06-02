globalThis.openIntegratorActivity = async () => {
  await ensureWorkbench();
  const activity = window.locator(
    `#workbench\\.parts\\.activitybar a.action-label[aria-label="${BI_INTEGRATOR_LABEL}"]`
  ).first();
  await activity.waitFor({ state: 'visible', timeout: 120000 });
  await activity.click();
};

globalThis.createProjectAndIntegration = async (baseName = 'Authoring') => {
  const suffix = Date.now();
  const projectName = `${baseName}Project${suffix}`;
  const integrationName = `${baseName}Integration${suffix}`;
  await openIntegratorActivity();

  const sideBar = window.locator('#workbench\\.parts\\.sidebar');
  const getStarted = sideBar.getByRole('button', { name: 'Get Started' }).first();
  try {
    await getStarted.waitFor({ state: 'visible', timeout: 120000 });
    await getStarted.click();
  } catch (error) {
    const host = await hostSnapshot().catch(() => '');
    throw new Error(`Get Started button was not available in the WSO2 Integrator side panel: ${error.message}\n${host}`);
  }

  let frame = await waitForGuest('Welcome', 60000).catch(() => waitForGuest(BI_INTEGRATOR_LABEL, 60000));
  const createHeading = frame.getByRole('heading', { name: 'Create New Integration' });
  if (await createHeading.isVisible({ timeout: 10000 }).catch(() => false)) {
    await frame.getByRole('button', { name: 'Create' }).first().click();
  }

  frame = await waitForGuest('Welcome', 30000).catch(() => waitForGuest(BI_INTEGRATOR_LABEL, 30000));
  await frame.getByRole('textbox', { name: /Integration Name/i }).fill(integrationName);
  await frame.getByRole('textbox', { name: /Project Name/i }).fill(projectName);

  const projectPathInput = frame.getByRole('textbox', { name: /Select Path/i })
    .or(frame.locator('input#project-folder-selector-input'));
  if (await projectPathInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await projectPathInput.first().fill(dataFolder);
  }

  await frame.getByRole('button', { name: 'Create Integration' }).click({ force: true });
  frame = await waitForGuest(BI_INTEGRATOR_LABEL, 120000);
  await frame.getByText(projectName, { exact: true }).waitFor({ timeout: 120000 });
  await frame.getByText(integrationName, { exact: true }).click({ force: true });
  await waitForText('Add Artifact', 60000);
  const projectDir = path.join(dataFolder, projectName.toLowerCase());
  const integrationDir = path.join(projectDir, integrationName.toLowerCase());
  globalThis.newProjectPath = integrationDir;
  return { projectName, integrationName, projectDir, integrationDir };
};

globalThis.navigateToIntegrationOverview = async (integrationName) => {
  const frame = await getBIWebview();
  const existing = await snapshot().catch(() => '');
  if (existing.includes('Add Artifact') && existing.includes('Run')) return;
  await frame.getByText(integrationName, { exact: true }).first().click({ force: true }).catch(() => {});
  await waitForText('Add Artifact', 60000);
};
