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
    addToTargetPosition,
    BallerinaProjectComponents,
    CompletionParams,
    createFunctionSignature,
    getSelectedDiagnostics,
    getSource,
    PrimitiveBalType,
    STModification,
    TypeField,
    updateFunctionSignature
} from "@wso2/ballerina-core";
import {
    FunctionDefinition,
    IdentifierToken,
    NodePosition,
    RequiredParam,
    STKindChecker,
    STNode
} from "@wso2/syntax-tree";
import { CompletionItemKind, Diagnostic } from "vscode-languageserver-types";

import { TypeDescriptor } from "../../Diagram/Node/commons/DataMapperNode";
import { getTypeOfInputParam, getTypeOfOutput } from "../../Diagram/utils/dm-utils";
import { getUnsupportedTypesFromTypeDesc } from "../../Diagram/utils/union-type-utils";
import { DM_INHERENTLY_SUPPORTED_INPUT_TYPES, DM_UNSUPPORTED_TYPES, isArraysSupported } from "../utils";

import { DM_DEFAULT_FUNCTION_NAME } from "./DataMapperConfigPanel";
import { DataMapperInputParam, DataMapperOutputParam, TypeNature } from "./InputParamsPanel/types";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";
import { URI } from "vscode-uri";

export const FILE_SCHEME = "file://";
export const EXPR_SCHEME = "expr://";

/* tslint:disable-next-line */
export const PROVIDED_TYPE = "${PROVIDED_TYPE}";
/* tslint:disable-next-line */
export const IO_KIND = "${IO_KIND}";
export const DM_TYPES_UNSUPPORTED_MSG = `${PROVIDED_TYPE} is not supported as data mapper ${IO_KIND}`;
export const DM_TYPES_NOT_FOUND_MSG = `Unrecognized type`;
export const DM_TYPES_YET_TO_SUPPORT_MSG = `${PROVIDED_TYPE} is currently not supported as data mapper ${IO_KIND}`;
export const DM_TYPES_SUPPORTED_IN_LATEST_MSG = `TypeField ${PROVIDED_TYPE} is not supported by the data mapper for your Ballerina version.
 Please upgrade Ballerina to the latest version to use this type`;
export const DM_TYPES_INVALID_MSG = `${PROVIDED_TYPE} is not a valid type descriptor`;
export const DM_TYPE_UNAVAILABLE_MSG = `TypeField is missing`;
export const DM_PARAM_NAME_UNAVAILABLE_MSG = `Parameter name is missing`;

function isSupportedType(node: STNode,
                         type: TypeField,
                         kind: 'input' | 'output',
                         balVersion: string,
                         paramName?: IdentifierToken): [boolean, TypeNature?] {
    if (!node) {
        return [false, TypeNature.NOT_FOUND];
    }

    const isUnionType = STKindChecker.isUnionTypeDesc(node);
    const isArrayType = STKindChecker.isArrayTypeDesc(node);
    const isMapType = STKindChecker.isMapTypeDesc(node);
    const isRecordType = STKindChecker.isRecordTypeDesc(node);
    const isOptionalType = STKindChecker.isOptionalTypeDesc(node);
    const isTypeMissing = STKindChecker.isSimpleNameReference(node) && node.name.isMissing;
    const isParenthesisedType = STKindChecker.isParenthesisedTypeDesc(node);

    if (!type && isRecordType) {
        return [false, TypeNature.WHITELISTED];
    } else if (!type) {
        if (paramName && paramName.isMissing) {
            return [false, TypeNature.INVALID];
        }
        return [false, TypeNature.NOT_FOUND];
    }
    const isInvalid = type && type.typeName === "$CompilationError$";

    let isAlreadySupportedType: boolean;
    if (kind === 'input') {
        isAlreadySupportedType = DM_INHERENTLY_SUPPORTED_INPUT_TYPES.some(t => {
            return t === type.typeName && !isUnionType && !isArrayType;
        });
    } else {
        isAlreadySupportedType = type.typeName === PrimitiveBalType.Record && !isArrayType;
    }

    const isUnsupportedType = DM_UNSUPPORTED_TYPES.some(t => t === type.typeName);

    if (isTypeMissing) {
        return [false, TypeNature.TYPE_UNAVAILABLE];
    } else if ((isUnionType || isOptionalType) && kind === 'output' && getUnsupportedTypesFromTypeDesc(node).length === 0) {
        return [true];
    } else if (isUnionType || isMapType || isOptionalType) {
        return [false, TypeNature.YET_TO_SUPPORT];
    } else if (isArrayType || isParenthesisedType) {
        return [getUnsupportedTypesFromTypeDesc(node).length === 0, TypeNature.BLACKLISTED]
    } else if (isInvalid) {
        return [false, TypeNature.INVALID];
    } else if (isAlreadySupportedType || (!isUnsupportedType && isArraysSupported(balVersion))) {
        return [true];
    } else if (!isUnsupportedType) {
        return [false, TypeNature.WHITELISTED];
    } else {
        return [false, TypeNature.BLACKLISTED];
    }
}

