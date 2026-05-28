{
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  await navigateToIntegrationOverview(state.integrationName);
  await createHttpServiceWithResource('POST', 'upload');
  console.log('created HTTP POST /upload');
}
