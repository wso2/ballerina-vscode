{
  // createProjectAndIntegration's final wait is for the *project* name text,
  // which this (flat-layout) environment never renders — the overview shows the
  // integration name instead. The project is still created, so tolerate the
  // throw and resolve the real package dir by scanning dataFolder.
  try {
    await createProjectAndIntegration('HttpTryIt');
  } catch (error) {
    console.log('createProjectAndIntegration wait skipped: ' + error.message.split('\n')[0]);
  }
  await waitForText('Add Artifact', 90000);

  const pkgs = fs.readdirSync(dataFolder, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dataFolder, e.name, 'Ballerina.toml')))
    .map((e) => ({ name: e.name, dir: path.join(dataFolder, e.name), mtime: fs.statSync(path.join(dataFolder, e.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!pkgs.length) throw new Error('no Ballerina package created under dataFolder');

  globalThis.newProjectPath = pkgs[0].dir;
  fs.writeFileSync(path.join(sessionDir, 'state.json'), JSON.stringify({ name: pkgs[0].name, integrationDir: pkgs[0].dir }, null, 2));
  console.log('project ready: ' + newProjectPath);
}
