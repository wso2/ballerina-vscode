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
import {
    AIChatRequest,
    AddFieldRequest,
    AddFunctionRequest,
    AddImportItemResponse,
    ArtifactData,
    AvailableNode,
    BIAiSuggestionsRequest,
    BIAiSuggestionsResponse,
    BIAvailableNodesRequest,
    BIAvailableNodesResponse,
    BICopilotContextRequest,
    BIDeleteByComponentInfoRequest,
    BIDeleteByComponentInfoResponse,
    BIDesignModelResponse,
    BIDiagramAPI,
    BIFlowModelRequest,
    BIFlowModelResponse,
    BIGetEnclosedFunctionRequest,
    BIGetEnclosedFunctionResponse,
    BIGetVisibleVariableTypesRequest,
    BIGetVisibleVariableTypesResponse,
    BIModuleNodesRequest,
    BIModuleNodesResponse,
    BINodeTemplateRequest,
    BINodeTemplateResponse,
    BISearchNodesRequest,
    BISearchNodesResponse,
    BISearchRequest,
    BISearchResponse,
    BISourceCodeRequest,
    BISourceCodeResponse,
    BISuggestedFlowModelRequest,
    BI_COMMANDS,
    BallerinaProject,
    BreakpointRequest,
    BuildMode,
    Category,
    ClassFieldModifierRequest,
    Command,
    ComponentRequest,
    ConfigVariableRequest,
    ConfigVariableResponse,
    CreateComponentResponse,
    CurrentBreakpointsResponse,
    DIRECTORY_MAP,
    DeleteConfigVariableRequestV2,
    DeleteConfigVariableResponseV2,
    DeleteProjectRequest,
    DeleteTypeRequest,
    DeleteTypeResponse,
    DeploymentRequest,
    DeploymentResponse,
    DevantMetadata,
    Diagnostics,
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
    Item,
    JsonToTypeRequest,
    JsonToTypeResponse,
    LinePosition,
    LoginMethod,
    ModelFromCodeRequest,
    NodeKind,
    NodePosition,
    OpenAPIClientDeleteRequest,
    OpenAPIClientDeleteResponse,
    OpenAPIClientGenerationRequest,
    OpenAPIGeneratedModulesRequest,
    OpenAPIGeneratedModulesResponse,
    OpenConfigTomlRequest,
    ProjectComponentsResponse,
    ProjectRequest,
    ProjectStructureResponse,
    ReadmeContentRequest,
    ReadmeContentResponse,
    RecordSourceGenRequest,
    RecordSourceGenResponse,
    RecordsInWorkspaceMentions,
    RenameIdentifierRequest,
    RenameRequest,
    SCOPE,
    ServiceClassModelResponse,
    ServiceClassSourceRequest,
    SignatureHelpRequest,
    SignatureHelpResponse,
    SourceEditResponse,
    TemplateId,
    TextEdit,
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
    VerifyTypeDeleteRequest,
    VerifyTypeDeleteResponse,
    VisibleTypesRequest,
    VisibleTypesResponse,
    WorkspaceFolder,
    WorkspacesResponse,
    FormDiagnosticsRequest,
    FormDiagnosticsResponse,
    ExpressionTokensRequest,
    ExpressionTokensResponse,
    AddProjectToWorkspaceRequest,
    OpenReadmeRequest,
} from "@wso2/ballerina-core";
import * as fs from "fs";
import * as path from 'path';
import * as vscode from "vscode";

import { ICreateComponentCmdParams, IWso2PlatformExtensionAPI, CommandIds as PlatformExtCommandIds } from "@wso2/wso2-platform-core";
import {
    ShellExecution,
    Task,
    TaskDefinition,
    Uri, ViewColumn, commands,
    extensions,
    tasks,
    window, workspace
} from "vscode";
import { DebugProtocol } from "vscode-debugprotocol";
import { fetchWithAuth } from "../../../src/features/ai/service/connection";
import { extension } from "../../BalExtensionContext";
import { notifyBreakpointChange } from "../../RPCLayer";
import { OLD_BACKEND_URL } from "../../features/ai/utils";
import { cleanAndValidateProject, getCurrentBIProject } from "../../features/config-generator/configGenerator";
import { BreakpointManager } from "../../features/debugger/breakpoint-manager";
import { StateMachine, updateView } from "../../stateMachine";
import { getAccessToken, getLoginMethod } from "../../utils/ai/auth";
import { getCompleteSuggestions } from '../../utils/ai/completions';
import { README_FILE, addProjectToExistingWorkspace, convertProjectToWorkspace, createBIAutomation, createBIFunction, createBIProjectPure, createBIWorkspace, deleteProjectFromWorkspace, openInVSCode } from "../../utils/bi";
import { writeBallerinaFileDidOpen } from "../../utils/modification";
import { updateSourceCode } from "../../utils/source-utils";
import { getView } from "../../utils/state-machine-utils";
import { checkProjectDiagnostics, removeUnusedImports } from "../ai-panel/repair-utils";

export class BiDiagramRpcManager implements BIDiagramAPI {
    OpenConfigTomlRequest: (params: OpenConfigTomlRequest) => Promise<void>;

