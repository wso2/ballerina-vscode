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
    AIMachineSnapshot,
    AIPanelAPI,
    AIPanelPrompt,
    AddFilesToProjectRequest,
    CheckpointInfo,
    Command,
    DocGenerationRequest,
    GenerateAgentCodeRequest,
    GenerateOpenAPIRequest,
    GetModuleDirParams,
    LLMDiagnostics,
    LoginMethod,
    MetadataWithAttachments,
    ProcessContextTypeCreationRequest,
    ProcessMappingParametersRequest,
    RequirementSpecification,
    RestoreCheckpointRequest,
    SemanticDiffRequest,
    SemanticDiffResponse,
    SubmitFeedbackRequest,
    TestGenerationMentions,
    UIChatMessage,
    UpdateChatMessageRequest,
} from "@wso2/ballerina-core";
import * as fs from 'fs';
import path from "path";
import { workspace } from 'vscode';

import { isNumber } from "lodash";
import { getServiceDeclarationNames } from "../../../src/features/ai/documentation/utils";
import { AIStateMachine, openAIPanelWithPrompt } from "../../../src/views/ai-panel/aiMachine";
import { checkToken } from "../../../src/views/ai-panel/utils";
import { extension } from "../../BalExtensionContext";
import { openChatWindowWithCommand } from "../../features/ai/data-mapper/index";
import { generateDocumentationForService } from "../../features/ai/documentation/generator";
import { generateOpenAPISpec } from "../../features/ai/openapi/index";
import { OLD_BACKEND_URL } from "../../features/ai/utils";
import { fetchWithAuth } from "../../features/ai/utils/ai-client";
import { getLLMDiagnosticArrayAsString } from "../../features/natural-programming/utils";
import { StateMachine, updateView } from "../../stateMachine";
import { getLoginMethod, loginGithubCopilot } from "../../utils/ai/auth";
import { normalizeCodeContext } from "../../views/ai-panel/codeContextUtils";
import { refreshDataMapper } from "../data-mapper/utils";
import {
    TEST_DIR_NAME
} from "./constants";
import { AIPanelAbortController, addToIntegration, cleanDiagnosticMessages, searchDocumentation } from "./utils";

import { onHideReviewActions } from '@wso2/ballerina-core';
import { createExecutionContextFromStateMachine, createExecutorConfig, generateAgent } from '../../features/ai/agent/index';
import { integrateCodeToWorkspace } from "../../features/ai/agent/utils";
import { ContextTypesExecutor } from '../../features/ai/executors/datamapper/ContextTypesExecutor';
import { FunctionMappingExecutor } from '../../features/ai/executors/datamapper/FunctionMappingExecutor';
import { InlineMappingExecutor } from '../../features/ai/executors/datamapper/InlineMappingExecutor';
import { approvalManager } from '../../features/ai/state/ApprovalManager';
import { cleanupTempProject } from "../../features/ai/utils/project/temp-project";
import { RPCLayer } from '../../RPCLayer';
import { chatStateStorage } from '../../views/ai-panel/chatStateStorage';
import { restoreWorkspaceSnapshot } from '../../views/ai-panel/checkpoint/checkpointUtils';

export class AiPanelRpcManager implements AIPanelAPI {

    async getLoginMethod(): Promise<LoginMethod> {
        return new Promise(async (resolve) => {
            const loginMethod = await getLoginMethod();
            resolve(loginMethod);
        });
    }

    async getDefaultPrompt(): Promise<AIPanelPrompt> {
        let defaultPrompt: AIPanelPrompt = extension.aiChatDefaultPrompt;
        
        // Normalize code context to use relative paths
        if (defaultPrompt && 'codeContext' in defaultPrompt && defaultPrompt.codeContext) {
            defaultPrompt = {
                ...defaultPrompt,
                codeContext: normalizeCodeContext(defaultPrompt.codeContext)
            };
        }
        
        return new Promise((resolve) => {
            resolve(defaultPrompt);
        });
    }

