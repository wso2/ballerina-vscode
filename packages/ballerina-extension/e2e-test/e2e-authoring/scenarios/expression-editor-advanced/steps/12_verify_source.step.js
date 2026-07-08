{
  // Final full-source verification across all generated files
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  const read = (f) => fs.readFileSync(path.join(state.integrationDir, f), 'utf8');

  const checks = [
    ['types.bal', ['type Person record {|', 'string name;', 'int age;']],
    ['automation.bal', [
      'int greeting = "Hello World".length()',
      'Person p = {name: personName, age: 30}',
      'mysqlClient->query(`SELECT * FROM users`)',
      '.run("Summarize the user data")'
    ]],
    ['config.bal', ['configurable string personName = "Anne"']],
    ['connections.bal', ['final mysql:Client mysqlClient = check new ()']],
    ['agents.bal', ['**You are a helpful assistant**', '* Answer briefly']],
  ];

  const failures = [];
  for (const [file, fragments] of checks) {
    let src = '';
    try { src = read(file); } catch { failures.push(`${file}: missing file`); continue; }
    for (const fragment of fragments) {
      if (!src.includes(fragment)) failures.push(`${file}: missing "${fragment}"`);
    }
  }
  if (failures.length) {
    throw new Error('source verification failed:\n' + failures.join('\n'));
  }
  console.log('all generated sources verified (types/automation/config/connections/agents)');
}
