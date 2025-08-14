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

import { ArrayTypeDesc, FunctionDefinition, ModulePart, QualifiedNameReference, RequiredParam, STKindChecker } from "@wso2/syntax-tree";
import { FormField, STModification, SyntaxTree, Attachment, AttachmentStatus, keywords, DiagnosticEntry, InlineDataMapperModelResponse } from "@wso2/ballerina-core";
import { window } from 'vscode';

import { StateMachine } from "../../stateMachine";
import {
    INVALID_PARAMETER_TYPE,
    INVALID_PARAMETER_TYPE_MULTIPLE_ARRAY,
    INVALID_RECORD_UNION_TYPE
} from "../../views/ai-panel/errorCodes";
import path from "path";
import * as fs from 'fs';
import { BACKEND_URL } from "../../features/ai/utils";
import { AIChatError } from "./utils/errors";
import { generateAutoMappings } from "../../../src/features/ai/service/datamapper/datamapper";
import { DatamapperResponse, Payload } from "../../../src/features/ai/service/datamapper/types";
import { DataMapperRequest, DataMapperResponse, FileData, processDataMapperInput } from "../../../src/features/ai/service/datamapper/context_api";
import { getAskResponse } from "../../../src/features/ai/service/ask/ask";
import { ArrayEnumUnionType, ArrayRecordType, MetadataType, NUMERIC_AND_BOOLEAN_TYPES, Operation, PrimitiveType, RecordType, UnionEnumIntersectionType } from "./constants";
import { FieldMetadata, InputMetadata, IntermediateMapping, MappingData, MappingFileRecord, NestedFieldDescriptor, OutputMetadata, ParameterDefinitions, ParameterField, ParameterMetadata, ProcessCombinedKeyResult, ProcessParentKeyResult, RecordDefinitonObject } from "./types";

const BACKEND_BASE_URL = BACKEND_URL.replace(/\/v2\.0$/, "");
//TODO: Temp workaround as custom domain seem to block file uploads
const CONTEXT_UPLOAD_URL_V1 = "https://e95488c8-8511-4882-967f-ec3ae2a0f86f-prod.e1-us-east-azure.choreoapis.dev/ballerina-copilot/context-upload-api/v1.0";
// const CONTEXT_UPLOAD_URL_V1 = BACKEND_BASE_URL + "/context-api/v1.0";
const ASK_API_URL_V1 = BACKEND_BASE_URL + "/ask-api/v1.0";

export const REQUEST_TIMEOUT = 2000000;

let abortController = new AbortController();

export class AIPanelAbortController {
    private static instance: AIPanelAbortController;
    private abortController: AbortController;

    private constructor() {
        this.abortController = new AbortController();
    }

    public static getInstance(): AIPanelAbortController {
        if (!AIPanelAbortController.instance) {
            AIPanelAbortController.instance = new AIPanelAbortController();
        }
        return AIPanelAbortController.instance;
    }

    public get signal(): AbortSignal {
        return this.abortController.signal;
    }

    public abort(): void {
        this.abortController.abort();
        // Create a new AbortController for the next operation
        this.abortController = new AbortController();
    }
}

export function handleStop() {
    AIPanelAbortController.getInstance().abort();
}

const isPrimitiveType = (type: string): boolean => {
    return Object.values(PrimitiveType).includes(type as PrimitiveType);
};

const isUnionEnumIntersectionType = (type: string): boolean => {
    return Object.values(UnionEnumIntersectionType).includes(type as UnionEnumIntersectionType);
};

const isRecordType = (type: string): boolean => {
    return Object.values(RecordType).includes(type as RecordType);
};

const isArrayRecord = (type: string): boolean => {
    return Object.values(ArrayRecordType).includes(type as ArrayRecordType);
};

const isArrayEnumUnion = (type: string): boolean => {
    return Object.values(ArrayEnumUnionType).includes(type as ArrayEnumUnionType);
};

export async function getParamDefinitions(
    fnSt: FunctionDefinition,
    fileUri: string
): Promise<ParameterDefinitions> {
    try {
        const inputs: NestedFieldDescriptor = {};
        const inputMetadata: InputMetadata = {};
        let output: NestedFieldDescriptor = {};
        let outputMetadata: OutputMetadata = {};
        let hasArrayParams = false;
        let arrayParams = 0;
        let isErrorExists = false;

        for (const parameter of fnSt.functionSignature.parameters) {
            if (!STKindChecker.isRequiredParam(parameter)) {
                continue;
            }

            const param = parameter as RequiredParam;
            let paramName = param.paramName.value;
            let paramType = "";

            if (STKindChecker.isArrayTypeDesc(param.typeName) && STKindChecker.isArrayTypeDesc(fnSt.functionSignature.returnTypeDesc.type)) {
                paramName = `${paramName}Item`; 
                arrayParams++;
            }

            if (param.typeData.typeSymbol.typeKind === "array") {
                paramType = param.typeName.source;
            } else if (param.typeData.typeSymbol.typeKind === "typeReference") {
                paramType = param.typeData.typeSymbol.name;
            } else {
                paramType = param.typeName.source;
            }

            const position = STKindChecker.isQualifiedNameReference(param.typeName)
                ? {
                    line: (param.typeName as QualifiedNameReference).identifier.position.startLine,
                    offset: (param.typeName as QualifiedNameReference).identifier.position.startColumn
                }
                : STKindChecker.isArrayTypeDesc(param.typeName) && STKindChecker.isQualifiedNameReference(
                    (param.typeName as ArrayTypeDesc).memberTypeDesc)
                    ? {
                        line: ((param.typeName as ArrayTypeDesc).memberTypeDesc as QualifiedNameReference).identifier.position.startLine,
                        offset: ((param.typeName as ArrayTypeDesc).memberTypeDesc as QualifiedNameReference).identifier.position.startColumn
                    }
                    : {
                        line: parameter.position.startLine,
                        offset: parameter.position.startColumn
                    };
            
            const inputTypeDefinition = await StateMachine.langClient().getTypeFromSymbol({
                documentIdentifier: {
                    uri: fileUri
                },
                positions: [position]
            });

            if ('types' in inputTypeDefinition && inputTypeDefinition.types.length > 1) {
                throw new Error(INVALID_PARAMETER_TYPE.message);
            }

            if ('types' in inputTypeDefinition && !inputTypeDefinition.types[0].hasOwnProperty('type')) {
                if (STKindChecker.isQualifiedNameReference(parameter.typeName)) {
                    throw new Error(`"${parameter.typeName["identifier"].value}" does not exist in the package "${parameter.typeName["modulePrefix"].value}". Please verify the record name or ensure that the correct package is imported.`);
                }
                throw new Error(INVALID_PARAMETER_TYPE.message);
            }

            const inputType = inputTypeDefinition["types"]?.[0].type;
            if (inputType?.typeName === "union" && inputType.members?.some((m: { fields: string | any[]; }) => m.fields?.length > 0)) {
                throw new Error(INVALID_RECORD_UNION_TYPE.message);
            }

            let inputDefinition: RecordDefinitonObject;
            if (inputType?.fields) {
                inputDefinition = navigateTypeInfo(inputType.fields, false);
            } else {
                inputDefinition = {
                    "recordFields": { [paramName]: { "type": inputType.typeName, "comment": "" } },
                    "recordFieldsMetadata": {
                        [paramName]: {
                            "typeName": inputType.typeName,
                            "type": inputType.typeName,
                            "typeInstance": paramName,
                            "nullable": false,
                            "optional": false
                        }
                    }
                };
            }

            inputs[paramName] = inputDefinition.recordFields;
            inputMetadata[paramName] = {
                isArrayType: STKindChecker.isArrayTypeDesc(parameter.typeName),
                parameterName: paramName,
                parameterType: paramType,
                type: STKindChecker.isArrayTypeDesc(parameter.typeName) ? "record[]" : "record",
                fields: inputDefinition.recordFieldsMetadata,
            };
            if (STKindChecker.isArrayTypeDesc(parameter.typeName)) {
                hasArrayParams = true;
            }
        }

        if (STKindChecker.isUnionTypeDesc(fnSt.functionSignature.returnTypeDesc.type)) {
            let unionType = fnSt.functionSignature.returnTypeDesc.type;
            let leftType = unionType.leftTypeDesc;
            let rightType = unionType.rightTypeDesc;

            if (STKindChecker.isArrayTypeDesc(leftType) && STKindChecker.isErrorTypeDesc(rightType)) {
                if (!STKindChecker.isSimpleNameReference(leftType.memberTypeDesc)) {
                    throw new Error(INVALID_PARAMETER_TYPE.message);
                }
                isErrorExists = true;
            } else if (STKindChecker.isArrayTypeDesc(rightType) && STKindChecker.isErrorTypeDesc(leftType)) {
                if (!STKindChecker.isSimpleNameReference(rightType.memberTypeDesc)) {
                    throw new Error(INVALID_PARAMETER_TYPE.message);
                }
                isErrorExists = true;
            } else if (
                (STKindChecker.isSimpleNameReference(leftType) || STKindChecker.isQualifiedNameReference(leftType)) &&
                STKindChecker.isErrorTypeDesc(rightType)) {
                isErrorExists = true;
            } else if (
                (STKindChecker.isSimpleNameReference(rightType) || STKindChecker.isQualifiedNameReference(rightType)) &&
                STKindChecker.isErrorTypeDesc(leftType)) {
                isErrorExists = true;
            } else {
                throw new Error(INVALID_PARAMETER_TYPE.message);
            }
        } else if (STKindChecker.isArrayTypeDesc(fnSt.functionSignature.returnTypeDesc.type)) {
            if (arrayParams > 1) {
                throw new Error(INVALID_PARAMETER_TYPE_MULTIPLE_ARRAY.message);
            }
            if (!hasArrayParams) {
                throw new Error(INVALID_PARAMETER_TYPE_MULTIPLE_ARRAY.message);
            }
            if (!(STKindChecker.isSimpleNameReference(fnSt.functionSignature.returnTypeDesc.type.memberTypeDesc) ||
                STKindChecker.isQualifiedNameReference(fnSt.functionSignature.returnTypeDesc.type.memberTypeDesc))) {
                throw new Error(INVALID_PARAMETER_TYPE.message);
            }
        } else {
            if (!STKindChecker.isSimpleNameReference(fnSt.functionSignature.returnTypeDesc.type) &&
                !STKindChecker.isQualifiedNameReference(fnSt.functionSignature.returnTypeDesc.type)) {
                throw new Error(INVALID_PARAMETER_TYPE.message);
            }
        }

        let returnType = fnSt.functionSignature.returnTypeDesc.type;

        const returnTypePosition = STKindChecker.isUnionTypeDesc(returnType)
            ? {
                line: STKindChecker.isErrorTypeDesc(returnType.leftTypeDesc)
                    ? returnType.rightTypeDesc.position.startLine
                    : returnType.leftTypeDesc.position.startLine,
                offset: STKindChecker.isErrorTypeDesc(returnType.leftTypeDesc)
                    ? returnType.rightTypeDesc.position.startColumn
                    : returnType.leftTypeDesc.position.startColumn
            }
            : STKindChecker.isArrayTypeDesc(returnType) && STKindChecker.isQualifiedNameReference(returnType.memberTypeDesc)
                ? {
                    line: returnType.memberTypeDesc.identifier.position.startLine,
                    offset: returnType.memberTypeDesc.identifier.position.startColumn
                }
                : STKindChecker.isQualifiedNameReference(returnType)
                    ? {
                        line: returnType.identifier.position.startLine,
                        offset: returnType.identifier.position.startColumn
                    }
                    : {
                        line: returnType.position.startLine,
                        offset: returnType.position.startColumn
                    };

        const outputTypeDefinition = await StateMachine.langClient().getTypeFromSymbol({
            documentIdentifier: {
                uri: fileUri
            },
            positions: [returnTypePosition]
        });

        if ('types' in outputTypeDefinition && !outputTypeDefinition.types[0].hasOwnProperty('type')) {
            if (STKindChecker.isQualifiedNameReference(returnType)) {
                throw new Error(`"${returnType["identifier"].value}" does not exist in the package "${returnType["modulePrefix"].value}". Please verify the record name or ensure that the correct package is imported.`);
            }
            throw new Error(INVALID_PARAMETER_TYPE.message);
        }

        const outputType = outputTypeDefinition["types"]?.[0].type;
        if (outputType?.typeName === "union" && outputType.members?.some((m) => m.fields)) {
            throw new Error(INVALID_RECORD_UNION_TYPE.message);
        }

        const outputDefinition = navigateTypeInfo('types' in outputTypeDefinition && outputTypeDefinition.types[0].type.fields, false);
        output = { ...outputDefinition.recordFields };
        outputMetadata = { ...outputDefinition.recordFieldsMetadata };

        const response = {
            inputs,
            output,
            inputMetadata,
            outputMetadata
        };

        return {
            parameterMetadata: response,
            errorStatus: isErrorExists
        };
    } catch (error) {
        throw error;
    }
}

