/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CreateTempFileRequest, DataMappingRecord, ImportInfo, Mapping, SyntaxTree } from "@wso2/ballerina-core";
import path from "path";
import * as fs from 'fs';
import * as os from 'os';
import { Uri } from "vscode";
import { writeBallerinaFileDidOpenTemp } from "../../../../utils/modification";
import { ExtendedLangClient } from "../../../../core";
import { FunctionDefinition, ModulePart, STKindChecker } from "@wso2/syntax-tree";
import { StateMachine } from "../../../../stateMachine";
import { createDataMappingFunctionSource } from "./code-generation";

/**
 * Temporary file and directory management for data mapping
 */

export async function createTempDataMappingFile(params: CreateTempFileRequest): Promise<string> {
  let funcSource: string;

  if (!params.hasMatchingFunction) {
    if (params.inputs && params.output && params.functionName && params.inputNames) {
      funcSource = createDataMappingFunctionSource(
        params.inputs,
        params.output,
        params.functionName,
        params.inputNames
      );
    }
  }

  const tempFilePath = await createTempBallerinaFile(
    params.tempDir,
    params.filePath,
    funcSource,
    params.imports,
    params.hasMatchingFunction
  );

  return tempFilePath;
}

export async function createCustomFunctionsFile(
  tempDir: string,
  customFunctions: Mapping[]
): Promise<string> {
  let functionsSource = customFunctions
    .map(f => f.functionContent)
    .filter(Boolean)
    .join('\n\n');

  const customFunctionsFilePath = path.join(tempDir, "functions.bal");
  let existingContent = "";
  if (fs.existsSync(customFunctionsFilePath)) {
    existingContent = fs.readFileSync(customFunctionsFilePath, 'utf8');
  }

  functionsSource = existingContent + "\n\n" + functionsSource;

  writeBallerinaFileDidOpenTemp(customFunctionsFilePath, functionsSource);
  return customFunctionsFilePath;
}

// Helper function to recursively find all .bal files in a directory
export function findBalFilesInDirectory(dir: string): string[] {
  let balFiles: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, target, and hidden directories
      if (entry.isDirectory() && !entry.name.startsWith('.') &&
          entry.name !== 'node_modules' && entry.name !== 'target') {
        balFiles = balFiles.concat(findBalFilesInDirectory(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.bal')) {
        balFiles.push(fullPath);
      }
    }
  } catch (error) {
    // If directory cannot be read, return empty array
    console.error(`Error reading directory ${dir}:`, error);
  }

  return balFiles;
}

export async function getFunctionDefinitionFromSyntaxTree(
  langClient: ExtendedLangClient,
  filePath: string,
  functionName: string
): Promise<FunctionDefinition | null> {
  const st = (await langClient.getSyntaxTree({
    documentIdentifier: {
      uri: Uri.file(filePath).toString(),
    },
  })) as SyntaxTree;

  const modulePart = st.syntaxTree as ModulePart;

  for (const member of modulePart.members) {
    if (STKindChecker.isFunctionDefinition(member)) {
      const funcDef = member as FunctionDefinition;
      if (funcDef.functionName?.value === functionName) {
        return funcDef;
      }
    }
  }

  return null;
}

async function createTempBallerinaFile(
  tempDir: string,
  filePath: string,
  funcSource?: string,
  imports?: ImportInfo[],
  functionExists?: boolean
): Promise<string> {
  let fullSource = funcSource;

  if (imports && imports.length > 0) {
    const importsString = imports
      .map(({ moduleName, alias }) =>
        alias ? `import ${moduleName} as ${alias};` : `import ${moduleName};`
      )
      .join("\n");
    fullSource = `${importsString}\n\n${funcSource}`;
  }

  const tempTestFilePath = path.join(tempDir, filePath);

  let existingContent = "";
  if (fs.existsSync(tempTestFilePath)) {
    existingContent = fs.readFileSync(tempTestFilePath, 'utf8');
  }

  if (!functionExists) {
    if (!funcSource) {
      fullSource = existingContent;
    } else {
      fullSource = existingContent + "\n\n" + fullSource;
    }
  } else {
    fullSource = existingContent;
  }
  writeBallerinaFileDidOpenTemp(tempTestFilePath, fullSource);
  return tempTestFilePath;
}

/**
 * Creates a temporary Ballerina directory.
 *
 * @deprecated This function creates temp directories that are not managed by the state machine.
 * In datamapper flows, the state machine manages temp directories via setupTempProjectAction.
 * This function is kept only for backward compatibility with non-state-machine flows.
 *
 * WARNING: Using this function in state-machine-managed flows will cause memory leaks
 * as these temp directories are not tracked or cleaned up.
 */
export async function createTempBallerinaDir(): Promise<string> {
  console.warn('[DEPRECATED] createTempBallerinaDir: Use state machine temp directory instead');
  const projectRoot = StateMachine.context().projectPath;
  const randomNum = Math.floor(Math.random() * 90000) + 10000;
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `ballerina-data-mapping-${randomNum}-`)
  );
  fs.cpSync(projectRoot, tempDir, { recursive: true });
  return tempDir;
}

export function extractImports(content: string, filePath: string): { filePath: string; statements: ImportInfo[] } {
  const withoutSingleLineComments = content.replace(/\/\/.*$/gm, "");
  const withoutComments = withoutSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, "");

  const importRegex = /import\s+([\w\.\/]+)(?:\s+as\s+([\w]+))?;/g;
  const imports: ImportInfo[] = [];
  let match;

  while ((match = importRegex.exec(withoutComments)) !== null) {
    const importStatement: ImportInfo = { moduleName: match[1] };
    if (match[2]) {
      importStatement.alias = match[2];
    }
    imports.push(importStatement);
  }

  return { filePath, statements: imports };
}

export async function getCustomFunctionsContent(
  customFunctionsFilePath: string | undefined,
): Promise<string> {
  if (!customFunctionsFilePath) {
    return "";
  }
  return fs.readFileSync(customFunctionsFilePath, 'utf8');
}
