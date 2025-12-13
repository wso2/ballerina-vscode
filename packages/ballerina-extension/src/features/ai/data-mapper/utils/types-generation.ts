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
  Attachment,
  ComponentInfo,
  DataMappingRecord,
  GenerateTypesFromRecordRequest,
  GenerateTypesFromRecordResponse,
  ModuleSummary,
  PackageSummary,
  ProjectComponentsResponse,
  SyntaxTree,
} from "@wso2/ballerina-core";
import path from "path";
import { Uri } from "vscode";
import { writeBallerinaFileDidOpenTemp } from "../../../../utils/modification";
import { ExtendedLangClient } from "../../../../core";
import { ModulePart, STKindChecker } from "@wso2/syntax-tree";
import { extractRecordTypeDefinitionsFromFile } from "../../../../rpc-managers/ai-panel/utils";
import { TypesGenerationResult } from "../types";
import { createTempBallerinaDir } from "./temp-project";

/**
 * Type extraction and generation from context
 */

// Extract record and enum types from syntax tree
export async function extractRecordTypesFromSyntaxTree(
  langClient: ExtendedLangClient,
  filePath: string
): Promise<{ records: string[]; enums: string[] }> {
  const st = (await langClient.getSyntaxTree({
    documentIdentifier: {
      uri: Uri.file(filePath).toString(),
    },
  })) as SyntaxTree;

  if (!st.syntaxTree) {
    throw new Error("Failed to retrieve syntax tree for file: " + filePath);
  }

  const modulePart = st.syntaxTree as ModulePart;
  const records: string[] = [];
  const enums: string[] = [];

  for (const member of modulePart.members) {
    if (STKindChecker.isTypeDefinition(member)) {
      const typeName = member.typeName?.value;
      if (typeName) {
        records.push(typeName);
      }
    } else if (STKindChecker.isEnumDeclaration(member)) {
      const enumName = member.identifier?.value;
      if (enumName) {
        enums.push(enumName);
      }
    }
  }

  return { records, enums };
}

// Generate Ballerina record types from context attachments and validate against existing records
export async function generateTypesFromContext(
  sourceAttachments: Attachment[],
  projectComponents: ProjectComponentsResponse,
  langClient: ExtendedLangClient
): Promise<TypesGenerationResult> {
  if (!sourceAttachments || sourceAttachments.length === 0) {
    throw new Error("Source attachments are required for type generation");
  }

  if (!projectComponents) {
    throw new Error("Project components are required for type generation");
  }

  const outputFileName = "types.bal";
  const existingRecordTypesMap = new Map<string, DataMappingRecord>();

  projectComponents.components.packages?.forEach((packageSummary: PackageSummary) => {
    packageSummary.modules?.forEach((moduleSummary: ModuleSummary) => {
      let baseFilePath = packageSummary.filePath;
      if (moduleSummary.name !== undefined) {
        baseFilePath += `modules/${moduleSummary.name}/`;
      }
      moduleSummary.records.forEach((recordComponent: ComponentInfo) => {
        const recordFilePath = baseFilePath + recordComponent.filePath;
        existingRecordTypesMap.set(recordComponent.name, { type: recordComponent.name, isArray: false, filePath: recordFilePath });
      });
      moduleSummary.types.forEach((typeComponent: ComponentInfo) => {
        const typeFilePath = baseFilePath + typeComponent.filePath;
        existingRecordTypesMap.set(typeComponent.name, { type: typeComponent.name, isArray: false, filePath: typeFilePath });
      });
      moduleSummary.enums.forEach((enumComponent: ComponentInfo) => {
        const enumFilePath = baseFilePath + enumComponent.filePath;
        existingRecordTypesMap.set(enumComponent.name, { type: enumComponent.name, isArray: false, filePath: enumFilePath });
      });
    });
  });

  // Generate type definitions from all attachments together
  const typeGenerationRequest: GenerateTypesFromRecordRequest = {
    attachment: sourceAttachments
  };

  const typeGenerationResponse = await generateTypeCreation(typeGenerationRequest);
  const generatedTypesCode = typeGenerationResponse.typesCode;

  // Create temp directory and file to validate generated types
  const tempDirectory = await createTempBallerinaDir();
  const tempTypesFilePath = path.join(tempDirectory, outputFileName);

  writeBallerinaFileDidOpenTemp(tempTypesFilePath, generatedTypesCode);

  // Extract record and enum names from syntax tree
  const { records: generatedRecords, enums: generatedEnums } = await extractRecordTypesFromSyntaxTree(langClient, tempTypesFilePath);

  // Check for duplicate record names
  for (const recordName of generatedRecords) {
    if (existingRecordTypesMap.has(recordName)) {
      throw new Error(`Record "${recordName}" already exists in the workspace`);
    }
  }

  // Check for duplicate enum names
  for (const enumName of generatedEnums) {
    if (existingRecordTypesMap.has(enumName)) {
      throw new Error(`Enum "${enumName}" already exists in the workspace`);
    }
  }

  return {
    typesCode: generatedTypesCode,
    filePath: outputFileName,
    recordMap: existingRecordTypesMap
  };
}

// Generate Ballerina record type definitions from attachment files
export async function generateTypeCreation(
  typeGenerationRequest: GenerateTypesFromRecordRequest
): Promise<GenerateTypesFromRecordResponse> {
  if (typeGenerationRequest.attachment.length === 0) {
    throw new Error('No attachments provided for type generation');
  }

  // Process all attachments together to understand correlations
  const generatedTypeDefinitions = await extractRecordTypeDefinitionsFromFile(typeGenerationRequest.attachment);
  if (typeof generatedTypeDefinitions !== 'string') {
    throw new Error(`Failed to generate types: ${JSON.stringify(generatedTypeDefinitions)}`);
  }

  return { typesCode: generatedTypeDefinitions };
}