export async function processMappings(
    fnSt: FunctionDefinition,
    fileUri: string,
    file?: Attachment
): Promise<SyntaxTree> {
    let result = await getParamDefinitions(fnSt, fileUri);
    let parameterDefinitions = result.parameterMetadata;
    const isErrorExists = result.errorStatus;

    if (file) {
        let mappedResult = await mappingFileParameterDefinitions(file, parameterDefinitions);
        parameterDefinitions = mappedResult as ParameterMetadata;
    }

    const codeObject = await getDatamapperCode(parameterDefinitions);
    const { recordString, isCheckError } = await constructRecord(codeObject);
    let codeString: string;
    const parameter = fnSt.functionSignature.parameters[0] as RequiredParam;
    const paramName = parameter.paramName.value;
    const formattedRecordString = recordString.startsWith(":") ? recordString.substring(1) : recordString;

    let returnType = fnSt.functionSignature.returnTypeDesc.type;

    if (STKindChecker.isUnionTypeDesc(returnType)) {
        const { leftTypeDesc: leftType, rightTypeDesc: rightType } = returnType;

        if (STKindChecker.isArrayTypeDesc(leftType) || STKindChecker.isArrayTypeDesc(rightType)) {
            codeString = isCheckError && !isErrorExists
                ? `|error => from var ${paramName}Item in ${paramName}\n select ${formattedRecordString};`
                : `=> from var ${paramName}Item in ${paramName}\n select ${formattedRecordString};`;
        } else {
            codeString = isCheckError && !isErrorExists ? `|error => ${recordString};` : `=> ${recordString};`;
        }
    } else if (STKindChecker.isArrayTypeDesc(returnType)) {
        codeString = isCheckError
            ? `|error => from var ${paramName}Item in ${paramName}\n select ${formattedRecordString};`
            : `=> from var ${paramName}Item in ${paramName}\n select ${formattedRecordString};`;
    } else {
        codeString = isCheckError ? `|error => ${recordString};` : `=> ${recordString};`;
    }

    const modifications: STModification[] = [];
    modifications.push({
        type: "INSERT",
        config: { STATEMENT: codeString },
        endColumn: fnSt.functionBody.position.endColumn,
        endLine: fnSt.functionBody.position.endLine,
        startColumn: fnSt.functionBody.position.startColumn,
        startLine: fnSt.functionBody.position.startLine,
    });

    const stModifyResponse = await StateMachine.langClient().stModify({
        astModifications: modifications,
        documentIdentifier: {
            uri: fileUri
        }
    });

    return stModifyResponse as SyntaxTree;
}

function isMappingData(obj: MappingData | IntermediateMapping): obj is MappingData {
    return (
        typeof obj === "object" &&
        obj !== null &&
        typeof obj.operation === "string" &&
        Array.isArray(obj.parameters) &&
        typeof obj.targetType === "string"
    );
}

export async function generateBallerinaCode(
    response: IntermediateMapping,
    parameterDefinitions: ParameterMetadata,
    nestedKey: string = "",
    nestedKeyArray: string[]
): Promise<Record<string, string>> {
    let recordFields: Record<string, string> = {};
    if (isMappingData(response)) {
        return await processMappingData(
            response,
            parameterDefinitions,
            nestedKey,
            nestedKeyArray
        );
    }

    const objectKeys = Object.keys(response);
    for (const key of objectKeys) {
        const subRecord = response[key];
        if (isMappingData(subRecord)) {
            const nestedResponseRecord = await processMappingData(
                subRecord,
                parameterDefinitions,
                key,
                nestedKeyArray
            );
            Object.assign(recordFields, nestedResponseRecord);
        } else {
            nestedKeyArray.push(key);
            const responseRecord = await generateBallerinaCode(
                subRecord as IntermediateMapping,
                parameterDefinitions,
                key,
                nestedKeyArray
            );
            const recordFieldDetails = await handleRecordArrays(
                key,
                nestedKey,
                responseRecord,
                parameterDefinitions,
                nestedKeyArray
            );
            nestedKeyArray.pop();
            Object.assign(recordFields, recordFieldDetails);
        }
    }
    return recordFields;
}

