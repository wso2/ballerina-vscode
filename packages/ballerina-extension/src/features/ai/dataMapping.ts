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

import { AllDataMapperSourceRequest, Attachment, CodeData, ComponentInfo, createFunctionSignature, CreateTempFileRequest, DataMapperMetadata, DatamapperModelContext, DataMapperModelResponse, DataMappingRecord, DiagnosticList, DMModel, EnumType, ExistingFunctionMatchResult, ExtendedDataMapperMetadata, ExtractMappingDetailsRequest, ExtractMappingDetailsResponse, GenerateTypesFromRecordRequest, GenerateTypesFromRecordResponse, getSource, ImportInfo, ImportStatements, InlineMappingsSourceResult, IORoot, IOTypeField, LinePosition, Mapping, MappingParameters, MetadataWithAttachments, ModuleSummary, PackageSummary, ProjectComponentsResponse, ProjectSource, RecordType, RepairCodeParams, repairCodeRequest, SourceFile, SyntaxTree, TempDirectoryPath } from "@wso2/ballerina-core";
import { camelCase } from "lodash";
import path from "path";
import * as fs from 'fs';
import * as os from 'os';
import { Uri } from "vscode";
import { extractRecordTypeDefinitionsFromFile, generateMappingExpressionsFromModel, repairSourceFilesWithAI } from "../../rpc-managers/ai-panel/utils";
import { writeBallerinaFileDidOpenTemp } from "../../utils/modification";
import { ExtendedLangClient, NOT_SUPPORTED } from "../../core";
import { DefaultableParam, FunctionDefinition, IncludedRecordParam, ModulePart, RequiredParam, RestParam, STKindChecker, STNode } from "@wso2/syntax-tree";
import { addMissingRequiredFields, attemptRepairProject, checkProjectDiagnostics } from "../../../src/rpc-managers/ai-panel/repair-utils";
import { NullablePrimitiveType, PrimitiveArrayType, PrimitiveType } from "./constants";
import { INVALID_RECORD_REFERENCE } from "../../../src/views/ai-panel/errorCodes";
import { PackageInfo, TypesGenerationResult } from "./service/datamapper/types";
import { URI } from "vscode-uri";
import { getAllDataMapperSource } from "./service/datamapper/datamapper";
import { StateMachine } from "../../stateMachine";

// Set to false to include mappings with default values
const OMIT_DEFAULT_MAPPINGS_ENABLED = true;

// ================================================================================================
// Utility Functions - Type checking and validation helpers
// ================================================================================================

const isPrimitiveType = (type: string): boolean => {
  return Object.values(PrimitiveType).includes(type as PrimitiveType);
};

const isNullablePrimitiveType = (type: string): boolean => {
  return Object.values(NullablePrimitiveType).includes(type as NullablePrimitiveType);
};

const isPrimitiveArrayType = (type: string): boolean => {
  if (Object.values(PrimitiveArrayType).includes(type as PrimitiveArrayType)) {
    return true;
  }

  const unionArrayPattern = /^\(([^)]+)\)\[\](\?)?$/;
  const match = type.match(unionArrayPattern);

  if (match) {
    const unionTypes = match[1].split('|').map(t => t.trim());
    return unionTypes.every(unionType =>
      isPrimitiveType(unionType) || isNullablePrimitiveType(unionType)
    );
  }
  return false;
};

const isAnyPrimitiveType = (type: string): boolean => {
  return isPrimitiveType(type) || isNullablePrimitiveType(type) || isPrimitiveArrayType(type);
};

