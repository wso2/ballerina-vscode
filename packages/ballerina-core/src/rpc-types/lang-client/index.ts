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

import { BallerinaPackagesParams, BallerinaProjectComponents, BallerinaSTParams, ComponentModels, ComponentModelsParams, ExecutorPositions, PartialST, PartialSTParams, ProjectDiagnosticsRequest, ProjectDiagnosticsResponse, STModifyParams, SymbolInfo, SymbolInfoParams, SyntaxTree, SyntaxTreeParams, TypeFromExpressionParams, TypeFromSymbolParams, TypesFromFnDefinitionParams } from "../../interfaces/extended-lang-client";
import { BallerinaVersionResponse, CompletionRequest, CompletionResponse, DiagnosticsResponse, CodeActionRequest, CodeActionResponse, RenameRequest, RenameResponse, DefinitionPositionRequest, UpdateFileContentRequest, UpdateFileContentResponse, DefinitionResponse, ExecutorPositionsRequest, DidCloseRequest, TypesFromExpressionResponse, TypesFromSymbolResponse, DidOpenRequest, DidChangeRequest, SemanticVersion } from "./interfaces";

export interface LangClientAPI {
    getSyntaxTree: () => Promise<SyntaxTree>;
    getST: (params: SyntaxTreeParams) => Promise<SyntaxTree>;
    getSTByRange: (params: BallerinaSTParams) => Promise<SyntaxTree>;
    getBallerinaProjectComponents: (params: BallerinaPackagesParams) => Promise<BallerinaProjectComponents>;
    getBallerinaVersion: () => Promise<BallerinaVersionResponse>;
    isSupportedSLVersion: (params: SemanticVersion) => Promise<boolean>;
    getCompletion: (params: CompletionRequest) => Promise<CompletionResponse>;
    getDiagnostics: (params: SyntaxTreeParams) => Promise<DiagnosticsResponse>;
    getProjectDiagnostics: (params: ProjectDiagnosticsRequest) => Promise<ProjectDiagnosticsResponse>;
    codeAction: (params: CodeActionRequest) => Promise<CodeActionResponse>;
    rename: (params: RenameRequest) => Promise<RenameResponse>;
    getDefinitionPosition: (params: DefinitionPositionRequest) => Promise<SyntaxTree>;
    stModify: (params: STModifyParams) => Promise<SyntaxTree>;
    updateFileContent: (params: UpdateFileContentRequest) => Promise<UpdateFileContentResponse>;
    getTypeFromExpression: (params: TypeFromExpressionParams) => Promise<TypesFromExpressionResponse>;
    getTypeFromSymbol: (params: TypeFromSymbolParams) => Promise<TypesFromSymbolResponse>;
    getTypesFromFnDefinition: (params: TypesFromFnDefinitionParams) => Promise<TypesFromSymbolResponse>;
    definition: (params: DefinitionPositionRequest) => Promise<DefinitionResponse>;
    getSTForFunction: (params: STModifyParams) => Promise<SyntaxTree>;
    getExecutorPositions: (params: ExecutorPositionsRequest) => Promise<ExecutorPositions>;
    getSTForExpression: (params: PartialSTParams) => Promise<PartialST>;
    getSTForSingleStatement: (params: PartialSTParams) => Promise<PartialST>;
    getSTForResource: (params: PartialSTParams) => Promise<PartialST>;
    getSTForModuleMembers: (params: PartialSTParams) => Promise<PartialST>;
    getSTForModulePart: (params: PartialSTParams) => Promise<PartialST>;
    getSymbolDocumentation: (params: SymbolInfoParams) => Promise<SymbolInfo>;
    didOpen: (params: DidOpenRequest) => void;
    didChange: (params: DidChangeRequest) => void;
    didClose: (params: DidCloseRequest) => void;
    getPackageComponentModels:(params: ComponentModelsParams) => Promise<ComponentModels>;
}

