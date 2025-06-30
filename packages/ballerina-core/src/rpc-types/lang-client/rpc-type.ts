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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import { BallerinaPackagesParams, BallerinaProjectComponents, BallerinaSTParams, ComponentModels, ComponentModelsParams, ExecutorPositions, PartialST, PartialSTParams, STModifyParams, SymbolInfo, SymbolInfoParams, SyntaxTree, SyntaxTreeParams, TypeFromExpressionParams, TypeFromSymbolParams, TypesFromFnDefinitionParams } from "../../interfaces/extended-lang-client";
import { BallerinaVersionResponse, CompletionRequest, CompletionResponse, DiagnosticsResponse, CodeActionRequest, CodeActionResponse, RenameRequest, RenameResponse, DefinitionPositionRequest, UpdateFileContentRequest, UpdateFileContentResponse, DefinitionResponse, ExecutorPositionsRequest, DidCloseRequest, TypesFromExpressionResponse, TypesFromSymbolResponse, DidOpenRequest, DidChangeRequest } from "./interfaces";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "lang-client";
export const getSyntaxTree: RequestType<void, SyntaxTree> = { method: `${_preFix}/getSyntaxTree` };
export const getST: RequestType<SyntaxTreeParams, SyntaxTree> = { method: `${_preFix}/getST` };
export const getSTByRange: RequestType<BallerinaSTParams, SyntaxTree> = { method: `${_preFix}/getSTByRange` };
export const getBallerinaProjectComponents: RequestType<BallerinaPackagesParams, BallerinaProjectComponents> = { method: `${_preFix}/getBallerinaProjectComponents` };
export const getBallerinaVersion: RequestType<void, BallerinaVersionResponse> = { method: `${_preFix}/getBallerinaVersion` };
export const getCompletion: RequestType<CompletionRequest, CompletionResponse> = { method: `${_preFix}/getCompletion` };
export const getDiagnostics: RequestType<SyntaxTreeParams, DiagnosticsResponse> = { method: `${_preFix}/getDiagnostics` };
export const codeAction: RequestType<CodeActionRequest, CodeActionResponse> = { method: `${_preFix}/codeAction` };
export const rename: RequestType<RenameRequest, RenameResponse> = { method: `${_preFix}/rename` };
export const getDefinitionPosition: RequestType<DefinitionPositionRequest, SyntaxTree> = { method: `${_preFix}/getDefinitionPosition` };
export const stModify: RequestType<STModifyParams, SyntaxTree> = { method: `${_preFix}/stModify` };
export const updateFileContent: RequestType<UpdateFileContentRequest, UpdateFileContentResponse> = { method: `${_preFix}/updateFileContent` };
export const getTypeFromExpression: RequestType<TypeFromExpressionParams, TypesFromExpressionResponse> = { method: `${_preFix}/getTypeFromExpression` };
export const getTypeFromSymbol: RequestType<TypeFromSymbolParams, TypesFromSymbolResponse> = { method: `${_preFix}/getTypeFromSymbol` };
export const getTypesFromFnDefinition: RequestType<TypesFromFnDefinitionParams, TypesFromSymbolResponse> = { method: `${_preFix}/getTypesFromFnDefinition` };
export const definition: RequestType<DefinitionPositionRequest, DefinitionResponse> = { method: `${_preFix}/definition` };
export const getSTForFunction: RequestType<STModifyParams, SyntaxTree> = { method: `${_preFix}/getSTForFunction` };
export const getExecutorPositions: RequestType<ExecutorPositionsRequest, ExecutorPositions> = { method: `${_preFix}/getExecutorPositions` };
export const getSTForExpression: RequestType<PartialSTParams, PartialST> = { method: `${_preFix}/getSTForExpression` };
export const getSTForSingleStatement: RequestType<PartialSTParams, PartialST> = { method: `${_preFix}/getSTForSingleStatement` };
export const getSTForResource: RequestType<PartialSTParams, PartialST> = { method: `${_preFix}/getSTForResource` };
export const getSTForModuleMembers: RequestType<PartialSTParams, PartialST> = { method: `${_preFix}/getSTForModuleMembers` };
export const getSTForModulePart: RequestType<PartialSTParams, PartialST> = { method: `${_preFix}/getSTForModulePart` };
export const getSymbolDocumentation: RequestType<SymbolInfoParams, SymbolInfo> = { method: `${_preFix}/getSymbolDocumentation` };
export const didOpen: NotificationType<DidOpenRequest> = { method: `${_preFix}/didOpen` };
export const didChange: NotificationType<DidChangeRequest> = { method: `${_preFix}/didChange` };
export const didClose: NotificationType<DidCloseRequest> = { method: `${_preFix}/didClose` };
export const getPackageComponentModels: RequestType<ComponentModelsParams, ComponentModels> = { method: `${_preFix}/getPackageComponentModels` };
