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
    AIMachineEventType,
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
    PromptEnhancementRequest,
    PromptEnhancementResponse,
    RequirementSpecification,
    RestoreCheckpointRequest,
    SemanticDiffRequest,
    SemanticDiffResponse,
    SubmitFeedbackRequest,
    TestGenerationMentions,
    UIChatMessage,
    UpdateChatMessageRequest,
    UsageResponse,
    WebToolApprovalRequest,
    CompactConversationRequest,
    CompactConversationResponse,
    ClarifyAnswerRequest,
    ClarifyCancelRequest,
    RunningServiceInfo,
    StopRunningServiceRequest,
    RunServiceRequest,
    GetSkillsResponse,
    AddSkillRequest,
    ToggleSkillRequest,
    DeleteSkillRequest,
    SkillSaveRequest,
    SkillSaveCancelRequest,
    SkillEntry,
    AvailableProject,
    ProjectSource,
    McpServerStatusDTO,
    SetMcpServerEnabledRequest,
    AddMcpServerRequest,
    AddMcpServerResponse,
    OpenMcpConfigRequest,
    McpWorkspaceContextResponse,
    UpdateMcpServerRequest,
    DeleteMcpServerRequest,
    SetMcpToolsEnabledRequest,
    McpLoadErrorsDTO,
    McpGroupStatesDTO,
    SetMcpGroupEnabledRequest,
} from "@wso2/ballerina-core";
import { ConfigurationTarget } from "vscode";
import { getMcpClientManager, ensureMcpConfigFileExists, writeMcpServer, updateMcpServer, deleteMcpServer } from "../../features/ai/agent/mcp";
import { notifyMcpServersChanged, notifyMcpLoadErrorsChanged, notifyMcpGroupStatesChanged } from "../../RPCLayer";
import * as os from "os";
import * as fs from 'fs';
import path from "path";
import * as vscode from 'vscode';
import { window, workspace } from 'vscode';
import { LOGIN_REQUIRED_WARNING, SIGN_IN_BI_COPILOT } from '../../features/ai/constants';

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
import { enhancePrompt as enhancePromptService } from "../../features/ai/service/prompt-enhancement/promptEnhancement";
import { StateMachine, updateView } from "../../stateMachine";
import { isInDevant, isInWI } from "../../utils";
import { getLoginMethod, isPlatformExtensionAvailable, loginGithubCopilot } from "../../utils/ai/auth";
import { normalizeCodeContext } from "../../views/ai-panel/codeContextUtils";
import { refreshDataMapper } from "../data-mapper/utils";
import {
    TEST_DIR_NAME
} from "./constants";
import { addToIntegration, searchDocumentation } from "./utils";

import { createExecutorConfig, generateAgent, resolveProjectRootPath } from '../../features/ai/agent/index';
import { REGISTERED_SKILLS } from '../../features/ai/agent/skills/index';
import { scanCustomSkills, scanUserSkills, readUserSkillContent, readCustomSkillContent } from '../../features/ai/agent/tools/skill-tool/skill-reader';
import {
    getSkillsConfig,
    setSkillEnabled,
    writeUserSkill,
    writeCustomSkill,
    deleteUserSkill,
    deleteCustomSkill,
    GLOBAL_SKILLS_CONFIG_PATH,
} from '../../features/ai/agent/tools/skill-tool/skill-writer';
import { clearCompactionDisabledWarning } from '../../features/ai/agent/AgentExecutor';
import { LLM_API_BASE_PATH, WI_EXTENSION_ID } from "../../features/ai/constants";
import { ContextTypesExecutor } from '../../features/ai/executors/datamapper/ContextTypesExecutor';
import { FunctionMappingExecutor } from '../../features/ai/executors/datamapper/FunctionMappingExecutor';
import { InlineMappingExecutor } from '../../features/ai/executors/datamapper/InlineMappingExecutor';
import { approvalManager } from '../../features/ai/state/ApprovalManager';
import { cleanupTempProject } from "../../features/ai/utils/project/temp-project";
import { chatStateStorage } from '../../views/ai-panel/chatStateStorage';
import { restoreWorkspaceSnapshot } from '../../views/ai-panel/checkpoint/checkpointUtils';
import { runningServicesManager } from '../../features/ai/agent/tools/running-service-manager';
import { executeRun } from "../../features/ai/agent/tools/ballerina-run";

