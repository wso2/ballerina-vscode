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
import { ErrorCode, FormField, STModification, SyntaxTree, Attachment, AttachmentStatus, RecordDefinitonObject, ParameterMetadata, ParameterDefinitions, MappingFileRecord, keywords, AIMachineEventType, DiagnosticEntry } from "@wso2/ballerina-core";
import { QuickPickItem, QuickPickOptions, window, workspace } from 'vscode';
import { UNKNOWN_ERROR } from '../../views/ai-panel/errorCodes';

import { StateMachine } from "../../stateMachine";
import {
    ENDPOINT_REMOVED,
    INVALID_PARAMETER_TYPE,
    INVALID_PARAMETER_TYPE_MULTIPLE_ARRAY,
    PARSING_ERROR,
    TIMEOUT,
    NOT_LOGGED_IN,
    USER_ABORTED,
    SERVER_ERROR,
    TOO_MANY_REQUESTS,
    INVALID_RECORD_UNION_TYPE
} from "../../views/ai-panel/errorCodes";
import { hasStopped } from "./rpc-manager";
// import { StateMachineAI } from "../../views/ai-panel/aiMachine";
import path from "path";
import * as fs from 'fs';
import { BACKEND_URL } from "../../features/ai/utils";
import { getAccessToken, getRefreshedAccessToken } from "../../../src/utils/ai/auth";
import { AIStateMachine } from "../../../src/views/ai-panel/aiMachine";
import { AIChatError } from "./utils/errors";

const BACKEND_BASE_URL = BACKEND_URL.replace(/\/v2\.0$/, "");
//TODO: Temp workaround as custom domain seem to block file uploads
const CONTEXT_UPLOAD_URL_V1 = "https://e95488c8-8511-4882-967f-ec3ae2a0f86f-prod.e1-us-east-azure.choreoapis.dev/ballerina-copilot/context-upload-api/v1.0";
// const CONTEXT_UPLOAD_URL_V1 = BACKEND_BASE_URL + "/context-api/v1.0";
const ASK_API_URL_V1 = BACKEND_BASE_URL + "/ask-api/v1.0";

const REQUEST_TIMEOUT = 2000000;

let abortController = new AbortController();
const primitiveTypes = ["string", "int", "float", "decimal", "boolean"];

export function handleStop() {
    abortController.abort();
}

export async function getParamDefinitions(
    fnSt: FunctionDefinition,
    fileUri: string
): Promise<ParameterDefinitions| ErrorCode> {
    let inputs: { [key: string]: any } = {};
    let inputMetadata: { [key: string]: any } = {};
    let output: { [key: string]: any } = {};
    let outputMetadata: { [key: string]: any } = {};
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

        if (STKindChecker.isArrayTypeDesc(param.typeName)) {
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
            return INVALID_PARAMETER_TYPE;
        }

        if ('types' in inputTypeDefinition && !inputTypeDefinition.types[0].hasOwnProperty('type')) {
            if (STKindChecker.isQualifiedNameReference(parameter.typeName)) {
                throw new Error(`"${parameter.typeName["identifier"].value}" does not exist in the package "${parameter.typeName["modulePrefix"].value}". Please verify the record name or ensure that the correct package is imported.`);
            } 
            return INVALID_PARAMETER_TYPE;
        }

        if (inputTypeDefinition["types"] && inputTypeDefinition["types"].length > 0) {
            const type = inputTypeDefinition["types"][0].type;
            if (type.typeName === "union" && type.members) {
                const hasFields = type.members.some(member => member.fields && member.fields.length > 0);
                if (hasFields) {
                    return INVALID_RECORD_UNION_TYPE;
                }
            }
        }

        let inputDefinition: ErrorCode | RecordDefinitonObject;
        if ('types' in inputTypeDefinition && inputTypeDefinition.types[0].type.hasOwnProperty('fields')) {
            inputDefinition = navigateTypeInfo(inputTypeDefinition.types[0].type.fields, false);
        } else {
            let singleFieldType = 'types' in inputTypeDefinition && inputTypeDefinition.types[0].type;
            inputDefinition = {
                "recordFields": { [paramName]: { "type": singleFieldType.typeName, "comment": "" } },
                "recordFieldsMetadata": {
                    [paramName]: {
                        "typeName": singleFieldType.typeName,
                        "type": singleFieldType.typeName,
                        "typeInstance": paramName,
                        "nullable": false,
                        "optional": false
                    }
                }
            };
        }

        if (isErrorCode(inputDefinition)) {
            return inputDefinition as ErrorCode;
        }
        
        inputs = { ...inputs, [paramName]: (inputDefinition as RecordDefinitonObject).recordFields };
        inputMetadata = {
            ...inputMetadata,
            [paramName]: {
                "isArrayType": STKindChecker.isArrayTypeDesc(parameter.typeName),
                "parameterName": paramName,
                "parameterType": paramType,
                "type": STKindChecker.isArrayTypeDesc(parameter.typeName) ? "record[]" : "record",
                "fields": (inputDefinition as RecordDefinitonObject).recordFieldsMetadata
            }
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
                return INVALID_PARAMETER_TYPE;
            }
            isErrorExists = true;
        } else if (STKindChecker.isArrayTypeDesc(rightType) && STKindChecker.isErrorTypeDesc(leftType)) {
            if (!STKindChecker.isSimpleNameReference(rightType.memberTypeDesc)) {
                return INVALID_PARAMETER_TYPE;
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
            return INVALID_PARAMETER_TYPE;
        }
    } else if (STKindChecker.isArrayTypeDesc(fnSt.functionSignature.returnTypeDesc.type)) {
        if (arrayParams > 1) {
            return INVALID_PARAMETER_TYPE_MULTIPLE_ARRAY;
        }
        if (!hasArrayParams) {
            return INVALID_PARAMETER_TYPE_MULTIPLE_ARRAY;
        }
        if (!(STKindChecker.isSimpleNameReference(fnSt.functionSignature.returnTypeDesc.type.memberTypeDesc) ||
            STKindChecker.isQualifiedNameReference(fnSt.functionSignature.returnTypeDesc.type.memberTypeDesc))) {
            return INVALID_PARAMETER_TYPE;
        }
    } else {
        if (!STKindChecker.isSimpleNameReference(fnSt.functionSignature.returnTypeDesc.type) &&
            !STKindChecker.isQualifiedNameReference(fnSt.functionSignature.returnTypeDesc.type)) {
                return INVALID_PARAMETER_TYPE;
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
        return INVALID_PARAMETER_TYPE;
    }

    if (outputTypeDefinition["types"] && outputTypeDefinition["types"].length > 0) {
        const type = outputTypeDefinition["types"][0].type;
        if (type.typeName === "union" && type.members) {
            const hasFields = type.members.some(member => member.fields);
            if (hasFields) {
                return INVALID_RECORD_UNION_TYPE;
            }
        }
    }

    const outputDefinition = navigateTypeInfo('types' in outputTypeDefinition && outputTypeDefinition.types[0].type.fields, false);

    if (isErrorCode(outputDefinition)) {
        return outputDefinition as ErrorCode;
    }

    output = { ...(outputDefinition as RecordDefinitonObject).recordFields };
    outputMetadata = { ...(outputDefinition as RecordDefinitonObject).recordFieldsMetadata };

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
}