export function getFnNameFromST(fnST: FunctionDefinition) {
    return fnST && fnST.functionName.value;
}

export function getFnSignatureFromST(fnST: FunctionDefinition) {
    return fnST && fnST.functionSignature.source;
}

export function getInputsFromST(fnST: FunctionDefinition, balVersion: string): DataMapperInputParam[] {
    let params: DataMapperInputParam[] = [];
    if (fnST) {
        // TODO: Check other Param Types
        const reqParams = fnST.functionSignature.parameters.filter((val) => STKindChecker.isRequiredParam(val)) as RequiredParam[];
        params = reqParams.map((param) => {
            const typeName = getTypeFromTypeDesc(param.typeName);
            const isArray = STKindChecker.isArrayTypeDesc(param.typeName);
            const typeInfo = getTypeOfInputParam(param, balVersion);
            let [isSupported, nature] = isSupportedType(param.typeName, typeInfo, 'input', balVersion, param?.paramName);
            if (isSupported && param?.paramName.isMissing) {
                isSupported = false;
                nature = TypeNature.PARAM_NAME_UNAVAILABLE;
            }
            return {
                name: param.paramName.value,
                type: typeName,
                isUnsupported: typeInfo ? !isSupported : true,
                typeNature: nature,
                isArray
            }
        });
    }
    return params;
}

export function getOutputTypeFromST(fnST: FunctionDefinition, balVersion: string): DataMapperOutputParam {
    const typeDesc = fnST.functionSignature?.returnTypeDesc && fnST.functionSignature.returnTypeDesc.type;
    if (typeDesc) {
        const typeName = getTypeFromTypeDesc(typeDesc);
        const isArray = STKindChecker.isArrayTypeDesc(typeDesc);
        const typeInfo = getTypeOfOutput(typeDesc, balVersion);
        const [isSupported, nature] = isSupportedType(typeDesc, typeInfo, 'output', balVersion);
        return {
            type: typeName,
            isUnsupported: typeInfo ? !isSupported : true,
            typeNature: nature,
            isArray
        }
    }
}

export function getTypeIncompatibilityMsg(nature: TypeNature,
                                          typeName: string,
                                          kind?: 'input' | 'output'): string {
    switch (nature) {
        case TypeNature.WHITELISTED: {
            return DM_TYPES_SUPPORTED_IN_LATEST_MSG.replace(PROVIDED_TYPE, typeName);
        }
        case TypeNature.BLACKLISTED: {
            return DM_TYPES_UNSUPPORTED_MSG.replace(PROVIDED_TYPE, typeName).replace(IO_KIND, kind);
        }
        case TypeNature.YET_TO_SUPPORT: {
            return DM_TYPES_YET_TO_SUPPORT_MSG.replace(PROVIDED_TYPE, typeName).replace(IO_KIND, kind);
        }
        case TypeNature.INVALID: {
            return DM_TYPES_INVALID_MSG.replace(PROVIDED_TYPE, typeName);
        }
        case TypeNature.NOT_FOUND: {
            return DM_TYPES_NOT_FOUND_MSG;
        }
        case TypeNature.TYPE_UNAVAILABLE: {
            return DM_TYPE_UNAVAILABLE_MSG;
        }
        case TypeNature.PARAM_NAME_UNAVAILABLE: {
            return DM_PARAM_NAME_UNAVAILABLE_MSG;
        }
    }
}

export function getTypeFromTypeDesc(typeDesc: TypeDescriptor) {
    if (typeDesc && STKindChecker.isSimpleNameReference(typeDesc)) {
        return !typeDesc.name.isMissing ? typeDesc.name.value : typeDesc?.source?.trim();
    } else if (typeDesc && STKindChecker.isQualifiedNameReference(typeDesc)) {
        return typeDesc.source?.trim();
    } else if (typeDesc && STKindChecker.isArrayTypeDesc(typeDesc)) {
        return typeDesc.memberTypeDesc.source;
    }
    return typeDesc?.source?.trim() || "";
}