/** Validate an MCP server config DTO. Returns an error message or null on success. */
function validateMcpServerConfig(cfg: any): string | null {
    if (!cfg || (cfg.type !== "stdio" && cfg.type !== "http")) {
        return "Invalid server config.";
    }
    if (cfg.type === "stdio" && (typeof cfg.command !== "string" || !cfg.command.trim())) {
        return "Command is required for stdio servers.";
    }
    if (cfg.type === "http") {
        if (typeof cfg.url !== "string" || !cfg.url.trim()) {
            return "URL is required for HTTP servers.";
        }
        try { new URL(cfg.url); } catch {
            return "URL is not a valid URL.";
        }
    }
    return null;
}

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

        // Normalize code context to use workspace-relative paths
        if (defaultPrompt && 'codeContext' in defaultPrompt && defaultPrompt.codeContext) {
            const smCtx = StateMachine.context();
            const workspaceRoot = smCtx.workspacePath || smCtx.projectPath;
            defaultPrompt = {
                ...defaultPrompt,
                codeContext: normalizeCodeContext(defaultPrompt.codeContext, workspaceRoot, smCtx.projectPath)
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
                if (!projectPath) {
                    resolve({ mentions: [] });
                    return;
                }
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
        if (isInDevant()) {
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

    async enhancePrompt(params: PromptEnhancementRequest): Promise<PromptEnhancementResponse> {
        return await enhancePromptService(params);
    }

    promptForLogin(): void {
        window.showWarningMessage(LOGIN_REQUIRED_WARNING, SIGN_IN_BI_COPILOT).then(selection => {
            if (selection === SIGN_IN_BI_COPILOT) {
                AIStateMachine.service().send(AIMachineEventType.LOGIN);
            }
        });
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

    async isWorkspaceProject(): Promise<boolean> {
        const context = StateMachine.context();
        const isWorkspace = context.projectInfo?.projectKind === 'WORKSPACE_PROJECT';
        console.log(`>>> isWorkspaceProject: ${isWorkspace}`);
        return isWorkspace;
    }

    async acceptChanges(): Promise<void> {
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
                console.warn("[Review Actions] No pending review generation found for accept");
                return;
            }

            // Get LATEST generation for integration
            const latestReview = underReviewGenerations[underReviewGenerations.length - 1];
            console.log(`[Review Actions] Accepting generation ${latestReview.id} with ${latestReview.reviewState.modifiedFiles.length} modified file(s)`);

            // Cleanup ALL under_review temp projects (prevents memory leak)
            if (!process.env.AI_TEST_ENV) {
                for (const generation of underReviewGenerations) {
                    if (generation.reviewState.tempProjectPath) {
                        await cleanupTempProject(generation.reviewState.tempProjectPath);
                    }
                }
            }

            // Mark ALL under_review generations as accepted (also clears affectedPackagePaths)
            chatStateStorage.acceptAllReviews(projectRootPath, threadId);
            console.log("[Review Actions] Marked all under_review generations as accepted");

            // Send telemetry for generation kept
            sendGenerationKeptTelemetry(latestReview.id);

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

            // Restore workspace to state before the latest generation ran
            const latestReview = underReviewGenerations[underReviewGenerations.length - 1];
            const checkpoint = latestReview.checkpoint;
            if (checkpoint) {
                await restoreWorkspaceSnapshot(checkpoint, true);
            } else {
                console.warn("[Review Actions] No checkpoint found for generation — workspace changes will not be reverted");
            }

            // Cleanup ALL under_review temp projects (prevents memory leak)
            if (!process.env.AI_TEST_ENV) {
                for (const generation of underReviewGenerations) {
                    if (generation.reviewState.tempProjectPath) {
                        await cleanupTempProject(generation.reviewState.tempProjectPath);
                    }
                }
            }

            // Append revert notification to model messages so the LLM knows changes were reverted
            const existingMessages = latestReview.modelMessages || [];
            chatStateStorage.updateGeneration(projectRootPath, threadId, latestReview.id, {
                modelMessages: [
                    ...existingMessages,
                    {
                        role: "user",
                        content: `<revert_notification>
User reverted the last made changes. The files have been restored to the state before this generation.
</revert_notification>`,
                    },
                ],
            });

            // Mark ALL under_review generations as error/declined
            chatStateStorage.declineAllReviews(projectRootPath, threadId);
            console.log("[Review Actions] Marked all under_review generations as declined");

            // Send telemetry for generation discard
            sendGenerationDiscardTelemetry(latestReview.id);

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

    async approveWebTool(params: WebToolApprovalRequest): Promise<void> {
        approvalManager.resolveWebToolApproval(params.requestId, true);
    }

    async declineWebTool(params: WebToolApprovalRequest): Promise<void> {
        approvalManager.resolveWebToolApproval(params.requestId, false);
    }

    async submitClarifyAnswer(params: ClarifyAnswerRequest): Promise<void> {
        approvalManager.resolveClarify(params.requestId, true, params.answers);
    }

    async cancelClarify(params: ClarifyCancelRequest): Promise<void> {
        approvalManager.resolveClarify(params.requestId, false);
    }

    async restoreCheckpoint(params: RestoreCheckpointRequest): Promise<void> {
        // Get project root path and thread identifiers
        const projectRootPath = resolveProjectRootPath();
        const threadId = 'default';

        // Find the checkpoint
        const found = chatStateStorage.findCheckpoint(projectRootPath, threadId, params.checkpointId);

        if (!found) {
            if (chatStateStorage.hasCompactedHistory(projectRootPath, threadId)) {
                window.showWarningMessage(
                    "This conversation was compacted to manage memory. Undo points prior to compaction are unavailable."
                );
                throw new Error("Checkpoint unavailable due to compaction");
            }
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
        clearCompactionDisabledWarning(projectRootPath, 'default');

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

    async compactConversation(_params: CompactConversationRequest): Promise<CompactConversationResponse> {
        // Manual compaction is no longer supported. Context is managed automatically
        // server-side via the compact_20260112 API during agent execution.
        return {
            success: false,
            error: 'Manual compaction is not available. Context is automatically managed by the server during agent execution.',
        };
    }

    async getShowContextUsage(): Promise<boolean> {
        return workspace.getConfiguration('ballerina').get<boolean>('ai.showContextUsage', false);
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

        const context = StateMachine.context();
        const workspaceId = context.workspacePath || context.projectPath;
        const threadId = 'default';
        const generation = chatStateStorage.getGeneration(workspaceId, threadId, params.generationId);
        const tempProjectPath = generation?.reviewState.tempProjectPath;

        if (!tempProjectPath) {
            console.error("[openFileDiff] No generation or temp project path for generationId:", params.generationId);
            return;
        }

        const modifiedFilePath = path.resolve(tempProjectPath, params.relativePath);

        if (!modifiedFilePath.startsWith(tempProjectPath + path.sep)) {
            console.error("[openFileDiff] Path escapes temp project root, rejecting");
            return;
        }

        // Clear previous diff entries to prevent unbounded memory growth
        AiPanelRpcManager.diffContentMap.clear();

        // Read original content from checkpoint snapshot — workspace already has generated code
        const snapshotKey = params.relativePath.split(path.sep).join('/');
        const originalContent = generation?.checkpoint?.workspaceSnapshot?.[snapshotKey] ?? '';

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
        await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, title, {
            viewColumn: vscode.ViewColumn.One,
        });
    }

    async getRunningServices(): Promise<RunningServiceInfo[]> {
        return runningServicesManager.getAll();
    }

    async stopRunningService(params: StopRunningServiceRequest): Promise<boolean> {
        return runningServicesManager.stopOne(params.taskId);
    }

    async runService(params: RunServiceRequest): Promise<boolean> {
        const { tempProjectPath, packagePath } = params;
        try {
            const result = await executeRun(
                {
                    runType: "service",
                    packagePath: packagePath,
                },
                tempProjectPath,
                runningServicesManager
            );
            if (!result || result.status !== 'started') {
                window.showErrorMessage(`Failed to start service${packagePath ? ` in package ${packagePath}` : ''}.`);
                return false;
            }
            return true;
        } catch (error) {
            console.error("[runService] Failed to start required services:", error);
            window.showErrorMessage(`Failed to start service${packagePath ? ` in package ${packagePath}` : ''}.`);
            return false;
        }
    }

    async getDefaultVertexCredsPath(): Promise<string> {
        const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (fromEnv && fs.existsSync(fromEnv)) {
            return fromEnv;
        }
        const adcPath = process.platform === "win32"
            ? path.join(process.env.APPDATA || "", "gcloud", "application_default_credentials.json")
            : path.join(os.homedir(), ".config", "gcloud", "application_default_credentials.json");
        if (fs.existsSync(adcPath)) {
            return adcPath;
        }
        return "";
    }

    async getSkills(): Promise<GetSkillsResponse> {
        const projectRootPath = resolveProjectRootPath();
        const globalConfig = getSkillsConfig(GLOBAL_SKILLS_CONFIG_PATH);
        const projectConfigPath = projectRootPath
            ? path.join(projectRootPath, '.copilot', 'skills.config.json')
            : null;
        const projectConfig = projectConfigPath ? getSkillsConfig(projectConfigPath) : { disabledSkills: [] };
        const allDisabled = new Set([...globalConfig.disabledSkills, ...projectConfig.disabledSkills]);

        const skills: SkillEntry[] = [];

        // Built-in skills (body not editable, omit from entry)
        for (const s of REGISTERED_SKILLS) {
            skills.push({ id: s.name, name: s.name, trigger: s.trigger, tier: 'builtin', enabled: !allDisabled.has(s.name) });
        }

        // Custom project/integration skills
        const availableProjects: AvailableProject[] = [];
        if (projectRootPath) {
            const projectName = path.basename(projectRootPath);
            const projectSources = this.scanPackages(projectRootPath);
            availableProjects.push(...projectSources);
            const projectMetas: ProjectSource[] = projectSources.map(p => ({
                projectName: p.name,
                packagePath: p.packagePath,
                sourceFiles: [],
                isActive: false,
            }));
            const customMetas = scanCustomSkills(projectRootPath, projectMetas);
            for (const s of customMetas) {
                const slash = s.name.indexOf('/');
                const prefix = slash !== -1 ? s.name.slice(0, slash) : '';
                const isProjectLevel = prefix === projectName;
                const content = readCustomSkillContent(projectRootPath, projectMetas, s.name);
                skills.push({
                    id: s.name,
                    name: s.name,
                    trigger: s.trigger,
                    body: content?.content !== content?.trigger ? content?.content : undefined,
                    tier: 'custom',
                    enabled: !allDisabled.has(s.name),
                    scope: isProjectLevel ? 'project' : 'integration',
                    packagePath: isProjectLevel ? undefined : prefix,
                });
            }
        }

        // User skills
        const userMetas = scanUserSkills();
        for (const s of userMetas) {
            const content = readUserSkillContent(s.name);
            skills.push({
                id: s.name,
                name: s.name,
                trigger: s.trigger,
                body: content?.content !== content?.trigger ? content?.content : undefined,
                tier: 'user',
                enabled: !allDisabled.has(s.name),
            });
        }

        return { skills, availableProjects };
    }

    async addSkill(params: AddSkillRequest): Promise<boolean> {
        try {
            if (params.tier === 'user') {
                writeUserSkill(params.name, params.trigger, params.body);
            } else {
                const projectRootPath = resolveProjectRootPath();
                if (!projectRootPath) { return false; }
                const packagePath = params.scope === 'integration' ? (params.packagePath ?? null) : null;
                writeCustomSkill(projectRootPath, packagePath, params.name, params.trigger, params.body);
            }
            return true;
        } catch (error) {
            console.error('[Skills] addSkill failed:', error);
            return false;
        }
    }

    async toggleSkill(params: ToggleSkillRequest): Promise<boolean> {
        try {
            const configPath = params.tier === 'custom'
                ? (() => {
                    const root = resolveProjectRootPath();
                    return root ? path.join(root, '.copilot', 'skills.config.json') : GLOBAL_SKILLS_CONFIG_PATH;
                })()
                : GLOBAL_SKILLS_CONFIG_PATH;
            setSkillEnabled(configPath, params.skillId, params.enabled);
            return true;
        } catch (error) {
            console.error('[Skills] toggleSkill failed:', error);
            return false;
        }
    }

    async deleteSkill(params: DeleteSkillRequest): Promise<boolean> {
        try {
            if (params.tier === 'user') {
                const slash = params.skillId.indexOf('/');
                const bareName = slash !== -1 ? params.skillId.slice(slash + 1) : params.skillId;
                deleteUserSkill(bareName);
            } else {
                const projectRootPath = resolveProjectRootPath();
                if (!projectRootPath) { return false; }
                const slash = params.skillId.indexOf('/');
                const prefix = slash !== -1 ? params.skillId.slice(0, slash) : '';
                const bareName = slash !== -1 ? params.skillId.slice(slash + 1) : params.skillId;
                const projectName = path.basename(projectRootPath);
                const packagePath = prefix === projectName ? null : prefix;
                deleteCustomSkill(projectRootPath, packagePath, bareName);
            }
            return true;
        } catch (error) {
            console.error('[Skills] deleteSkill failed:', error);
            return false;
        }
    }

    async saveSkillFromChat(params: SkillSaveRequest): Promise<boolean> {
        try {
            const draft = approvalManager.getSkillDraft(params.requestId);
            if (!draft) {
                console.warn('[Skills] saveSkillFromChat: no pending draft for request', params.requestId);
                return false;
            }
            if (params.tier === 'user') {
                writeUserSkill(draft.name, draft.trigger, draft.body);
            } else {
                const projectRootPath = resolveProjectRootPath();
                if (!projectRootPath) { return false; }
                const packagePath = params.scope === 'integration' ? (params.packagePath ?? null) : null;
                writeCustomSkill(projectRootPath, packagePath, draft.name, draft.trigger, draft.body);
            }
            approvalManager.resolveSkillSave(params.requestId, true, params.tier);
            return true;
        } catch (error) {
            console.error('[Skills] saveSkillFromChat failed:', error);
            approvalManager.resolveSkillSave(params.requestId, false);
            return false;
        }
    }

    async cancelSkillSave(params: SkillSaveCancelRequest): Promise<void> {
        approvalManager.resolveSkillSave(params.requestId, false);
    }

    private scanPackages(projectRootPath: string): AvailableProject[] {
        const results: AvailableProject[] = [];
        try {
            const entries = fs.readdirSync(projectRootPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) { continue; }
                const tomlPath = path.join(projectRootPath, entry.name, 'Ballerina.toml');
                if (fs.existsSync(tomlPath)) {
                    results.push({ name: entry.name, packagePath: entry.name });
                }
            }
        } catch { /* ignore */ }
        return results;
    }

    async listMcpServers(): Promise<McpServerStatusDTO[]> {
        const manager = getMcpClientManager();
        if (!manager) {
            return [];
        }
        try {
            await manager.refresh();
        } catch (err) {
            console.warn('[mcp] listMcpServers refresh failed:', err);
        }
        return manager.listServers();
    }

    async setMcpServerEnabled(params: SetMcpServerEnabledRequest): Promise<void> {
        const manager = getMcpClientManager();
        if (!manager) {
            return;
        }
        const scope = params.scope ?? "user";
        await manager.setEnabled(scope, params.name, params.enabled);
        notifyMcpServersChanged(manager.listServers());
    }

    async openMcpConfig(params: OpenMcpConfigRequest): Promise<void> {
        const scope = params?.scope ?? "user";
        let workspacePath: string | undefined;
        if (scope === "workspace") {
            workspacePath = resolveProjectRootPath() || undefined;
            if (!workspacePath) {
                vscode.window.showWarningMessage("No project is open — cannot edit project MCP config.");
                return;
            }
            if (!vscode.workspace.isTrusted) {
                vscode.window.showWarningMessage("This project is not trusted. Trust this project from the workspace trust prompt to enable project-scope MCP servers.");
                return;
            }
        }
        const filePath = ensureMcpConfigFileExists(scope, workspacePath);
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc, { preview: false });
    }

    async getMcpToolsEnabled(): Promise<boolean> {
        return workspace.getConfiguration('ballerina').get<boolean>('copilot.enableMcpTools', false);
    }

    async getMcpWorkspaceContext(): Promise<McpWorkspaceContextResponse> {
        return { hasWorkspace: !!resolveProjectRootPath() && vscode.workspace.isTrusted };
    }

    async getMcpLoadErrors(): Promise<McpLoadErrorsDTO> {
        const manager = getMcpClientManager();
        if (!manager) {
            return {};
        }
        return manager.getLoadErrors();
    }

    async getMcpGroupStates(): Promise<McpGroupStatesDTO> {
        const manager = getMcpClientManager();
        if (!manager) {
            return { user: true, workspace: true };
        }
        return manager.getGroupStates();
    }

    async setMcpGroupEnabled(params: SetMcpGroupEnabledRequest): Promise<void> {
        const manager = getMcpClientManager();
        if (!manager) {
            return;
        }
        await manager.setGroupEnabled(params.scope, params.enabled);
        notifyMcpServersChanged(manager.listServers());
        notifyMcpGroupStatesChanged(manager.getGroupStates());
    }

    async addMcpServer(params: AddMcpServerRequest): Promise<AddMcpServerResponse> {
        const name = (params?.name ?? "").trim();
        if (!name) {
            return { success: false, error: "Server name is required." };
        }
        if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(name)) {
            return { success: false, error: "Use letters, digits, _, ., or - only (max 64 chars)." };
        }
        const cfg = params?.config;
        const cfgError = validateMcpServerConfig(cfg);
        if (cfgError) {
            return { success: false, error: cfgError };
        }
        const scope = params.scope ?? "user";
        let workspacePath: string | undefined;
        if (scope === "workspace") {
            workspacePath = resolveProjectRootPath() || undefined;
            if (!workspacePath) {
                return { success: false, error: "No project is open — cannot add a project-scope server." };
            }
            if (!vscode.workspace.isTrusted) {
                return { success: false, error: "This project is not trusted. Trust this project from the workspace trust prompt to enable project-scope MCP servers." };
            }
        }
        try {
            writeMcpServer(name, cfg, scope, workspacePath);
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
        await this.refreshAndNotify();
        return { success: true };
    }

    async updateMcpServer(params: UpdateMcpServerRequest): Promise<AddMcpServerResponse> {
        const name = (params?.name ?? "").trim();
        if (!name) {
            return { success: false, error: "Server name is required." };
        }
        const cfg = params?.config;
        const cfgError = validateMcpServerConfig(cfg);
        if (cfgError) {
            return { success: false, error: cfgError };
        }
        const scope = params.scope ?? "user";
        let workspacePath: string | undefined;
        if (scope === "workspace") {
            workspacePath = resolveProjectRootPath() || undefined;
            if (!workspacePath) {
                return { success: false, error: "No project is open — cannot update a project-scope server." };
            }
            if (!vscode.workspace.isTrusted) {
                return { success: false, error: "This project is not trusted. Trust this project from the workspace trust prompt to enable project-scope MCP servers." };
            }
        }
        try {
            updateMcpServer(name, cfg, scope, workspacePath);
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
        await this.refreshAndNotify();
        return { success: true };
    }

    async deleteMcpServer(params: DeleteMcpServerRequest): Promise<AddMcpServerResponse> {
        const name = (params?.name ?? "").trim();
        if (!name) {
            return { success: false, error: "Server name is required." };
        }
        const scope = params.scope ?? "user";
        let workspacePath: string | undefined;
        if (scope === "workspace") {
            workspacePath = resolveProjectRootPath() || undefined;
            if (!workspacePath) {
                return { success: false, error: "No project is open." };
            }
            // Note: deleting an entry from an already-cloned untrusted .mcp.json is harmless,
            // so we don't require trust here.
        }
        try {
            deleteMcpServer(name, scope, workspacePath);
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
        const manager = getMcpClientManager();
        if (manager) {
            await manager.deleteServerOverride(scope, name);
        }
        await this.refreshAndNotify();
        return { success: true };
    }

    async setMcpToolsEnabled(params: SetMcpToolsEnabledRequest): Promise<void> {
        await workspace.getConfiguration('ballerina').update('copilot.enableMcpTools', !!params?.enabled, ConfigurationTarget.Global);
        // The existing onDidChangeConfiguration listener in activator.ts handles
        // setup/teardown of the manager and pushes config_change + mcpServersChanged.
    }

    private async refreshAndNotify(): Promise<void> {
        const manager = getMcpClientManager();
        if (!manager) {
            return;
        }
        try {
            await manager.refresh();
            notifyMcpServersChanged(manager.listServers());
            notifyMcpLoadErrorsChanged(manager.getLoadErrors());
        } catch (err) {
            console.warn('[mcp] post-write refresh failed:', err);
        }
    }

}
