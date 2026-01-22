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
  AllDataMapperSourceRequest,
  CodeData,
  CreateTempFileRequest,
  DataMapperMetadata,
  DatamapperModelContext,
  DataMapperModelResponse,
  DMModel,
  ExtendedDataMapperMetadata,
  IORoot,
  LinePosition,
  Mapping,
  MetadataWithAttachments,
  SyntaxTree,
} from "@wso2/ballerina-core";
import { Uri } from "vscode";
import { generateMappingExpressionsFromModel } from "../../../../rpc-managers/ai-panel/utils";
import { ExtendedLangClient, NOT_SUPPORTED } from "../../../../core";
import { STKindChecker, STNode } from "@wso2/syntax-tree";
import path from "path";
import { CopilotEventHandler } from "../../utils/events";
import { ensureUnionRefs, normalizeRefs, omitDefaultMappings } from "./model-optimization";
import { createCustomFunctionsFile, createTempDataMappingFile, getFunctionDefinitionFromSyntaxTree } from "./temp-project";

/**
 * Data mapper model generation and processing
 */

// Set to false to include mappings with default values
const OMIT_DEFAULT_MAPPINGS_ENABLED = true;

export async function generateDataMapperModel(
  params: DatamapperModelContext,
  langClient: ExtendedLangClient,
  context: any
): Promise<DataMapperModelResponse> {
  let filePath: string;
  let identifier: string;
  let dataMapperMetadata: DataMapperMetadata;

  if (params && params.documentUri && params.identifier) {
    filePath = params.documentUri;
    identifier = params.identifier;
    dataMapperMetadata = params.dataMapperMetadata;
  } else {
    filePath = context.documentUri;
    identifier = context.identifier || context.dataMapperMetadata.name;
    dataMapperMetadata = context.dataMapperMetadata;
  }

  let position: LinePosition = {
    line: dataMapperMetadata.codeData.lineRange.startLine.line,
    offset: dataMapperMetadata.codeData.lineRange.startLine.offset
  };

  if (!dataMapperMetadata.codeData.hasOwnProperty('node') ||
    dataMapperMetadata.codeData.node !== "VARIABLE") {
    const fileUri = Uri.file(filePath).toString();
    const fnSTByRange = await langClient.getSTByRange({
      lineRange: {
        start: {
          line: dataMapperMetadata.codeData.lineRange.startLine.line,
          character: dataMapperMetadata.codeData.lineRange.startLine.offset
        },
        end: {
          line: dataMapperMetadata.codeData.lineRange.endLine.line,
          character: dataMapperMetadata.codeData.lineRange.endLine.offset
        }
      },
      documentIdentifier: { uri: fileUri }
    });

    if (fnSTByRange === NOT_SUPPORTED) {
      throw new Error("Syntax tree retrieval not supported");
    }

    const fnSt = (fnSTByRange as SyntaxTree).syntaxTree as STNode;

    if (STKindChecker.isFunctionDefinition(fnSt) &&
      STKindChecker.isExpressionFunctionBody(fnSt.functionBody)) {
      position = {
        line: fnSt.functionBody.expression.position.startLine,
        offset: fnSt.functionBody.expression.position.startColumn
      };
    }
  }

  let dataMapperModel = await langClient
    .getDataMapperMappings({
      filePath,
      codedata: dataMapperMetadata.codeData,
      targetField: identifier,
      position: position
    }) as DataMapperModelResponse;

  if (!dataMapperModel) {
    console.error('DataMapperModel is undefined', dataMapperModel);
    throw new Error('Failed to retrieve DataMapperModel from language client');
  }

  let mappingsModel = ensureUnionRefs(dataMapperModel.mappingsModel as DMModel);
  mappingsModel = normalizeRefs(mappingsModel);
  mappingsModel = omitDefaultMappings(mappingsModel, OMIT_DEFAULT_MAPPINGS_ENABLED);

  if (mappingsModel.subMappings && mappingsModel.subMappings.length > 0) {
    mappingsModel.subMappings = await processSubMappings(
      mappingsModel.subMappings as IORoot[],
      filePath,
      dataMapperMetadata.codeData,
      langClient,
      position
    );
  }

  return { mappingsModel };
}

