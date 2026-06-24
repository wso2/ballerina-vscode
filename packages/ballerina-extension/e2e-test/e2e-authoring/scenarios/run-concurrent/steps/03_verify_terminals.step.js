{
  // Both integrations keep dedicated task terminals with intact output.
  const alphaTab = window.locator('.terminal-tabs-entry', { hasText: 'alpha_runner' }).first();
  const betaTab = window.locator('.terminal-tabs-entry', { hasText: 'beta_runner' }).first();
  await alphaTab.waitFor({ timeout: 15000 });
  await betaTab.waitFor({ timeout: 15000 });

  await alphaTab.click();
  await window.locator('.xterm-screen', { hasText: 'alpha_runner started' }).first().waitFor({ timeout: 10000 });
  console.log('both integrations alive in dedicated terminals');
}
