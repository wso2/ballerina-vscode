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
  ExtractMappingDetailsRequest,
  ExtractMappingDetailsResponse,
  ImportInfo,
} from "@wso2/ballerina-core";
import { ExtendedLangClient } from "../../../../core";
import { DefaultableParam, IncludedRecordParam, RequiredParam, RestParam } from "@wso2/syntax-tree";
import { INVALID_RECORD_REFERENCE } from "../../../../views/ai-panel/errorCodes";
import { isAnyPrimitiveType, isPrimitiveArrayType } from "./type-utils";
import { getFunctionDefinitionFromSyntaxTree } from "./temp-project";

/**
 * Functions for extracting and validating mapping parameters
 */

export async function extractMappingDetails(
  params: ExtractMappingDetailsRequest,
  langClient: ExtendedLangClient
): Promise<ExtractMappingDetailsResponse> {
  const { parameters, recordMap, allImports, existingFunctions } = params;
  const importsMap: Record<string, ImportInfo> = {};
  let inputParams: string[];
  let outputParam: string;
  let inputNames: string[] = [];

  const existingFunctionMatch = await processExistingFunctions(
    existingFunctions,
    parameters.functionName,
    langClient
  );

  const hasProvidedRecords = parameters.inputRecord.length > 0 || parameters.outputRecord !== "";

  if (hasProvidedRecords) {
    if (existingFunctionMatch.match) {
      throw new Error(
        `"${parameters.functionName}" function already exists. Please provide a valid function name.`
      );
    }
    inputParams = parameters.inputRecord;
    outputParam = parameters.outputRecord;
  } else {
    if (!existingFunctionMatch.match || !existingFunctionMatch.functionDefNode) {
      throw new Error(
        `"${parameters.functionName}" function was not found. Please provide a valid function name.`
      );
    }

    const funcNode = existingFunctionMatch.functionDefNode;
    const params = funcNode.functionSignature.parameters?.filter(
      (param): param is RequiredParam | DefaultableParam | RestParam | IncludedRecordParam =>
        param.kind !== 'CommaToken'
    ) ?? [];

    inputParams = params.map(param => (param.typeName.source || "").trim());
    inputNames = params.map(param => (param.paramName.value || "").trim());
    outputParam = (funcNode.functionSignature.returnTypeDesc.type.source || "").trim();
  }

  const inputs = processInputs(inputParams, recordMap, allImports, importsMap);
  const output = processOutput(outputParam, recordMap, allImports, importsMap);

  return {
    inputs,
    output,
    inputParams,
    outputParam,
    imports: Object.values(importsMap),
    inputNames,
    existingFunctionMatch,
  };
}

// Processes existing functions to find a matching function by name
export async function processExistingFunctions(
  existingFunctions: ComponentInfo[],
  functionName: string,
  langClient: ExtendedLangClient
): Promise<ExistingFunctionMatchResult> {
  for (const func of existingFunctions) {
    const filePath = func.filePath;
    const fileName = filePath.split("/").pop();

    const funcDefNode = await getFunctionDefinitionFromSyntaxTree(langClient, filePath, functionName);
    if (funcDefNode) {
      return {
        match: true,
        matchingFunctionFile: fileName,
        functionDefNode: funcDefNode,
      };
    } else {
      continue;
    }
  }

  return {
    match: false,
    matchingFunctionFile: null,
    functionDefNode: null,
  };
}

// Process input parameters
export function processInputs(
  inputParams: string[],
  recordMap: Record<string, DataMappingRecord>,
  allImports: ImportInfo[],
  importsMap: Record<string, ImportInfo>
) {
  let results = inputParams.map((param: string) =>
    processRecordReference(param, recordMap, allImports, importsMap)
  );
  return results.filter((result): result is DataMappingRecord => {
    if (result instanceof Error) {
      throw INVALID_RECORD_REFERENCE;
    }
    return true;
  });
}

