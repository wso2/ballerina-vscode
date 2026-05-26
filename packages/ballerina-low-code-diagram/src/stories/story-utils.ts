import { BallerinaLanguageClient, WSConnection } from "@wso2/ballerina-core";
// tslint:disable-next-line: no-implicit-dependencies
import { Uri } from "monaco-editor";

import devproject from "./data/devproject.json";

export const MOCK_SERVER_URL = "http://localhost:3000"
export const LANG_SERVER_URL = "ws://localhost:9095"

export const langClientPromise = WSConnection.initialize(LANG_SERVER_URL).then((wsConnection: WSConnection) => {
  return new BallerinaLanguageClient(wsConnection);
});

export async function getFileContent(filePath: string): Promise<string> {
  return fetch(MOCK_SERVER_URL + "/file/" + encodeURIComponent(filePath))
    .then(response => {
      return response.text()
    })
}

export async function updateFileContent(filePath: string, text: string): Promise<boolean> {
  return fetch(MOCK_SERVER_URL + "/file/" + encodeURIComponent(filePath),
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify({ text })
    })
    .then(response => {
      return response.json()
    }).then(result => result.success);
}


export function getProjectRoot() {
  return devproject.projectRoot;
}

export function getSourceRoot() {
  return devproject.sourceRoot;
}

export function getComponentDataPath(componentName: string, fileName: string) {
  return devproject.sourceRoot + "Components/RenderingComponents/" + componentName + "/stories/data/" + fileName;
}

export async function fetchSyntaxTree(filePath: string) {
  const text = await getFileContent(filePath);
  const langClient = await langClientPromise;
  const uri =  Uri.file(filePath).toString();

  await langClient.didOpen({
    textDocument: {
      languageId: "ballerina",
      text,
      uri,
      version: 1
    }
  });

  const syntaxTreeResponse = await langClient.getSyntaxTree({
    documentIdentifier: {
      uri
    }
  });

  const syntaxTree = syntaxTreeResponse.syntaxTree;

  langClient.didClose({
    textDocument: {
      uri,
    }
  });

  return syntaxTree;
}
