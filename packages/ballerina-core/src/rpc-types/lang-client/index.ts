/*
 *  Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 * 
 *  This software is the property of WSO2 LLC. and its suppliers, if any.
 *  Dissemination of any information or reproduction of any material contained
 *  herein is strictly forbidden, unless permitted by WSO2 in accordance with
 *  the WSO2 Commercial License available at http://wso2.com/licenses.
 *  For specific language governing the permissions and limitations under
 *  this license, please see the license as well as any agreement you’ve
 *  entered into with WSO2 governing the purchase of this software and any
 *  associated services.
 */

import { BallerinaPackagesParams, BallerinaProjectComponents, BallerinaSTParams, ComponentModels, ComponentModelsParams, ExecutorPositions, PartialST, PartialSTParams, STModifyParams, SymbolInfo, SymbolInfoParams, SyntaxTree, SyntaxTreeParams, TypeFromExpressionParams, TypeFromSymbolParams, TypesFromFnDefinitionParams } from "../../interfaces/extended-lang-client";
import { BallerinaVersionResponse, CompletionRequest, CompletionResponse, DiagnosticsResponse, CodeActionRequest, CodeActionResponse, RenameRequest, RenameResponse, DefinitionPositionRequest, UpdateFileContentRequest, UpdateFileContentResponse, DefinitionResponse, ExecutorPositionsRequest, DidCloseRequest, TypesFromExpressionResponse, TypesFromSymbolResponse, DidOpenRequest, DidChangeRequest } from "./interfaces";

export interface LangClientAPI {
    getSyntaxTree: () => Promise<SyntaxTree>;
    getST: (params: SyntaxTreeParams) => Promise<SyntaxTree>;
    getSTByRange: (params: BallerinaSTParams) => Promise<SyntaxTree>;
    getBallerinaProjectComponents: (params: BallerinaPackagesParams) => Promise<BallerinaProjectComponents>;
    getBallerinaVersion: () => Promise<BallerinaVersionResponse>;
    getCompletion: (params: CompletionRequest) => Promise<CompletionResponse>;
    getDiagnostics: (params: SyntaxTreeParams) => Promise<DiagnosticsResponse>;
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