export function getModifiedTargetPosition(
    currentRecords: string[],
    currentTargetPosition: NodePosition,
    projectComponents: BallerinaProjectComponents,
    filePath: string
) {
    if (currentRecords.length === 0) {
        return currentTargetPosition;
    } else {
        if (projectComponents) {
            const recordsWithinFile = projectComponents.packages
            .flatMap(pkg => pkg.modules
                .flatMap(mdl => mdl.records
                    .filter(record => pkg.filePath + record.filePath === `file://${filePath}`)
                )
            );
            const recordWithHighestEndLine = recordsWithinFile.reduce((prev, current) => {
                return (prev.endLine > current.endLine) ? prev : current
            });
            if (recordWithHighestEndLine) {
                return {
                    endColumn: 0,
                    endLine: recordWithHighestEndLine.endLine + 1,
                    startColumn: 0,
                    startLine: recordWithHighestEndLine.endLine + 1,
                }
            }
        }
        return currentTargetPosition;
    }
}

export async function getDiagnosticsForFnName(name: string,
                                              inputParams: DataMapperInputParam[],
                                              outputType: string,
                                              fnST: FunctionDefinition,
                                              targetPosition: NodePosition,
                                              currentFileContent: string,
                                              filePath: string,
                                              langServerRpcClient: LangClientRpcClient) {
    const parametersStr = inputParams
        .map((item) => `${item.type} ${item.name}`)
        .join(",");
    const returnTypeStr = outputType ? `returns ${outputType}` : '';

    let stModification: STModification;
    let fnConfigPosition: NodePosition;
    let diagTargetPosition: NodePosition;
    if (fnST && STKindChecker.isFunctionDefinition(fnST)) {
        fnConfigPosition = {
            ...fnST?.functionSignature?.position as NodePosition,
            startLine: (fnST.functionName.position as NodePosition)?.startLine,
            startColumn: (fnST.functionName.position as NodePosition)?.startColumn
        }
        diagTargetPosition = {
            startLine: (fnST.functionName.position as NodePosition).startLine,
            startColumn: (fnST.functionName.position as NodePosition).startColumn,
            endLine: (fnST.functionName.position as NodePosition).endLine,
            endColumn: (fnST.functionName.position as NodePosition).startColumn + name.length
        };
        stModification = updateFunctionSignature(name, parametersStr, returnTypeStr, fnConfigPosition);
    } else {
        fnConfigPosition = targetPosition;
        const fnNameStartColumn = "function ".length + 1;
        diagTargetPosition = {
            startLine: targetPosition.startLine + 1,
            startColumn: targetPosition.startColumn + fnNameStartColumn,
            endLine: targetPosition.endLine + 1,
            endColumn: targetPosition.endColumn + (fnNameStartColumn + name.length)
        };
        stModification = createFunctionSignature(
            "",
            name,
            parametersStr,
            returnTypeStr,
            targetPosition,
            false,
            true,
            outputType ? `{}` : `()`  // TODO: Find default value for selected output type when DM supports types other than records
        );
    }
    const source = getSource(stModification);
    const content = addToTargetPosition(currentFileContent, fnConfigPosition, source);

    const diagnostics = await getVirtualDiagnostics(filePath, currentFileContent, content, langServerRpcClient);

    return getSelectedDiagnostics(diagnostics, diagTargetPosition, 0, name.length);
}

export async function getDefaultFnName(
    filePath: string,
    targetPosition: NodePosition,
    langServerRpcClient: LangClientRpcClient
): Promise<string> {
    const completionParams: CompletionParams = {
        textDocument: {
            uri: URI.file(filePath).toString()
        },
        position: {
            character: targetPosition.endColumn,
            line: targetPosition.endLine
        },
        context: {
            triggerKind: 3
        }
    };
    const completions = (await langServerRpcClient.getCompletion(completionParams)).completions;
    const existingFnNames = completions.map((completion) => {
        if (completion.kind === CompletionItemKind.Function) {
            return completion?.filterText;
        }
    }).filter((name) => name !== undefined);

    let suffixIndex = 2;
    while (existingFnNames.includes(`${DM_DEFAULT_FUNCTION_NAME}${suffixIndex}`)) {
        suffixIndex++;
    }

    return `${DM_DEFAULT_FUNCTION_NAME}${suffixIndex}`;
}

async function getVirtualDiagnostics(filePath: string,
                                     currentFileContent: string,
                                     newContent: string,
                                     langServerRpcClient: LangClientRpcClient): Promise<Diagnostic[]> {
    const docUri = URI.file(filePath).toString();
    langServerRpcClient.didChange({
        contentChanges: [
            {
                text: newContent
            }
        ],
        textDocument: {
            uri: docUri,
            version: 1
        }
    });
    const diagResp = await langServerRpcClient.getDiagnostics({
        documentIdentifier: {
            uri: docUri,
        }
    });
    langServerRpcClient.didChange({
        contentChanges: [
            {
                text: currentFileContent
            }
        ],
        textDocument: {
            uri: docUri,
            version: 1
        }
    });

    return diagResp.diagnostics[0]?.diagnostics || [];
}