async function processMappingData(
    mappingData: MappingData,
    parameterDefinitions: ParameterMetadata,
    nestedKey: string,
    nestedKeyArray: string[]
): Promise<Record<string, string>> {
    const parameters = mappingData.parameters;
    const paths = parameters[0].split(".");

    const path = await getMappingString(
        mappingData,
        parameterDefinitions,
        nestedKey,
        nestedKeyArray
    );

    if (typeof path !== "string" || path === "") {
        return {};
    }

    const recordFieldName = paths.length === 1 ? nestedKey : (nestedKey || paths[1]);
    return { [recordFieldName]: path };
}

// Get union types from the combination of union types
function getUnionTypes(types: string[]) {
    const result = new Set<string>(); // Use a Set to avoid duplicates
    const len = types.length;

    // Generate combinations of at least two elements
    for (let i = 2; i <= len; i++) {
        generateCombinations(types, i, 0, [], result);
    }

    return Array.from(result);
}

// Generate union combination
function generateCombinations(arr: string[], size: number, start: number, current: string[], result: Set<string>) {
    if (current.length === size) {
        result.add(current.slice().sort().join("|")); // Sort to ensure order consistency
        return;
    }
    for (let i = start; i < arr.length; i++) {
        generateCombinations(arr, size, i + 1, [...current, arr[i]], result);
    }
}

// Function to check if a given type is a valid union type (order-independent)
function isUnionType(type: string): boolean {
    const sortedType = type.split("|").sort().join("|"); // Sort input type for consistency
    const validUnionTypes = getUnionTypes(Object.values(PrimitiveType)); // Get valid union types
    return validUnionTypes.includes(sortedType); // Check against Set
}

async function getMappingString(mapping: MappingData, parameterDefinitions: ParameterMetadata, nestedKey: string, nestedKeyArray: string[]): Promise<string> {
    let operation: string = mapping.operation;
    let targetType: string = mapping.targetType;
    let parameters: string[] = mapping.parameters;

    let path: string = "";
    let modifiedPaths: string[] = [];
    let inputTypeName: string = "";
    let inputType: string = "";
    let baseType: string = "";
    let baseTargetType: string = "";
    let outputType: string = "";
    let baseOutputType: string = "";
    let baseInputType: string = "";
    let modifiedInput: FieldMetadata;
    let outputObject: FieldMetadata;
    let isInputNullableArray: boolean;
    let isOutputNullableArray: boolean;

    let paths = parameters[0].split(".");
    let recordObjectName: string = paths[0];

    // Retrieve inputType
    if (paths.length > 2) {
        modifiedInput = await getNestedType(paths.slice(1), parameterDefinitions.inputMetadata[recordObjectName]);
    } else if (paths.length === 2) {
        modifiedInput = parameterDefinitions.inputMetadata[recordObjectName]["fields"][paths[1]];
    } else {
        modifiedInput = parameterDefinitions.configurables[recordObjectName] ||
                parameterDefinitions.constants[recordObjectName] ||
                parameterDefinitions.variables[recordObjectName] || parameterDefinitions.inputMetadata[recordObjectName].fields[paths[0]];
    }

    // Resolve output metadata
    if (nestedKeyArray.length > 0) {
        outputObject = await getMetadata(parameterDefinitions, nestedKeyArray, nestedKey, MetadataType.OUTPUT_METADATA);
    } else if (parameterDefinitions.outputMetadata.hasOwnProperty("fields") || !parameterDefinitions.outputMetadata[nestedKey]) {
        throw new Error(`Invalid or missing metadata for nestedKey: ${nestedKey}.`);
    } else {
        outputObject = parameterDefinitions.outputMetadata[nestedKey];
    }

    baseTargetType = targetType.replace(/\|\(\)$/, "");

    inputTypeName = modifiedInput.typeName;
    baseType = inputTypeName.replace(/\|\(\)$/, "");

    inputType = modifiedInput.type;
    baseInputType = inputType.replace(/\|\(\)$/, "");

    outputType = outputObject.type;
    baseOutputType = outputType.replace(/\|\(\)$/, "");

    if (operation === Operation.DIRECT) {
        if (parameters.length > 1) {
            return "";
        }
        // Helper function to check if type contains []
        const hasArrayNotation = (type: string) => type.includes("[]");
        if (isRecordType(baseType)) {
            // Both baseType and baseTargetType either contain "[]" or do not
            if (!(hasArrayNotation(baseType) === hasArrayNotation(baseTargetType)) && !(baseTargetType === "int")) {
                return "";
            }
        } else if (isUnionEnumIntersectionType(baseOutputType)) {
            // Both baseInputType and baseOutputType either contain "[]" or do not
            if (!(hasArrayNotation(baseInputType) === hasArrayNotation(baseOutputType))) {
                return "";
            }
        }
        modifiedPaths = await accessMetadata(
            paths,
            parameterDefinitions,
            outputObject,
            baseType,
            baseTargetType,
            operation
        );
        for (let index = 0; index < modifiedPaths.length; index++) {
            if (index > 0 && modifiedPaths[index] === modifiedPaths[index - 1]) {
                continue;
            }
            if (path !== "") {
                path = `${path}.`;
            }
            path = `${path}${modifiedPaths[index]}`;
        }
        // Add split operation if inputType is "string" and targetType is "string[]"
        if (baseType === PrimitiveType.STRING && baseTargetType === "string[]") {
            return `re \`,\`.split(${path})`;
        }

        // Add length operation if inputType is "record[]" and targetType is "int"
        if (isArrayRecord(baseType) && baseTargetType === PrimitiveType.INT) {
            return `(${path}).length()`;
        }

        // Type conversion logic
        const stringConversions: Record<string, string> = {
            int: "check int:fromString",
            float: "check float:fromString",
            decimal: "check decimal:fromString",
            boolean: "check boolean:fromString"
        };

        const numericConversions: { [key: string]: Record<string, string> } = {
            float: {
                int: `check (${path}).ensureType()`,
                decimal: `check (${path}).ensureType()`
            },
            int: {
                float: `check (${path}).ensureType()`,
                decimal: `check (${path}).ensureType()`
            },
            decimal: {
                int: `check (${path}).ensureType()`,
                float: `check (${path}).ensureType()`
            }
        };

        function convertUnionTypes(inputType: string, targetType: string, variablePath: string): string {
            const inputTypes = inputType.split("|").filter(isPrimitiveType);
            const isStringInput = inputTypes.includes(PrimitiveType.STRING);
            const isNumericOrBooleanTarget = NUMERIC_AND_BOOLEAN_TYPES.includes(targetType as PrimitiveType);

            if (targetType === PrimitiveType.STRING) {
                return `(${variablePath}).toString()`;
            }

            if (isStringInput && isNumericOrBooleanTarget) {
                return `(${variablePath}) is string ? check ${targetType}:fromString((${variablePath}).toString()) : check (${variablePath}).ensureType()`;
            }

            if (isNumericOrBooleanTarget) {
                return `check (${variablePath}).ensureType()`;
            }

            return variablePath;
        }

        isOutputNullableArray = outputObject.nullableArray;
        isInputNullableArray = modifiedInput.nullableArray;

        const isStringInput = ["string", "string|()"].includes(inputTypeName);
        const isStringTarget = ["string", "string|()"].includes(targetType);
        if (isPrimitiveType(baseTargetType) && isPrimitiveType(baseType)) {
            if (inputTypeName === targetType || inputTypeName === baseTargetType) {
                path = `${path}`;
            } else if (isStringInput) {
                const conversion = stringConversions[baseTargetType];
                if (conversion) {
                    path = `${conversion}(${path})`;
                } else if (!isStringTarget) {
                    return "";
                }
            } else if (isStringTarget) {
                path = `(${path}).toString()`;
            } else {
                const conversion = numericConversions[inputTypeName]?.[targetType];
                if (conversion && baseTargetType !== PrimitiveType.BOOLEAN) {
                    path = conversion;
                } else if (baseType === baseTargetType) {
                    path = `${path}`;
                } else if ((targetType.includes("|()") && inputTypeName !== baseTargetType) || inputTypeName.includes("|()") && baseTargetType !== PrimitiveType.BOOLEAN) {
                    path = `check (${path}).ensureType()`;
                } else {
                    return "";
                }
            }
        } else if (isUnionEnumIntersectionType(inputType)) {
            if (isUnionType(baseType)) {
                path = convertUnionTypes(baseType, baseTargetType, path);
            } else {
                path = `${path}`;
                if (isInputNullableArray && !isOutputNullableArray) {
                    path = `check (${path}).cloneWithType()`;
                }
            }
        }
    } else if (operation === Operation.LENGTH) {
        if (parameters.length > 1) {
            return "";
        }
        modifiedPaths = await accessMetadata(
            paths,
            parameterDefinitions,
            outputObject,
            baseType,
            baseTargetType,
            operation
        );
        for (let index = 0; index < modifiedPaths.length; index++) {
            if (path !== "") {
                path = `${path}.`;
            }
            path = `${path}${modifiedPaths[index]}`;
        }
        path = `(${path}).length()`;
    } else if (operation === Operation.SPLIT) {
        if (parameters.length > 2) {
            return "";
        }
        modifiedPaths = await accessMetadata(
            paths,
            parameterDefinitions,
            outputObject,
            baseType,
            baseTargetType,
            operation
        );
        for (let index = 0; index < modifiedPaths.length; index++) {
            if (path !== "") {
                path = `${path}.`;
            }
            path = `${path}${modifiedPaths[index]}`;
        }
        path = `re \`${parameters[1]}\`.split(${path})`;
    }
    return path;
}

