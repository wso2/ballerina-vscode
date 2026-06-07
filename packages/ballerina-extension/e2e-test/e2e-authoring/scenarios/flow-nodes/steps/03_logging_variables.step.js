{
  await addLogNode('Log Info', 'flow started');
  await addDeclareVariableNode('count', 'int', '1');
  await addDeclareVariableNode('msg', 'string', '"started"');
  await addLogNode('Log Debug', 'string `initial ${count} ${msg}`');
  await verifyFlowNodesBaseSource();
}
