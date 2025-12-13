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

import { DataMappingRecord, createFunctionSignature, getSource, repairCodeRequest, ProjectSource, SourceFile } from "@wso2/ballerina-core";
import { camelCase } from "lodash";
import { writeBallerinaFileDidOpenTemp } from "../../../../utils/modification";
import { repairSourceFilesWithAI } from "../../../../rpc-managers/ai-panel/utils";
import { PrimitiveType } from "../constants";

/**
 * Code generation utilities for data mapping functions
 */

export async function repairCodeWithLLM(codeRepairRequest: repairCodeRequest): Promise<ProjectSource> {
  if (!codeRepairRequest) {
    throw new Error("Code repair request is required");
  }

  if (!codeRepairRequest.sourceFiles || codeRepairRequest.sourceFiles.length === 0) {
    throw new Error("Source files are required for code repair");
  }

  const repairedSourceFiles = await repairSourceFilesWithAI(codeRepairRequest);

  for (const repairedFile of repairedSourceFiles) {
    try {
      writeBallerinaFileDidOpenTemp(
        repairedFile.filePath,
        repairedFile.content
      );
    } catch (error) {
      console.error(`Error processing file ${repairedFile.filePath}:`, error);
    }
  }

  const projectSourceResponse = { sourceFiles: repairedSourceFiles, projectName: "", packagePath: "", isActive: true };
  return projectSourceResponse;
}

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

function processType(type: string): string {
  let typeName = type.includes("/") ? type.split("/").pop()! : type;

  if (typeName.includes(":")) {
    const [modulePart, typePart] = typeName.split(":");
    typeName = `${modulePart.split(".").pop()}:${typePart}`;
  }

  return typeName;
}

function formatParameter(
  item: DataMappingRecord,
  paramName: string
): string {
  return `${processType(item.type)}${item.isArray ? "[]" : ""} ${paramName}`;
}

function buildReturnTypeString(outputParam: DataMappingRecord): string {
  return `returns ${processType(outputParam.type)}${outputParam.isArray ? "[]" : ""
    }`;
}