//Define interfaces for the visitor pattern
interface TypeInfoVisitor {
    visitField(field: FormField, context: VisitorContext): void;
    visitMember(member: any, context: VisitorContext): { typeName: string, member: any };
    visitRecord(field: FormField, context: VisitorContext): void;
    visitUnionOrIntersection(field: FormField, context: VisitorContext): void;
    visitArray(field: FormField, context: VisitorContext): void;
    visitEnum(field: FormField, context: VisitorContext): void;
    visitPrimitive(field: FormField, context: VisitorContext): void;
}

//Context object to maintain state during traversal
interface VisitorContext {
    recordFields: { [key: string]: any };
    recordFieldsMetadata: { [key: string]: any };
    memberRecordFields: { [key: string]: any };
    memberFieldsMetadata: { [key: string]: any };
    fieldMetadata: { [key: string]: any };
    isNill: boolean;
    isNullable: boolean;
    isArray: boolean;
    isRecord: boolean;
    isSimple: boolean;
    isUnion: boolean;
    isArrayNullable: boolean;
    isRecordNullable: boolean;
    memberName: string;
}

// Implementation of the visitor
class TypeInfoVisitorImpl implements TypeInfoVisitor {
    constructor() { }

    visitField(field: FormField, context: VisitorContext): void {
        // Reset state for each field
        this.resetContext(context);

        const typeName = field.typeName;

        if (!typeName) {
            this.handleTypeInfo(field, context);
            return;
        }

        switch (typeName) {
            case "record":
                this.visitRecord(field, context);
                break;
            case "union":
            case "intersection":
                this.visitUnionOrIntersection(field, context);
                break;
            case "array":
                this.visitArray(field, context);
                break;
            case "enum":
                this.visitEnum(field, context);
                break;
            default:
                this.visitPrimitive(field, context);
                break;
        }
    }

    visitMember(member: any, context: VisitorContext): { typeName: string, member: any } {
        let typeName: string;
        if (member.typeName === "record" && member.fields) {
            typeName = this.handleRecordMember(member, context);
        } else if (member.typeName === "array") {
            const result = this.handleArrayMember(member, context);
            typeName = result.typeName;
            member = result.member;
        } else if (["union", "intersection", "enum"].includes(member.typeName)) {
            typeName = this.handleCompositeMember(member, context);
        } else if (member.typeName === "()") {
            typeName = this.handleNullMember(member, context);
        } else {
            typeName = this.handleSimpleMember(member, context);
        }
        return { typeName, member };
    }

    visitRecord(field: FormField, context: VisitorContext): void {
        const temporaryRecord = navigateTypeInfo(field.fields, false);
        context.isRecord = true;

        const fieldName = getBalRecFieldName(field.name);
        context.recordFields[fieldName] = temporaryRecord.recordFields;
        context.recordFieldsMetadata[fieldName] = {
            nullable: context.isNill,
            optional: field.optional,
            type: "record",
            typeInstance: fieldName,
            typeName: field.typeName,
            fields: temporaryRecord.recordFieldsMetadata
        };
    }

    visitUnionOrIntersection(field: FormField, context: VisitorContext): void {
        let memberTypeNames: string[] = [];
        let resolvedTypeName: string = "";

        // Check for record fields in union members and handle appropriately
        this.processUnionMembers(field.members, context);

        for (const member of field.members) {
            const result = this.visitMember(member, context);
            memberTypeNames.push(result.typeName);
            if (Object.keys(result.member).length === 0) {
                field.members = [];
                break;
            }
        }

        if (field.members.length === 0) {
            context.memberRecordFields = {};
            context.memberFieldsMetadata = {};
            return;
        }

        resolvedTypeName = this.getResolvedTypeName(field.typeName, memberTypeNames);

        this.buildFieldMetadata(field, resolvedTypeName, context);
        this.setFieldAndMetadata(field, resolvedTypeName, context);
    }

    visitArray(field: FormField, context: VisitorContext): void {
        if (field.memberType.hasOwnProperty("members") &&
            ["union", "intersection", "enum"].includes(field.memberType.typeName)) {

            // Handle array with union/intersection/enum member type
            this.processUnionMembers(field.memberType.members, context);

            if (field.memberType.members.length === 0) {
                context.memberRecordFields = {};
                context.memberFieldsMetadata = {};
                return;
            }

            this.handleArrayWithCompositeType(field, context);
        } else if (field.memberType.hasOwnProperty("fields") && field.memberType.typeName === "record") {
            this.handleArrayWithRecordType(field, context);
        } else {
            this.handleSimpleArray(field, context);
        }
    }

    visitEnum(field: FormField, context: VisitorContext): void {
        let memberTypeNames: string[] = [];

        for (const member of field.members) {
            const result = this.visitMember(member, context);
            memberTypeNames.push(result.typeName);
        }

        const resolvedTypeName = memberTypeNames.join("|");

        this.buildFieldMetadata(field, resolvedTypeName, context);
        this.setFieldAndMetadata(field, resolvedTypeName, context);
    }

    visitPrimitive(field: FormField, context: VisitorContext): void {
        const typeName = field.typeName;

        if (field.hasOwnProperty("name")) {
            const fieldName = getBalRecFieldName(field.name);
            context.recordFields[fieldName] = { type: typeName, comment: "" };
            context.recordFieldsMetadata[fieldName] = {
                typeName: typeName,
                type: typeName,
                typeInstance: fieldName,
                nullable: context.isNill,
                optional: field.optional
            };
        } else {
            context.recordFields[typeName] = { type: "string", comment: "" };
            context.recordFieldsMetadata[typeName] = {
                typeName: typeName,
                type: "string",
                typeInstance: typeName,
                nullable: context.isNill,
                optional: field.optional
            };
        }
    }

    private handleTypeInfo(field: FormField, context: VisitorContext): void {
        const fieldName = getBalRecFieldName(field.name);
        context.recordFields[fieldName] = { type: field.typeInfo.name, comment: "" };
        context.recordFieldsMetadata[fieldName] = {
            typeName: field.typeInfo.name,
            type: field.typeInfo.name,
            typeInstance: fieldName,
            nullable: context.isNill,
            optional: field.optional
        };
    }

    private handleRecordMember(member: any, context: VisitorContext): string {
        const temporaryRecord = navigateTypeInfo(member.fields, false);
        context.isRecord = true;
        let memberName: string;

        if (context.isUnion && member.hasOwnProperty("name")) {
            memberName = member.name;
            const fieldName = getBalRecFieldName(memberName);
            context.memberRecordFields[fieldName] = (temporaryRecord as RecordDefinitonObject).recordFields;
            context.memberFieldsMetadata[fieldName] = {
                nullable: context.isNill,
                optional: member.optional,
                type: "record",
                typeInstance: fieldName,
                typeName: member.typeName,
                fields: (temporaryRecord as RecordDefinitonObject).recordFieldsMetadata
            };
        } else {
            memberName = "record";
            context.memberRecordFields = {
                ...context.memberRecordFields,
                ...(temporaryRecord as RecordDefinitonObject).recordFields
            };
            context.memberFieldsMetadata = {
                ...context.memberFieldsMetadata,
                ...((temporaryRecord as RecordDefinitonObject).recordFieldsMetadata)
            };
        }

        return memberName;
    }

