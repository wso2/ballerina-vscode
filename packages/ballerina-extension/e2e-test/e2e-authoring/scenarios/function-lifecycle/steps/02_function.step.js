{
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  await addFunctionArtifact('calculateSum');
  console.log('created Function artifact: calculateSum');
}
