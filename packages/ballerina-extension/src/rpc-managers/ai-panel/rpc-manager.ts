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
    AbortAIGenerationRequest,
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
    OpenFileDiffRequest,
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
    UsageResponse,
} from "@wso2/ballerina-core";
import * as fs from 'fs';
import path from "path";
import * as vscode from 'vscode';

import { isNumber } from "lodash";
import { getServiceDeclarationNames } from "../../../src/features/ai/documentation/utils";
import { AIStateMachine, openAIPanelWithPrompt } from "../../../src/views/ai-panel/aiMachine";
import { checkToken } from "../../../src/views/ai-panel/utils";
import { extension } from "../../BalExtensionContext";
import { openChatWindowWithCommand } from "../../features/ai/data-mapper/index";
import { generateDocumentationForService } from "../../features/ai/documentation/generator";
import { generateOpenAPISpec } from "../../features/ai/openapi/index";
import { BACKEND_URL } from "../../features/ai/utils";
import { fetchWithAuth } from "../../features/ai/utils/ai-client";
import { sendChatComponentNotification, sendSaveChatNotification } from "../../features/ai/utils/ai-utils";
import { submitFeedback as submitFeedbackUtil } from "../../features/ai/utils/feedback";
import { sendGenerationDiscardTelemetry, sendGenerationKeptTelemetry } from "../../features/ai/utils/generation-response";
import { getLLMDiagnosticArrayAsString } from "../../features/natural-programming/utils";
import { StateMachine, updateView } from "../../stateMachine";
import { isInWI } from "../../utils";
import { getLoginMethod, isPlatformExtensionAvailable, loginGithubCopilot } from "../../utils/ai/auth";
import { normalizeCodeContext } from "../../views/ai-panel/codeContextUtils";
import { refreshDataMapper } from "../data-mapper/utils";
import {
    TEST_DIR_NAME
} from "./constants";
import { addToIntegration, searchDocumentation } from "./utils";

import { createExecutionContextFromStateMachine, createExecutorConfig, generateAgent, resolveProjectRootPath } from '../../features/ai/agent/index';
import { integrateCodeToWorkspace } from "../../features/ai/agent/utils";
import { LLM_API_BASE_PATH, WI_EXTENSION_ID } from "../../features/ai/constants";
import { ContextTypesExecutor } from '../../features/ai/executors/datamapper/ContextTypesExecutor';
import { FunctionMappingExecutor } from '../../features/ai/executors/datamapper/FunctionMappingExecutor';
import { InlineMappingExecutor } from '../../features/ai/executors/datamapper/InlineMappingExecutor';
import { approvalManager } from '../../features/ai/state/ApprovalManager';
import { cleanupTempProject } from "../../features/ai/utils/project/temp-project";
import { chatStateStorage } from '../../views/ai-panel/chatStateStorage';
import { restoreWorkspaceSnapshot } from '../../views/ai-panel/checkpoint/checkpointUtils';

export class AiPanelRpcManager implements AIPanelAPI {

    async getLoginMethod(): Promise<LoginMethod> {
        return new Promise(async (resolve) => {
            const loginMethod = await getLoginMethod();
            resolve(loginMethod);
        });
    }

    async isPlatformExtensionAvailable(): Promise<boolean> {
        return isPlatformExtensionAvailable();
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
        // Don't show alert in WI environment (WSO2 Integrator extension is installed)
        const inWI = isInWI();
        if (inWI) {
            return false;
        }

        // Don't show alert in Devant environment
        const isInDevant = !!process.env.CLOUD_STS_TOKEN;
        if (isInDevant) {
            return false;
        }

        // Check if alert was already dismissed
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
        return await submitFeedbackUtil(content);
    }

    async generateOpenAPI(params: GenerateOpenAPIRequest): Promise<void> {
        await generateOpenAPISpec(params);
    }