    private handleArrayMember(member: any, context: VisitorContext): { typeName: string, member: any } {
        context.isArray = true;
        let memberName: string;

        if (member.memberType.hasOwnProperty("fields") && member.memberType.typeName === "record") {
            const temporaryRecord = navigateTypeInfo(member.memberType.fields, false);
            memberName = `${member.memberType.typeName}[]`;
            context.memberRecordFields = {
                ...context.memberRecordFields,
                ...(temporaryRecord as RecordDefinitonObject).recordFields
            };
            context.memberFieldsMetadata = {
                ...context.memberFieldsMetadata,
                ...((temporaryRecord as RecordDefinitonObject).recordFieldsMetadata)
            };
        } else if (member.memberType.hasOwnProperty("members") &&
            ["union", "intersection", "enum"].includes(member.memberType.typeName)) {

            // Process union members to handle records appropriately
            this.processUnionMembers(member.memberType.members, context);

            if (member.memberType.members.length === 0) {
                memberName = "";
                member = [];
            } else {
                memberName = this.handleArrayWithCompositeTypeMember(member, context);
            }
        } else if (member.memberType.hasOwnProperty("typeInfo")) {
            if (member.memberType.hasOwnProperty("name") && !member.memberType.hasOwnProperty("typeName")) {
                memberName = `${member.memberType.name}[]`;
            } else {
                memberName = "record[]";
            }
        } else {
            memberName = `${member.memberType.typeName}[]`;
        }

        return { typeName: memberName, member };
    }

    private handleArrayWithCompositeTypeMember(member: any, context: VisitorContext): string {
        let memberTypes: string[] = [];
        const members = member.memberType.members;

        this.determineIfUnion(members, context);

        for (const innerMember of members) {
            const result = this.visitMember(innerMember, context);
            memberTypes.push(result.typeName);
        }

        context.isSimple = false;

        if (member.memberType.typeName === "intersection") {
            return `(${memberTypes.join("&")})[]`;
        } else {
            return `(${memberTypes.join("|")})[]`;
        }
    }

    private handleCompositeMember(member: any, context: VisitorContext): string {
        let memberTypeNames: string[] = [];

        for (const innerMember of member.members) {
            const result = this.visitMember(innerMember, context);
            memberTypeNames.push(result.typeName);
        }

        if (member.typeName === "intersection") {
            return `${memberTypeNames.join("&")}`;
        } else {
            return `${memberTypeNames.join("|")}`;
        }
    }

    private handleNullMember(member: any, context: VisitorContext): string {
        const memberName = member.typeName;

        if (context.isArray) {
            context.isArrayNullable = true;
        }
        if (context.isRecord) {
            context.isRecordNullable = true;
        }
        if (context.isSimple) {
            context.isNullable = true;
        }

        return memberName;
    }

    private handleSimpleMember(member: any, context: VisitorContext): string {
        context.isSimple = true;
        let memberName: string;

        if (member.hasOwnProperty("typeName")) {
            memberName = member.typeName;

            if (member.hasOwnProperty("name")) {
                this.addNamedSimpleMember(member, memberName, context);
            } else {
                this.addUnnamedSimpleMember(memberName, member, context);
            }
        } else {
            memberName = member.name;
        }

        return memberName;
    }

    private addNamedSimpleMember(member: any, memberName: string, context: VisitorContext): void {
        const fieldName = getBalRecFieldName(member.name);
        context.memberRecordFields = {
            ...context.memberRecordFields,
            [fieldName]: {
                type: memberName,
                comment: ""
            }
        };
        context.memberFieldsMetadata = {
            ...context.memberFieldsMetadata,
            [fieldName]: {
                typeName: memberName,
                type: memberName,
                typeInstance: fieldName,
                nullable: context.isNill,
                optional: member.optional
            }
        };
    }

    private addUnnamedSimpleMember(memberName: string, member: any, context: VisitorContext): void {
        // Check if typeName is not one of the BasicTypes types
        const BasicTypes = ["int", "string", "float", "boolean", "decimal", "readonly"];
        if (!BasicTypes.includes(memberName)) {
            const fieldName = getBalRecFieldName(memberName);
            context.memberFieldsMetadata = {
                ...context.memberFieldsMetadata,
                [fieldName]: {
                    typeName: fieldName,
                    type: fieldName,
                    typeInstance: fieldName,
                    nullable: context.isNill,
                    optional: member.optional
                }
            };
        }
    }

    private handleArrayWithCompositeType(field: FormField, context: VisitorContext): void {
        let memberTypeNames: string[] = [];

        for (const member of field.memberType.members) {
            const result = this.visitMember(member, context);
            memberTypeNames.push(result.typeName);
        }

        context.isArray = true;
        let resolvedTypeName: string = "";

        if (field.memberType.typeName === "intersection") {
            resolvedTypeName = `${memberTypeNames.join("&")}`;
        } else {
            resolvedTypeName = `${memberTypeNames.join("|")}`;
        }

        const fieldName = getBalRecFieldName(field.name);
        context.recordFields[fieldName] = Object.keys(context.memberRecordFields).length > 0
            ? context.memberRecordFields
            : { type: `(${resolvedTypeName})[]`, comment: "" };

        this.buildArrayFieldMetadata(field, resolvedTypeName, context);
    }

    private handleArrayWithRecordType(field: FormField, context: VisitorContext): void {
        const temporaryRecord = navigateTypeInfo(field.memberType.fields, false);
        const fieldName = getBalRecFieldName(field.name);
        context.recordFields[fieldName] = (temporaryRecord as RecordDefinitonObject).recordFields;
        context.isArray = true;
        context.isRecord = true;

        context.fieldMetadata = {
            optional: field.optional,
            typeName: "record[]",
            type: "record[]",
            typeInstance: fieldName,
            fields: (temporaryRecord as RecordDefinitonObject).recordFieldsMetadata
        };

        this.applyNullabilityToFieldMetadata(context);
        context.recordFieldsMetadata[field.name] = context.fieldMetadata;
    }

    private handleSimpleArray(field: FormField, context: VisitorContext): void {
        let typeName: string;

        if (field.memberType.hasOwnProperty("typeInfo")) {
            typeName = "record[]";
        } else {
            typeName = `${field.memberType.typeName}[]`;
        }

        if (field.memberType.members && field.memberType.members.length === 0) {
            context.memberRecordFields = {};
            context.memberFieldsMetadata = {};
        } else {
            const fieldName = getBalRecFieldName(field.name);
            context.recordFields[fieldName] = { type: typeName, comment: "" };
            context.recordFieldsMetadata[fieldName] = {
                typeName: typeName,
                type: typeName,
                typeInstance: fieldName,
                nullable: context.isNill,
                optional: field.optional
            };
        }
    }

    private processUnionMembers(members: any[], context: VisitorContext): void {
        this.determineIfUnion(members, context);

        if (members.length > 2) {
            // If at least one member has fields, remove that field
            for (let i = members.length - 1; i >= 0; i--) {
                if (members[i].fields) {
                    members.length = 0;
                    break;
                }
            }
        } else if (members.length === 2) {
            // If one member is "()" proceed normally, else if one member has fields, remove it
            for (let i = members.length - 1; i >= 0; i--) {
                if (members[i].fields && context.isUnion) {
                    members.length = 0;
                    break;
                }
            }
        }
    }

    private determineIfUnion(members: any[], context: VisitorContext): void {
        if (members.length > 2) {
            context.isUnion = members.some((member) => member.typeName === "()");
        } else if (members.length === 2) {
            context.isUnion = !members.some(member => member.typeName === "()" || member.typeName === "readonly");
        } else {
            context.isUnion = false;
        }
    }

    private getResolvedTypeName(typeName: string, memberTypeNames: string[]): string {
        if (typeName === "intersection") {
            return `${memberTypeNames.join("&")}`;
        } else {
            return `${memberTypeNames.join("|")}`;
        }
    }

    private buildFieldMetadata(field: FormField, resolvedTypeName: string, context: VisitorContext): void {
        context.fieldMetadata = {
            optional: field.optional,
            typeName: resolvedTypeName,
            type: context.isArray
                ? (context.isArrayNullable
                    ? `${field.typeName}[]|()` : `${field.typeName}[]`)
                : field.typeName,
            typeInstance: field.name,
            ...(Object.keys(context.memberFieldsMetadata).length > 0 && { members: context.memberFieldsMetadata })
        };

        this.applyNullabilityToFieldMetadata(context);
    }

    private buildArrayFieldMetadata(field: FormField, resolvedTypeName: string, context: VisitorContext): void {
        context.fieldMetadata = {
            optional: field.optional,
            typeName: `(${resolvedTypeName})[]`,
            type: `${field.memberType.typeName}[]`,
            typeInstance: field.name,
            ...(Object.keys(context.memberFieldsMetadata).length > 0 && { members: context.memberFieldsMetadata })
        };

        this.applyNullabilityToFieldMetadata(context);
        const fieldName = getBalRecFieldName(field.name);
        context.recordFieldsMetadata[fieldName] = context.fieldMetadata;
    }