export async function processMappings(
    fnSt: FunctionDefinition,
    fileUri: string,
    file?: Attachment
): Promise<SyntaxTree | ErrorCode> {
    let result = await getParamDefinitions(fnSt, fileUri);
    if (isErrorCode(result)) {
        return result as ErrorCode;
    }
    let parameterDefinitions = (result as ParameterDefinitions).parameterMetadata;
    const isErrorExists = (result as ParameterDefinitions).errorStatus;

    if (file) {
        let mappedResult = await mappingFileParameterDefinitions(file, parameterDefinitions);
        if (isErrorCode(mappedResult)) {
            return mappedResult as ErrorCode;
        }
        parameterDefinitions = mappedResult as ParameterMetadata; 
    }

    const codeObject = await getDatamapperCode(parameterDefinitions);
    if (isErrorCode(codeObject) || Object.keys(codeObject).length === 0) {
        return codeObject as ErrorCode;
    }

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


export async function generateBallerinaCode(response: object, parameterDefinitions: ParameterMetadata | ErrorCode, nestedKey: string = "", nestedKeyArray: string[]): Promise<object|ErrorCode> {
    let recordFields: { [key: string]: any } = {};
    const arrayRecords = [
        "record[]", "record[]|()", "(readonly&record)[]", "(readonly&record)[]|()",
        "(record|())[]", "(record|())[]|()", "(readonly&record|())[]", "(readonly&record|())[]|()",
    ];
    const arrayEnumUnion = ["enum[]", "union[]", "intersection[]", "enum[]|()", "union[]|()", "intersection[]|()"];
    const recordTypes = [
        "record", "record|()", "readonly&record", "readonly&record|()",
        "record[]", "record[]|()", "(readonly&record)[]", "(readonly&record)[]|()",
        "(record|())[]", "(record|())[]|()", "(readonly&record|())[]", "(readonly&record|())[]|()",
    ];
    const unionEnumIntersectionTypes = [
        "enum", "union", "intersection", "enum[]", 
        "enum[]|()", "union[]", "union[]|()", "intersection[]", "intersection[]|()"];

    if (response.hasOwnProperty("code") && response.hasOwnProperty("message")) {
        return response as ErrorCode;
    }

    if (response.hasOwnProperty("operation") && response.hasOwnProperty("parameters") && response.hasOwnProperty("targetType")) {
        let path = await getMappingString(response, parameterDefinitions, nestedKey, recordTypes, unionEnumIntersectionTypes, arrayRecords, arrayEnumUnion, nestedKeyArray);
        if (isErrorCode(path)) {
            return {};
        }        
        if (path === "") {
            return {};
        }
        let parameters: string[] = response["parameters"];
        let paths = parameters[0].split(".");
        let recordFieldName: string = nestedKey || paths[1];

        return { [recordFieldName]: path };
    } else {
        let objectKeys = Object.keys(response);
        for (let index = 0; index < objectKeys.length; index++) {
            let key = objectKeys[index];
            let subRecord = response[key];
            
            if (!subRecord.hasOwnProperty("operation") && !subRecord.hasOwnProperty("parameters") && !subRecord.hasOwnProperty("targetType")) {
                nestedKeyArray.push(key);
                let responseRecord = await generateBallerinaCode(subRecord, parameterDefinitions, key, nestedKeyArray);
                let recordFieldDetails = await handleRecordArrays(key, nestedKey, responseRecord, parameterDefinitions, arrayRecords, arrayEnumUnion, nestedKeyArray);
                nestedKeyArray.pop();
                recordFields = { ...recordFields, ...recordFieldDetails };
            } else {
                let nestedResponseRecord = await generateBallerinaCode(subRecord, parameterDefinitions, key, nestedKeyArray);
                recordFields = { ...recordFields, ...nestedResponseRecord };
            }
        }

        return { ...recordFields };
    }
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
    const validUnionTypes = getUnionTypes(primitiveTypes); // Get valid union types
    return validUnionTypes.includes(sortedType); // Check against Set
}

async function getMappingString(mapping: object, parameterDefinitions: ParameterMetadata | ErrorCode, nestedKey:string, recordTypes: string[], unionEnumIntersectionTypes: string[], arrayRecords: string[], arrayEnumUnion: string[], nestedKeyArray: string[]): Promise<string | ErrorCode>  {
    let operation: string = mapping["operation"];
    let targetType: string = mapping["targetType"];
    let parameters: string[] = mapping["parameters"];
    
    let path: string = "";
    let modifiedPaths: string[] = [];
    let inputTypeName: string = "";
    let inputType: string = "";
    let baseType: string = "";
    let baseTargetType: string = "";
    let outputType: string = "";
    let baseOutputType: string = "";
    let baseInputType: string = "";
    let modifiedInput: object;
    let outputObject: object;
    let isInputNullableArray: boolean;
    let isOutputNullableArray: boolean;

    let paths = parameters[0].split(".");
    let recordObjectName: string = paths[0];

    // Retrieve inputType
    if (paths.length > 2) {
        modifiedInput = await getNestedType(paths.slice(1), parameterDefinitions["inputMetadata"][recordObjectName]);
    } else {
        modifiedInput = parameterDefinitions["inputMetadata"][recordObjectName]["fields"][paths[1]];
    }

    // Resolve output metadata
    if (nestedKeyArray.length > 0) {
        outputObject = await resolveMetadata(parameterDefinitions, nestedKeyArray, nestedKey, "outputMetadata");
        if (!outputObject) { throw new Error(`Metadata not found for ${nestedKey}.`); }
    } else if (parameterDefinitions["outputMetadata"].hasOwnProperty("fields") || !parameterDefinitions["outputMetadata"][nestedKey]) {
        throw new Error(`Invalid or missing metadata for nestedKey: ${nestedKey}.`);
    } else {
        outputObject = parameterDefinitions["outputMetadata"][nestedKey];
    }

    baseTargetType= targetType.replace(/\|\(\)$/, "");

    inputTypeName = modifiedInput["typeName"];
    baseType = inputTypeName.replace(/\|\(\)$/, "");

    inputType = modifiedInput["type"];
    baseInputType = inputType.replace(/\|\(\)$/, "");

    outputType = outputObject["type"];
    baseOutputType = outputType.replace(/\|\(\)$/, "");

    if (operation === "DIRECT") {
        if (parameters.length > 1) {
            return "";
        }
        // Helper function to check if type contains []
        const hasArrayNotation = (type: string) => type.includes("[]");
        if (recordTypes.includes(baseType)) {
            // Both baseType and baseTargetType either contain "[]" or do not
            if (!(hasArrayNotation(baseType) === hasArrayNotation(baseTargetType)) && !(baseTargetType === "int")) {
                return ""; 
            } 
        } else if (unionEnumIntersectionTypes.includes(baseOutputType)) {
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
            nestedKey, 
            operation,
            unionEnumIntersectionTypes,
            recordTypes,
            arrayRecords,
            arrayEnumUnion
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
        if (baseType === "string" && baseTargetType === "string[]") {
            return `re \`,\`.split(${path})`;
        }

        // Add length operation if inputType is "record[]" and targetType is "int"
        if (arrayRecords.includes(baseType) && baseTargetType === "int") {
            return `(${path}).length()`;
        }

        // Type conversion logic
        const stringConversions: { [key: string]: string } = {
            int: "check int:fromString",
            float: "check float:fromString",
            decimal: "check decimal:fromString",
            boolean: "check boolean:fromString"
        };

        const numericConversions: { [key: string]: { [key: string]: string } } = {
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

        function convertUnionTypes(inputType: string, targetType: string, variablePath: string) {
            const inputTypes = inputType.split("|").filter(type => primitiveTypes.includes(type));
            
            if (targetType === "string") {
                return `(${variablePath}).toString()`;
            }
            
            if (inputTypes.includes("string") && ["int", "float", "decimal", "boolean"].includes(targetType)) {
                return `(${variablePath}) is string ? check ${targetType}:fromString((${variablePath}).toString()) : check (${variablePath}).ensureType()`;
            }
            
            if (["int", "float", "decimal", "boolean"].includes(targetType)) {
                return `check (${variablePath}).ensureType()`;
            }
            
            return `${variablePath}`;
        }

        isOutputNullableArray = outputObject["nullableArray"];
        isInputNullableArray = modifiedInput["nullableArray"];

        const isStringInput = ["string", "string|()"].includes(inputTypeName);
        const isStringTarget = ["string", "string|()"].includes(targetType);
        if (primitiveTypes.includes(baseTargetType) && primitiveTypes.includes(baseType)) {
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
                if (conversion && baseTargetType !== "boolean") {
                    path = conversion;
                } else if (baseType === baseTargetType) {
                    path = `${path}`;
                } else if ((targetType.includes("|()") && inputTypeName !== baseTargetType) || inputTypeName.includes("|()") && baseTargetType !== "boolean") {
                    path = `check (${path}).ensureType()`;
                } else {
                    return "";
                }
            }
        } else if (unionEnumIntersectionTypes.includes(inputType)) {
            if (isUnionType(baseType)) {
                path = convertUnionTypes(baseType, baseTargetType, path);
            } else {
                path = `${path}`;
                if (isInputNullableArray && !isOutputNullableArray) {
                    path = `check (${path}).cloneWithType()`;
                }
            }
        }
    } else if (operation === "LENGTH") {
        if (parameters.length > 1) {
            return "";
        }
        modifiedPaths = await accessMetadata(
            paths, 
            parameterDefinitions, 
            outputObject, 
            baseType, 
            baseTargetType,
            nestedKey, 
            operation,
            unionEnumIntersectionTypes,
            recordTypes,
            arrayRecords,
            arrayEnumUnion
        );
        for (let index = 0; index < modifiedPaths.length; index++) {
            if (path !== "") {
                path = `${path}.`;
            }
            path = `${path}${modifiedPaths[index]}`;
        }
        path = `(${path}).length()`;
    } else if (operation === "SPLIT") {
        if (parameters.length > 2) {
            return "";
        }
        modifiedPaths = await accessMetadata(
            paths, 
            parameterDefinitions, 
            outputObject, 
            baseType, 
            baseTargetType,
            nestedKey, 
            operation,
            unionEnumIntersectionTypes,
            recordTypes,
            arrayRecords,
            arrayEnumUnion
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
    constructor() {}

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
        context.recordFields[fieldName] = (temporaryRecord as RecordDefinitonObject).recordFields;
        context.recordFieldsMetadata[fieldName] = {
            nullable: context.isNill,
            optional: field.optional,
            type: "record",
            typeInstance: fieldName,
            typeName: field.typeName,
            fields: (temporaryRecord as RecordDefinitonObject).recordFieldsMetadata
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

function navigateTypeInfo(
    typeInfos: FormField[],
    isNill: boolean
): RecordDefinitonObject | ErrorCode {
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
        "recordFields": context.recordFields, 
        "recordFieldsMetadata": context.recordFieldsMetadata 
    };
}

export function getBalRecFieldName(fieldName: string) {
    return keywords.includes(fieldName) ? `'${fieldName}` : fieldName;
}

export async function getDatamapperCode(parameterDefinitions: ErrorCode | ParameterMetadata): Promise<object | ErrorCode> {
    let nestedKeyArray: string[] = [];
    try {
        const accessToken = await getAccessToken().catch((error) => {
            console.error(error);
            return NOT_LOGGED_IN;
        });
        let response = await sendDatamapperRequest(parameterDefinitions, accessToken);
        if (isErrorCode(response)) {
            return (response as ErrorCode);
        }

        response = (response as Response);

        // Refresh
        if (response.status === 401) {
            const newAccessToken = await getRefreshedAccessToken();
            if (!newAccessToken) {
                AIStateMachine.service().send(AIMachineEventType.LOGOUT);
                return;
            }
            let retryResponse: Response | ErrorCode = await sendDatamapperRequest(parameterDefinitions, newAccessToken);
            
            if (isErrorCode(retryResponse)) {
                return (retryResponse as ErrorCode);
            }

            retryResponse = (retryResponse as Response);
            let intermediateMapping = await filterResponse(retryResponse); 
            let finalCode =  await generateBallerinaCode(intermediateMapping, parameterDefinitions, "", nestedKeyArray);
            return finalCode;
        }
        let intermediateMapping = await filterResponse(response);
        let finalCode =  await generateBallerinaCode(intermediateMapping, parameterDefinitions, "", nestedKeyArray);
        return finalCode; 
    } catch (error) {
        console.error(error);
        return TIMEOUT;
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

async function sendDatamapperRequest(parameterDefinitions: ParameterMetadata | ErrorCode, accessToken: string | ErrorCode): Promise<Response | ErrorCode> {
    const response = await fetchWithTimeout(BACKEND_URL + "/datamapper", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Ballerina-VSCode-Plugin',
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(parameterDefinitions)
    }, REQUEST_TIMEOUT);

    return response;
}

async function sendMappingFileUploadRequest(file: Blob): Promise<Response | ErrorCode> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchWithToken(CONTEXT_UPLOAD_URL_V1 + "/file_upload/generate_mapping_instruction", {
        method: "POST",
        body: formData
    });
    return response;
}

export async function searchDocumentation(message: string): Promise<string> {
    const response = await fetchWithToken(ASK_API_URL_V1 + "/documentation-assistant", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "query": `${message}`
        })
    });

    return await filterDocumentation(response as Response);
    
}

export async function filterDocumentation(resp: Response): Promise<string> {
    let responseContent: string;
    if (resp.status == 200 || resp.status == 201) {
        const data = (await resp.json()) as any;
        console.log("data",data.response);
        const finalResponse = await (data.response.content).replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        const referenceSources = data.response.references;
        if (referenceSources.length > 0) {
            responseContent = `${finalResponse}  \nreference sources:  \n${referenceSources.join('  \n')}`;
        }else{
            responseContent = finalResponse;
        }

        return responseContent;
    }
    throw new Error(AIChatError.UNKNOWN_CONNECTION_ERROR);
}

async function filterMappingResponse(resp: Response): Promise<string| ErrorCode> {
    if (resp.status == 200 || resp.status == 201) {
        const data = (await resp.json()) as any;
        return data.file_content;
    }
    if (resp.status == 404) {
        return ENDPOINT_REMOVED;
    }
    if (resp.status == 400) {
        const data = (await resp.json()) as any;
        console.log(data);
        return PARSING_ERROR;
    } if (resp.status == 429) {
        return TOO_MANY_REQUESTS;
    } 
    if (resp.status == 500) {
        return SERVER_ERROR;
    } else {
        //TODO: Handle more error codes
        return { code: 4, message: `An unknown error occured. ${resp.statusText}.` };
    }
}

export async function getMappingFromFile(file: Blob): Promise<MappingFileRecord | ErrorCode> {
    try {
        let response = await sendMappingFileUploadRequest(file);
        if (isErrorCode(response)) {
            return response as ErrorCode;
        }
        response = response as Response;
        let mappingContent = JSON.parse((await filterMappingResponse(response)) as string);
        if (isErrorCode(mappingContent)) {
            return mappingContent as ErrorCode;
        }
        return mappingContent;
    } catch (error) {
        console.error(error);
        return TIMEOUT;
    }
}

async function sendTypesFileUploadRequest(file: Blob): Promise<Response | ErrorCode> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchWithToken(CONTEXT_UPLOAD_URL_V1 + "/file_upload/generate_record", {
        method: "POST",
        body: formData
    });
    return response;
}

export async function getTypesFromFile(file: Blob): Promise<string | ErrorCode> {
    try {
        let response = await sendTypesFileUploadRequest(file);
        if (isErrorCode(response)) {
            return response as ErrorCode;
        }
        response = response as Response;
        let typesContent = await filterMappingResponse(response) as string;
        return typesContent;
    } catch (error) {
        console.error(error);
        return TIMEOUT;
    }
}

export async function mappingFileParameterDefinitions(file: Attachment, parameterDefinitions: ErrorCode | ParameterMetadata): Promise<ParameterMetadata | ErrorCode> {
    if (!file) { return parameterDefinitions; }

    const convertedFile = convertBase64ToBlob(file);
    if (!convertedFile) { throw new Error("Invalid file content"); }

    let mappingFile = await getMappingFromFile(convertedFile);
    if (isErrorCode(mappingFile)) { return mappingFile as ErrorCode; }

    mappingFile = mappingFile as MappingFileRecord;

    return {
        ...parameterDefinitions,
        mapping_fields: mappingFile.mapping_fields,
    };
}

export async function typesFileParameterDefinitions(file: Attachment): Promise<string | ErrorCode> {
    if (!file) { throw new Error("File is undefined"); }

    const convertedFile = convertBase64ToBlob(file);
    if (!convertedFile) { throw new Error("Invalid file content"); }

    let typesFile = await getTypesFromFile(convertedFile);
    if (isErrorCode(typesFile)) { return typesFile as ErrorCode; }

    return typesFile;
}

function convertBase64ToBlob(file: Attachment): Blob | null {
    try {
        const { content: base64Content, name: fileName } = file;
        const binaryString = atob(base64Content);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const mimeType = determineMimeType(fileName);
        return new Blob([bytes], { type: mimeType });
    } catch (error) {
        console.error("Error converting Base64 to Blob", error);
        return null;
    }
}

function determineMimeType(fileName: string): string {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
        case "pdf": return "application/pdf";
        case "txt": return "text/plain";
        case "jpg":
        case "jpeg": return "image/jpeg";
        case "png": return "image/png";
        case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        case "doc": return "application/msword";
        case "heic":
        case "heif": return "image/heif";
        default: return "application/octet-stream";
    }
}