export async function createTempFileAndGenerateMetadata(params: CreateTempFileRequest, langClient: ExtendedLangClient, context: any): Promise<ExtendedDataMapperMetadata> {
  let filePath = await createTempDataMappingFile(params);

  if (!params.metadata || Object.keys(params.metadata).length === 0) {
    const funcDefinitionNode = await getFunctionDefinitionFromSyntaxTree(
      langClient,
      filePath,
      params.functionName
    );

    const dataMapperMetadata = {
      name: params.functionName,
      codeData: {
        lineRange: {
          fileName: filePath,
          startLine: {
            line: funcDefinitionNode.position.startLine,
            offset: funcDefinitionNode.position.startColumn,
          },
          endLine: {
            line: funcDefinitionNode.position.endLine,
            offset: funcDefinitionNode.position.endColumn,
          },
        },
      }
    };

    const dataMapperModel = await generateDataMapperModel(
      {
        documentUri: filePath,
        identifier: params.functionName,
        dataMapperMetadata: dataMapperMetadata
      },
      langClient,
      context
    );

    return {
      mappingsModel: dataMapperModel.mappingsModel as DMModel,
      name: params.functionName,
      codeData: dataMapperMetadata.codeData
    };
  }

  const updatedMetadata = {
    ...params.metadata,
    codeData: {
      ...params.metadata.codeData,
      lineRange: {
        ...params.metadata.codeData.lineRange,
        fileName: filePath
      }
    }
  };

  return {
    mappingsModel: updatedMetadata.mappingsModel,
    name: params.functionName || updatedMetadata.name,
    codeData: updatedMetadata.codeData
  };
}

export async function generateMappings(
  metadataWithAttachments: MetadataWithAttachments,
  context: any,
  eventHandler: CopilotEventHandler
): Promise<AllDataMapperSourceRequest> {
  const targetFilePath = metadataWithAttachments.metadata.codeData.lineRange.fileName || context.documentUri;

  const generatedMappings = await generateMappingExpressionsFromModel(
    metadataWithAttachments.metadata.mappingsModel as DMModel,
    metadataWithAttachments.attachments || [],
    eventHandler
  );

  const customFunctionMappings = generatedMappings.filter(mapping => mapping.isFunctionCall);
  let customFunctionsFilePath: string | undefined;

  if (customFunctionMappings.length > 0) {
    let tempDirectory = path.dirname(metadataWithAttachments.metadata.codeData.lineRange.fileName);
    customFunctionsFilePath = await createCustomFunctionsFile(
      tempDirectory,
      customFunctionMappings
    );
  }

  const allMappingsRequest: AllDataMapperSourceRequest = {
    filePath: targetFilePath,
    codedata: metadataWithAttachments.metadata.codeData,
    varName: metadataWithAttachments.metadata.name,
    position: {
      line: metadataWithAttachments.metadata.codeData.lineRange.startLine.line,
      offset: metadataWithAttachments.metadata.codeData.lineRange.startLine.offset
    },
    mappings: generatedMappings,
    customFunctionsFilePath
  };

  return allMappingsRequest;
}

async function processSubMappings(
  subMappings: IORoot[],
  filePath: string,
  codeData: CodeData,
  langClient: ExtendedLangClient,
  position?: LinePosition
): Promise<Mapping[]> {
  const allSubMappings: Mapping[] = [];

  for (const subMapping of subMappings) {
    const subMappingCodeData = await langClient.getSubMappingCodedata({
      filePath,
      codedata: codeData,
      view: (subMapping as IORoot).name
    });

    const subMappingModel = await langClient.getDataMapperMappings({
      filePath,
      codedata: subMappingCodeData.codedata,
      targetField: (subMapping as IORoot).name,
      position: position
    }) as DataMapperModelResponse;

    if (subMappingModel.mappingsModel &&
      'mappings' in subMappingModel.mappingsModel &&
      subMappingModel.mappingsModel.mappings) {
      allSubMappings.push(...subMappingModel.mappingsModel.mappings);
    }
  }

  return allSubMappings;
}