    async abortAIGeneration(params: AbortAIGenerationRequest): Promise<void> {
        const projectRootPath = params?.projectRootPath || resolveProjectRootPath();
        const threadId = params?.threadId || 'default';

        const aborted = chatStateStorage.abortActiveExecution(projectRootPath, threadId);

        if (aborted) {
            console.log(`[RPC] Aborted execution for projectRootPath=${projectRootPath}, thread=${threadId}`);
        } else {
            console.warn(`[RPC] No active execution found for projectRootPath=${projectRootPath}, thread=${threadId}`);
        }
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

    async getAffectedPackages(): Promise<string[]> {
        // Get project root path and thread ID
        const projectRootPath = resolveProjectRootPath();
        const threadId = 'default';

        // Get the LATEST under_review generation (not the first one)
        const thread = chatStateStorage.getOrCreateThread(projectRootPath, threadId);
        const underReviewGenerations = thread.generations.filter(
            g => g.reviewState.status === 'under_review'
        );

        if (underReviewGenerations.length === 0) {
            console.log(">>> No pending review generation, returning empty affected packages");
            return [];
        }

        // Return packages from the LATEST under_review generation
        const latestReview = underReviewGenerations[underReviewGenerations.length - 1];
        const affectedPackages = latestReview.reviewState.affectedPackagePaths || [];
        console.log(`>>> Returning ${affectedPackages.length} affected packages from generation ${latestReview.id}:`, affectedPackages);
        return affectedPackages;
    }

    async isWorkspaceProject(): Promise<boolean> {
        const context = StateMachine.context();
        const isWorkspace = context.projectInfo?.projectKind === 'WORKSPACE_PROJECT';
        console.log(`>>> isWorkspaceProject: ${isWorkspace}`);
        return isWorkspace;
    }

    async acceptChanges(): Promise<void> {
        try {
            // Get project root path and thread ID
            const ctx = createExecutionContextFromStateMachine();
            const projectRootPath = resolveProjectRootPath();
            const threadId = 'default';

            // Get ALL under_review generations
            const thread = chatStateStorage.getOrCreateThread(projectRootPath, threadId);
            const underReviewGenerations = thread.generations.filter(
                g => g.reviewState.status === 'under_review'
            );

            if (underReviewGenerations.length === 0) {
                console.warn("[Review Actions] No pending review generation found for accept");
                return;
            }

            // Get LATEST generation for integration
            const latestReview = underReviewGenerations[underReviewGenerations.length - 1];
            console.log(`[Review Actions] Accepting generation ${latestReview.id} with ${latestReview.reviewState.modifiedFiles.length} modified file(s)`);

            // In workspace mode, if no active project is set, resolve it from the modified files
            // so that artifact notifications can find the correct project in the structure.
            if (!ctx.projectPath && ctx.workspacePath && latestReview.reviewState.modifiedFiles.length > 0) {
                const firstBalFile = latestReview.reviewState.modifiedFiles.find(f => f.endsWith('.bal'));
                if (firstBalFile) {
                    const packageName = firstBalFile.split('/')[0];
                    if (packageName) {
                        StateMachine.context().projectPath = path.join(ctx.workspacePath, packageName);
                    }
                }
            }

            // Integrate LATEST generation's code to workspace
            if (latestReview.reviewState.modifiedFiles.length > 0) {
                const modifiedFilesSet = new Set(latestReview.reviewState.modifiedFiles);
                await integrateCodeToWorkspace(
                    latestReview.reviewState.tempProjectPath!,
                    modifiedFilesSet,
                    ctx
                );
                console.log(`[Review Actions] Integrated ${latestReview.reviewState.modifiedFiles.length} file(s) to workspace`);
            }

            // Cleanup ALL under_review temp projects (prevents memory leak)
            if (!process.env.AI_TEST_ENV) {
                for (const generation of underReviewGenerations) {
                    if (generation.reviewState.tempProjectPath) {
                        await cleanupTempProject(generation.reviewState.tempProjectPath);
                    }
                }
            }

            // Mark ALL under_review generations as accepted
            chatStateStorage.acceptAllReviews(projectRootPath, threadId);
            console.log("[Review Actions] Marked all under_review generations as accepted");

            // Send telemetry for generation kept
            sendGenerationKeptTelemetry(latestReview.id);

            // Clear affectedPackagePaths from all completed reviews to prevent stale data
            for (const generation of underReviewGenerations) {
                chatStateStorage.updateReviewState(projectRootPath, threadId, generation.id, {
                    affectedPackagePaths: []
                });
            }
            console.log("[Review Actions] Cleared affected packages from accepted generations");

            // Notify webview to update review component status and persist
            sendChatComponentNotification("review", { status: "accepted" });
            const latestGeneration = underReviewGenerations[underReviewGenerations.length - 1];
            sendSaveChatNotification(Command.Agent, latestGeneration.id);
        } catch (error) {
            console.error("[Review Actions] Error accepting changes:", error);
            throw error;
        }
    }

    async declineChanges(): Promise<void> {
        try {
            // Get project root path and thread ID
            const projectRootPath = resolveProjectRootPath();
            const threadId = 'default';

            // Get ALL under_review generations
            const thread = chatStateStorage.getOrCreateThread(projectRootPath, threadId);
            const underReviewGenerations = thread.generations.filter(
                g => g.reviewState.status === 'under_review'
            );

            if (underReviewGenerations.length === 0) {
                console.warn("[Review Actions] No pending review generation found for decline");
                return;
            }

            console.log(`[Review Actions] Declining ${underReviewGenerations.length} generation(s)`);

            // Cleanup ALL under_review temp projects (prevents memory leak)
            if (!process.env.AI_TEST_ENV) {
                for (const generation of underReviewGenerations) {
                    if (generation.reviewState.tempProjectPath) {
                        await cleanupTempProject(generation.reviewState.tempProjectPath);
                    }
                }
            }

            // Mark ALL under_review generations as error/declined
            chatStateStorage.declineAllReviews(projectRootPath, threadId);
            console.log("[Review Actions] Marked all under_review generations as declined");

            // Send telemetry for generation discard
            const latestReview = underReviewGenerations[underReviewGenerations.length - 1];
            sendGenerationDiscardTelemetry(latestReview.id);

            // Clear affectedPackagePaths from all completed reviews to prevent stale data
            for (const generation of underReviewGenerations) {
                chatStateStorage.updateReviewState(projectRootPath, threadId, generation.id, {
                    affectedPackagePaths: []
                });
            }
            console.log("[Review Actions] Cleared affected packages from declined generations");

            // Notify webview to update review component status and persist
            sendChatComponentNotification("review", { status: "discarded" });
            const latestGeneration = underReviewGenerations[underReviewGenerations.length - 1];
            sendSaveChatNotification(Command.Agent, latestGeneration.id);
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

    async provideConfiguration(params: { requestId: string; configValues: Record<string, string> }): Promise<void> {
        approvalManager.resolveConfiguration(params.requestId, true, params.configValues);
    }

    async cancelConfiguration(params: { requestId: string; comment?: string }): Promise<void> {
        approvalManager.resolveConfiguration(params.requestId, false, undefined, params.comment);
    }

    async approveWebTool(params: { requestId: string }): Promise<void> {
        approvalManager.resolveWebToolApproval(params.requestId, true);
    }

    async declineWebTool(params: { requestId: string }): Promise<void> {
        approvalManager.resolveWebToolApproval(params.requestId, false);
    }

    async restoreCheckpoint(params: RestoreCheckpointRequest): Promise<void> {
        // Get project root path and thread identifiers
        const projectRootPath = resolveProjectRootPath();
        const threadId = 'default';

        // Find the checkpoint
        const found = chatStateStorage.findCheckpoint(projectRootPath, threadId, params.checkpointId);

        if (!found) {
            throw new Error(`Checkpoint ${params.checkpointId} not found`);
        }

        const { checkpoint } = found;

        // 1. Restore workspace files from checkpoint snapshot
        await restoreWorkspaceSnapshot(checkpoint);

        // 2. Truncate thread history to this checkpoint
        const restored = chatStateStorage.restoreThreadToCheckpoint(
            projectRootPath,
            threadId,
            params.checkpointId
        );

        if (!restored) {
            throw new Error('Failed to restore thread to checkpoint');
        }
    }

    async clearChat(): Promise<void> {
        // Get project root path
        const projectRootPath = resolveProjectRootPath();

        // Clear the workspace (all threads)
        await chatStateStorage.clearWorkspace(projectRootPath);

        console.log(`[RPC] Cleared chat for projectRootPath: ${projectRootPath}`);
    }

    async updateChatMessage(params: UpdateChatMessageRequest): Promise<void> {
        const projectRootPath = resolveProjectRootPath();
        const threadId = 'default';

        // The messageId is actually a generation ID
        // This is called when streaming completes to save the final UI-formatted response
        const generation = chatStateStorage.getGeneration(projectRootPath, threadId, params.messageId);

        if (!generation) {
            console.warn(`[RPC] Generation ${params.messageId} not found in thread ${threadId}`);
            return;
        }

        // Update the UI response with the final formatted content
        chatStateStorage.updateGeneration(projectRootPath, threadId, params.messageId, {
            uiResponse: params.content
        });

        console.log(`[RPC] Updated generation ${params.messageId} UI response`);
    }

    async getChatMessages(): Promise<UIChatMessage[]> {
        const projectRootPath = resolveProjectRootPath();
        const threadId = 'default';

        // Get all generations from chat storage
        const generations = chatStateStorage.getGenerations(projectRootPath, threadId);

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
        const projectRootPath = resolveProjectRootPath();
        const threadId = 'default';

        // Get checkpoints from ChatStateStorage
        const checkpoints = chatStateStorage.getCheckpoints(projectRootPath, threadId);

        // Convert to CheckpointInfo format
        return checkpoints.map(cp => ({
            id: cp.id,
            messageId: cp.messageId,
            timestamp: cp.timestamp,
            snapshotSize: cp.snapshotSize
        }));
    }

    async getActiveTempDir(): Promise<string> {
        const projectRootPath = resolveProjectRootPath();
        const threadId = 'default';

        // Always get tempProjectPath from active generation in chatStateStorage
        const pendingReview = chatStateStorage.getPendingReviewGeneration(projectRootPath, threadId);
        if (!pendingReview || !pendingReview.reviewState.tempProjectPath) {
            console.log(">>> no pending review or temp project path found for semantic diff");
            return undefined;
        }

        const projectPath = pendingReview.reviewState.tempProjectPath;
        console.log(">>> active temp project path", projectPath);
        return projectPath;
    }

    async getUsage(): Promise<UsageResponse | undefined> {
        const loginMethod = await getLoginMethod();
        if (loginMethod !== LoginMethod.BI_INTEL) {
            return undefined;
        }
        try {
            const url = BACKEND_URL + LLM_API_BASE_PATH + "/usage";
            const response = await fetchWithAuth(url, { method: "GET" });
            if (response && response.ok) {
                const data = await response.json();
                return data as UsageResponse;
            }
            console.error("Failed to fetch usage: ", response?.status, response?.statusText);
            return undefined;
        } catch (error) {
            console.error("Failed to fetch usage:", error);
            return undefined;
        }
    }

    private static diffContentProviderRegistered = false;
    private static diffContentMap = new Map<string, string>();

    private static registerDiffContentProvider() {
        if (AiPanelRpcManager.diffContentProviderRegistered) { return; }
        const provider: vscode.TextDocumentContentProvider = {
            provideTextDocumentContent(uri: vscode.Uri): string {
                return AiPanelRpcManager.diffContentMap.get(uri.toString()) ?? '';
            }
        };
        extension.context.subscriptions.push(
            vscode.workspace.registerTextDocumentContentProvider('bi-diff', provider)
        );
        AiPanelRpcManager.diffContentProviderRegistered = true;
    }

    async openFileDiff(params: OpenFileDiffRequest): Promise<void> {
        AiPanelRpcManager.registerDiffContentProvider();

        // Resolve roots on the host — never trust webview-supplied absolute paths
        const context = StateMachine.context();
        // Use workspace root when available; modifiedFiles are relative to the workspace root in workspace mode
        const originalRoot = context.workspacePath || context.projectPath;
        const workspaceId = context.workspacePath || context.projectPath;
        const threadId = 'default';
        const pendingReview = chatStateStorage.getPendingReviewGeneration(workspaceId, threadId);
        const tempProjectPath = pendingReview?.reviewState.tempProjectPath;

        if (!tempProjectPath) {
            console.error("[openFileDiff] No active review with temp project path");
            return;
        }

        const originalFilePath = path.resolve(originalRoot, params.relativePath);
        const modifiedFilePath = path.resolve(tempProjectPath, params.relativePath);

        // Reject paths that escape the project roots
        if (!originalFilePath.startsWith(originalRoot + path.sep) || !modifiedFilePath.startsWith(tempProjectPath + path.sep)) {
            console.error("[openFileDiff] Path escapes project root, rejecting");
            return;
        }

        // Clear previous diff entries to prevent unbounded memory growth
        AiPanelRpcManager.diffContentMap.clear();

        let originalContent = '';
        try {
            originalContent = fs.readFileSync(originalFilePath, 'utf8');
        } catch {
            // File doesn't exist (new file) — left side will be empty
        }

        let modifiedContent = '';
        try {
            modifiedContent = fs.readFileSync(modifiedFilePath, 'utf8');
        } catch (error) {
            console.error("[openFileDiff] Error reading modified file:", error);
            return;
        }

        const fileName = path.basename(params.relativePath);
        const ts = Date.now();
        const originalUri = vscode.Uri.parse(`bi-diff:original/${fileName}?${ts}`);
        const modifiedUri = vscode.Uri.parse(`bi-diff:modified/${fileName}?${ts}`);

        AiPanelRpcManager.diffContentMap.set(originalUri.toString(), originalContent);
        AiPanelRpcManager.diffContentMap.set(modifiedUri.toString(), modifiedContent);

        const title = `${fileName} (Review Diff)`;
        await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, title);
    }
}