    private applyNullabilityToFieldMetadata(context: VisitorContext): void {
        // Apply nullableArray property
        if (context.isArray) {
            if (context.isRecord) {
                context.fieldMetadata.nullableArray = context.isRecordNullable;
            } else {
                context.fieldMetadata.nullableArray = context.isNullable;
            }
        }

        // Apply nullable property
        if (context.isArray) {
            context.fieldMetadata.nullable = context.isArrayNullable;
        } else if (context.isRecord) {
            context.fieldMetadata.nullable = context.isRecordNullable;
        } else if (context.isSimple) {
            context.fieldMetadata.nullable = context.isNullable;
        }
    }

    private setFieldAndMetadata(field: FormField, resolvedTypeName: string, context: VisitorContext): void {
        const fieldName = getBalRecFieldName(field.name);
        context.recordFields[fieldName] = Object.keys(context.memberRecordFields).length > 0
            ? context.memberRecordFields
            : { type: resolvedTypeName, comment: "" };
        context.recordFieldsMetadata[fieldName] = context.fieldMetadata;
    }

    private resetContext(context: VisitorContext): void {
        context.memberRecordFields = {};
        context.memberFieldsMetadata = {};
        context.fieldMetadata = {};
        context.isArrayNullable = false;
        context.isRecordNullable = false;
        context.isNullable = false;
        context.isArray = false;
        context.isRecord = false;
        context.isSimple = false;
        context.isUnion = false;
    }
}

export function navigateTypeInfo(
    typeInfos: FormField[],
    isNill: boolean
): RecordDefinitonObject {
    const context: VisitorContext = {
        recordFields: {},
        recordFieldsMetadata: {},
        memberRecordFields: {},
        memberFieldsMetadata: {},
        fieldMetadata: {},
        isNill,
        isNullable: false,
        isArray: false,
        memberName: '',
        isRecord: false,
        isArrayNullable: false,
        isRecordNullable: false,
        isSimple: false,
        isUnion: false
    };

    const visitor = new TypeInfoVisitorImpl();

    for (const field of typeInfos) {
        visitor.visitField(field, context);
    }
    return {
        recordFields: context.recordFields,
        recordFieldsMetadata: context.recordFieldsMetadata
    };
}

export function getBalRecFieldName(fieldName: string) {
    return keywords.includes(fieldName) ? `'${fieldName}` : fieldName;
}

