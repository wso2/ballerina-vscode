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

import {
  DiagnosticList,
  ExtendedDataMapperMetadata,
  ImportInfo,
  RepairCodeParams,
  SourceFile,
  TempDirectoryPath,
} from "@wso2/ballerina-core";
import * as fs from 'fs';
import { ExtendedLangClient } from "../../../../core";
import { addMissingRequiredFields, attemptRepairProject, checkProjectDiagnostics } from "../../../../rpc-managers/ai-panel/repair-utils";
import { CodeRepairResult } from "../types";
import { getCustomFunctionsContent } from "./temp-project";
import { repairCodeWithLLM } from "./code-generation";

/**
 * Code repair and diagnostics checking utilities
 */

export async function repairAndCheckDiagnostics(
  langClient: ExtendedLangClient,
  projectRoot: string,
  params: TempDirectoryPath
): Promise<DiagnosticList> {
  const targetDir = params.tempDir && params.tempDir.trim() !== "" ? params.tempDir : projectRoot;

  let diagnostics = await attemptRepairProject(langClient, targetDir);

  // Add missing required fields and recheck diagnostics
  let isDiagsChanged = await addMissingRequiredFields(diagnostics, langClient);
  if (isDiagsChanged) {
    diagnostics = await checkProjectDiagnostics(langClient, targetDir);
  }

  const filteredDiagnostics = diagnostics.filter(diag =>
    params.filePaths.some(filePath => diag.uri.includes(filePath))
  );

  return { diagnosticsList: filteredDiagnostics };
}

// Collect file paths for diagnostics checking
function collectDiagnosticFilePaths(
  tempFileMetadata: ExtendedDataMapperMetadata,
  customFunctionsFilePath?: string
): string[] {
  const filePaths = [tempFileMetadata.codeData.lineRange.fileName];
  if (customFunctionsFilePath) {
    filePaths.push(customFunctionsFilePath);
  }
  return filePaths;
}

// Prepare source files for LLM repair
function prepareSourceFilesForRepair(
  mainFilePath: string,
  mainContent: string,
  customFunctionsFilePath: string | undefined,
  customFunctionsContent: string
): SourceFile[] {
  const sourceFiles: SourceFile[] = [
    {
      filePath: mainFilePath,
      content: mainContent,
    }
  ];

  if (customFunctionsFilePath) {
    sourceFiles.push({
      filePath: customFunctionsFilePath,
      content: customFunctionsContent,
    });
  }

  return sourceFiles;
}

// Repair code and get updated content
export async function repairCodeAndGetUpdatedContent(
  params: RepairCodeParams,
  langClient: ExtendedLangClient,
  projectRoot: string
): Promise<CodeRepairResult> {

  // Read main file content
  let finalContent = fs.readFileSync(params.tempFileMetadata.codeData.lineRange.fileName, 'utf8');

  // Read custom functions content (only if path is provided)
  let customFunctionsContent = params.customFunctionsFilePath
    ? await getCustomFunctionsContent(params.customFunctionsFilePath)
    : '';

  // Check and repair diagnostics
  const diagnostics = await checkAndRepairDiagnostics(
    params,
    langClient,
    projectRoot
  );

  // Repair with LLM if needed
  if (diagnostics.diagnosticsList && diagnostics.diagnosticsList.length > 0) {
    const result = await repairWithLLM(
      params.tempFileMetadata,
      finalContent,
      params.customFunctionsFilePath,
      customFunctionsContent,
      diagnostics,
      params.imports
    );
    finalContent = result.finalContent;
    customFunctionsContent = result.customFunctionsContent;
  }

  return { finalContent, customFunctionsContent };
}

// Check diagnostics and attempt repair
async function checkAndRepairDiagnostics(
  params: RepairCodeParams,
  langClient: ExtendedLangClient,
  projectRoot: string
): Promise<DiagnosticList> {
  const diagnosticsParams: TempDirectoryPath = {
    filePaths: collectDiagnosticFilePaths(params.tempFileMetadata, params.customFunctionsFilePath)
  };

  if (params.tempDir) {
    diagnosticsParams.tempDir = params.tempDir;
  }

  return await repairAndCheckDiagnostics(langClient, projectRoot, diagnosticsParams);
}

// Repair code using LLM
async function repairWithLLM(
  tempFileMetadata: ExtendedDataMapperMetadata,
  mainContent: string,
  customFunctionsFilePath: string | undefined,
  customFunctionsContent: string,
  diagnostics: DiagnosticList,
  imports: ImportInfo[]
): Promise<{ finalContent: string; customFunctionsContent: string }> {
  const sourceFiles = prepareSourceFilesForRepair(
    tempFileMetadata.codeData.lineRange.fileName,
    mainContent,
    customFunctionsFilePath,
    customFunctionsContent
  );

  await repairCodeWithLLM({sourceFiles, diagnostics, imports});

  // Get updated content after repair
  const finalContent = fs.readFileSync(tempFileMetadata.codeData.lineRange.fileName, 'utf8');
  const updatedCustomFunctionsContent = await getCustomFunctionsContent(customFunctionsFilePath);

  return {
    finalContent,
    customFunctionsContent: updatedCustomFunctionsContent
  };
}