// ================================================================================================
// Common Data Mapper Functions - Shared utilities for all mapping processes
// ================================================================================================

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
function findBalFilesInDirectory(dir: string): string[] {
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

export async function createTempBallerinaDir(): Promise<string> {
  const projectRoot = StateMachine.context().projectPath;
  const randomNum = Math.floor(Math.random() * 90000) + 10000;
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `ballerina-data-mapping-${randomNum}-`)
  );
  fs.cpSync(projectRoot, tempDir, { recursive: true });
  return tempDir;
}

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
  context: any
): Promise<AllDataMapperSourceRequest> {
  const targetFilePath = metadataWithAttachments.metadata.codeData.lineRange.fileName || context.documentUri;

  const generatedMappings = await generateMappingExpressionsFromModel(
    metadataWithAttachments.metadata.mappingsModel as DMModel,
    metadataWithAttachments.attachments || []
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

// ================================================================================================
// DMModel Optimization - Functions for processing and optimizing data mapper models
// ================================================================================================
function ensureUnionRefs(model: DMModel): DMModel {
  const processedModel = JSON.parse(JSON.stringify(model));
  const unionRefs = new Map<string, any>();

  interface FieldVisitor {
    visitUnion(field: IOTypeField): void;
    visitRecord(field: IOTypeField): void;
    visitArray(field: IOTypeField): void;
    visitField(field: IOTypeField): void;
  }

  class UnionRefCollector implements FieldVisitor {
    visitUnion(field: IOTypeField): void {
      if (field.ref) {
        const refId = field.ref;

        if (!processedModel.refs[refId] && !unionRefs.has(refId)) {
          unionRefs.set(refId, {
            members: field.members || [],
            typeName: field.typeName,
            kind: 'union'
          });
        }

        field.members = [];
      }
    }

    visitRecord(field: IOTypeField): void {
      if (field.fields) {
        this.visitFields(field.fields);
      }
    }

    visitArray(field: IOTypeField): void {
      if (field.member) {
        this.visitField(field.member);
      }
    }

    visitField(field: IOTypeField): void {
      if (!field) { return; }

      switch (field.kind) {
        case 'union':
          this.visitUnion(field);
          break;
        case 'record':
          this.visitRecord(field);
          break;
        case 'array':
          this.visitArray(field);
          break;
      }

      if (field.members && Array.isArray(field.members)) {
        field.members.forEach(member => this.visitField(member));
      }

      if (field.member && field.kind !== 'array') {
        this.visitField(field.member);
      }
    }

    visitFields(fields: IOTypeField[]): void {
      if (!fields || !Array.isArray(fields)) { return; }

      for (const field of fields) {
        this.visitField(field);
      }
    }
  }

  class UnionMemberClearer implements FieldVisitor {
    visitUnion(field: IOTypeField): void {
      if (field.ref && field.members) {
        field.members = [];
      }
    }

    visitRecord(field: IOTypeField): void {
      if (field.fields) {
        this.visitFields(field.fields);
      }
    }

    visitArray(field: IOTypeField): void {
      if (field.member) {
        this.visitField(field.member);
      }
    }

    visitField(field: IOTypeField): void {
      if (!field || typeof field !== 'object') { return; }

      if (Array.isArray(field)) {
        field.forEach(item => this.visitField(item));
        return;
      }

      switch (field.kind) {
        case 'union':
          this.visitUnion(field);
          break;
        case 'record':
          this.visitRecord(field);
          break;
        case 'array':
          this.visitArray(field);
          break;
      }

      for (const key of Object.keys(field)) {
        if (typeof field[key] === 'object') {
          this.visitField(field[key]);
        }
      }
    }

    visitFields(fields: IOTypeField[]): void {
      if (!fields || !Array.isArray(fields)) { return; }

      for (const field of fields) {
        this.visitField(field);
      }
    }
  }

  const collector = new UnionRefCollector();

  if (processedModel.inputs) {
    collector.visitFields(processedModel.inputs);
  }

  if (processedModel.output) {
    if (processedModel.output.fields) {
      collector.visitFields(processedModel.output.fields);
    } else {
      collector.visitField(processedModel.output);
    }
  }

  if (processedModel.subMappings) {
    collector.visitFields(processedModel.subMappings);
  }

  if (processedModel.refs) {
    for (const refKey of Object.keys(processedModel.refs)) {
      const refObj = processedModel.refs[refKey];
      if (refObj.fields) {
        collector.visitFields(refObj.fields);
      } else if (refObj.members) {
        refObj.members.forEach((member: IOTypeField) => collector.visitField(member));
      }
    }
  }

  unionRefs.forEach((unionRef, refId) => {
    if (!processedModel.refs[refId]) {
      processedModel.refs[refId] = unionRef;
    }
  });

  const clearer = new UnionMemberClearer();

  clearer.visitField(processedModel.inputs);
  clearer.visitField(processedModel.output);
  if (processedModel.subMappings) {
    clearer.visitField(processedModel.subMappings);
  }

  if (processedModel.refs) {
    for (const refKey of Object.keys(processedModel.refs)) {
      const refObj = processedModel.refs[refKey];
      if (refObj.kind === 'record' && refObj.fields) {
        clearer.visitField(refObj.fields);
      }
    }
  }

  return processedModel;
}

export function normalizeRefs(model: DMModel): DMModel {
  const processedModel: DMModel = JSON.parse(JSON.stringify(model));

  function removeRef(field: IOTypeField) {
    if (!field || typeof field !== 'object') { return; }

    delete field.ref;

    if (field.member) { removeRef(field.member); }
    if (Array.isArray(field.members)) { field.members.forEach(removeRef); }
    if ((field as IOTypeField).fields && Array.isArray((field as IOTypeField).fields)) {
      (field as IOTypeField).fields.forEach(removeRef);
    }
  }

  if (processedModel.inputs) { processedModel.inputs.forEach(removeRef); }

  if (processedModel.output) { removeRef(processedModel.output); }

  if (processedModel.subMappings) {
    processedModel.subMappings.forEach((sub) => removeRef(sub as IOTypeField));
  }

  const newRefs: Record<string, RecordType | EnumType> = {};
  if (processedModel.refs) {
    for (const refObj of Object.values(processedModel.refs)) {
      const typeName = (refObj as RecordType).typeName;
      if (typeName) {
        if ((refObj as RecordType).fields) {
          (refObj as RecordType).fields.forEach(removeRef);
        }
        newRefs[typeName] = refObj as RecordType | EnumType;
      }
    }
  }

  processedModel.refs = newRefs;

  return processedModel;
}

export function omitDefaultMappings(model: DMModel, enabled: boolean = true): DMModel {
  if (!enabled || !model.mappings || !Array.isArray(model.mappings)) {
    return model;
  }

  const processedModel: DMModel = JSON.parse(JSON.stringify(model));

  processedModel.mappings = processedModel.mappings.filter((mapping: Mapping) => {
    if (!mapping.inputs || !Array.isArray(mapping.inputs)) {
      return true;
    }
    return mapping.inputs.length > 0;
  });

  return processedModel;
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

// ================================================================================================
// Mapping Details Extraction - Functions for extracting and validating mapping parameters
// ================================================================================================

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

// ================================================================================================
// Code Repair, Diagnostics, and Mapping Generation
// ================================================================================================

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

// ================================================================================================
// processInlineMappings - Functions for processing inline mapping parameters
// ================================================================================================

export async function generateInlineMappingsSource(
  inlineMappingRequest: MetadataWithAttachments,
  langClient: ExtendedLangClient,
  context: any,
): Promise<InlineMappingsSourceResult> {
  if (!inlineMappingRequest) {
    throw new Error("Inline mapping request is required");
  }

  if (!inlineMappingRequest.metadata) {
    throw new Error("Metadata is required for inline mapping generation");
  }

  if (!inlineMappingRequest.metadata.codeData) {
    throw new Error("Code data is required for inline mapping generation");
  }

  if (!langClient) {
    throw new Error("Language client is required for inline mapping generation");
  }

  const targetFileName = inlineMappingRequest.metadata.codeData.lineRange.fileName;

  if (!targetFileName) {
    throw new Error("Target file name could not be determined from code data");
  }

  const tempDirectory = await createTempBallerinaDir();
  const tempFileMetadata = await createTempFileAndGenerateMetadata(
    {
      tempDir: tempDirectory,
      filePath: targetFileName,
      metadata: inlineMappingRequest.metadata
    },
    langClient,
    context
  );

  // Prepare mapping request payload
  const mappingRequestPayload: MetadataWithAttachments = {
    metadata: tempFileMetadata
  };
  if (inlineMappingRequest.attachments && inlineMappingRequest.attachments.length > 0) {
    mappingRequestPayload.attachments = inlineMappingRequest.attachments;
  }

  // Generate mappings and source code
  const allMappingsRequest = await generateMappings(
    mappingRequestPayload,
    context
  );

  const generatedSourceResponse = await getAllDataMapperSource(allMappingsRequest);

  return {
    sourceResponse: generatedSourceResponse,
    allMappingsRequest,
    tempFileMetadata,
    tempDir: tempDirectory
  };
}

// ================================================================================================
// processContextTypeCreation - Functions for processing context type creation
// ================================================================================================

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

export function extractImports(content: string, filePath: string): ImportStatements {
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

// ================================================================================================
// Code Repair and Content Update - Functions for repairing code and getting updated content
// ================================================================================================

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
): Promise<{ finalContent: string; customFunctionsContent: string }> {
  
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

// Get custom functions content if file exists
export async function getCustomFunctionsContent(
  customFunctionsFilePath: string | undefined,
): Promise<string> {
  if (!customFunctionsFilePath) {
    return "";
  }
  return fs.readFileSync(customFunctionsFilePath, 'utf8');
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

// ================================================================================================
// processMappingParameters - Functions for processing mapping parameters
// ================================================================================================

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
  mappingDetails: ExtractMappingDetailsResponse;
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
