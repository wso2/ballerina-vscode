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

import { createFunctionSignature, DataMappingRecord, GenerateTypesFromRecordRequest, GenerateTypesFromRecordResponse, getSource, ImportInfo } from "@wso2/ballerina-core";
import { camelCase } from "lodash";
import path from "path";
import * as fs from 'fs';
import * as os from 'os';
import { typesFileParameterDefinitions } from "../../rpc-managers/ai-panel/utils";
import { writeBallerinaFileDidOpenTemp } from "../../utils/modification";
import { PrimitiveType } from "../../../src/rpc-managers/ai-panel/constants";

// Generate Ballerina types from a record request
export async function generateTypeCreation(
  request: GenerateTypesFromRecordRequest
): Promise<GenerateTypesFromRecordResponse> {
    const file = request.attachment && request.attachment.length > 0
        ? request.attachment[0]
        : undefined;

    const updatedSource = await typesFileParameterDefinitions(file);
    if (typeof updatedSource !== 'string') {
        throw new Error(`Failed to generate types: ${JSON.stringify(updatedSource)}`);
    }

    return Promise.resolve({ typesCode: updatedSource });
}

// Create a temporary Ballerina file with a generated data mapping function
export async function createTempDataMappingFile(
  projectRoot: string,
  inputs: DataMappingRecord[],
  output: DataMappingRecord,
  functionName: string,
  inputNames: string[],
  imports: ImportInfo[]
): Promise<string> {
  const funcSource = createDataMappingFunctionSource(inputs, output, functionName, inputNames);
  const tempFilePath = await createTempBallerinaFile(projectRoot, funcSource, imports);
  return tempFilePath;
}

// Create a temporary Ballerina file with optional imports
async function createTempBallerinaFile(
  projectRoot: string,
  funcSource: string,
  imports?: ImportInfo[]
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

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "ballerina-data-mapping-temp-")
  );
  fs.cpSync(projectRoot, tempDir, { recursive: true });
  const tempTestFilePath = path.join(tempDir, "temp.bal");
  writeBallerinaFileDidOpenTemp(tempTestFilePath, fullSource);

  return tempTestFilePath;
}

// Generate the Ballerina source for a data mapping function
export function createDataMappingFunctionSource(
  inputParams: DataMappingRecord[],
  outputParam: DataMappingRecord,
  functionName: string,
  inputNames: string[]
): string {
  const parametersStr = buildParametersString(inputParams, inputNames);
  const returnTypeStr = buildReturnTypeString(outputParam);

  const modification = createFunctionSignature(
    "",
    functionName,
    parametersStr,
    returnTypeStr,
    { startLine: 0, startColumn: 0 },
    false,
    true,
    "{}"
  );

  return getSource(modification);
}

// Generate parameters string for function signature
function buildParametersString(
  inputParams: DataMappingRecord[],
  inputNames: string[]
): string {
  return inputParams
    .map((item, index) => {
      const paramName =
        inputNames[index] || getDefaultParamName(item.type, item.isArray);
      return formatParameter(item, paramName);
    })
    .join(", ");
}

// Generate a default parameter name for primitives and custom types
function getDefaultParamName(type: string, isArray: boolean): string {
  const processedType = processType(type);

  switch (processedType) {
    case PrimitiveType.STRING:
      return isArray ? "strArr" : "str";
    case PrimitiveType.INT:
      return isArray ? "numArr" : "num";
    case PrimitiveType.FLOAT:
      return isArray ? "fltArr" : "flt";
    case PrimitiveType.DECIMAL:
      return isArray ? "decArr" : "dec";
    case PrimitiveType.BOOLEAN:
      return isArray ? "flagArr" : "flag";
    default:
      return camelCase(processedType);
  }
}

// Extract the actual type name from a fully qualified type
function processType(type: string): string {
  let typeName = type.includes("/") ? type.split("/").pop()! : type;

  if (typeName.includes(":")) {
    const [modulePart, typePart] = typeName.split(":");
    typeName = `${modulePart.split(".").pop()}:${typePart}`;
  }

  return typeName;
}

// Format a single function parameter
function formatParameter(
  item: DataMappingRecord,
  paramName: string
): string {
  return `${processType(item.type)}${item.isArray ? "[]" : ""} ${paramName}`;
}

// Generate return type string
function buildReturnTypeString(outputParam: DataMappingRecord): string {
  return `returns ${processType(outputParam.type)}${
    outputParam.isArray ? "[]" : ""
  }`;
}
