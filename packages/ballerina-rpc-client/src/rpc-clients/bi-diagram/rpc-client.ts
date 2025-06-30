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
    AIChatRequest,
    AddFieldRequest,
    AddFunctionRequest,
    AddImportItemResponse,
    BIAiSuggestionsRequest,
    BIAiSuggestionsResponse,
    BIAvailableNodesRequest,
    BIAvailableNodesResponse,
    BIDeleteByComponentInfoRequest,
    BIDeleteByComponentInfoResponse,
    BIDesignModelResponse,
    BIDiagramAPI,
    BIFlowModelResponse,
    BIGetEnclosedFunctionRequest,
    BIGetEnclosedFunctionResponse,
    BIGetVisibleVariableTypesRequest,
    BIGetVisibleVariableTypesResponse,
    BIModuleNodesResponse,
    BINodeTemplateRequest,
    BINodeTemplateResponse,
    BISearchRequest,
    BISearchResponse,
    BISourceCodeRequest,
    BISourceCodeResponse,
    BreakpointRequest,
    BuildMode,
    ClassFieldModifierRequest,
    ComponentRequest,
    ConfigVariableResponse,
    CreateComponentResponse,
    CurrentBreakpointsResponse,
    DeploymentRequest,
    DeploymentResponse,
    DevantMetadata,
    EndOfFileRequest,
    ExpressionCompletionsRequest,
    ExpressionCompletionsResponse,
    ExpressionDiagnosticsRequest,
    ExpressionDiagnosticsResponse,
    FormDidCloseParams,
    FormDidOpenParams,
    FunctionNodeRequest,
    FunctionNodeResponse,
    GeneratedClientSaveResponse,
    GetConfigVariableNodeTemplateRequest,
    GetRecordConfigRequest,
    GetRecordConfigResponse,
    GetRecordModelFromSourceRequest,
    GetRecordModelFromSourceResponse,
    GetTypeRequest,
    GetTypeResponse,
    GetTypesRequest,
    GetTypesResponse,
    LinePosition,
    ModelFromCodeRequest,
    OpenAPIClientDeleteRequest,
    OpenAPIClientDeleteResponse,
    OpenAPIClientGenerationRequest,
    OpenAPIGeneratedModulesRequest,
    OpenAPIGeneratedModulesResponse,
    OpenConfigTomlRequest,
    ProjectComponentsResponse,
    ProjectImports,
    ProjectRequest,
    ProjectStructureResponse,
    ReadmeContentRequest,
    ReadmeContentResponse,
    RecordSourceGenRequest,
    RecordSourceGenResponse,
    RecordsInWorkspaceMentions,
    RenameIdentifierRequest,
    ServiceClassModelResponse,
    ServiceClassSourceRequest,
    SignatureHelpRequest,
    SignatureHelpResponse,
    SourceEditResponse,
    UpdateConfigVariableRequest,
    UpdateConfigVariableRequestV2,
    UpdateConfigVariableResponse,
    UpdateConfigVariableResponseV2,
    UpdateImportsRequest,
    UpdateImportsResponse,
    UpdateRecordConfigRequest,
    UpdateTypeRequest,
    UpdateTypeResponse,
    UpdateTypesRequest,
    UpdateTypesResponse,
    UpdatedArtifactsResponse,
    VisibleTypesRequest,
    VisibleTypesResponse,
    WorkspacesResponse,
    addBreakpointToSource,
    addClassField,
    addFunction,
    buildProject,
    createComponent,
    createGraphqlClassType,
    createProject,
    deleteByComponentInfo,
    deleteConfigVariableV2,
    deleteFlowNode,
    deleteOpenApiGeneratedModules,
    deployProject,
    formDidClose,
    formDidOpen,
    generateOpenApiClient,
    getAiSuggestions,
    getAllImports,
    getAvailableNodes,
    getBreakpointInfo,
    getConfigVariableNodeTemplate,
    getConfigVariables,
    getConfigVariablesV2,
    getDesignModel,
    getDevantMetadata,
    getEnclosedFunction,
    getEndOfFile,
    getExpressionCompletions,
    getExpressionDiagnostics,
    getFlowModel,
    getFunctionNames,
    getFunctionNode,
    getModuleNodes,
    getNodeTemplate,
    getOpenApiGeneratedModules,
    getProjectComponents,
    getProjectStructure,
    getReadmeContent,
    getRecordConfig,
    getRecordModelFromSource,
    getRecordNames,
    getRecordSource,
    getServiceClassModel,
    getSignatureHelp,
    getSourceCode,
    getType,
    getTypes,
    getVisibleTypes,
    getVisibleVariableTypes,
    getWorkspaces,
    handleReadmeContent,
    openAIChat,
    openConfigToml,
    openReadme,
    removeBreakpointFromSource,
    renameIdentifier,
    runProject,
    search,
    updateClassField,
    updateConfigVariables,
    updateConfigVariablesV2,
    updateImports,
    updateRecordConfig,
    updateServiceClass,
    updateType,
    updateTypes,
    DeleteConfigVariableRequestV2,
    DeleteConfigVariableResponseV2,
} from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class BiDiagramRpcClient implements BIDiagramAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    getFlowModel(): Promise<BIFlowModelResponse> {
        return this._messenger.sendRequest(getFlowModel, HOST_EXTENSION);
    }

    getSourceCode(params: BISourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        return this._messenger.sendRequest(getSourceCode, HOST_EXTENSION, params);
    }

    deleteFlowNode(params: BISourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        return this._messenger.sendRequest(deleteFlowNode, HOST_EXTENSION, params);
    }

    deleteByComponentInfo(params: BIDeleteByComponentInfoRequest): Promise<BIDeleteByComponentInfoResponse> {
        return this._messenger.sendRequest(deleteByComponentInfo, HOST_EXTENSION, params);
    }

    getAvailableNodes(params: BIAvailableNodesRequest): Promise<BIAvailableNodesResponse> {
        return this._messenger.sendRequest(getAvailableNodes, HOST_EXTENSION, params);
    }

    getEnclosedFunction(params: BIGetEnclosedFunctionRequest): Promise<BIGetEnclosedFunctionResponse> {
        return this._messenger.sendRequest(getEnclosedFunction, HOST_EXTENSION, params);
    }

    getNodeTemplate(params: BINodeTemplateRequest): Promise<BINodeTemplateResponse> {
        return this._messenger.sendRequest(getNodeTemplate, HOST_EXTENSION, params);
    }

    getAiSuggestions(params: BIAiSuggestionsRequest): Promise<BIAiSuggestionsResponse> {
        return this._messenger.sendRequest(getAiSuggestions, HOST_EXTENSION, params);
    }

    createProject(params: ProjectRequest): void {
        return this._messenger.sendNotification(createProject, HOST_EXTENSION, params);
    }

    getWorkspaces(): Promise<WorkspacesResponse> {
        return this._messenger.sendRequest(getWorkspaces, HOST_EXTENSION);
    }

    getProjectStructure(): Promise<ProjectStructureResponse> {
        return this._messenger.sendRequest(getProjectStructure, HOST_EXTENSION);
    }

    getProjectComponents(): Promise<ProjectComponentsResponse> {
        return this._messenger.sendRequest(getProjectComponents, HOST_EXTENSION);
    }

    createComponent(params: ComponentRequest): Promise<CreateComponentResponse> {
        return this._messenger.sendRequest(createComponent, HOST_EXTENSION, params);
    }

    handleReadmeContent(params: ReadmeContentRequest): Promise<ReadmeContentResponse> {
        return this._messenger.sendRequest(handleReadmeContent, HOST_EXTENSION, params);
    }

    getVisibleVariableTypes(params: BIGetVisibleVariableTypesRequest): Promise<BIGetVisibleVariableTypesResponse> {
        return this._messenger.sendRequest(getVisibleVariableTypes, HOST_EXTENSION, params);
    }

    getExpressionCompletions(params: ExpressionCompletionsRequest): Promise<ExpressionCompletionsResponse> {
        return this._messenger.sendRequest(getExpressionCompletions, HOST_EXTENSION, params);
    }

    getConfigVariables(): Promise<ConfigVariableResponse> {
        return this._messenger.sendRequest(getConfigVariables, HOST_EXTENSION);
    }

    updateConfigVariables(params: UpdateConfigVariableRequest): Promise<UpdateConfigVariableResponse> {
        return this._messenger.sendRequest(updateConfigVariables, HOST_EXTENSION, params);
    }

    getConfigVariablesV2(): Promise<ConfigVariableResponse> {
        return this._messenger.sendRequest(getConfigVariablesV2, HOST_EXTENSION);
    }
    
    updateConfigVariablesV2(params: UpdateConfigVariableRequestV2): Promise<UpdateConfigVariableResponseV2> {
        return this._messenger.sendRequest(updateConfigVariablesV2, HOST_EXTENSION, params);
    }

    deleteConfigVariableV2(params: DeleteConfigVariableRequestV2): Promise<DeleteConfigVariableResponseV2> {
        return this._messenger.sendRequest(deleteConfigVariableV2, HOST_EXTENSION, params);
    }

    getConfigVariableNodeTemplate(params: GetConfigVariableNodeTemplateRequest): Promise<BINodeTemplateResponse> {
        return this._messenger.sendRequest(getConfigVariableNodeTemplate, HOST_EXTENSION, params);
    }
    
    OpenConfigTomlRequest(params: OpenConfigTomlRequest): Promise<void> {
        return this._messenger.sendRequest(openConfigToml, HOST_EXTENSION, params);
    }

    getModuleNodes(): Promise<BIModuleNodesResponse> {
        return this._messenger.sendRequest(getModuleNodes, HOST_EXTENSION);
    }

    getReadmeContent(): Promise<ReadmeContentResponse> {
        return this._messenger.sendRequest(getReadmeContent, HOST_EXTENSION);
    }

    openReadme(): void {
        return this._messenger.sendNotification(openReadme, HOST_EXTENSION);
    }

    renameIdentifier(params: RenameIdentifierRequest): Promise<void> {
        return this._messenger.sendRequest(renameIdentifier, HOST_EXTENSION, params);
    }

    deployProject(params: DeploymentRequest): Promise<DeploymentResponse> {
        return this._messenger.sendRequest(deployProject, HOST_EXTENSION, params);
    }

    openAIChat(params: AIChatRequest): void {
        return this._messenger.sendNotification(openAIChat, HOST_EXTENSION, params);
    }

    getSignatureHelp(params: SignatureHelpRequest): Promise<SignatureHelpResponse> {
        return this._messenger.sendRequest(getSignatureHelp, HOST_EXTENSION, params);
    }

    buildProject(params: BuildMode): void {
        return this._messenger.sendNotification(buildProject, HOST_EXTENSION, params);
    }

    runProject(): void {
        return this._messenger.sendNotification(runProject, HOST_EXTENSION);
    }

    getVisibleTypes(params: VisibleTypesRequest): Promise<VisibleTypesResponse> {
        return this._messenger.sendRequest(getVisibleTypes, HOST_EXTENSION, params);
    }

    addBreakpointToSource(params: BreakpointRequest): void {
        return this._messenger.sendNotification(addBreakpointToSource, HOST_EXTENSION, params);
    }

    removeBreakpointFromSource(params: BreakpointRequest): void {
        return this._messenger.sendNotification(removeBreakpointFromSource, HOST_EXTENSION, params);
    }

    getBreakpointInfo(): Promise<CurrentBreakpointsResponse> {
        return this._messenger.sendRequest(getBreakpointInfo, HOST_EXTENSION);
    }

    getExpressionDiagnostics(params: ExpressionDiagnosticsRequest): Promise<ExpressionDiagnosticsResponse> {
        return this._messenger.sendRequest(getExpressionDiagnostics, HOST_EXTENSION, params);
    }

    getAllImports(): Promise<ProjectImports> {
        return this._messenger.sendRequest(getAllImports, HOST_EXTENSION);
    }

    formDidOpen(params: FormDidOpenParams): Promise<void> {
        return this._messenger.sendRequest(formDidOpen, HOST_EXTENSION, params);
    }

    formDidClose(params: FormDidCloseParams): Promise<void> {
        return this._messenger.sendRequest(formDidClose, HOST_EXTENSION, params);
    }

    getDesignModel(): Promise<BIDesignModelResponse> {
        return this._messenger.sendRequest(getDesignModel, HOST_EXTENSION);
    }

    getTypes(params: GetTypesRequest): Promise<GetTypesResponse> {
        return this._messenger.sendRequest(getTypes, HOST_EXTENSION, params);
    }

    getType(params: GetTypeRequest): Promise<GetTypeResponse> {
        return this._messenger.sendRequest(getType, HOST_EXTENSION, params);
    }

    updateType(params: UpdateTypeRequest): Promise<UpdateTypeResponse> {
        return this._messenger.sendRequest(updateType, HOST_EXTENSION, params);
    }

    updateTypes(params: UpdateTypesRequest): Promise<UpdateTypesResponse> {
        return this._messenger.sendRequest(updateTypes, HOST_EXTENSION, params);
    }

    getServiceClassModel(params: ModelFromCodeRequest): Promise<ServiceClassModelResponse> {
        return this._messenger.sendRequest(getServiceClassModel, HOST_EXTENSION, params);
    }

    updateClassField(params: ClassFieldModifierRequest): Promise<SourceEditResponse> {
        return this._messenger.sendRequest(updateClassField, HOST_EXTENSION, params);
    }

    addClassField(params: AddFieldRequest): Promise<SourceEditResponse> {
        return this._messenger.sendRequest(addClassField, HOST_EXTENSION, params);
    }

    updateServiceClass(params: ServiceClassSourceRequest): Promise<SourceEditResponse> {
        return this._messenger.sendRequest(updateServiceClass, HOST_EXTENSION, params);
    }

    createGraphqlClassType(params: UpdateTypeRequest): Promise<UpdateTypeResponse> {
        return this._messenger.sendRequest(createGraphqlClassType, HOST_EXTENSION, params);
    }

    getRecordConfig(params: GetRecordConfigRequest): Promise<GetRecordConfigResponse> {
        return this._messenger.sendRequest(getRecordConfig, HOST_EXTENSION, params);
    }

    updateRecordConfig(params: UpdateRecordConfigRequest): Promise<GetRecordConfigResponse> {
        return this._messenger.sendRequest(updateRecordConfig, HOST_EXTENSION, params);
    }

    getRecordModelFromSource(params: GetRecordModelFromSourceRequest): Promise<GetRecordModelFromSourceResponse> {
        return this._messenger.sendRequest(getRecordModelFromSource, HOST_EXTENSION, params);
    }

    getRecordSource(params: RecordSourceGenRequest): Promise<RecordSourceGenResponse> {
        return this._messenger.sendRequest(getRecordSource, HOST_EXTENSION, params);
    }

    updateImports(params: UpdateImportsRequest): Promise<UpdateImportsResponse> {
        return this._messenger.sendRequest(updateImports, HOST_EXTENSION, params);
    }

    addFunction(params: AddFunctionRequest): Promise<AddImportItemResponse> {
        return this._messenger.sendRequest(addFunction, HOST_EXTENSION, params);
    }

    getFunctionNode(params: FunctionNodeRequest): Promise<FunctionNodeResponse> {
        return this._messenger.sendRequest(getFunctionNode, HOST_EXTENSION, params);
    }

    getEndOfFile(params: EndOfFileRequest): Promise<LinePosition> {
        return this._messenger.sendRequest(getEndOfFile, HOST_EXTENSION, params);
    }

    search(params: BISearchRequest): Promise<BISearchResponse> {
        return this._messenger.sendRequest(search, HOST_EXTENSION, params);
    }

    getRecordNames(): Promise<RecordsInWorkspaceMentions> {
        return this._messenger.sendRequest(getRecordNames, HOST_EXTENSION);
    }

    getFunctionNames(): Promise<RecordsInWorkspaceMentions> {
        return this._messenger.sendRequest(getFunctionNames, HOST_EXTENSION);
    }

    getDevantMetadata(): Promise<DevantMetadata | undefined> {
        return this._messenger.sendRequest(getDevantMetadata, HOST_EXTENSION);
    }

    generateOpenApiClient(params: OpenAPIClientGenerationRequest): Promise<GeneratedClientSaveResponse> {
        return this._messenger.sendRequest(generateOpenApiClient, HOST_EXTENSION, params);
    }

    getOpenApiGeneratedModules(params: OpenAPIGeneratedModulesRequest): Promise<OpenAPIGeneratedModulesResponse> {
        return this._messenger.sendRequest(getOpenApiGeneratedModules, HOST_EXTENSION, params);
    }

    deleteOpenApiGeneratedModules(params: OpenAPIClientDeleteRequest): Promise<OpenAPIClientDeleteResponse> {
        return this._messenger.sendRequest(deleteOpenApiGeneratedModules, HOST_EXTENSION, params);
    }
}
