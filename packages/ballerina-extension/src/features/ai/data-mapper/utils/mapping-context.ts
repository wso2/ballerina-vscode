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
  ComponentInfo,
  DataMappingRecord,
  ExistingFunctionMatchResult,
  ImportInfo,
  MappingParameters,
  ProjectComponentsResponse,
  SourceFile,
} from "@wso2/ballerina-core";
import path from "path";
import * as fs from 'fs';
import { ExtendedLangClient } from "../../../../core";
import { URI } from "vscode-uri";
import { PackageInfo } from "../types";
import { findBalFilesInDirectory } from "./temp-project";
import { extractMappingDetails } from "./extraction";

/**
 * Mapping context preparation and utilities
 */

// Build record map from project components
export function buildRecordMap(
  projectComponents: ProjectComponentsResponse,
  moduleDirs: Map<string, string>
): Map<string, DataMappingRecord> {
  const recordMap = new Map<string, DataMappingRecord>();

  for (const pkg of projectComponents.components.packages || []) {
    for (const mod of pkg.modules || []) {
      let filepath = URI.parse(pkg.filePath).fsPath;
      if (mod.name !== undefined && moduleDirs.has(mod.name)) {
        const modDir = moduleDirs.get(mod.name);
        filepath += `${modDir}/${mod.name}/`;
      }

      mod.records.forEach((rec: ComponentInfo) => {
        const recFilePath = filepath + rec.filePath;
        recordMap.set(rec.name, { type: rec.name, isArray: false, filePath: recFilePath });
      });
    }
  }

  return recordMap;
}

// Collect existing functions from project components
export function collectExistingFunctions(
  projectComponents: ProjectComponentsResponse,
  moduleDirs: Map<string, string>
): ComponentInfo[] {
  const existingFunctions: ComponentInfo[] = [];

  for (const pkg of projectComponents.components.packages || []) {
    for (const mod of pkg.modules || []) {
      let filepath = URI.parse(pkg.filePath).fsPath;
      if (mod.name !== undefined && moduleDirs.has(mod.name)) {
        const modDir = moduleDirs.get(mod.name);
        filepath += `${modDir}/${mod.name}/`;
      }

      mod.functions?.forEach((func: ComponentInfo) => {
        existingFunctions.push({
          name: func.name,
          filePath: filepath + func.filePath,
          startLine: func.startLine,
          startColumn: func.startColumn,
          endLine: func.endLine,
          endColumn: func.endColumn
        });
      });
    }
  }

  return existingFunctions;
}

// Get unique file paths from existing functions
export function getUniqueFunctionFilePaths(existingFunctions: ComponentInfo[]): string[] {
  return [...new Set(existingFunctions.map(func => func.filePath))];
}

// Collect module information that needs directory resolution
export function collectModuleInfo(projectComponents: ProjectComponentsResponse): PackageInfo[] {
  const moduleInfo: Array<{ moduleName: string; packageFilePath: string }> = [];

  for (const pkg of projectComponents.components.packages || []) {
    for (const mod of pkg.modules || []) {
      if (mod.name !== undefined) {
        moduleInfo.push({
          moduleName: mod.name,
          packageFilePath: pkg.filePath
        });
      }
    }
  }

  return moduleInfo;
}

// Determine file path for mapping function
export function determineMappingFilePath(
  existingFunctionMatch: ExistingFunctionMatchResult,
  activeFile: string,
  projectRoot?: string
): string {
  if (existingFunctionMatch.match) {
    return existingFunctionMatch.matchingFunctionFile;
  } else if (activeFile && activeFile.endsWith(".bal")) {
    return activeFile;
  } else {
    if (projectRoot) {
      const allBalFiles = findBalFilesInDirectory(projectRoot);
      if (allBalFiles.length > 0) {
        return path.basename(allBalFiles[allBalFiles.length - 1]);
      }
    }

    return null;
  }
}

// Determine the file path for custom functions
export function determineCustomFunctionsPath(
  projectRoot: string,
  activeFilePath?: string
): string | null {
  const functionsBalPath = path.join(projectRoot, "functions.bal");

  if (fs.existsSync(functionsBalPath)) {
    return functionsBalPath;
  }

  const allBalFiles = findBalFilesInDirectory(projectRoot);

  if (activeFilePath) {
    const normalizedActiveFilePath = path.join(projectRoot, activeFilePath);
    const otherBalFiles = allBalFiles.filter(file => file !== normalizedActiveFilePath);

    if (otherBalFiles.length > 0) {
      return otherBalFiles[0];
    }
    if (otherBalFiles.length === 0) {
      return allBalFiles[0];
    }
  } else {
    if (allBalFiles.length > 0) {
      return allBalFiles[0];
    }
  }

  return null;
}

// Build file array for mapping results
export function buildMappingFileArray(
  filePath: string,
  finalContent: string,
  customFunctionsTargetPath?: string,
  customFunctionsContent?: string
): SourceFile[] {
  const fileArray: SourceFile[] = [
    {
      filePath: filePath,
      content: finalContent
    }
  ];

  if (customFunctionsContent) {
    fileArray.push({
      filePath: customFunctionsTargetPath,
      content: customFunctionsContent
    });
  }

  return fileArray;
}

// Prepare mapping context with record map, functions, and mapping details for code generation
export async function prepareMappingContext(
  mappingParameters: MappingParameters,
  availableRecordTypes: Map<string, DataMappingRecord>,
  existingProjectFunctions: ComponentInfo[],
  projectImports: ImportInfo[],
  functionSourceContents: Map<string, string>,
  currentActiveFileName: string,
  langClient: ExtendedLangClient,
  projectRoot?: string
): Promise<{
  recordMap: Map<string, DataMappingRecord>;
  existingFunctions: ComponentInfo[];
  mappingDetails: any;
  filePath: string;
}> {
  const extractedMappingDetails = await extractMappingDetails({
    parameters: mappingParameters,
    recordMap: Object.fromEntries(availableRecordTypes),
    allImports: projectImports,
    existingFunctions: existingProjectFunctions,
    functionContents: Object.fromEntries(functionSourceContents)
  }, langClient);

  const targetFilePath = determineMappingFilePath(extractedMappingDetails.existingFunctionMatch, currentActiveFileName, projectRoot);

  return {
    recordMap: availableRecordTypes,
    existingFunctions: existingProjectFunctions,
    mappingDetails: extractedMappingDetails,
    filePath: targetFilePath
  };
}