async function fetchWithTimeout(url, options, timeout = 100000): Promise<Response | ErrorCode> {
    abortController = new AbortController();
    const id = setTimeout(() => abortController.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: abortController.signal });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        if (error.name === 'AbortError' && !hasStopped) {
            return TIMEOUT;
        } else if (error.name === 'AbortError' && hasStopped) {
            return USER_ABORTED;
        } else {
            console.error(error);
            return SERVER_ERROR;
        }
    }
}

export function isErrorCode(error: any): boolean {
    return error.hasOwnProperty("code") && error.hasOwnProperty("message");
}

async function accessMetadata(
    paths: string[],
    parameterDefinitions: ParameterMetadata | ErrorCode,
    outputObject: object,
    baseType: string,
    baseTargetType: string,
    nestedKey: string,
    operation: string,
    unionEnumIntersectionTypes: string[],
    recordTypes: string[],
    arrayRecords: string[],
    arrayEnumUnion: string[]
): Promise<string[]> {
    let newPath: string[] = [...paths];
    let isOutputNullable = false;
    let isOutputOptional = false;
    let isUsingDefault = false;
    let isUsingArray = false;
    let defaultValue: string;
    let isOutputRecordNullable = false;
    let modifiedBaseType: string;

    const outputMetadataType = outputObject["typeName"];
    baseTargetType = outputMetadataType.replace(/\|\(\)$/, "");
    isOutputNullable = outputObject["nullable"];
    isOutputOptional = outputObject["optional"];
    isOutputRecordNullable = outputObject["nullableArray"];

    // Process paths for metadata
    for (let index = 1; index < paths.length; index++) {
        const pathIndex = paths[index];
        let inputObject = await resolveMetadata(parameterDefinitions, paths, pathIndex, "inputMetadata");
        if (!inputObject) { throw new Error(`Field ${pathIndex} not found in metadata.`); }

        const isInputNullable = inputObject["nullable"];
        const isInputOptional = inputObject["optional"];
        const isInputNullableArray = inputObject["nullableArray"];

        if (inputObject.hasOwnProperty("members") || inputObject.hasOwnProperty("fields") || operation === "LENGTH") {
            const inputMetadataType = inputObject["type"];
            const metadataTypeName = inputObject["typeName"];
            const isInputRecordNullableArray = inputObject["nullableArray"];
            const isInputRecordNullable = inputObject["nullable"];
            const isInputRecordOptional = inputObject["optional"];
            if (!["enum", "enum|()"].includes(inputMetadataType)) {
                isUsingDefault = false;
            }
            
            if (arrayRecords.includes(metadataTypeName) || arrayEnumUnion.includes(inputMetadataType)) {
                if (isInputRecordNullableArray) {
                    isUsingArray = true;
                } else {
                    isUsingArray = false;
                }
            }
            if (isUsingArray && recordTypes.includes(metadataTypeName)) {
                newPath[index] = `${paths[index]}?`;
            }
            if (isInputRecordNullable || isInputRecordOptional) {
                // Handle record types
                if (recordTypes.includes(metadataTypeName)) {
                    if (!metadataTypeName.includes("[]")) {
                        if (index !== (paths.length - 1)) {
                            newPath[index] = `${paths[index]}?`;
                            isUsingDefault = true;
                        }
                    }
                    if (metadataTypeName.includes("[]") && operation === "LENGTH") {
                        let lastInputObject = await resolveMetadata(parameterDefinitions, paths, paths[paths.length - 1], "inputMetadata");
                        let inputDataType = lastInputObject["typeName"].replace(/\|\(\)$/, "");
                        defaultValue = await getDefaultValue(inputDataType);
                        newPath[paths.length - 1] = `${paths[paths.length - 1]}?:${defaultValue}`;
                    }
                    if (isInputRecordNullable && isInputRecordOptional) {
                        newPath[index - 1] = `${paths[index - 1]}?`;
                    }
                // Handle enum, union, and intersection types    
                } else if (unionEnumIntersectionTypes.includes(inputMetadataType)) {
                    if (isInputRecordNullable && isInputRecordOptional) {
                        newPath[index - 1] = `${paths[index - 1]}?`;
                    }  
                    if (inputMetadataType.includes("[]") && operation === "LENGTH") {
                        let lastInputObject = await resolveMetadata(parameterDefinitions, paths, paths[paths.length - 1], "inputMetadata");
                        let inputDataType = lastInputObject["type"].replace(/\|\(\)$/, "");
                        defaultValue = await getDefaultValue(inputDataType);
                        newPath[paths.length - 1] = `${paths[paths.length - 1]}?:${defaultValue}`;
                    } else if (!isOutputNullable && !isOutputOptional) {   
                        if (unionEnumIntersectionTypes.includes(inputObject["type"]) && inputObject["members"]) {
                            if (!isInputRecordNullableArray || isOutputRecordNullable){
                                let typeName = inputMetadataType.includes("[]")
                                    ? inputMetadataType.replace(/\|\(\)$/, "")
                                    : (inputObject as any).members[Object.keys((inputObject as any).members)[0]].typeName;
                        
                                let defaultValue = await getDefaultValue(typeName);
                                newPath[paths.length - 1] = `${paths[paths.length - 1]}?:${defaultValue !== "void" ? defaultValue : JSON.stringify(typeName)}`;
                            }
                        }
                        return newPath;
                    }
                }
            } else {
                if (isUsingDefault && unionEnumIntersectionTypes.includes(inputObject["type"]) && inputObject["members"]) {
                    if (!isOutputNullable && !isOutputOptional) {
                        let typeName = inputMetadataType.includes("[]") 
                            ? inputMetadataType.replace("|()", "") 
                            : (inputObject as any).members[Object.keys((inputObject as any).members)[0]].typeName;
                        
                        let defaultValue = await getDefaultValue(typeName);
                        newPath[paths.length - 1] = `${paths[paths.length - 1]}?:${defaultValue !== "void" ? defaultValue : JSON.stringify(typeName)}`;
                    }
                }
            }
        } else {
            if (isInputNullable && isInputOptional) {
                newPath[index - 1] = `${paths[index - 1]}?`;
            }
            if (!primitiveTypes.includes(baseType)) {
                if (baseType.includes("[]")) {
                    if (!isInputNullableArray || isOutputRecordNullable){
                        defaultValue = `[]`;
                    }
                } else {
                    let cleanedBaseType = baseType.replace(/[\[\]()]*/g, ""); 
                    if (cleanedBaseType.includes("|")) {
                        modifiedBaseType = cleanedBaseType.split("|")[0].trim();
                    } else {
                        modifiedBaseType = cleanedBaseType;
                    }
                    defaultValue = await getDefaultValue(modifiedBaseType);
                }
            } else {
                defaultValue = await getDefaultValue(baseType);
            }           

            if (isUsingArray) {
                newPath[index] = `${pathIndex}?:${defaultValue}`;
            }

            if (isUsingDefault && !isOutputNullable && !isOutputOptional) {
                newPath[index] = `${pathIndex}?:${defaultValue}`;
            } else if ((isInputNullable || isInputOptional)) { 
                if (!isOutputNullable && !isOutputOptional) {
                    if (!isInputNullableArray && isOutputRecordNullable) {
                        newPath[index] = `${pathIndex}?:${defaultValue}`;
                    } else {
                        newPath[index] = baseType === "string" || baseType === baseTargetType
                            ? `${pathIndex}?:${defaultValue}`
                            : `${pathIndex}`;
                    }
                } else {
                    newPath[index] = baseType !== baseTargetType && baseType === "string"
                        ? `${pathIndex}?:${defaultValue}`
                        : `${pathIndex}`;
                }
            }
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

async function getNestedType(paths: string[], metadata: object): Promise<object> {
    let currentMetadata = metadata;
    for (let i = 0; i < paths.length; i++) {
        let cleanPath = paths[i].replace(/\?.*$/, "");
        if (currentMetadata["fields"] && currentMetadata["fields"][cleanPath]) {
            currentMetadata = currentMetadata["fields"][cleanPath];
        } else if (currentMetadata["members"] && currentMetadata["members"][cleanPath]) {
            currentMetadata = currentMetadata["members"][cleanPath];
        } else {
            throw new Error(`Field ${cleanPath} not found in metadata.`);
        }
    }
    return currentMetadata;
}

async function resolveMetadata(parameterDefinitions: ParameterMetadata | ErrorCode, nestedKeyArray: string[], key: string, metadataKey: "inputMetadata" | "outputMetadata"): Promise<object|null> {
    let metadata = parameterDefinitions[metadataKey];
    for (let nk of nestedKeyArray) {
        if (metadata[nk] && (metadata[nk]["fields"] || metadata[nk]["members"])) {
            if (nk === key){
                return metadata[nk];
            }
            metadata = metadata[nk]["fields"] || metadata[nk]["members"];
        } else {
            return metadata[key];
        }
    }
    return metadata[key];
}

async function handleRecordArrays(key: string, nestedKey: string, responseRecord: object, parameterDefinitions: ParameterMetadata | ErrorCode, arrayRecords: string[], arrayEnumUnion: string[], nestedKeyArray: string[]) {
    let recordFields: { [key: string]: any } = {};
    let subObjectKeys = Object.keys(responseRecord);

    let formattedRecordsArray: string[] = [];
    let itemKey: string = "";
    let combinedKey: string = "";
    let modifiedOutput: object;
    let outputMetadataType: string = "";
    let outputMetadataTypeName: string = "";

    for (let subObjectKey of subObjectKeys) {
        if (!nestedKey) {
            modifiedOutput = parameterDefinitions["outputMetadata"][key];
        } else {
            modifiedOutput = await resolveMetadata(parameterDefinitions, nestedKeyArray, key, "outputMetadata");
            if (!modifiedOutput) {
                throw new Error(`Metadata not found for ${nestedKey}.`);
            }
        }
        outputMetadataTypeName = modifiedOutput["typeName"];
        outputMetadataType = modifiedOutput["type"];
        let isDeeplyNested = (arrayRecords.includes(outputMetadataTypeName) || arrayEnumUnion.includes(outputMetadataType));

        let { itemKey: currentItemKey, combinedKey: currentCombinedKey, inputArrayNullable:currentArrayNullable } = await extractKeys(responseRecord[subObjectKey], parameterDefinitions, arrayRecords, arrayEnumUnion);
        if (currentItemKey.includes('?')) {
            currentItemKey = currentItemKey.replace('?', '');
        }
        if (modifiedOutput.hasOwnProperty("fields") || modifiedOutput.hasOwnProperty("members")) {
            if (isDeeplyNested) {
                const subArrayRecord = responseRecord[subObjectKey];
                const isCombinedKeyModified = currentCombinedKey.endsWith('?');
                const replacementKey = currentArrayNullable || isCombinedKeyModified 
                    ? `${currentItemKey}Item?.` 
                    : `${currentItemKey}Item.`;
        
                const regex = new RegExp(
                    currentCombinedKey.replace(/\?/g, '\\?').replace(/\./g, '\\.') + '\\.', 'g'
                );
        
                formattedRecordsArray.push(
                    `${subObjectKey}: ${subArrayRecord.replace(regex, replacementKey)}`
                );

                itemKey = currentItemKey;
                combinedKey = currentCombinedKey;
            } else {
                formattedRecordsArray.push(`${subObjectKey}: ${responseRecord[subObjectKey]}`);
            }
        } else {
            recordFields = { ...recordFields, [key]: responseRecord };
        }
    }

    if (formattedRecordsArray.length > 0 && itemKey && combinedKey) {
        const formattedRecords = formattedRecordsArray.join(",\n");
        const keyToReplace = combinedKey.endsWith('?') ? combinedKey.replace(/\?$/, '') : combinedKey;
        const processedKeys = await processCombinedKey(combinedKey, parameterDefinitions, arrayRecords, arrayEnumUnion);
        const combinedKeyExpression = (processedKeys.isinputRecordArrayNullable || processedKeys.isinputRecordArrayOptional || processedKeys.isinputArrayNullable || processedKeys.isinputArrayOptional || processedKeys.isinputNullableArray)
            ? `${keyToReplace} ?: []`
            : keyToReplace;
        recordFields[key] = `from var ${itemKey}Item in ${combinedKeyExpression}\n select {\n ${formattedRecords}\n}`;
    } else {
        recordFields[key] = `{\n ${formattedRecordsArray.join(",\n")} \n}`;
    }

    return { ...recordFields };
}

async function filterResponse(resp: Response): Promise<object | ErrorCode> {
    if (resp.status == 200 || resp.status == 201) {
        const data = (await resp.json()) as any;
        console.log(JSON.stringify(data.mappings));
        return data.mappings;
    }
    if (resp.status == 404) {
        return ENDPOINT_REMOVED;
    }
    if (resp.status == 400) {
        const data = (await resp.json()) as any;
        console.log(data);
        return PARSING_ERROR;
    } 
    if (resp.status == 429) {
        return TOO_MANY_REQUESTS;
    } 
    if (resp.status == 500) {
        return SERVER_ERROR;
    } else {
        //TODO: Handle more error codes
        return TIMEOUT;
    }
}

async function extractKeys(
    key: string,
    parameterDefinitions: ParameterMetadata | ErrorCode,
    arrayRecords: string[],
    arrayEnumUnion: string[]
): Promise<{
    itemKey: string;
    combinedKey: string;
    inputArrayNullable: boolean;
}> {
    let innerKey: string;
    let itemKey: string = "";
    let combinedKey: string = "";
    let inputArrayNullable: boolean = false;

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
    const processedKeys = await processParentKey(innerKey, parameterDefinitions, arrayRecords, arrayEnumUnion);
    itemKey = processedKeys.itemKey;
    combinedKey = processedKeys.combinedKey;
    inputArrayNullable = processedKeys.inputArrayNullable;
    return { itemKey, combinedKey, inputArrayNullable };
}

async function processParentKey(
    innerKey: string, 
    parameterDefinitions: ParameterMetadata | ErrorCode, 
    arrayRecords: string[],
    arrayEnumUnion: string[]
): Promise<{ 
    itemKey: string; 
    combinedKey: string; 
    inputArrayNullable: boolean;
}> {
    let inputMetadataType: string = "";
    let inputMetadataTypeName: string = "";
    let itemKey: string = "";
    let combinedKey: string = "";
    let refinedInnerKey: string;
    let isSet: boolean = false;
    let inputArrayNullable: boolean = false;

    // Split the innerKey to get parent keys and field name
    let keys = innerKey.split(".");
    let fieldName = keys.pop()!;
    let parentKey = keys.slice(0, keys.length);

    refinedInnerKey = innerKey
        .replace(/\?\./g, ".") // Replace `?.` with `.`
        .replace(/\?$/g, "") // Remove a trailing `?`
        .replace(/\s*\?:.*$/g, "") // Remove `?: <value>`
        .replace(/[\(\)]/g, ""); // Remove parentheses

    let refinedKeys = refinedInnerKey.split(".");
    let refinedFieldName = refinedKeys.pop()!;
    let refinedParentKey = refinedKeys.slice(0, refinedKeys.length);

    // Handle the base case where there's only one key
    if (refinedParentKey.length === 1) {
        itemKey = parentKey[0];
        combinedKey = parentKey[0];
        return { itemKey, combinedKey, inputArrayNullable };
    }

    for (let index = refinedParentKey.length - 1; index > 0; index--) {
        const modifiedInputs = await resolveMetadata(parameterDefinitions, refinedParentKey, refinedParentKey[index], "inputMetadata");
        if (!modifiedInputs) {
            throw new Error(`Metadata not found for ${refinedParentKey[index]}.`);
        }
        inputMetadataTypeName = modifiedInputs["typeName"];
        inputMetadataType = modifiedInputs["type"];
        inputArrayNullable = modifiedInputs["nullableArray"];

        if (!isSet && (arrayEnumUnion.includes(inputMetadataType) || arrayRecords.includes(inputMetadataTypeName))) {
            itemKey = parentKey[index];
            combinedKey = parentKey.slice(0, index + 1).join(".");
            isSet = true;
        }
    }
    return { itemKey, combinedKey, inputArrayNullable };
}

async function processCombinedKey(
    combinedKey: string,
    parameterDefinitions: ParameterMetadata | ErrorCode,
    arrayRecords: string[],
    arrayEnumUnion: string[]
): Promise<{
    isinputRecordArrayNullable: boolean;
    isinputRecordArrayOptional: boolean;
    isinputArrayNullable: boolean;
    isinputArrayOptional: boolean;
    isinputNullableArray: boolean;
}> {
    let isinputRecordArrayNullable: boolean = false;
    let isinputRecordArrayOptional: boolean = false;
    let isinputArrayNullable: boolean = false;
    let isinputArrayOptional: boolean = false;
    let currentNullable: boolean = false;
    let currentOptional: boolean = false;
    let inputMetadataTypeName: string = "";
    let inputMetadataType: string = "";
    let refinedCombinedKey: string = "";
    let isSet: boolean = false;
    let isinputNullableArray: boolean = false;

    // Refine and split the inner key
    refinedCombinedKey = combinedKey
        .replace(/\?\./g, ".") // Replace `?.` with `.`
        .replace(/\?$/g, "") // Remove a trailing `?`
        .replace(/\s*\?:.*$/g, "") // Remove `?: <value>`
        .replace(/[\(\)]/g, ""); // Remove parentheses

    let refinedCombinedKeys = refinedCombinedKey.split(".");

    // Iterate through parent keys in reverse
    let index = refinedCombinedKeys.length - 1;
    const modifiedInputs = await resolveMetadata(parameterDefinitions, refinedCombinedKeys, refinedCombinedKeys[index], "inputMetadata");
    if (!modifiedInputs) {
        throw new Error(`Metadata not found for ${refinedCombinedKeys[index]}.`);
    }

    currentNullable = modifiedInputs["nullable"];
    currentOptional = modifiedInputs["optional"];
    inputMetadataTypeName = modifiedInputs["typeName"];
    inputMetadataType = modifiedInputs["type"];

    if (!isSet && (arrayRecords.includes(inputMetadataTypeName) || arrayEnumUnion.includes(inputMetadataType))) {
        isSet = true;
    }

    if (isSet) {
        // Update record array flags
        if (currentNullable) { isinputRecordArrayNullable = true; }
        if (currentOptional) { isinputRecordArrayOptional = true; }

        // Check preceding elements for non-`record[]` types
        for (let nextIndex = index - 1; nextIndex >= 0; nextIndex--) {
            isinputNullableArray = false;
            const nextModifiedInputs = await resolveMetadata(parameterDefinitions, refinedCombinedKeys, refinedCombinedKeys[nextIndex], "inputMetadata");
            const nextMetadataTypeName = nextModifiedInputs["typeName"];
            const nextMetadataType = nextModifiedInputs["type"];
            const nextNullable = nextModifiedInputs["nullable"];
            const nextOptional = nextModifiedInputs["optional"];
            const nextNullableArray = nextModifiedInputs["nullableArray"];

            if (!(arrayRecords.includes(nextMetadataTypeName) || arrayEnumUnion.includes(nextMetadataType))) {
                if (nextNullable) { isinputArrayNullable = true; }
                if (nextOptional) { isinputArrayOptional = true; }
            } else {
                if (arrayRecords.includes(nextMetadataTypeName) || arrayEnumUnion.includes(nextMetadataType)) {
                    if (nextNullableArray && (nextIndex === (index - 1))) {isinputNullableArray = true;}
                }
                return { isinputRecordArrayNullable, isinputRecordArrayOptional, isinputArrayNullable, isinputArrayOptional, isinputNullableArray };
            }
        }
    }
    return { isinputRecordArrayNullable, isinputRecordArrayOptional, isinputArrayNullable, isinputArrayOptional, isinputNullableArray };
}

async function sendRequirementFileUploadRequest(file: Blob): Promise<Response | ErrorCode> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchWithToken(CONTEXT_UPLOAD_URL_V1 + "/file_upload/extract_requirements", {
        method: "POST",
        body: formData
    });
    return response;
}

export async function getTextFromRequirements(file: Blob): Promise<string | ErrorCode> {
    try {
        let response = await sendRequirementFileUploadRequest(file);
        if (isErrorCode(response)) {
            return response as ErrorCode;
        }
        response = response as Response;
        let requirements = await filterMappingResponse(response) as string;
        return requirements;
    } catch (error) {
        console.error(error);
        return UNKNOWN_ERROR;
    }
}

export async function requirementsSpecification(filepath: string): Promise<string | ErrorCode> {
    if (!filepath) { 
        throw new Error("File is undefined"); 
    }

    const convertedFile = convertBase64ToBlob({name: path.basename(filepath), 
                            content: getBase64FromFile(filepath), status: AttachmentStatus.UnknownError});
    if (!convertedFile) { throw new Error("Invalid file content"); }

    let requirements = await getTextFromRequirements(convertedFile);
    if (isErrorCode(requirements)) { 
        return requirements as ErrorCode; 
    }

    return requirements;
}

function getBase64FromFile(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString('base64');
}

export async function fetchWithToken(url: string, options: RequestInit) {
    const accessToken = await getAccessToken();
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Ballerina-VSCode-Plugin',
    };
    let response = await fetch(url, options);
    console.log("Response status: ", response.status);
    if (response.status === 401) {
        console.log("Token expired. Refreshing token...");
        const newToken = await getRefreshedAccessToken();
        console.log("refreshed token : " + newToken);
        if (newToken) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${newToken}`,
            };
            response = await fetch(url, options);
        } else {
            AIStateMachine.service().send(AIMachineEventType.LOGOUT);
            return;
        }
    }
    return response;
}

export function cleanDiagnosticMessages(entries: DiagnosticEntry[]): DiagnosticEntry[] {
    return entries.map(entry => ({
        code: entry.code || "",
        message: entry.message,
    }));
}