export async function getDatamapperCode(parameterDefinitions: ParameterMetadata): Promise<Record<string, string>> {
    let nestedKeyArray: string[] = [];
    try {
        let response: DatamapperResponse = await sendDatamapperRequest(parameterDefinitions);
        let intermediateMapping = response.mappings;
        let finalCode = await generateBallerinaCode(intermediateMapping, parameterDefinitions, "", nestedKeyArray);
        return finalCode;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function constructRecord(codeObject: object): Promise<{ recordString: string; isCheckError: boolean; }> {
    let recordString: string = "";
    let isCheckError: boolean = false;
    let objectKeys = Object.keys(codeObject);
    for (let index = 0; index < objectKeys.length; index++) {
        let key = objectKeys[index];
        let mapping = codeObject[key];
        if (typeof mapping === "string") {
            if (mapping.includes("check ")) {
                isCheckError = true;
            }
            if (recordString !== "") {
                recordString += ",\n";
            }
            recordString += `${key}:${mapping}`;
        } else {
            let subRecordResult = await constructRecord(mapping);
            if (subRecordResult.isCheckError) {
                isCheckError = true;
            }
            if (recordString !== "") {
                recordString += ",\n";
            }
            recordString += `${key}:${subRecordResult.recordString}`;
        }
    }
    return { recordString: `{\n${recordString}}`, isCheckError };
}

export async function getFunction(modulePart: ModulePart, functionName: string) {
    const fns = modulePart.members.filter((mem) =>
        STKindChecker.isFunctionDefinition(mem)
    ) as FunctionDefinition[];

    return fns.find(mem => mem.functionName.value === functionName);
}

export function notifyNoGeneratedMappings() {
    const msg = 'No automatic mappings detected. Try manual mapping for precise connections.';
    window.showInformationMessage(msg);
}

async function sendDatamapperRequest(parameterDefinitions: ParameterMetadata): Promise<DatamapperResponse> {
    const response: DatamapperResponse = await generateAutoMappings(parameterDefinitions as Payload);
    return response;
}

export async function searchDocumentation(message: string): Promise<string> {
    const resp = await getAskResponse(message,);
    const finalResponse = resp.content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    const referenceSources = resp.references;
    let responseContent: string;
    if (referenceSources.length > 0) {
        responseContent = `${finalResponse}  \nreference sources:  \n${referenceSources.join('  \n')}`;
    } else {
        responseContent = finalResponse;
    }

    return responseContent;
}

export async function filterDocumentation(resp: Response): Promise<string> {
    let responseContent: string;
    if (resp.status == 200 || resp.status == 201) {
        const data = (await resp.json()) as any;
        console.log("data", data.response);
        const finalResponse = await (data.response.content).replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        const referenceSources = data.response.references;
        if (referenceSources.length > 0) {
            responseContent = `${finalResponse}  \nreference sources:  \n${referenceSources.join('  \n')}`;
        } else {
            responseContent = finalResponse;
        }
        return responseContent;
    }
    throw new Error(AIChatError.UNKNOWN_CONNECTION_ERROR);
}

async function attatchmentToFileData(file: Attachment): Promise<FileData> {
    return {
        fileName: file.name,
        content: file.content
    };
}

export async function mappingFileParameterDefinitions(file: Attachment, parameterDefinitions: ParameterMetadata): Promise<ParameterMetadata> {
    if (!file) { return parameterDefinitions; }
    const fileData = await attatchmentToFileData(file);
    const params: DataMapperRequest = {
        file: fileData,
        processType: "mapping_instruction"
    };
    const resp: DataMapperResponse = await processDataMapperInput(params);
    let mappingFile: MappingFileRecord = JSON.parse(resp.fileContent) as MappingFileRecord;

    return {
        ...parameterDefinitions,
        mapping_fields: mappingFile.mapping_fields
    };
}

export async function mappingFileInlineDataMapperModel(file: Attachment, inlineDataMapperResponse: InlineDataMapperModelResponse): Promise<InlineDataMapperModelResponse> {
    if (!file) { return inlineDataMapperResponse; }
    const fileData = await attatchmentToFileData(file);
    const params: DataMapperRequest = {
        file: fileData,
        processType: "mapping_instruction"
    };
    const resp: DataMapperResponse = await processDataMapperInput(params);
    let mappingFile: MappingFileRecord = JSON.parse(resp.fileContent) as MappingFileRecord;

    return {
        ...inlineDataMapperResponse,
        mappingsModel: {
            ...inlineDataMapperResponse.mappingsModel,
            mapping_fields: mappingFile.mapping_fields
        }
    };
}

export async function typesFileParameterDefinitions(file: Attachment): Promise<string> {
    if (!file) { throw new Error("File is undefined"); }

    const fileData = await attatchmentToFileData(file);
    const params: DataMapperRequest = {
        file: fileData,
        processType: "records"
    };
    const resp: DataMapperResponse = await processDataMapperInput(params);
    return resp.fileContent;
}

export function isErrorCode(error: any): boolean {
    return error.hasOwnProperty("code") && error.hasOwnProperty("message");
}

async function accessMetadata(
    paths: string[],
    parameterDefinitions: ParameterMetadata,
    outputObject: FieldMetadata,
    baseType: string,
    baseTargetType: string,
    operation: string
): Promise<string[]> {
    let newPath = [...paths];
    let isUsingDefault = false;
    let isUsingArray = false;
    let defaultValue: string;

    baseTargetType = outputObject.typeName.replace(/\|\(\)$/, "");

    for (let index = 1; index < paths.length; index++) {
        const pathIndex = paths[index];
        let inputObject = await getMetadata(parameterDefinitions, paths, pathIndex, MetadataType.INPUT_METADATA);

        if (inputObject.hasOwnProperty("members") || inputObject.hasOwnProperty("fields") || operation === Operation.LENGTH) {
            if (!["enum", "enum|()"].includes(inputObject.type)) {
                isUsingDefault = false;
            }
            if (isArrayRecord(inputObject.typeName) || isArrayEnumUnion(inputObject.type)) {
                isUsingArray = inputObject.nullableArray;
            } 
            if (isUsingArray && isRecordType(inputObject.typeName)) {
                newPath[index] = `${paths[index]}?`;
            }
            if (inputObject.nullable || inputObject.optional) {
                // Handle record types
                if (isRecordType(inputObject.typeName)) {
                    if (!inputObject.typeName.includes("[]")) {
                        if (index !== (paths.length - 1)) {
                            newPath[index] = `${paths[index]}?`;
                            isUsingDefault = true;
                        }
                    }
                    if (inputObject.typeName.includes("[]") && operation === Operation.LENGTH) {
                        let lastInputObject = await getMetadata(parameterDefinitions, paths, paths[paths.length - 1], MetadataType.INPUT_METADATA);
                        let inputDataType = lastInputObject.typeName.replace(/\|\(\)$/, "");
                        defaultValue = await getDefaultValue(inputDataType);
                        newPath[paths.length - 1] = `${paths[paths.length - 1]}?:${defaultValue}`;
                    }
                    if (inputObject.nullable && inputObject.optional) {
                        newPath[index - 1] = `${paths[index - 1]}?`;
                    }
                    // Handle enum, union, and intersection types    
                } else if (isUnionEnumIntersectionType(inputObject.type)) {
                    if (inputObject.nullable && inputObject.optional) {
                        newPath[index - 1] = `${paths[index - 1]}?`;
                    }
                    if (inputObject.type.includes("[]") && operation === Operation.LENGTH) {
                        let lastInputObject = await getMetadata(parameterDefinitions, paths, paths[paths.length - 1], MetadataType.INPUT_METADATA);
                        let inputDataType = lastInputObject.type.replace(/\|\(\)$/, "");
                        defaultValue = await getDefaultValue(inputDataType);
                        newPath[paths.length - 1] = `${paths[paths.length - 1]}?:${defaultValue}`;
                    } else if (!outputObject.nullable && !outputObject.optional) {
                        if (isUnionEnumIntersectionType(inputObject.type) && inputObject.members) {
                            if (!inputObject.nullableArray || outputObject.nullableArray) {
                                let typeName = inputObject.type.includes("[]")
                                    ? inputObject.type.replace(/\|\(\)$/, "")
                                    : (inputObject as any).members[Object.keys((inputObject as any).members)[0]].typeName;

                                let defaultValue = await getDefaultValue(typeName);
                                newPath[paths.length - 1] = `${paths[paths.length - 1]}?:${defaultValue !== "void" ? defaultValue : JSON.stringify(typeName)}`;
                            }
                        }
                        return newPath;
                    }
                }
            } else {
                if (isUsingDefault && isUnionEnumIntersectionType(inputObject.type) && inputObject.members) {
                    if (!outputObject.nullable && !outputObject.optional) {
                        let typeName = inputObject.type.includes("[]")
                            ? inputObject.type.replace("|()", "")
                            : (inputObject as any).members[Object.keys((inputObject as any).members)[0]].typeName;

                        let defaultValue = await getDefaultValue(typeName);
                        newPath[paths.length - 1] = `${paths[paths.length - 1]}?:${defaultValue !== "void" ? defaultValue : JSON.stringify(typeName)}`;
                    }
                }
            }
        } else {
            if (inputObject.nullable && inputObject.optional) {
                newPath[index - 1] = `${paths[index - 1]}?`;
            }
            if (!isPrimitiveType(baseType) && baseType.includes("[]")) {
                defaultValue = (!inputObject.nullableArray || outputObject.nullableArray) ? `[]` : undefined;
            } else {
                const typeToUse = !isPrimitiveType(baseType)
                    ? baseType.replace(/[\[\]()]*/g, "").split("|")[0].trim()
                    : baseType;
                defaultValue = await getDefaultValue(typeToUse);
            }

            if (isUsingArray) {
                newPath[index] = `${pathIndex}?:${defaultValue}`;
            }

            if (isUsingDefault && !outputObject.nullable && !outputObject.optional) {
                newPath[index] = `${pathIndex}?:${defaultValue}`;
                continue;
            }
            if (!(inputObject.nullable || inputObject.optional)) {
                continue;
            }

            // Handle nullable/optional input
            const shouldUseDefault = (
                (!outputObject.nullable && !outputObject.optional && !inputObject.nullableArray && outputObject.nullableArray) ||
                (!outputObject.nullable && !outputObject.optional && (baseType === PrimitiveType.STRING || baseType === baseTargetType)) ||
                (baseType !== baseTargetType && baseType === PrimitiveType.STRING)
            );
            newPath[index] = shouldUseDefault ? `${pathIndex}?:${defaultValue}` : `${pathIndex}`;
            return newPath;
        }
    }
    return newPath;
}

async function getDefaultValue(dataType: string): Promise<string> {
    switch (dataType) {
        case "string":
            return "\"\"";
        case "int":
            return "0";
        case "decimal":
            return "0.0";
        case "float":
            return "0.0";
        case "boolean":
            return "false";
        case "json":
            return "()";
        case "int[]":
        case "string[]":
        case "float[]":
        case "decimal[]":
        case "boolean[]":
        case "record[]":
        case "(readonly&record)[]":
        case "enum[]":
        case "union[]":
        case "intersection[]":
        case "json[]":
            return "[]";
        default:
            // change the following to a appropriate value
            return "void";
    }
}

async function getNestedType(paths: string[], metadata: ParameterField | FieldMetadata): Promise<FieldMetadata> {
    let currentMetadata = metadata;
    for (const path of paths) {
        const cleanPath = path.replace(/\?.*$/, "");
        const nextMetadata = currentMetadata.fields?.[cleanPath] ?? currentMetadata.members?.[cleanPath];
        if (!nextMetadata) {
            throw new Error(`Field ${cleanPath} not found in metadata.`);
        }
        currentMetadata = nextMetadata;
    }
    return currentMetadata as FieldMetadata;
}

async function getMetadata(
    parameterDefinitions: ParameterMetadata,
    nestedKeyArray: string[],
    key: string,
    metadataType: MetadataType.INPUT_METADATA | MetadataType.OUTPUT_METADATA
): Promise<FieldMetadata> {
    try {
        let currentMetadata = parameterDefinitions[metadataType];
        for (const nestedKey of nestedKeyArray) {
            const nested = currentMetadata[nestedKey];
            const hasNestedStructure = nested?.fields || nested?.members;

            if (hasNestedStructure) {
                if (nestedKey === key) {
                    return nested as FieldMetadata;
                }
                currentMetadata = nested.fields || nested.members;
            } else {
                return currentMetadata[key] as FieldMetadata;
            }
        }
        return currentMetadata[key] as FieldMetadata;
    } catch {
        throw new Error(`Metadata not found for key: "${key}" in ${metadataType}.`);
    }
}

async function handleRecordArrays(key: string, nestedKey: string, responseRecord: Record<string, string>, parameterDefinitions: ParameterMetadata,nestedKeyArray: string[]) {
    let recordFields: Record<string, string> = {};
    let subObjectKeys = Object.keys(responseRecord);

    let formattedRecordsArray: string[] = [];
    let itemKey: string = "";
    let combinedKey: string = "";
    let modifiedOutput: FieldMetadata;
    let outputMetadataType: string = "";
    let outputMetadataTypeName: string = "";
    let isOutputDeeplyNested: boolean = false;

    for (let subObjectKey of subObjectKeys) {
        if (!nestedKey) {
            modifiedOutput = parameterDefinitions.outputMetadata[key];
        } else {
            modifiedOutput = await getMetadata(parameterDefinitions, nestedKeyArray, key, MetadataType.OUTPUT_METADATA);
        }
        outputMetadataTypeName = modifiedOutput.typeName;
        outputMetadataType = modifiedOutput.type;
        isOutputDeeplyNested = (isArrayRecord(outputMetadataTypeName) || isArrayEnumUnion(outputMetadataType));

        let { itemKey: currentItemKey, combinedKey: currentCombinedKey, inputArrayNullable, isSet, isInputDeeplyNested } = await extractKeys(responseRecord[subObjectKey], parameterDefinitions);
        if (currentItemKey.includes('?')) {
            currentItemKey = currentItemKey.replace('?', '');
        }
        if (modifiedOutput.hasOwnProperty("fields") || modifiedOutput.hasOwnProperty("members")) {
            if (isOutputDeeplyNested) {
                const subArrayRecord = responseRecord[subObjectKey];
                const isCombinedKeyModified = currentCombinedKey.endsWith('?');
                const replacementKey = inputArrayNullable || isCombinedKeyModified
                    ? `${currentItemKey}Item?.`
                    : `${isInputDeeplyNested ? currentItemKey + 'Item' : currentItemKey}.`;
                const regex = new RegExp(
                    currentCombinedKey.replace(/\?/g, '\\?').replace(/\./g, '\\.') + '\\.', 'g'
                );

                formattedRecordsArray.push(
                    `${subObjectKey}: ${subArrayRecord.replace(regex, replacementKey)}`
                );

                if (isSet || (itemKey === "" && combinedKey === "")) {
                    itemKey = currentItemKey;
                    combinedKey = currentCombinedKey;
                }
            } else {
                formattedRecordsArray.push(`${subObjectKey}: ${responseRecord[subObjectKey]}`);
            }
        } else {
            recordFields = { ...recordFields, [key]: JSON.stringify(responseRecord) };
        }
    }

    if (formattedRecordsArray.length > 0 && itemKey && combinedKey) {
        const formattedRecords = formattedRecordsArray.join(",\n");
        const keyToReplace = combinedKey.endsWith('?') ? combinedKey.replace(/\?$/, '') : combinedKey;
        const processedKeys = await processCombinedKey(combinedKey, parameterDefinitions);
        const combinedKeyExpression = (processedKeys.isinputRecordArrayNullable || processedKeys.isinputRecordArrayOptional || processedKeys.isinputArrayNullable || processedKeys.isinputArrayOptional || processedKeys.isinputNullableArray)
            ? `${keyToReplace} ?: []`
            : keyToReplace;
        recordFields[key] = `from var ${itemKey}Item in ${combinedKeyExpression}\n select {\n ${formattedRecords}\n}`;
    } else {
        recordFields[key] = `{\n ${formattedRecordsArray.join(",\n")} \n}`;
    }
    return { ...recordFields };
}

async function extractKeys(
    key: string,
    parameterDefinitions: ParameterMetadata
): Promise<ProcessParentKeyResult> {
    let innerKey: string;
    let itemKey: string = "";
    let combinedKey: string = "";
    let inputArrayNullable: boolean = false;
    let isSet: boolean = false;
    let isInputDeeplyNested = false;

    // Handle the key for nullable and optional fields
    key = key.replace(/\?*$/, "");

    // Check for a nested mapping like 'from var ... in ...'
    const nestedMappingMatch = key.match(/from\s+var\s+(\w+)\s+in\s+([\w?.]+)/);
    if (nestedMappingMatch) {
        itemKey = nestedMappingMatch[1];
        innerKey = nestedMappingMatch[2];

        const keys = innerKey.split(".");
        combinedKey = keys.slice(0, keys.length - 1).join(".");
    } else if (key.startsWith("{") && key.endsWith("}")) {
        // Handle complex nested mappings in braces
        const matches = key.match(/\{\s*([^}]+)\s*\}/);
        innerKey = matches ? matches[1] : key;

        // Use regex to find each deeply nested mapping within braces
        const nestedKeys = innerKey.match(/[\w\s]+:\s*([\w?.]+)/g);
        if (nestedKeys) {
            const parsedKeys = nestedKeys.map(kv => kv.split(":")[1].trim());
            innerKey = parsedKeys[0] || ""; // Assume the first entry for simplicity if multiple mappings
        } else {
            // Fallback for simpler cases
            innerKey = innerKey.split(",").map(kv => kv.split(":")[1].trim())[0] || "";
        }
    } else {
        // Standard case
        innerKey = key.match(/\(([^)]+)\)/)?.[1] || key;

        innerKey = innerKey
            .replace(/^check\s*/, '')
            .replace(/\.ensureType\(\)$/, '')
            .replace(/\.toString\(\)$/, '');
    }
    // Call the helper function to process parent keys
    const processedKeys = await processParentKey(innerKey, parameterDefinitions);
    itemKey = processedKeys.itemKey;
    combinedKey = processedKeys.combinedKey;
    inputArrayNullable = processedKeys.inputArrayNullable;
    isSet = processedKeys.isSet;
    isInputDeeplyNested = processedKeys.isInputDeeplyNested;
    return { itemKey, combinedKey, inputArrayNullable, isSet, isInputDeeplyNested };
}

