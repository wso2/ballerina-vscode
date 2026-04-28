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
  DataMapperModelResponse,
  DataMappingRecord,
  DMModel,
  MatchedFunction,
  ExtractMappingDetailsRequest,
  ExtractMappingDetailsResponse,
  ImportInfo,
} from "@wso2/ballerina-core";
import { ExtendedLangClient } from "../../../../core";
import { STKindChecker } from "@wso2/syntax-tree";
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

  const matchedFunction = await processExistingFunctions(
    existingFunctions,
    parameters.functionName,
    langClient
  );

  const hasProvidedRecords = parameters.inputRecord.length > 0 || parameters.outputRecord !== "";

  if (hasProvidedRecords) {
    if (matchedFunction !== null) {
      throw new Error(
        `${parameters.functionName} function already exists. Please provide a valid function name.`
      );
    }
    inputParams = parameters.inputRecord;
    outputParam = parameters.outputRecord;
  } else {
    if (!matchedFunction) {
      throw new Error(
        `${parameters.functionName} function was not found. Please provide a valid function name.`
      );
    }

    const funcNode = matchedFunction.functionDefNode;
    const filePath = matchedFunction.matchingFunctionFilePath;

    let position = {
      line: funcNode.position.startLine,
      offset: funcNode.position.startColumn
    };
    if (STKindChecker.isExpressionFunctionBody(funcNode.functionBody)) {
      position = {
        line: funcNode.functionBody.expression.position.startLine,
        offset: funcNode.functionBody.expression.position.startColumn
      };
    }

    const codedata = {
      lineRange: {
        fileName: filePath,
        startLine: { line: funcNode.position.startLine, offset: funcNode.position.startColumn },
        endLine: { line: funcNode.position.endLine, offset: funcNode.position.endColumn }
      }
    };

    const dmModelResponse = await langClient.getDataMapperMappings({ filePath, codedata, position }) as DataMapperModelResponse;
    if (!dmModelResponse?.mappingsModel) {
      throw new Error(`Failed to retrieve data mapper model for function: ${parameters.functionName}`);
    }
    const dmModel = dmModelResponse.mappingsModel as DMModel;
    if (!dmModel.inputs || !dmModel.output) {
      throw new Error(`Data mapper model for function "${parameters.functionName}" has missing inputs or output`);
    }

    inputParams = dmModel.inputs.map(input => (input.convertedVariable?.typeName ?? input.typeName ?? "").trim());
    inputNames = dmModel.inputs.map(input => input.name);
    outputParam = (dmModel.output.convertedVariable?.typeName ?? dmModel.output.typeName ?? "").trim();
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
    matchedFunction,
  };
}

// Processes existing functions to find a matching function by name
export async function processExistingFunctions(
  existingFunctions: ComponentInfo[],
  functionName: string,
  langClient: ExtendedLangClient
): Promise<MatchedFunction | null> {
  for (const func of existingFunctions) {
    const funcDefNode = await getFunctionDefinitionFromSyntaxTree(langClient, func.filePath, functionName);
    if (funcDefNode) {
      return {
        matchingFunctionFilePath: func.filePath,
        functionDefNode: funcDefNode,
      };
    }
  }

  return null;
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