    async getFlowModel(): Promise<BIFlowModelResponse> {
        console.log(">>> requesting bi flow model from ls");
        return new Promise((resolve) => {
            const context = StateMachine.context();
            if (!context.position) {
                console.log(">>> position not found in the context");
                return new Promise((resolve) => {
                    resolve(undefined);
                });
            }

            const params: BIFlowModelRequest = {
                filePath: context.documentUri,
                startLine: {
                    line: context.position.startLine ?? 0,
                    offset: context.position.startColumn ?? 0,
                },
                endLine: {
                    line: context.position.endLine ?? 0,
                    offset: context.position.endColumn ?? 0,
                },
                forceAssign: true, // TODO: remove this
            };

            StateMachine.langClient()
                .getFlowModel(params)
                .then((model) => {
                    console.log(">>> bi flow model from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching bi flow model from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async getSourceCode(params: BISourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        console.log(">>> requesting bi source code from ls", params);
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getSourceCode(params)
                .then(async (model) => {
                    console.log(">>> bi source code from ls", model);
                    if (params?.isConnector) {
                        const artifacts = await updateSourceCode({ textEdits: model.textEdits, description: this.getSourceDescription(params) });
                        resolve({ artifacts });
                    } else {
                        const artifacts = await updateSourceCode({ textEdits: model.textEdits, artifactData: this.getArtifactDataFromNodeKind(params.flowNode.codedata.node), description: this.getSourceDescription(params) });
                        resolve({ artifacts });
                    }
                })
                .catch((error) => {
                    console.log(">>> error fetching source code from ls", error);
                    return new Promise((resolve) => {
                        resolve({ artifacts: [], error: error });
                    });
                });
        });
    }

    private capitalizeFirstLetter(name: string): string {
        return name
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/^\w/, c => c.toUpperCase());
    }

    private getSourceDescription(params: BISourceCodeRequest): string {
        let artifactType = this.capitalizeFirstLetter(params.flowNode.codedata.node);
        if (params.isConnector) {
            artifactType = `${this.capitalizeFirstLetter(params.flowNode.codedata.module)} Connection`;
        }
        const action = params.flowNode.codedata.isNew ? 'Creation' : 'Update';
        const identifier = params.flowNode?.properties?.variable?.value;
        return `${artifactType} ${action}${identifier ? ` - ${identifier}` : ''}`;
    }

    private getArtifactDataFromNodeKind(nodeKind: NodeKind): ArtifactData {
        switch (nodeKind) {
            case 'FUNCTION':
                return { artifactType: DIRECTORY_MAP.FUNCTION };
            case 'FUNCTION_DEFINITION':
                return { artifactType: DIRECTORY_MAP.FUNCTION };
            case 'AUTOMATION':
                return { artifactType: DIRECTORY_MAP.AUTOMATION };
            case 'DATA_MAPPER_DEFINITION':
                return { artifactType: DIRECTORY_MAP.DATA_MAPPER };
            case 'NP_FUNCTION_DEFINITION':
                return { artifactType: DIRECTORY_MAP.NP_FUNCTION };
            // Add other cases as needed
            default:
                return undefined;
        }
    }

    async applyTextEdits(filePath: string, textEdits: TextEdit[]): Promise<void> {
        const workspaceEdit = new vscode.WorkspaceEdit();
        const fileUri = Uri.file(filePath);

        const dirPath = path.dirname(filePath);
        const dirUri = vscode.Uri.file(dirPath);

        try {
            await vscode.workspace.fs.createDirectory(dirUri);
            workspaceEdit.createFile(fileUri, { ignoreIfExists: true });
        } catch (error) {
            console.error("Error creating file or directory:", error);
        }

        for (const edit of textEdits) {
            const range = new vscode.Range(
                edit.range.start.line,
                edit.range.start.character,
                edit.range.end.line,
                edit.range.end.character
            );
            workspaceEdit.replace(fileUri, range, edit.newText);
            console.log(">>> edit");
            console.log(edit.newText);
            console.log(">>> end edit");
        }

        try {
            await workspace.applyEdit(workspaceEdit);

            // Notify language server about the changes
            const document = await workspace.openTextDocument(fileUri);

            console.log(">>> document");
            console.log(document.getText());
            console.log(">>> end document");

            await document.save();

            await StateMachine.langClient().didChange({
                textDocument: {
                    uri: fileUri.toString(),
                    version: document.version
                },
                contentChanges: [{
                    text: document.getText()
                }]
            });
        } catch (error) {
            console.error("Error applying text edits:", error);
            throw error;
        }
    }

    private filterAdvancedAiNodes(response: BIAvailableNodesResponse): BIAvailableNodesResponse {
        const showAdvancedAiNodes = extension.ballerinaExtInstance.getShowAdvancedAiNodes();
        if (showAdvancedAiNodes || !response) {
            return response;
        }

        // List of node types/labels to hide when advanced AI nodes are disabled
        const hiddenNodeTypes = [
            'CHUNKERS',
            'VECTOR_STORES',
            'EMBEDDING_PROVIDERS'
        ];

        const hiddenNodeLabels = [
            'Recursive Document Chunker',
            'Chunker',
            'Vector Store',
            'Embedding Provider'
        ];

        const filterItems = (items: Item[]): Item[] => {
            if (!items) { return items; }

            return items.filter(item => {
                if ((item as AvailableNode).codedata?.node && hiddenNodeTypes.includes((item as AvailableNode).codedata.node)) {
                    return false;
                }

                if (item.metadata?.label && hiddenNodeLabels.includes(item.metadata.label)) {
                    return false;
                }

                if ((item as Category).items) {
                    (item as Category).items = filterItems((item as Category).items);
                }

                return true;
            });
        };

        if (response.categories) {
            response.categories = response.categories.map(category => {
                if (category.items) {
                    category.items = filterItems(category.items);
                }
                return category;
            });
        }

        return response;
    }

    private updateNodeDescriptions(availableNodes: BIAvailableNodesResponse): BIAvailableNodesResponse {
        if (!availableNodes) {
            return availableNodes;
        }
        // Adding descriptions for AI nodes
        const updateItems = (items: Item[], isInAICategory: boolean): Item[] => {
            if (!items) { return items; }

            return items.map(item => {
                if ((item as AvailableNode).enabled === false && isInAICategory) {
                    item.metadata = {
                        ...item.metadata,
                        description: "Please update AI package version to latest version to use this feature"
                    };
                }

                // Recursively handle nested items
                if ((item as Category).items) {
                    (item as Category).items = updateItems((item as Category).items, isInAICategory);
                }

                return item;
            });
        };

        if (availableNodes.categories) {
            availableNodes.categories = availableNodes.categories.map(category => {
                const isAICategory = category.metadata?.label === "AI";
                if (category.items) {
                    category.items = updateItems(category.items, isAICategory);
                }
                return category;
            });
        }

        return availableNodes;
    }

    async getAvailableNodes(params: BIAvailableNodesRequest): Promise<BIAvailableNodesResponse> {
        console.log(">>> requesting bi available nodes from ls", params);
        return new Promise((resolve) => {
            const fileNameOrPath = params.filePath;
            let filePath = fileNameOrPath;
            if (path.basename(fileNameOrPath) === fileNameOrPath) {
                filePath = path.join(StateMachine.context().projectPath, fileNameOrPath);
            }
            StateMachine.langClient()
                .getAvailableNodes({
                    position: params.position,
                    filePath
                })
                .then((model) => {
                    console.log(">>> bi available nodes from ls", model);
                    const filteredModel = this.filterAdvancedAiNodes(model);
                    const updatedModel = this.updateNodeDescriptions(filteredModel);
                    resolve(updatedModel);
                })
                .catch((error) => {
                    console.log(">>> error fetching available nodes from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }


    async getAvailableModelProviders(params: BIAvailableNodesRequest): Promise<BIAvailableNodesResponse> {
        console.log(">>> requesting bi available model providers from ls", params);
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getAvailableModelProviders(params)
                .then((model) => {
                    console.log(">>> bi available model providers from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching available model providers from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async getAvailableVectorStores(params: BIAvailableNodesRequest): Promise<BIAvailableNodesResponse> {
        console.log(">>> requesting bi available vector stores from ls", params);
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getAvailableVectorStores(params)
                .then((model) => {
                    console.log(">>> bi available vector stores from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching available vector stores from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async getAvailableEmbeddingProviders(params: BIAvailableNodesRequest): Promise<BIAvailableNodesResponse> {
        console.log(">>> requesting bi available embedding providers from ls", params);
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getAvailableEmbeddingProviders(params)
                .then((model) => {
                    console.log(">>> bi available embedding providers from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching available embedding providers from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async getAvailableVectorKnowledgeBases(params: BIAvailableNodesRequest): Promise<BIAvailableNodesResponse> {
        console.log(">>> requesting bi available knowledge bases from ls", params);
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getAvailableVectorKnowledgeBases(params)
                .then((model) => {
                    console.log(">>> bi available knowledge bases from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching available knowledge bases from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }


    async getAvailableDataLoaders(params: BIAvailableNodesRequest): Promise<BIAvailableNodesResponse> {
        console.log(">>> requesting bi available data loaders from ls", params);
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getAvailableDataLoaders(params)
                .then((model) => {
                    console.log(">>> bi available data loaders from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching available data loaders from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async getAvailableChunkers(params: BIAvailableNodesRequest): Promise<BIAvailableNodesResponse> {
        console.log(">>> requesting bi available chunkers from ls", params);
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getAvailableChunkers(params)
                .then((model) => {
                    console.log(">>> bi available chunkers from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching available chunkers from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async getNodeTemplate(params: BINodeTemplateRequest): Promise<BINodeTemplateResponse> {
        console.log(">>> requesting bi node template from ls", params);
        params.forceAssign = true; // TODO: remove this

        // Check if the file exists
        if (!fs.existsSync(params.filePath)) {
            // Create the file if it does not exist
            fs.writeFileSync(params.filePath, "");
            console.log(`>>> Created file at ${params.filePath}`);
        }

        return new Promise((resolve) => {
            StateMachine.langClient()
                .getNodeTemplate(params)
                .then((model) => {
                    console.log(">>> bi node template from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching node template from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async createProject(params: ProjectRequest): Promise<void> {
        if (params.createAsWorkspace) {
            const workspaceRoot = createBIWorkspace(params);
            openInVSCode(workspaceRoot);
        } else {
            const projectRoot = createBIProjectPure(params);
            openInVSCode(projectRoot);
        }
    }

    async deleteProject(params: DeleteProjectRequest): Promise<void> {
        const projectInfo = StateMachine.context().projectInfo;
        const targetProject = projectInfo?.children.find((child) => child.projectPath === params.projectPath);
        const projectName = targetProject?.title || targetProject?.name;
        if (!projectName) {
            return;
        }
        // Confirm destructive action with user
        const response = await window.showWarningMessage(
            `Delete Integration '${projectName}'?`,
            {
                modal: true,
                detail: "This action cannot be undone. The integration will be permanently removed from the workspace."
            },
            { title: "Delete", isCloseAffordance: false },
            { title: "Cancel", isCloseAffordance: true }
        );
        
        if (response?.title !== "Delete") {
            return;
        }

        const projectPath = params.projectPath;
        const workspacePath = projectInfo?.projectPath;
        await deleteProjectFromWorkspace(workspacePath, projectPath);

        // Refresh project info to update UI with newly added project
        StateMachine.refreshProjectInfo();
    }

    async addProjectToWorkspace(params: AddProjectToWorkspaceRequest): Promise<void> {
        if (params.convertToWorkspace) {
            try {
                await convertProjectToWorkspace(params);
                // Refresh project info to update UI with newly added project
                StateMachine.refreshProjectInfo();
            } catch (error) {
                window.showErrorMessage("Error converting integration to workspace");
                console.error("Error converting integration to workspace:", error);
            }
        } else {
            try {
                await addProjectToExistingWorkspace(params);
                // Refresh project info to update UI with newly added project
                StateMachine.refreshProjectInfo();
            } catch (error) {
                window.showErrorMessage("Error adding integration to existing workspace");
                console.error("Error adding integration to existing workspace:", error);
            }
        }
    }

    async getWorkspaces(): Promise<WorkspacesResponse> {
        return new Promise(async (resolve) => {
            const workspaces = workspace.workspaceFolders;
            const response: WorkspaceFolder[] = (workspaces ?? []).map((space) => ({
                index: space.index,
                fsPath: space.uri.fsPath,
                name: space.name,
            }));
            resolve({ workspaces: response });
        });
    }

    async createComponent(params: ComponentRequest): Promise<CreateComponentResponse> {
        return new Promise(async (resolve) => {
            let res: CreateComponentResponse;
            switch (params.type) {
                case DIRECTORY_MAP.AUTOMATION:
                    res = await createBIAutomation(params);
                    break;
                case DIRECTORY_MAP.FUNCTION || DIRECTORY_MAP.DATA_MAPPER:
                    res = await createBIFunction(params);
                    break;
                default:
                    break;
            }
            resolve(res);
        });
    }

    async getProjectStructure(): Promise<ProjectStructureResponse> {
        return new Promise(async (resolve) => {
            const stateContext = StateMachine.context();
            resolve(stateContext.projectStructure);
        });
    }

    async getProjectComponents(): Promise<ProjectComponentsResponse> {
        return new Promise(async (resolve) => {
            const components = await StateMachine.langClient().getBallerinaProjectComponents({
                documentIdentifiers: [{ uri: Uri.file(StateMachine.context().projectPath).toString() }],
            });
            resolve({ components });
        });
    }

    async getAiSuggestions(params: BIAiSuggestionsRequest): Promise<BIAiSuggestionsResponse> {
        return new Promise(async (resolve) => {
            const { filePath, position, prompt } = params;

            const enableAiSuggestions = extension.ballerinaExtInstance.enableAiSuggestions();
            if (!enableAiSuggestions) {
                resolve(undefined);
                return;
            }
            // get copilot context form ls
            const copilotContextRequest: BICopilotContextRequest = {
                filePath: filePath,
                position: position.startLine,
            };
            console.log(">>> request get copilot context from ls", { request: copilotContextRequest });
            const copilotContext = await StateMachine.langClient().getCopilotContext(copilotContextRequest);
            console.log(">>> copilot context from ls", { response: copilotContext });

            //TODO: Refactor this logic
            let suggestedContent;
            try {
                if (prompt) {
                    let token: string;
                    const loginMethod = await getLoginMethod();
                    if (loginMethod === LoginMethod.BI_INTEL) {
                        token = await getAccessToken();
                    }

                    if (!token) {
                        resolve(undefined);
                        return;
                    }
                    // get suggestions from ai
                    const requestBody = {
                        ...copilotContext,
                        prompt,
                        singleCompletion: false, // Remove setting and assign constant value since this is handled by the AI BE
                    };
                    const requestOptions = {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify(requestBody),
                    };
                    console.log(">>> request ai suggestion", { request: requestBody });
                    // generate new nodes
                    const response = await fetchWithAuth(OLD_BACKEND_URL + "/inline/generation", requestOptions);
                    if (!response.ok) {
                        console.log(">>> ai completion api call failed ", response.status);
                        console.log(">>> ai completion api call failed ", response);
                        return new Promise((resolve) => {
                            resolve(undefined);
                        });
                    }
                    const data = await response.json();
                    console.log(">>> ai suggestion", { response: data });
                    suggestedContent = (data as any).code;
                } else {
                    // get next suggestion
                    const copilot_token = await extension.context.secrets.get("GITHUB_COPILOT_TOKEN");
                    if (!copilot_token) {
                        let token: string;
                        const loginMethod = await getLoginMethod();
                        if (loginMethod === LoginMethod.BI_INTEL) {
                            token = await getAccessToken();
                        }
                        if (!token) {
                            //TODO: Do we need to prompt to login here? If so what? Copilot or Ballerina AI?
                            resolve(undefined);
                            return;
                        }
                        suggestedContent = await this.getCompletionsWithHostedAI(token, copilotContext);
                    } else {
                        const resp = await getCompleteSuggestions({
                            prefix: copilotContext.prefix,
                            suffix: copilotContext.suffix,
                        });
                        console.log(">>> ai suggestion from local", { response: resp });
                        suggestedContent = resp.completion;
                    }

                }
            } catch (error) {
                console.log(">>> error fetching ai suggestion", error);
                return new Promise((resolve) => {
                    resolve(undefined);
                });
            }
            if (!suggestedContent || suggestedContent.trim() === "") {
                console.log(">>> ai suggested content not found");
                return new Promise((resolve) => {
                    resolve(undefined);
                });
            }

            // get flow model from ls
            const context = StateMachine.context();
            if (!context.position) {
                console.log(">>> position not found in the context");
                return new Promise((resolve) => {
                    resolve(undefined);
                });
            }

            const request: BISuggestedFlowModelRequest = {
                filePath: context.documentUri,
                startLine: {
                    line: context.position.startLine ?? 0,
                    offset: context.position.startColumn ?? 0,
                },
                endLine: {
                    line: context.position.endLine ?? 0,
                    offset: context.position.endColumn ?? 0,
                },
                text: suggestedContent,
                position: position.startLine,
            };
            console.log(">>> request bi suggested flow model", request);

            StateMachine.langClient()
                .getSuggestedFlowModel(request)
                .then((model) => {
                    console.log(">>> bi suggested flow model from ls", model);
                    resolve({ flowModel: model.flowModel, suggestion: suggestedContent });
                })
                .catch((error) => {
                    console.log(">>> error fetching bi suggested flow model from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async deleteFlowNode(params: BISourceCodeRequest): Promise<UpdatedArtifactsResponse> {
        console.log(">>> requesting bi delete node from ls", params);
        // Clean project diagnostics before deleting flow node
        await cleanAndValidateProject(StateMachine.langClient(), StateMachine.context().projectPath);

        return new Promise((resolve) => {
            StateMachine.langClient()
                .deleteFlowNode(params)
                .then(async (model) => {
                    console.log(">>> bi delete node from ls", model);
                    const artifacts = await updateSourceCode({ textEdits: model.textEdits, description: 'Flow Node Deletion - ' + params.flowNode.metadata.label });
                    resolve({ artifacts });
                })
                .catch((error) => {
                    console.log(">>> error fetching delete node from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async handleReadmeContent(params: ReadmeContentRequest): Promise<ReadmeContentResponse> {
        return new Promise((resolve) => {
            const projectPath = params.projectPath;
            const readmePath = projectPath ? path.join(projectPath, README_FILE) : undefined;
            if (!readmePath) {
                resolve({ content: "" });
                return;
            }
            if (params.read) {
                if (!fs.existsSync(readmePath)) {
                    resolve({ content: "" });
                } else {
                    const content = fs.readFileSync(readmePath, "utf8");
                    console.log(">>> Read content:", content);
                    resolve({ content });
                }
            } else {
                if (!fs.existsSync(readmePath)) {
                    fs.writeFileSync(readmePath, params.content);
                    console.log(">>> Created and saved readme.md with content:", params.content);
                } else {
                    fs.writeFileSync(readmePath, params.content);
                    console.log(">>> Updated readme.md with content:", params.content);
                }
            }
        });
    }

    async getExpressionCompletions(params: ExpressionCompletionsRequest): Promise<ExpressionCompletionsResponse> {
        return new Promise((resolve, reject) => {
            if (!params.filePath) {
                params.filePath = StateMachine.context().documentUri;
            }
            StateMachine.langClient()
                .getExpressionCompletions(params)
                .then((completions) => {
                    resolve(completions);
                })
                .catch((error) => {
                    reject("Error fetching expression completions from ls");
                });
        });
    }

    async getDataMapperCompletions(params: ExpressionCompletionsRequest): Promise<ExpressionCompletionsResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient()
                .getDataMapperCompletions(params)
                .then((completions) => {
                    resolve(completions);
                })
                .catch((error) => {
                    reject("Error fetching data mapper completions from ls");
                });
        });
    }

    async getConfigVariables(): Promise<ConfigVariableResponse> {
        return new Promise(async (resolve) => {
            const projectPath = StateMachine.context().projectPath;
            const variables = await StateMachine.langClient().getConfigVariables({ projectPath: projectPath }) as ConfigVariableResponse;
            resolve(variables);
        });
    }

    async updateConfigVariables(params: UpdateConfigVariableRequest): Promise<UpdateConfigVariableResponse> {
        return new Promise(async (resolve) => {
            const req: UpdateConfigVariableRequest = params;

            if (!fs.existsSync(params.configFilePath)) {

                // Create config.bal if it doesn't exist
                writeBallerinaFileDidOpen(params.configFilePath, "\n");
            }

            const response = await StateMachine.langClient().updateConfigVariables(req) as BISourceCodeResponse;
            await updateSourceCode({ textEdits: response.textEdits, artifactData: { artifactType: DIRECTORY_MAP.CONFIGURABLE }, description: 'Config Variable Update' });
            resolve(response);
        });
    }

    async getConfigVariablesV2(params: ConfigVariableRequest): Promise<ConfigVariableResponse> {
        return new Promise(async (resolve) => {
            const projectPath = StateMachine.context().projectPath;
            const showLibraryConfigVariables = extension.ballerinaExtInstance.showLibraryConfigVariables();

            // if params includeLibraries is not set, then use settings 
            const includeLibraries = params?.includeLibraries !== undefined
                ? params.includeLibraries
                : showLibraryConfigVariables !== false;

            const variables = await StateMachine.langClient().getConfigVariablesV2({
                projectPath: projectPath,
                includeLibraries
            }) as ConfigVariableResponse;
            resolve(variables);
        });
    }

    async updateConfigVariablesV2(params: UpdateConfigVariableRequestV2): Promise<UpdateConfigVariableResponseV2> {
        return new Promise(async (resolve) => {
            const req: UpdateConfigVariableRequestV2 = params;
            if (!fs.existsSync(params.configFilePath)) {
                // Create config.bal if it doesn't exist
                writeBallerinaFileDidOpen(params.configFilePath, "\n");
            }
            const response = await StateMachine.langClient().updateConfigVariablesV2(req) as UpdateConfigVariableResponseV2;
            await updateSourceCode({ textEdits: response.textEdits, artifactData: { artifactType: DIRECTORY_MAP.CONFIGURABLE }, description: 'Config Variable Update' });
            resolve(response);
        });
    }

    async deleteConfigVariableV2(params: DeleteConfigVariableRequestV2): Promise<DeleteConfigVariableResponseV2> {
        return new Promise(async (resolve) => {
            const req: DeleteConfigVariableRequestV2 = params;
            if (!fs.existsSync(params.configFilePath)) {
                // Create config.bal if it doesn't exist
                writeBallerinaFileDidOpen(params.configFilePath, "\n");
            }
            const response = await StateMachine.langClient().deleteConfigVariableV2(req) as BISourceCodeResponse;
            await updateSourceCode({ textEdits: response.textEdits, artifactData: { artifactType: DIRECTORY_MAP.CONFIGURABLE }, description: 'Config Variable Deletion' });
            resolve(response);
        });
    }

    async getConfigVariableNodeTemplate(params: GetConfigVariableNodeTemplateRequest): Promise<BINodeTemplateResponse> {
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getConfigVariableNodeTemplate(params)
                .then((model) => {
                    console.log(">>> bi node template from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching node template from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }


    // Function to open Config.toml
    async openConfigToml(params: OpenConfigTomlRequest): Promise<void> {
        return new Promise(async (resolve) => {
            const currentProject: BallerinaProject | undefined = await getCurrentBIProject(params.filePath);

            const configFilePath = path.join(StateMachine.context().projectPath, "Config.toml");
            const ignoreFile = path.join(StateMachine.context().projectPath, ".gitignore");
            const docLink = "https://ballerina.io/learn/provide-values-to-configurable-variables/#provide-via-toml-syntax";
            const uri = Uri.file(configFilePath);

            if (!fs.existsSync(configFilePath)) {
                const updatedContent = `
# Configuration file for "${currentProject.packageName}"
# 
# This file contains configuration values for configurable variables in your Ballerina code.
# Both package-specific and imported module configurations are included below.
# 
# Learn more about configurable variables:
# ${docLink}
#
# Note: This file is automatically added to .gitignore to protect sensitive information.
`;
                // Create and write content to the config file
                fs.writeFile(configFilePath, updatedContent, (error) => {
                    if (error) {
                        window.showErrorMessage('Unable to create the Config.toml file: ' + error);
                        return;
                    }
                });

                if (fs.existsSync(ignoreFile)) {
                    const ignoreUri = Uri.file(ignoreFile);
                    let ignoreContent: string = fs.readFileSync(ignoreUri.fsPath, 'utf8');
                    if (!ignoreContent.includes("Config.toml")) {
                        ignoreContent += `\n${"Config.toml"}\n`;
                        fs.writeFile(ignoreUri.fsPath, ignoreContent, function (error) {
                            if (error) {
                                return window.showErrorMessage('Unable to update the .gitIgnore file: ' + error);
                            }
                            window.showInformationMessage('Successfully updated the .gitIgnore file.');
                        });
                    }
                }
            }

            await workspace.openTextDocument(uri).then(async document => {
                window.showTextDocument(document, { preview: false });
            });
            resolve();
        });

    }


    async getReadmeContent(params: ReadmeContentRequest): Promise<ReadmeContentResponse> {
        return new Promise((resolve) => {
            const projectPath = params.projectPath;
            const readmePath = path.join(projectPath, "README.md");

            if (!fs.existsSync(readmePath)) {
                resolve({ content: "" });
                return;
            }

            fs.readFile(readmePath, "utf8", (err, data) => {
                if (err) {
                    console.error("Error reading README.md:", err);
                    resolve({ content: "" });
                } else {
                    resolve({ content: data });
                }
            });
        });
    }

    openReadme(params: OpenReadmeRequest): void {
        const projectRoot = params.projectPath;
        const readmePath = path.join(projectRoot, "README.md");

        if (!fs.existsSync(readmePath)) {
            // Create README.md if it doesn't exist

            const projectInfo = StateMachine.context().projectInfo;
            let content = "";

            if (params.isWorkspaceReadme) {
                const workspaceName = projectInfo?.title || projectInfo?.name;
                content = `# ${workspaceName} Workspace\n\nAdd your workspace description here.`;
            } else {
                const project = projectInfo?.children && projectInfo?.children.length > 0
                    ? projectInfo?.children.find((child) => child.projectPath === params.projectPath)
                    : projectInfo;
                const projectName = project?.title || project?.name;
                content = `# ${projectName} Integration\n\nAdd your integration description here.`;
            }

            fs.writeFileSync(readmePath, content);
        }

        // Open README.md in the editor
        workspace.openTextDocument(readmePath).then((doc) => {
            window.showTextDocument(doc, ViewColumn.Beside);
        });
    }

    async deployProject(params: DeploymentRequest): Promise<DeploymentResponse> {
        const scopes = params.integrationTypes;

        let integrationType: SCOPE;

        if (scopes.length === 1) {
            integrationType = scopes[0];
        } else {
            // Show a quick pick to select deployment option
            const selectedScope = await window.showQuickPick(scopes, {
                placeHolder: 'You have different types of artifacts within this integration. Select the artifact type to be deployed'
            });
            integrationType = selectedScope as SCOPE;
        }

        if (!integrationType) {
            return { isCompleted: true };
        }

        const deployementParams: ICreateComponentCmdParams = {
            integrationType: integrationType as any,
            buildPackLang: "ballerina", // Example language
            name: path.basename(StateMachine.context().projectPath),
            componentDir: StateMachine.context().projectPath,
            extName: "Devant"
        };
        commands.executeCommand(PlatformExtCommandIds.CreateNewComponent, deployementParams);

        return { isCompleted: true };
    }

    openAIChat(params: AIChatRequest): void {
        if (params.readme) {
            commands.executeCommand("ballerina.open.ai.panel", {
                type: 'command-template',
                command: Command.Code,
                templateId: TemplateId.GenerateFromReadme,
            });
        } else {
            commands.executeCommand("ballerina.open.ai.panel");
        }
    }

    async getModuleNodes(): Promise<BIModuleNodesResponse> {
        console.log(">>> requesting bi module nodes from ls");
        return new Promise((resolve) => {
            const context = StateMachine.context();
            if (!context.projectPath) {
                console.log(">>> projectPath not found in the context");
                return new Promise((resolve) => {
                    resolve(undefined);
                });
            }

            const params: BIModuleNodesRequest = {
                filePath: context.projectPath,
            };

            StateMachine.langClient()
                .getModuleNodes(params)
                .then((model) => {
                    console.log(">>> bi module nodes from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching bi module nodes from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async getSignatureHelp(params: SignatureHelpRequest): Promise<SignatureHelpResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient()
                .getSignatureHelp(params)
                .then((signatureHelp) => {
                    resolve(signatureHelp);
                })
                .catch((error) => {
                    reject("Error fetching signature help from ls");
                });
        });
    }

    async getVisibleVariableTypes(params: BIGetVisibleVariableTypesRequest): Promise<BIGetVisibleVariableTypesResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient()
                .getVisibleVariableTypes(params)
                .then((types) => {
                    resolve(types as BIGetVisibleVariableTypesResponse);
                })
                .catch((error) => {
                    reject("Error fetching visible variable types from ls");
                });
        });
    }

    async checkDockerAvailability(): Promise<boolean> {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            exec('docker --version', (error: any) => {
                resolve(!error);
            });
        });
    }

    async runBallerinaBuildTask(docker: boolean): Promise<void> {
        const taskDefinition: TaskDefinition = {
            type: 'shell',
            task: 'run'
        };

        let buildCommand = docker ? 'bal build --cloud="docker"' : 'bal build';

        // If docker is true check if docker command is available
        if (docker) {
            const dockerAvailable = await this.checkDockerAvailability();
            if (!dockerAvailable) {
                window.showErrorMessage('Docker is not available. Please install Docker to build Docker images.');
                return;
            }
        }

        // Get Ballerina home path from settings
        const config = workspace.getConfiguration('ballerina');
        const ballerinaHome = config.get<string>('home');
        if (ballerinaHome) {
            // Add ballerina home to build path only if it's configured
            buildCommand = path.join(ballerinaHome, 'bin', buildCommand);
        }

        // Use the current process environment which should have the updated PATH
        const execution = new ShellExecution(buildCommand, { env: process.env as { [key: string]: string } });

        const task = new Task(
            taskDefinition,
            workspace.workspaceFolders![0], // Assumes at least one workspace folder is open
            'Ballerina Build',
            'ballerina',
            execution
        );

        try {
            await tasks.executeTask(task);
        } catch (error) {
            window.showErrorMessage(`Failed to build Ballerina package: ${error}`);
        }
    }

    buildProject(mode: BuildMode): void {

        switch (mode) {
            case BuildMode.JAR:
                this.runBallerinaBuildTask(false);
                break;
            case BuildMode.DOCKER:
                this.runBallerinaBuildTask(true);
                break;
        }

    }

    runProject(): void {
        commands.executeCommand(BI_COMMANDS.BI_RUN_PROJECT);
    }

    async getVisibleTypes(params: VisibleTypesRequest): Promise<VisibleTypesResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient()
                .getVisibleTypes(params)
                .then((visibleTypes) => {
                    resolve(visibleTypes);
                })
                .catch((error) => {
                    reject("Error fetching visible types from ls");
                });
        });
    }

    async deleteByComponentInfo(params: BIDeleteByComponentInfoRequest): Promise<BIDeleteByComponentInfoResponse> {
        console.log(">>> requesting bi delete node from ls by componentInfo", params);
        const projectDiags: Diagnostics[] = await checkProjectDiagnostics(StateMachine.langClient(), StateMachine.context().projectPath);

        const position: NodePosition = {
            startLine: params.component?.startLine,
            startColumn: params.component?.startColumn,
            endColumn: params.component?.endColumn,
            endLine: params.component?.endLine
        };
        // Check if the filepath is only the filename or the full path if not concatenate the project uri
        let filePath = params.component?.filePath;
        if (!filePath.includes(StateMachine.context().projectPath)) {
            filePath = path.join(StateMachine.context().projectPath, filePath);
        }
        const componentView = await getView(filePath, position, StateMachine.context().projectPath);
        // Helper function to perform the actual delete operation
        const performDelete = async (): Promise<any> => {
            return new Promise((resolve, reject) => {
                StateMachine.langClient()
                    .deleteByComponentInfo(params)
                    .then(async (model) => {
                        console.log(">>> bi delete node from ls by componentInfo", model);
                        let description = 'Component Deletion';
                        if (componentView?.location?.artifactType && componentView?.location?.identifier) {
                            description = `${this.capitalizeFirstLetter(componentView.location.artifactType)} Deletion - ${componentView.location.identifier}`;
                        }
                        await updateSourceCode({ textEdits: model.textEdits, description: description, skipPayloadCheck: true }); // Skip payload check because the component is deleted
                        resolve(model);
                    })
                    .catch((error) => {
                        console.log(">>> error fetching delete node from ls by componentInfo", error);
                        reject("Error fetching delete node from ls by componentInfo");
                    });
            });
        };

        // If there are diagnostics, remove unused imports first, then delete component
        if (projectDiags.length > 0) {
            return new Promise((resolve, reject) => {
                removeUnusedImports(projectDiags, StateMachine.langClient())
                    .then(() => {
                        // After removing unused imports, proceed with component deletion
                        return performDelete();
                    })
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((error) => {
                        reject("Error during delete operation: " + error);
                    });
            });
        } else {
            // No diagnostics, directly delete component
            return performDelete();
        }
    }

    async getFormDiagnostics(params: FormDiagnosticsRequest): Promise<FormDiagnosticsResponse> {
        return new Promise((resolve, reject) => {
            console.log(">>> requesting form diagnostics from ls", params);
            StateMachine.langClient()
                .getFormDiagnostics(params)
                .then((diagnostics) => {
                    console.log(">>> form diagnostics response from ls", diagnostics);
                    resolve(diagnostics);
                })
                .catch((error) => {
                    reject("Error fetching form diagnostics from ls");
                });
        });
    }

    async getExpressionDiagnostics(params: ExpressionDiagnosticsRequest): Promise<ExpressionDiagnosticsResponse> {
        return new Promise((resolve, reject) => {
            console.log(">>> requesting expression diagnostics from ls", params);
            StateMachine.langClient()
                .getExpressionDiagnostics(params)
                .then((diagnostics) => {
                    console.log(">>> expression diagnostics response from ls", diagnostics);
                    resolve(diagnostics);
                })
                .catch((error) => {
                    reject("Error fetching expression diagnostics from ls");
                });
        });
    }

    async addBreakpointToSource(params: BreakpointRequest): Promise<void> {
        return new Promise(async (resolve) => {
            console.log(">>> adding breakpoint to source", params);
            const breakpoint = new vscode.SourceBreakpoint(
                new vscode.Location(vscode.Uri.file(params.filePath), new vscode.Position(params.breakpoint.line, params.breakpoint?.column)));
            vscode.debug.addBreakpoints([breakpoint]);

            notifyBreakpointChange();
        });
    }

    async removeBreakpointFromSource(params: BreakpointRequest): Promise<void> {
        return new Promise(async (resolve) => {
            console.log(">>> removing breakpoint from source", params);
            const breakpointsForFile: vscode.SourceBreakpoint[] = vscode.debug.breakpoints.filter((breakpoint) => {
                const sourceBreakpoint = breakpoint as vscode.SourceBreakpoint;
                return sourceBreakpoint.location.uri.fsPath === params.filePath;
            }) as vscode.SourceBreakpoint[];

            const breakpoints = breakpointsForFile.filter((breakpoint) => {
                return breakpoint.location.range.start.line === params.breakpoint.line &&
                    breakpoint.location.range.start?.character === params.breakpoint?.column;
            });

            // If there are no breakpoints found,
            // then it could be due the breakpoint has been added from the sourceCode, where the column is not provided
            // so we need to check for breakpoint with the same line and remove
            if (breakpoints.length === 0) {
                const breakpointsToRemove = breakpointsForFile.filter((breakpoint) => {
                    return breakpoint.location.range.start.line === params.breakpoint.line;
                });
                vscode.debug.removeBreakpoints(breakpointsToRemove);
            } else {
                vscode.debug.removeBreakpoints(breakpoints);
            }

            notifyBreakpointChange();
        });
    }

    async getBreakpointInfo(): Promise<CurrentBreakpointsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();

            const breakpointsForFile: vscode.SourceBreakpoint[] = vscode.debug.breakpoints.filter((breakpoint) => {
                const sourceBreakpoint = breakpoint as vscode.SourceBreakpoint;
                return sourceBreakpoint.location.uri.fsPath === context?.documentUri;
            }) as vscode.SourceBreakpoint[];

            const breakpoints: DebugProtocol.Breakpoint[] = breakpointsForFile.map((breakpoint) => {
                return {
                    verified: true,
                    line: breakpoint.location.range.start.line,
                    column: breakpoint.location.range.start?.character
                };
            });
            // TODO: Check the need of using breakpoints with verified status
            // const breakppoints = BreakpointManager.getInstance().getBreakpoints();
            // if there is an instance then call get ActiveBreakpoint

            const activeBreakpoint = BreakpointManager.getInstance()?.getActiveBreakpoint();
            resolve({ breakpoints: breakpoints, activeBreakpoint: activeBreakpoint });
        });
    }

    async getEnclosedFunction(params: BIGetEnclosedFunctionRequest): Promise<BIGetEnclosedFunctionResponse> {
        console.log(">>> requesting parent functin definition", params);
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getEnclosedFunctionDef(params)
                .then((response) => {
                    if (response?.filePath && response?.startLine && response?.endLine) {
                        console.log(">>> parent function position ", response);
                        resolve(response);
                    } else {
                        console.log(">>> parent function position not found");
                        resolve(undefined);
                    }

                })
                .catch((error) => {
                    console.log(">>> error fetching parent function position", error);
                    resolve(undefined);
                });
        });
    }

    async formDidOpen(params: FormDidOpenParams): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const { filePath } = params;
            const fileUri = Uri.file(filePath);
            const exprFileSchema = fileUri.with({ scheme: 'expr' });

            let languageId: string;
            let version: number;
            let text: string;

            try {
                const textDocument = await workspace.openTextDocument(fileUri);
                languageId = textDocument.languageId;
                version = textDocument.version;
                text = textDocument.getText();
            } catch (error) {
                languageId = "ballerina";
                version = 1;
                text = "";
            }

            StateMachine.langClient().didOpen({
                textDocument: {
                    uri: exprFileSchema.toString(),
                    languageId,
                    version,
                    text
                }
            });
        });
    }

    async formDidClose(params: FormDidCloseParams): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const { filePath } = params;
                const fileUri = Uri.file(filePath);
                const exprFileSchema = fileUri.with({ scheme: 'expr' });
                StateMachine.langClient().didClose({
                    textDocument: {
                        uri: exprFileSchema.toString()
                    }
                });
                resolve();
            } catch (error) {
                console.error("Error closing file in didClose", error);
                reject(error);
            }
        });
    }

    async getDesignModel(): Promise<BIDesignModelResponse> {
        console.log(">>> requesting design model from ls");
        return new Promise((resolve) => {
            const projectPath = StateMachine.context().projectPath;

            StateMachine.langClient()
                .getDesignModel({ projectPath })
                .then((model) => {
                    console.log(">>> design model from ls", model);
                    resolve(model);
                })
                .catch((error) => {
                    console.log(">>> error fetching design model from ls", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                }
                );
        });
    }


    async getTypes(params: GetTypesRequest): Promise<GetTypesResponse> {
        const projectPath = StateMachine.context().projectPath;
        const ballerinaFiles = await getBallerinaFiles(Uri.file(projectPath).fsPath);

        return new Promise((resolve, reject) => {
            StateMachine.langClient()
                .getTypes({ filePath: ballerinaFiles[0] })
                .then((types) => {
                    resolve(types);
                }).catch((error) => {
                    console.log(">>> error fetching types from ls", error);
                    reject(error);
                });
        });
    }

    async updateType(params: UpdateTypeRequest): Promise<UpdateTypeResponse> {
        const projectPath = StateMachine.context().projectPath;
        const filePath = path.join(projectPath, params.filePath);
        return new Promise((resolve, reject) => {
            console.log(">>> updating type request", params.type);
            StateMachine.langClient()
                .updateType({ filePath, type: params.type, description: "" })
                .then(async (updateTypeResponse: UpdateTypeResponse) => {
                    console.log(">>> update type response", updateTypeResponse);
                    await updateSourceCode({ textEdits: updateTypeResponse.textEdits, description: 'Type Update', identifier: params.type.name });
                    resolve(updateTypeResponse);
                }).catch((error) => {
                    console.log(">>> error fetching types from ls", error);
                    reject(error);
                });
        });
    }

    async getType(params: GetTypeRequest): Promise<GetTypeResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient()
                .getType(params)
                .then((type) => {
                    console.log(">>> type from ls", type);
                    resolve(type);
                })
                .catch((error) => {
                    console.log(">>> error fetching type from ls", error);
                    reject(error);
                });
        });
    }

    async updateImports(params: UpdateImportsRequest): Promise<UpdateImportsResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient()
                .updateImports({
                    ...params,
                    importStatement: params.importStatement.trim()
                })
                .then((response) => {
                    resolve({ ...response, importStatementOffset: params.importStatement.length });
                })
                .catch((error) => {
                    console.error('Error updating imports', error);
                    reject(error);
                });
        });
    }

    async addFunction(params: AddFunctionRequest): Promise<AddImportItemResponse> {
        return new Promise((resolve) => {
            StateMachine.langClient().addFunction(params)
                .then((response) => {
                    resolve(response);
                })
                .catch((error) => {
                    console.log(">>> Error adding function", error);
                    resolve(undefined);
                });
        });
    }

    async promptGithubCopilotAuthNotificaiton(): Promise<void> {
        //TODO: Prevent multiple notifications
        vscode.window.showInformationMessage(
            'WSO2 Integrator: BI supports visual completions with GitHub Copilot.',
            'Authorize using GitHub Copilot'
        ).then(selection => {
            if (selection === 'Authorize using GitHub Copilot') {
                commands.executeCommand('ballerina.login.copilot');
            }
        });
    }

    async getCompletionsWithHostedAI(token, copilotContext): Promise<string> {
        // get suggestions from ai
        const requestBody = {
            ...copilotContext,
        };
        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(requestBody),
        };
        console.log(">>> request ai suggestion", { request: requestBody });
        // generate new nodes
        const response = await fetchWithAuth(OLD_BACKEND_URL + "/completion", requestOptions);
        if (!response.ok) {
            console.log(">>> ai completion api call failed ", response);
            return new Promise((resolve) => {
                resolve(undefined);
            });
        }
        const data = await response.json();
        console.log(">>> ai suggestion from remote", { response: data });
        const suggestedContent = (data as any).completion;
        return suggestedContent;
    }

    async getFunctionNode(params: FunctionNodeRequest): Promise<FunctionNodeResponse> {
        return new Promise((resolve) => {
            StateMachine.langClient().getFunctionNode(params)
                .then((response) => {
                    resolve(response);
                })
                .catch((error) => {
                    console.log(">>> Error getting function node", error);
                    resolve(undefined);
                });
        });
    }

    async getExpressionTokens(params: ExpressionTokensRequest): Promise<number[]> {
        return new Promise((resolve) => {
            StateMachine.langClient().getExpressionTokens(params)
                .then((response) => {
                    resolve(response?.data || []);
                })
                .catch((error) => {
                    console.log(">>> Error getting expression tokens", error);
                    resolve(undefined);
                });
        });
    }

    async createGraphqlClassType(params: UpdateTypeRequest): Promise<UpdateTypeResponse> {
        const projectPath = StateMachine.context().projectPath;
        const filePath = path.join(projectPath, params.filePath);
        return new Promise((resolve, reject) => {
            StateMachine.langClient()
                .createGraphqlClassType({ filePath, type: params.type, description: "" })
                .then(async (updateTypeResponse: UpdateTypeResponse) => {
                    console.log(">>> create graphql class type response", updateTypeResponse);
                    await updateSourceCode({ textEdits: updateTypeResponse.textEdits, description: 'Graphql Class Type Creation' });
                    resolve(updateTypeResponse);
                }).catch((error) => {
                    console.log(">>> error fetching class type from ls", error);
                    reject(error);
                });
        });
    }

    async getServiceClassModel(params: ModelFromCodeRequest): Promise<ServiceClassModelResponse> {
        return new Promise(async (resolve) => {
            try {
                const res: ServiceClassModelResponse = await StateMachine.langClient().getServiceClassModel(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async updateClassField(params: ClassFieldModifierRequest): Promise<SourceEditResponse> {
        return new Promise(async (resolve) => {
            try {
                const res: SourceEditResponse = await StateMachine.langClient().updateClassField(params);
                await updateSourceCode({ textEdits: res.textEdits, description: 'Class Field Update' });
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async updateServiceClass(params: ServiceClassSourceRequest): Promise<UpdatedArtifactsResponse> {
        return new Promise(async (resolve) => {
            try {
                const res: SourceEditResponse = await StateMachine.langClient().updateServiceClass(params);
                const artifacts = await updateSourceCode({ textEdits: res.textEdits, description: 'Service Class Update' });
                resolve({ artifacts });
            } catch (error) {
                console.log(error);
            }
        });
    }

    async addClassField(params: AddFieldRequest): Promise<SourceEditResponse> {
        return new Promise(async (resolve) => {
            try {
                const res: SourceEditResponse = await StateMachine.langClient().addClassField(params);
                await updateSourceCode({ textEdits: res.textEdits, description: 'Class Field Creation' });
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async renameIdentifier(params: RenameIdentifierRequest): Promise<void> {
        const projectPath = StateMachine.context().projectPath;
        const filePath = path.join(projectPath, params.fileName);
        const fileUri = Uri.file(filePath).toString();
        const request: RenameRequest = {
            textDocument: {
                uri: fileUri
            },
            position: params.position,
            newName: params.newName
        };
        try {
            const workspaceEdit = await StateMachine.langClient().rename(request);
            if (workspaceEdit && 'changes' in workspaceEdit && workspaceEdit.changes) {
                await updateSourceCode({ textEdits: workspaceEdit.changes, description: 'Rename for ' + params.newName, isRenameOperation: true });
            }
        } catch (error) {
            console.error('Error in renameIdentifier:', error);
            throw error;
        }
    }

    async getEndOfFile(params: EndOfFileRequest): Promise<LinePosition> {
        return new Promise((resolve, reject) => {
            const { filePath } = params;
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const lines = fileContent.split('\n');
                const lastLine = lines[lines.length - 1];
                const lastLineLength = lastLine.length;
                resolve({ line: lines.length - 1, offset: lastLineLength });
            } catch (error) {
                console.log(error);
                resolve({ line: 0, offset: 0 });
            }
        });
    }

    async search(params: BISearchRequest): Promise<BISearchResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient().search(params).then((res) => {
                resolve(res);
            }).catch((error) => {
                console.log(">>> error searching", error);
                reject(error);
            });
        });
    }

    async getRecordNames(): Promise<RecordsInWorkspaceMentions> {
        const projectComponents = await this.getProjectComponents();

        // Extracting all record names
        const recordNames: string[] = [];

        if (projectComponents?.components?.packages) {
            for (const pkg of projectComponents.components.packages) {
                for (const module of pkg.modules) {
                    if (module.records) {
                        for (const record of module.records) {
                            recordNames.push(record.name);
                        }
                    }
                }
            }
        }

        return { mentions: recordNames };
    }

    async getDevantMetadata(): Promise<DevantMetadata | undefined> {
        let hasContextYaml = false;
        let isLoggedIn = false;
        let hasComponent = false;
        let hasLocalChanges = false;
        try {
            const projectPath = StateMachine.context().projectPath;
            const repoRoot = getRepoRoot(projectPath);
            if (repoRoot) {
                const contextYamlPath = path.join(repoRoot, ".choreo", "context.yaml");
                if (fs.existsSync(contextYamlPath)) {
                    hasContextYaml = true;
                }
            }

            const platformExt = extensions.getExtension("wso2.wso2-platform");
            if (!platformExt) {
                return { hasComponent: hasContextYaml, isLoggedIn: false };
            }
            const platformExtAPI: IWso2PlatformExtensionAPI = await platformExt.activate();
            hasLocalChanges = await platformExtAPI.localRepoHasChanges(projectPath);
            isLoggedIn = platformExtAPI.isLoggedIn();
            if (isLoggedIn) {
                const components = platformExtAPI.getDirectoryComponents(projectPath);
                hasComponent = components.length > 0;
                return { isLoggedIn, hasComponent, hasLocalChanges };
            }
            return { isLoggedIn, hasComponent: hasContextYaml, hasLocalChanges };
        } catch (err) {
            console.error("failed to call getDevantMetadata: ", err);
            return { hasComponent: hasComponent || hasContextYaml, isLoggedIn, hasLocalChanges };
        }
    }

    async getRecordConfig(params: GetRecordConfigRequest): Promise<GetRecordConfigResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient().getRecordConfig(params).then((res) => {
                resolve(res);
            }).catch((error) => {
                console.log(">>> error getting record config", error);
                reject(error);
            });
        });
    }

    async updateRecordConfig(params: UpdateRecordConfigRequest): Promise<GetRecordConfigResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient().updateRecordConfig(params).then((res) => {
                resolve(res);
            }).catch((error) => {
                console.log(">>> error updating record config", error);
                reject(error);
            });
        });
    }

    async getRecordSource(params: RecordSourceGenRequest): Promise<RecordSourceGenResponse> {
        console.log(">>> requesting record source", params);
        return new Promise((resolve, reject) => {
            StateMachine.langClient().getRecordSource(params).then((res) => {
                resolve(res);
            }).catch((error) => {
                console.log(">>> error getting record source", error);
                reject(error);
            });
        });
    }

    async getRecordModelFromSource(params: GetRecordModelFromSourceRequest): Promise<GetRecordModelFromSourceResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient().getRecordModelFromSource(params).then((res) => {
                resolve(res);
            }).catch((error) => {
                console.log(">>> error getting record model from source", error);
                reject(error);
            });
        });
    }

    async updateTypes(params: UpdateTypesRequest): Promise<UpdateTypesResponse> {
        return new Promise((resolve, reject) => {
            const projectPath = StateMachine.context().projectPath;
            const completeFilePath = path.join(projectPath, params.filePath);

            StateMachine.langClient().updateTypes(
                { filePath: completeFilePath, types: params.types }
            ).then(async (updateTypesresponse: UpdateTypesResponse) => {
                console.log(">>> update type response", updateTypesresponse);
                if (updateTypesresponse.textEdits) {
                    await updateSourceCode({ textEdits: updateTypesresponse.textEdits, description: 'Type Update' });
                    resolve(updateTypesresponse);
                } else {
                    console.log(">>> error updating types", updateTypesresponse?.errorMsg);
                    resolve(undefined);
                }
            }).catch((error) => {
                console.log(">>> error updating types", error);
                reject(error);
            });
        });
    }

    async getFunctionNames(): Promise<RecordsInWorkspaceMentions> {
        const projectComponents = await this.getProjectComponents();

        // Extracting all function names
        const functionNames: string[] = [];

        if (projectComponents?.components?.packages) {
            for (const pkg of projectComponents.components.packages) {
                for (const module of pkg.modules || []) {
                    if (module.functions) {
                        for (const func of module.functions) {
                            functionNames.push(func.name);
                        }
                    }
                }
            }
        }

        return { mentions: functionNames };
    }

    async generateOpenApiClient(params: OpenAPIClientGenerationRequest): Promise<GeneratedClientSaveResponse> {
        return new Promise((resolve, reject) => {
            const projectPath = StateMachine.context().projectPath;
            const request: OpenAPIClientGenerationRequest = {
                openApiContractPath: params.openApiContractPath,
                projectPath: projectPath,
                module: params.module
            };
            StateMachine.langClient().openApiGenerateClient(request).then((res) => {
                if (!res.source || !res.source.textEditsMap) {
                    console.error("textEditsMap is undefined or null");
                    reject(new Error("textEditsMap is undefined or null"));
                    return;
                }

                if (res.source.isModuleExists) {
                    console.error("Module already exists");
                    resolve({ errorMessage: "Module already exists" });
                    return;
                }

                // Convert the plain object back to a Map
                const textEditsMap = new Map(Object.entries(res.source.textEditsMap));
                textEditsMap.forEach(async (value, key) => {
                    await this.applyTextEdits(key, value);
                });
                resolve({});
            }).catch((error) => {
                console.log(">>> error generating openapi client", error);
                reject(error);
            });
        });
    }

    async getOpenApiGeneratedModules(params: OpenAPIGeneratedModulesRequest): Promise<OpenAPIGeneratedModulesResponse> {
        return new Promise((resolve, reject) => {
            const projectPath = StateMachine.context().projectPath;
            const request: OpenAPIGeneratedModulesRequest = {
                projectPath: projectPath
            };
            StateMachine.langClient().getOpenApiGeneratedModules(request).then((res) => {
                resolve(res);
            }).catch((error) => {
                console.log(">>> error getting openapi generated modules", error);
                reject(error);
            });
        });
    }

    async deleteOpenApiGeneratedModules(params: OpenAPIClientDeleteRequest): Promise<OpenAPIClientDeleteResponse> {
        return new Promise((resolve, reject) => {
            const projectPath = StateMachine.context().projectPath;
            const request: OpenAPIClientDeleteRequest = {
                projectPath: projectPath,
                module: params.module
            };
            StateMachine.langClient().deleteOpenApiGeneratedModule(request).then(async (res) => {
                for (const [key, value] of Object.entries(res.deleteData.textEditsMap)) {
                    await this.applyTextEdits(key, value);
                }
                for (const file of res.deleteData.filesToDelete) {
                    await this.applyTextEdits(file, [{
                        newText: "",
                        range: {
                            start: {
                                character: 0,
                                line: 0,
                            },
                            end: {
                                character: Number.MAX_VALUE,
                                line: Number.MAX_VALUE,
                            }
                        }
                    }]);
                }
                updateView();
                resolve(res);
            }).catch((error) => {
                console.log(">>> error getting openapi generated modules", error);
                reject(error);
            });
        });
    }

    async getTypeFromJson(params: JsonToTypeRequest): Promise<JsonToTypeResponse> {
        return new Promise((resolve, reject) => {
            const projectPath = StateMachine.context().projectPath;
            const filePath = path.join(projectPath, 'types.bal');
            StateMachine.langClient().getTypeFromJson({ ...params, filePath })
                .then((response) => {
                    console.log(">>> type from json response", response);
                    resolve(response);
                })
                .catch((error) => {
                    console.log(">>> error getting type from json", error);
                    reject(error);
                });
        });
    }

    async deleteType(params: DeleteTypeRequest): Promise<DeleteTypeResponse> {
        return new Promise((resolve, reject) => {
            const projectPath = StateMachine.context().projectPath;
            const filePath = path.join(projectPath, params.filePath);
            StateMachine.langClient().deleteType({ filePath: filePath, lineRange: params.lineRange })
                .then(async (deleteTypeResponse: DeleteTypeResponse) => {
                    if (deleteTypeResponse.textEdits) {
                        await updateSourceCode({ textEdits: deleteTypeResponse.textEdits, description: 'Type Deletion' });
                        resolve(deleteTypeResponse);
                    } else {
                        reject(deleteTypeResponse.errorMsg);
                    }
                }).catch((error) => {
                    reject(error);
                });
        });
    }

    async verifyTypeDelete(params: VerifyTypeDeleteRequest): Promise<VerifyTypeDeleteResponse> {
        const projectPath = StateMachine.context().projectPath;
        const filePath = path.join(projectPath, params.filePath);

        const request: VerifyTypeDeleteRequest = {
            filePath: filePath,
            startPosition: params.startPosition,
        };
        return new Promise((resolve, reject) => {
            StateMachine.langClient().verifyTypeDelete(request)
                .then((response) => {
                    resolve(response);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    async searchNodes(params: BISearchNodesRequest): Promise<BISearchNodesResponse> {
        return new Promise((resolve, reject) => {
            StateMachine.langClient().searchNodes(params).then((res) => {
                resolve(res);
            }).catch((error) => {
                console.log(">>> error searching", error);
                reject(error);
            });
        });
    }

}

export function getRepoRoot(projectRoot: string): string | undefined {
    // traverse up the directory tree until .git directory is found
    const gitDir = path.join(projectRoot, ".git");
    if (fs.existsSync(gitDir)) {
        return projectRoot;
    }
    // path is root return undefined
    if (projectRoot === path.parse(projectRoot).root) {
        return undefined;
    }
    return getRepoRoot(path.join(projectRoot, ".."));
}

export async function getBallerinaFiles(dir: string): Promise<string[]> {
    let files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(await getBallerinaFiles(entryPath));
        } else if (entry.isFile() && entry.name.endsWith(".bal")) {
            files.push(entryPath);
        }
    }
    return files;
}