function refineKey(key: string): string {
    return key
        .replace(/\?\./g, ".") // Replace `?.` with `.`
        .replace(/\?$/g, "") // Remove a trailing `?`
        .replace(/\s*\?:.*$/g, "") // Remove `?: <value>`
        .replace(/[\(\)]/g, ""); // Remove parentheses
}

async function processParentKey(
    innerKey: string,
    parameterDefinitions: ParameterMetadata
): Promise<ProcessParentKeyResult> {
    let itemKey: string = "";
    let combinedKey: string = "";
    let isSet: boolean = false;
    let inputArrayNullable: boolean = false;
    let isInputDeeplyNested: boolean = false;

    // Split the innerKey to get parent keys and field name
    let keys = innerKey.split(".");
    let fieldName = keys.pop()!;
    let parentKey = keys.slice(0, keys.length);

    const refinedInnerKey = refineKey(innerKey);
    const refinedKeys = refinedInnerKey.split(".");
    const refinedParentKey = refinedKeys.slice(0, keys.length);

    // Handle the base case where there's only one key
    if (refinedParentKey.length === 1) {
        itemKey = parentKey[0];
        combinedKey = parentKey[0];
        return { itemKey, combinedKey, inputArrayNullable, isSet, isInputDeeplyNested };
    }

    for (let index = refinedParentKey.length - 1; index > 0; index--) {
        const modifiedInputs = await getMetadata(parameterDefinitions, refinedParentKey, refinedParentKey[index], MetadataType.INPUT_METADATA);
        inputArrayNullable = modifiedInputs.nullableArray;

        const isArrayType = isArrayRecord(modifiedInputs.typeName) || isArrayEnumUnion(modifiedInputs.type);
        if (isArrayType) {
            if (!isSet) {
                itemKey = parentKey[index];
                combinedKey = parentKey.slice(0, index + 1).join(".");
                isSet = true;
            }
            isInputDeeplyNested = true;
        }
    }
    return { itemKey, combinedKey, inputArrayNullable, isSet, isInputDeeplyNested };
}

async function processCombinedKey(
    combinedKey: string,
    parameterDefinitions: ParameterMetadata
): Promise<ProcessCombinedKeyResult> {
    let isinputRecordArrayNullable: boolean = false;
    let isinputRecordArrayOptional: boolean = false;
    let isinputArrayNullable: boolean = false;
    let isinputArrayOptional: boolean = false;
    let isSet: boolean = false;
    let isinputNullableArray: boolean = false;

    let refinedCombinedKey = refineKey(combinedKey);
    let refinedCombinedKeys = refinedCombinedKey.split(".");
    let lastIndex = refinedCombinedKeys.length - 1;

    const modifiedInputs = await getMetadata(parameterDefinitions, refinedCombinedKeys, refinedCombinedKeys[lastIndex], MetadataType.INPUT_METADATA);

    if (!isSet && (isArrayRecord(modifiedInputs.typeName) || isArrayEnumUnion(modifiedInputs.type))) {
        isSet = true;
    }

    if (isSet) {
        // Update record array flags
        if (modifiedInputs.nullable) { isinputRecordArrayNullable = true; }
        if (modifiedInputs.optional) { isinputRecordArrayOptional = true; }

        // Check preceding elements for non-`record[]` types
        for (let nextIndex = lastIndex - 1; nextIndex >= 0; nextIndex--) {
            isinputNullableArray = false;
            const nextModifiedInputs = await getMetadata(parameterDefinitions, refinedCombinedKeys, refinedCombinedKeys[nextIndex], MetadataType.INPUT_METADATA);
            if (!(isArrayRecord(nextModifiedInputs.typeName) || isArrayEnumUnion(nextModifiedInputs.type))) {
                if (nextModifiedInputs.nullable) { isinputArrayNullable = true; }
                if (nextModifiedInputs.optional) { isinputArrayOptional = true; }
            } else {
                if (isArrayRecord(nextModifiedInputs.typeName) || isArrayEnumUnion(nextModifiedInputs.type)) {
                    if (nextModifiedInputs?.nullableArray && (nextIndex === (lastIndex - 1))) { isinputNullableArray = true; }
                }
                return { isinputRecordArrayNullable, isinputRecordArrayOptional, isinputArrayNullable, isinputArrayOptional, isinputNullableArray };
            }
        }
    }
    return { isinputRecordArrayNullable, isinputRecordArrayOptional, isinputArrayNullable, isinputArrayOptional, isinputNullableArray };
}

export async function requirementsSpecification(filepath: string): Promise<string> {
    if (!filepath) {
        throw new Error("File is undefined");
    }
    const fileData = await attatchmentToFileData({
        name: path.basename(filepath),
        content: getBase64FromFile(filepath), status: AttachmentStatus.UnknownError
    });
    const params: DataMapperRequest = {
        file: fileData,
        processType: "requirements",
        isRequirementAnalysis: true
    };
    const resp: DataMapperResponse = await processDataMapperInput(params);
    return resp.fileContent;
}

function getBase64FromFile(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString('base64');
}

export function cleanDiagnosticMessages(entries: DiagnosticEntry[]): DiagnosticEntry[] {
    return entries.map(entry => ({
        code: entry.code || "",
        message: entry.message,
    }));
}