    async getAIMachineSnapshot(): Promise<AIMachineSnapshot> {
        return {
            state: AIStateMachine.state(),
            context: AIStateMachine.context(),
        };
    }

    async clearInitialPrompt(): Promise<void> {
        extension.aiChatDefaultPrompt = undefined;
    }

    async getServiceNames(): Promise<TestGenerationMentions> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectPath = StateMachine.context().projectPath;
                const serviceDeclNames = await getServiceDeclarationNames(projectPath);
                resolve({
                    mentions: serviceDeclNames
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async getFromDocumentation(content: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await searchDocumentation(content);
                resolve(response.toString());
            } catch (error) {
                reject(error);
            }
        });
    }

    async promptGithubAuthorize(): Promise<boolean> {
        return await loginGithubCopilot();
        //Change state to notify?
        // return true;
    }

    async isCopilotSignedIn(): Promise<boolean> {
        const token = await extension.context.secrets.get('GITHUB_COPILOT_TOKEN');
        if (token && token !== '') {
            return true;
        }
        return false;
    }

    async showSignInAlert(): Promise<boolean> {
        const resp = await extension.context.secrets.get('LOGIN_ALERT_SHOWN');
        if (resp === 'true') {
            return false;
        }
        const isWso2Signed = await this.isCopilotSignedIn();

        if (isWso2Signed) {
            return false;
        }
        return true;
    }

    async markAlertShown(): Promise<void> {
        await extension.context.secrets.store('LOGIN_ALERT_SHOWN', 'true');
    }

    async updateRequirementSpecification(requirementsSpecification: RequirementSpecification) {
        const naturalProgrammingDir = path.join(StateMachine.context().projectPath, 'natural-programming');
        const requirementsFilePath = path.join(naturalProgrammingDir, 'requirements.txt');

        // Create the 'natural-programming' directory if it doesn't exist
        if (!fs.existsSync(naturalProgrammingDir)) {
            fs.mkdirSync(naturalProgrammingDir, { recursive: true });
        }

        // Write the requirements to the 'requirements.txt' file
        fs.writeFileSync(requirementsFilePath, requirementsSpecification.content, 'utf8');
    }

    async getDriftDiagnosticContents(): Promise<LLMDiagnostics> {
        const result = await getLLMDiagnosticArrayAsString(StateMachine.context().projectPath);
        if (isNumber(result)) {
            return {
                statusCode: result,
                diags: "Failed to check drift between the code and the documentation. Please try again."
            };
        }

        return {
            statusCode: 200,
            diags: result
        };
    }

    async createTestDirecoryIfNotExists() {
        const testDirName = path.join(StateMachine.context().projectPath, TEST_DIR_NAME);
        if (!fs.existsSync(testDirName)) {
            fs.mkdirSync(testDirName, { recursive: true }); // Add recursive: true
        }
    }

    async getModuleDirectory(params: GetModuleDirParams): Promise<string> {
        return new Promise((resolve) => {
            const projectFsPath = params.filePath;
            const moduleName = params.moduleName;
            const generatedPath = path.join(projectFsPath, "generated", moduleName);
            if (fs.existsSync(generatedPath) && fs.statSync(generatedPath).isDirectory()) {
                resolve("generated");
            } else {
                resolve("modules");
            }
        });
    }

    async submitFeedback(content: SubmitFeedbackRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            try {
                const payload = {
                    feedback: content.feedbackText,
                    positive: content.positive,
                    messages: content.messages,
                    diagnostics: cleanDiagnosticMessages(content.diagnostics)
                };

                const response = await fetchWithAuth(`${OLD_BACKEND_URL}/feedback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    resolve(true);
                } else {
                    console.error("Failed to submit feedback");
                    resolve(false);
                }
            } catch (error) {
                console.error("Error submitting feedback:", error);
                resolve(false);
            }
        });
    }

    async generateOpenAPI(params: GenerateOpenAPIRequest): Promise<void> {
        await generateOpenAPISpec(params);
    }

    async abortAIGeneration(): Promise<void> {
        AIPanelAbortController.getInstance().abort();
    }

    async getGeneratedDocumentation(params: DocGenerationRequest): Promise<void> {
        await generateDocumentationForService(params);
    }

    async addFilesToProject(params: AddFilesToProjectRequest): Promise<boolean> {
        try {
            let projectPath = StateMachine.context().projectPath;
            const workspacePath = StateMachine.context().workspacePath;
            if (workspacePath) {
                projectPath = workspacePath;
            }

            const ballerinaProjectFile = path.join(projectPath, "Ballerina.toml");
            if (!fs.existsSync(ballerinaProjectFile)) {
                throw new Error("Not a Ballerina project.");
            }
            await addToIntegration(projectPath, params.fileChanges);

            const context = StateMachine.context();
            const dataMapperMetadata = context.dataMapperMetadata;
            if (!dataMapperMetadata || !dataMapperMetadata.codeData) {
                updateView();
                return true;
            }

            // Refresh data mapper with the updated code
            let filePath = dataMapperMetadata.codeData.lineRange?.fileName;
            const varName = dataMapperMetadata.name;
            if (!filePath || !varName) {
                updateView();
                return true;
            }

            await refreshDataMapper(filePath, dataMapperMetadata.codeData, varName);
            return true;
        } catch (error) {
            console.error(">>> Failed to add files to the project", error);
            return false; //silently fail for timeout issues.
        }
    }

    async generateMappingCode(params: ProcessMappingParametersRequest): Promise<void> {
        try {
            // Create config using factory function
            const config = createExecutorConfig(params, {
                command: Command.DataMap,
                chatStorageEnabled: true,  // Enable chat storage for checkpoint support
                cleanupStrategy: 'immediate',  // DataMapper uses immediate cleanup,
            });

            await new FunctionMappingExecutor(config).run();
        } catch (error) {
            console.error('[RPC Manager] Error in generateMappingCode:', error);
            throw error;
        }
    }

    async generateInlineMappingCode(params: MetadataWithAttachments): Promise<void> {
        try {
            // Create config using factory function
            const config = createExecutorConfig(params, {
                command: Command.DataMap,
                chatStorageEnabled: true,  // Enable chat storage for checkpoint support
                cleanupStrategy: 'immediate'  // DataMapper uses immediate cleanup
            });

            await new InlineMappingExecutor(config).run();
        } catch (error) {
            console.error('[RPC Manager] Error in generateInlineMappingCode:', error);
            throw error;
        }
    }

    async generateContextTypes(params: ProcessContextTypeCreationRequest): Promise<void> {
        try {
            // Create config using factory function
            const config = createExecutorConfig(params, {
                command: Command.TypeCreator,
                chatStorageEnabled: true,  // Enable chat storage for checkpoint support
                cleanupStrategy: 'immediate'  // DataMapper uses immediate cleanup
            });

            await new ContextTypesExecutor(config).run();
        } catch (error) {
            console.error('[RPC Manager] Error in generateContextTypes:', error);
            throw error;
        }
    }

    async openChatWindowWithCommand(): Promise<void> {
        await openChatWindowWithCommand();
    }

    async isUserAuthenticated(): Promise<boolean> {
        try {
            const token = await checkToken();
            return !!token;
        } catch (error) {
            return false;
        }
    }

    async generateAgent(params: GenerateAgentCodeRequest): Promise<boolean> {
        return await generateAgent(params);
    }

    async openAIPanel(params: AIPanelPrompt): Promise<void> {
        openAIPanelWithPrompt(params);
    }

    async isPlanModeFeatureEnabled(): Promise<boolean> {
        const config = workspace.getConfiguration('ballerina');
        return config.get<boolean>('ai.planMode', false);
    }

    async getSemanticDiff(params: SemanticDiffRequest): Promise<SemanticDiffResponse> {
        const context = StateMachine.context();
        console.log(">>> requesting semantic diff from ls", JSON.stringify(params));
        try {
            const res: SemanticDiffResponse = await context.langClient.getSemanticDiff(params);
            console.log(">>> semantic diff response from ls", JSON.stringify(res));
            return res;
        } catch (error) {
            console.log(">>> error in getting semantic diff", error);
            return undefined;
        }
    }

    async acceptChanges(): Promise<void> {
        try {
            // Get workspace ID and thread ID
            const ctx = createExecutionContextFromStateMachine();
            const workspaceId = ctx.projectPath;
            const threadId = 'default';

            // Get LATEST generation under review
            const latestReview = chatStateStorage.getPendingReviewGeneration(workspaceId, threadId);

            if (!latestReview) {
                console.warn("[Review Actions] No pending review generation found for accept");
                return;
            }

            console.log(`[Review Actions] Accepting generation ${latestReview.id} with ${latestReview.reviewState.modifiedFiles.length} modified file(s)`);

            // Integrate code to workspace if there are modified files
            if (latestReview.reviewState.modifiedFiles.length > 0) {
                const modifiedFilesSet = new Set(latestReview.reviewState.modifiedFiles);
                await integrateCodeToWorkspace(
                    latestReview.reviewState.tempProjectPath!,
                    modifiedFilesSet,
                    ctx
                );
                console.log(`[Review Actions] Integrated ${latestReview.reviewState.modifiedFiles.length} file(s) to workspace`);
            }

            // Cleanup temp project
            if (!process.env.AI_TEST_ENV) {
                cleanupTempProject(latestReview.reviewState.tempProjectPath!);
            }

            // Mark ALL under_review generations as accepted
            chatStateStorage.acceptAllReviews(workspaceId, threadId);
            console.log("[Review Actions] Marked all under_review generations as accepted");

            // Notify AI panel webview to hide review actions
            RPCLayer._messenger.sendNotification(onHideReviewActions, {
                type: 'webview',
                webviewType: 'ballerina.ai-panel'
            });
        } catch (error) {
            console.error("[Review Actions] Error accepting changes:", error);
            throw error;
        }
    }

    async declineChanges(): Promise<void> {
        try {
            // Get workspace ID and thread ID
            const ctx = createExecutionContextFromStateMachine();
            const workspaceId = ctx.projectPath;
            const threadId = 'default';

            // Get LATEST generation under review
            const latestReview = chatStateStorage.getPendingReviewGeneration(workspaceId, threadId);

            if (!latestReview) {
                console.warn("[Review Actions] No pending review generation found for decline");
                return;
            }

            console.log(`[Review Actions] Declining generation ${latestReview.id}`);

            // Cleanup temp project immediately (without integrating changes)
            if (!process.env.AI_TEST_ENV) {
                cleanupTempProject(latestReview.reviewState.tempProjectPath!);
            }

            // Mark ALL under_review generations as error/declined
            chatStateStorage.declineAllReviews(workspaceId, threadId);
            console.log("[Review Actions] Marked all under_review generations as declined");

            // Notify AI panel webview to hide review actions
            RPCLayer._messenger.sendNotification(onHideReviewActions, {
                type: 'webview',
                webviewType: 'ballerina.ai-panel'
            });
        } catch (error) {
            console.error("[Review Actions] Error declining changes:", error);
            throw error;
        }
    }

    async approvePlan(params: { requestId: string; comment?: string }): Promise<void> {
        approvalManager.resolvePlanApproval(params.requestId, true, params.comment);
    }

    async declinePlan(params: { requestId: string; comment?: string }): Promise<void> {
        approvalManager.resolvePlanApproval(params.requestId, false, params.comment);
    }

    async approveTask(params: { requestId: string; approvedTaskDescription?: string }): Promise<void> {
        approvalManager.resolveTaskApproval(params.requestId, true, undefined, params.approvedTaskDescription);
    }

    async declineTask(params: { requestId: string; comment?: string }): Promise<void> {
        approvalManager.resolveTaskApproval(params.requestId, false, params.comment);
    }

    async provideConnectorSpec(params: { requestId: string; spec: any }): Promise<void> {
        approvalManager.resolveConnectorSpec(params.requestId, true, params.spec);
    }

    async cancelConnectorSpec(params: { requestId: string; comment?: string }): Promise<void> {
        approvalManager.resolveConnectorSpec(params.requestId, false, undefined, params.comment);
    }

    async restoreCheckpoint(params: RestoreCheckpointRequest): Promise<void> {
        // Get workspace and thread identifiers
        const workspaceId = StateMachine.context().projectPath;
        const threadId = 'default';

        // Find the checkpoint
        const found = chatStateStorage.findCheckpoint(workspaceId, threadId, params.checkpointId);

        if (!found) {
            throw new Error(`Checkpoint ${params.checkpointId} not found`);
        }

        const { checkpoint } = found;

        // 1. Restore workspace files from checkpoint snapshot
        await restoreWorkspaceSnapshot(checkpoint);

        // 2. Truncate thread history to this checkpoint
        const restored = chatStateStorage.restoreThreadToCheckpoint(
            workspaceId,
            threadId,
            params.checkpointId
        );

        if (!restored) {
            throw new Error('Failed to restore thread to checkpoint');
        }
    }

    async clearChat(): Promise<void> {
        // Get workspace identifier
        const workspaceId = StateMachine.context().projectPath;

        // Clear the workspace (all threads)
        chatStateStorage.clearWorkspace(workspaceId);

        console.log(`[RPC] Cleared chat for workspace: ${workspaceId}`);
    }

    async updateChatMessage(params: UpdateChatMessageRequest): Promise<void> {
        const workspaceId = StateMachine.context().projectPath;
        const threadId = 'default';

        // The messageId is actually a generation ID
        // This is called when streaming completes to save the final UI-formatted response
        const generation = chatStateStorage.getGeneration(workspaceId, threadId, params.messageId);

        if (!generation) {
            console.warn(`[RPC] Generation ${params.messageId} not found in thread ${threadId}`);
            return;
        }

        // Update the UI response with the final formatted content
        chatStateStorage.updateGeneration(workspaceId, threadId, params.messageId, {
            uiResponse: params.content
        });

        console.log(`[RPC] Updated generation ${params.messageId} UI response`);
    }

    async getChatMessages(): Promise<UIChatMessage[]> {
        const ctx = StateMachine.context();
        const workspaceId = ctx.projectPath;
        const threadId = 'default';

        // Get all generations from chat storage
        const generations = chatStateStorage.getGenerations(workspaceId, threadId);

        // Convert generations to UI messages format
        const uiMessages: UIChatMessage[] = [];
        for (const generation of generations) {
            // Add user message
            uiMessages.push({
                role: 'user',
                content: generation.userPrompt,
                checkpointId: generation.checkpoint?.id,
                messageId: generation.id
            });

            // Add assistant message if available
            if (generation.uiResponse) {
                uiMessages.push({
                    role: 'assistant',
                    content: generation.uiResponse,
                    messageId: generation.id
                });
            }
        }

        return uiMessages;
    }

    async getCheckpoints(): Promise<CheckpointInfo[]> {
        const ctx = StateMachine.context();
        const workspaceId = ctx.projectPath;
        const threadId = 'default';

        // Get checkpoints from ChatStateStorage
        const checkpoints = chatStateStorage.getCheckpoints(workspaceId, threadId);

        // Convert to CheckpointInfo format
        return checkpoints.map(cp => ({
            id: cp.id,
            messageId: cp.messageId,
            timestamp: cp.timestamp,
            snapshotSize: cp.snapshotSize
        }));
    }
}
