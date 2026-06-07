{
  await configureUploadResourceIO();
  await addReturnNodeFromDiagram();
  const result = await runIntegrationAndWaitForUpload();
  if (![200, 201].includes(result.status) || !result.body.includes('uploads/probe.txt') || !result.body.includes('"size":5')) {
    throw new Error(`unexpected upload response: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result));
}