// Process Output parameters
export function processOutput(
  outputParam: string,
  recordMap: Record<string, DataMappingRecord>,
  allImports: ImportInfo[],
  importsMap: Record<string, ImportInfo>
) {
  const outputResult = processRecordReference(outputParam, recordMap, allImports, importsMap);
  if (outputResult instanceof Error) {
    throw INVALID_RECORD_REFERENCE;
  }
  return outputResult;
}

// Validate and register an imported type in the imports map
function registerImportedType(
  typeName: string,
  allImports: ImportInfo[],
  importsMap: Record<string, ImportInfo>
): void {
  if (!typeName.includes("/")) {
    const [moduleName, recName] = typeName.split(":");
    const matchedImport = allImports.find((imp) => {
      if (imp.alias) {
        return typeName.startsWith(imp.alias);
      }
      const moduleNameParts = imp.moduleName.split(/[./]/);
      const inferredAlias = moduleNameParts[moduleNameParts.length - 1];
      return typeName.startsWith(inferredAlias);
    });

    if (!matchedImport) {
      throw new Error(`Import not found for: ${typeName}`);
    }
    importsMap[typeName] = {
      moduleName: matchedImport.moduleName,
      alias: matchedImport.alias,
      recordName: recName,
    };
  } else {
    const [moduleName, recName] = typeName.split(":");
    importsMap[typeName] = {
      moduleName: moduleName,
      recordName: recName,
    };
  }
}

// Validate that a type exists as either a primitive, local record, or imported type
function validateTypeExists(
  typeName: string,
  recordMap: Record<string, DataMappingRecord>,
  allImports: ImportInfo[],
  importsMap: Record<string, ImportInfo>
): void {
  if (isAnyPrimitiveType(typeName)) {
    return;
  }

  const cleanedType = typeName.replace(/\[\]$/, "");
  if (recordMap[cleanedType]) {
    return;
  }

  if (cleanedType.includes(":")) {
    registerImportedType(cleanedType, allImports, importsMap);
    return;
  }

  throw new Error(`${cleanedType} is not defined.`);
}

// Process and validate a union type, returning its data mapping record
function processUnionType(
  unionTypeString: string,
  recordMap: Record<string, DataMappingRecord>,
  allImports: ImportInfo[],
  importsMap: Record<string, ImportInfo>
): DataMappingRecord {
  const unionTypes = unionTypeString.split("|").map(t => t.trim());

  for (const unionType of unionTypes) {
    validateTypeExists(unionType, recordMap, allImports, importsMap);
  }

  return { type: unionTypeString, isArray: false, filePath: null };
}

// Process and validate a single type reference, returning its data mapping record
function processSingleType(
  typeName: string,
  recordMap: Record<string, DataMappingRecord>,
  allImports: ImportInfo[],
  importsMap: Record<string, ImportInfo>
): DataMappingRecord {
  if (isAnyPrimitiveType(typeName)) {
    return { type: typeName, isArray: false, filePath: null };
  }

  const isArray = typeName.endsWith("[]") && !isPrimitiveArrayType(typeName);
  const cleanedRecordName = isArray ? typeName.replace(/\[\]$/, "") : typeName;

  const rec = recordMap[cleanedRecordName];

  if (rec) {
    return { ...rec, isArray };
  }

  if (cleanedRecordName.includes(":")) {
    registerImportedType(cleanedRecordName, allImports, importsMap);
    return { type: typeName, isArray, filePath: null };
  }

  throw new Error(`${cleanedRecordName} is not defined.`);
}

// Process a record type reference and validate it exists, handling both union and single types
export function processRecordReference(
  recordName: string,
  recordMap: Record<string, DataMappingRecord>,
  allImports: ImportInfo[],
  importsMap: Record<string, ImportInfo>
): DataMappingRecord {
  const trimmedRecordName = recordName.trim();

  if (trimmedRecordName.includes("|")) {
    return processUnionType(trimmedRecordName, recordMap, allImports, importsMap);
  }

  return processSingleType(trimmedRecordName, recordMap, allImports, importsMap);
}
