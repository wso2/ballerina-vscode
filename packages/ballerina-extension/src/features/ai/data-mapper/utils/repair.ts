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
  TempDirectoryPath,
} from "@wso2/ballerina-core";
import { ExtendedLangClient } from "../../../../core";
import { addMissingRequiredFields, attemptRepairProject, checkProjectDiagnostics } from "../../../../rpc-managers/ai-panel/repair-utils";

/**
 * Code repair and diagnostics checking utilities
 */

export async function repairAndCheckDiagnostics(
  langClient: ExtendedLangClient,
  projectRoot: string,
  params: TempDirectoryPath
): Promise<DiagnosticList> {
  let diagnostics = await attemptRepairProject(langClient, projectRoot);

  // Add missing required fields and recheck diagnostics
  let isDiagsChanged = await addMissingRequiredFields(diagnostics, langClient);
  if (isDiagsChanged) {
    diagnostics = await checkProjectDiagnostics(langClient, projectRoot);
  }

  const filteredDiagnostics = diagnostics.filter(diag =>
    params.filePaths.some(filePath => diag.uri.includes(filePath))
  );

  return { diagnosticsList: filteredDiagnostics };
}

// NOTE: Old file-based repair functions have been removed.
// The new DM Model-based repair workflow is implemented in orchestrator.ts
// using getDMModel(), repairMappingsWithLLM(), repairCheckErrors(), etc.
