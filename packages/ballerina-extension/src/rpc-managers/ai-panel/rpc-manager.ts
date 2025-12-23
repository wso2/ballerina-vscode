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
    AIChatSummary,
    AIMachineSnapshot,
    AIPanelAPI,
    AIPanelPrompt,
    AddFilesToProjectRequest,
    AddToProjectRequest,
    BIIntelSecrets,
    BIModuleNodesRequest,
    BISourceCodeResponse,
    Command,
    DeleteFromProjectRequest,
    DeveloperDocument,
    DiagnosticEntry,
    Diagnostics,
    DocGenerationRequest,
    ExecutionContext,
    FetchDataRequest,
    FetchDataResponse,
    GenerateAgentCodeRequest,
    GenerateCodeRequest,
    GenerateOpenAPIRequest,
    GetFromFileRequest,
    GetModuleDirParams,
    LLMDiagnostics,
    LoginMethod,
    MetadataWithAttachments,
    PostProcessRequest,
    PostProcessResponse,
    ProcessContextTypeCreationRequest,
    ProcessMappingParametersRequest,
    ProjectDiagnostics,
    ProjectSource,
    RelevantLibrariesAndFunctionsRequest,
    RelevantLibrariesAndFunctionsResponse,
    RepairParams,
    RequirementSpecification,
    RestoreCheckpointRequest,
    SemanticDiffRequest,
    SemanticDiffResponse,
    SetAutoApproveRequest,
    SubmitFeedbackRequest,
    TestGenerationMentions,
    TestGeneratorIntermediaryState,
    TestPlanGenerationRequest,
    UpdateChatMessageRequest,
} from "@wso2/ballerina-core";
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import path from "path";
import { workspace } from 'vscode';

import { isNumber } from "lodash";
import { ExtendedLangClient } from "src/core";
import { getServiceDeclarationNames } from "../../../src/features/ai/documentation/utils";
import { AIStateMachine, openAIPanelWithPrompt } from "../../../src/views/ai-panel/aiMachine";
import { checkToken } from "../../../src/views/ai-panel/utils";
import { extension } from "../../BalExtensionContext";
import { clearPendingReviewContext, getPendingReviewContext } from "../../features/ai/agent/stream-handlers/handlers/finish-handler";
import { openChatWindowWithCommand } from "../../features/ai/data-mapper/index";
import { generateDocumentationForService } from "../../features/ai/documentation/generator";
import { generateOpenAPISpec } from "../../features/ai/openapi/index";
import { runtimeStateManager } from '../../features/ai/state/RuntimeStateManager';
import { getSelectedLibraries } from "../../features/ai/agent/tools/healthcare-library";
import { OLD_BACKEND_URL, closeAllBallerinaFiles } from "../../features/ai/utils";
import { fetchWithAuth } from "../../features/ai/utils/ai-client";
import { selectRequiredFunctions } from "../../features/ai/utils/libs/function-registry";
import { GenerationType } from "../../features/ai/utils/libs/libraries";
import { Library } from "../../features/ai/utils/libs/library-types";
import { getLLMDiagnosticArrayAsString, handleChatSummaryFailure } from "../../features/natural-programming/utils";
import { StateMachine, updateView } from "../../stateMachine";
import { getAccessToken, getLoginMethod, getRefreshedAccessToken, loginGithubCopilot } from "../../utils/ai/auth";
import { writeBallerinaFileDidOpen, writeBallerinaFileDidOpenTemp } from "../../utils/modification";
import { updateSourceCode } from "../../utils/source-utils";
import { refreshDataMapper } from "../data-mapper/utils";
import {
    DEVELOPMENT_DOCUMENT,
    NATURAL_PROGRAMMING_DIR_NAME, REQUIREMENT_DOC_PREFIX,
    TEST_DIR_NAME
} from "./constants";
import { attemptRepairProject, checkProjectDiagnostics } from "./repair-utils";
import { AIPanelAbortController, addToIntegration, cleanDiagnosticMessages, searchDocumentation } from "./utils";
import { fetchData } from "./utils/fetch-data-utils";

export class AiPanelRpcManager implements AIPanelAPI {

    // ==================================
    // General Functions
    // ==================================
    async getBackendUrl(): Promise<string> {
        return new Promise(async (resolve) => {
            resolve(OLD_BACKEND_URL);
        });
    }

    async getProjectUuid(): Promise<string> {
        return new Promise(async (resolve) => {
            // Check if there is at least one workspace folder
            if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
                resolve("");
                return;
            }

            try {
                let projectIdentifier: string;
                const cloudProjectId = process.env.CLOUD_INITIAL_PROJECT_ID;
                
                if (cloudProjectId) {
                    projectIdentifier = cloudProjectId;
                } else {
                    projectIdentifier = workspace.workspaceFolders[0].uri.fsPath;
                }

                const hash = crypto.createHash('sha256')
                    .update(projectIdentifier)
                    .digest('hex');

                resolve(hash);
            } catch (error) {
                resolve("");
            }
        });
    }

    async getLoginMethod(): Promise<LoginMethod> {
        return new Promise(async (resolve) => {
            const loginMethod = await getLoginMethod();
            resolve(loginMethod);
        });
    }

    async getAccessToken(): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const credentials = await getAccessToken();

                if (!credentials) {
                    reject(new Error("Access Token is undefined"));
                    return;
                }
                const secrets = credentials.secrets as BIIntelSecrets;
                const accessToken = secrets.accessToken;
                resolve(accessToken);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getRefreshedAccessToken(): Promise<string> {
        return new Promise(async (resolve) => {
            const token = await getRefreshedAccessToken();
            resolve(token);
        });
    }

    async getDefaultPrompt(): Promise<AIPanelPrompt> {
        const defaultPrompt = extension.aiChatDefaultPrompt;
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

    async fetchData(params: FetchDataRequest): Promise<FetchDataResponse> {
        return {
            response: await fetchData(params.url, params.options)
        };
    }

    async addToProject(req: AddToProjectRequest): Promise<boolean> {
        const projectPath = StateMachine.context().projectPath;
        // Check if workspaceFolderPath is a Ballerina project
        // Assuming a Ballerina project must contain a 'Ballerina.toml' file
        const ballerinaProjectFile = path.join(projectPath, 'Ballerina.toml');
        if (!fs.existsSync(ballerinaProjectFile)) {
            throw new Error("Not a Ballerina project.");
        }

        let balFilePath = path.join(projectPath, req.filePath);

        const directory = path.dirname(balFilePath);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        await writeBallerinaFileDidOpen(balFilePath, req.content);
        return true;
    }

    async getFromFile(req: GetFromFileRequest): Promise<string> {
        let projectPath = StateMachine.context().projectPath;
        const workspacePath = StateMachine.context().workspacePath;
        if (workspacePath) {
            projectPath = workspacePath;
        }
        const ballerinaProjectFile = path.join(projectPath, 'Ballerina.toml');
        if (!fs.existsSync(ballerinaProjectFile)) {
            throw new Error("Not a Ballerina project.");
        }

        const balFilePath = path.join(projectPath, req.filePath);
        try {
            const content = await fs.promises.readFile(balFilePath, 'utf-8');
            return content;
        } catch (error) {
            throw error;
        }
    }

    async deleteFromProject(req: DeleteFromProjectRequest): Promise<void> {
        let projectPath = StateMachine.context().projectPath;
        const workspacePath = StateMachine.context().workspacePath;
        if (workspacePath) {
            projectPath = workspacePath;
        }
        const ballerinaProjectFile = path.join(projectPath, 'Ballerina.toml');
        if (!fs.existsSync(ballerinaProjectFile)) {
            throw new Error("Not a Ballerina project.");
        }

        const balFilePath = path.join(projectPath, req.filePath);
        if (fs.existsSync(balFilePath)) {
            try {
                fs.unlinkSync(balFilePath);
            } catch (err) {
                throw new Error("Could not delete the file.");
            }
        } else {
            throw new Error("File does not exist.");
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        updateView();
    }

    async getFileExists(req: GetFromFileRequest): Promise<boolean> {
        const projectPath = StateMachine.context().projectPath;
        const ballerinaProjectFile = path.join(projectPath, 'Ballerina.toml');
        if (!fs.existsSync(ballerinaProjectFile)) {
            throw new Error("Not a Ballerina project.");
        }

        const balFilePath = path.join(projectPath, req.filePath);
        if (fs.existsSync(balFilePath)) {
            return true;
        }
        return false;
    }

    async getShadowDiagnostics(project: ProjectSource): Promise<ProjectDiagnostics> {
        const environment = await setupProjectEnvironment(project);
        if (!environment) {
            return { diagnostics: [] };
        }

        const { langClient, tempDir } = environment;
        let remainingDiags: Diagnostics[] = await attemptRepairProject(langClient, tempDir);
        const filteredDiags: DiagnosticEntry[] = getErrorDiagnostics(remainingDiags);
        await closeAllBallerinaFiles(tempDir);
        return {
            diagnostics: filteredDiags
        };
    }

    async clearInitialPrompt(): Promise<void> {
        extension.aiChatDefaultPrompt = undefined;
    }

    async checkSyntaxError(project: ProjectSource): Promise<boolean> {
        const environment = await setupProjectEnvironment(project);
        if (!environment) {
            return false;
        }

        const { langClient, tempDir } = environment;
        // check project diagnostics
        const projectDiags: Diagnostics[] = await checkProjectDiagnostics(langClient, tempDir);
        await closeAllBallerinaFiles(tempDir);
        for (const diagnostic of projectDiags) {
            for (const diag of diagnostic.diagnostics) {
                console.log(diag.code);
                if (typeof diag.code === "string" && diag.code.startsWith("BCE")) {
                    const match = diag.code.match(/^BCE(\d+)$/);
                    if (match) {
                        const codeNumber = Number(match[1]);
                        if (codeNumber < 2000) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
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

    async abortTestGeneration(): Promise<void> {
        AIPanelAbortController.getInstance().abort();
    }

    async postProcess(req: PostProcessRequest): Promise<PostProcessResponse> {
        return await postProcess(req);
    }

    async applyDoOnFailBlocks(): Promise<void> {
        const projectPath = StateMachine.context().projectPath;

        if (!projectPath) {
            return null;
        }

        const balFiles: string[] = [];

        const findBalFiles = (dir: string) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    findBalFiles(filePath);
                } else if (file.endsWith('.bal')) {
                    balFiles.push(filePath);
                }
            }
        };

        findBalFiles(projectPath);

        for (const balFile of balFiles) {
            const req: BIModuleNodesRequest = {
                filePath: balFile
            };

            const resp: BISourceCodeResponse = await StateMachine.langClient().addErrorHandler(req);
            await updateSourceCode({ textEdits: resp.textEdits, description: 'Error Handler Creation' });
        }
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

    async promptWSO2AILogout(): Promise<boolean> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
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

    async isRequirementsSpecificationFileExist(filePath: string): Promise<boolean> {
        const dirPath = path.join(filePath, NATURAL_PROGRAMMING_DIR_NAME);

        if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
            return false; // Directory doesn't exist or isn't a folder
        }

        const files = fs.readdirSync(dirPath);
        return Promise.resolve(files.some(file => file.toLowerCase().startsWith(REQUIREMENT_DOC_PREFIX)));
    }

    async addChatSummary(filepathAndSummary: AIChatSummary): Promise<boolean> {
        const filepath = filepathAndSummary.filepath;
        var summaryResponse = filepathAndSummary.summary;

        const summaryJson: SummaryResponse = JSON.parse(summaryResponse);
        let summary = summaryJson.summary;

        const naturalProgrammingDirectory = path.join(filepath, NATURAL_PROGRAMMING_DIR_NAME);

        if (!fs.existsSync(naturalProgrammingDirectory)) {
            return false;
        }

        const developerMdPath = path.join(naturalProgrammingDirectory, DEVELOPMENT_DOCUMENT);
        fs.writeFileSync(developerMdPath, summary, 'utf8');
        return true;
    }

    async readDeveloperMdFile(directoryPath: string): Promise<string> {
        const developerMdPath = path.join(directoryPath, NATURAL_PROGRAMMING_DIR_NAME, DEVELOPMENT_DOCUMENT);
        if (!fs.existsSync(developerMdPath)) {
            return "";
        }

        let developerMdContent = fs.readFileSync(developerMdPath, 'utf8');
        return Promise.resolve(developerMdContent);
    }

    async updateDevelopmentDocument(developerDocument: DeveloperDocument) {
        const projectPath = developerDocument.filepath;
        const content = developerDocument.content;

        const developerMdPath = path.join(projectPath, NATURAL_PROGRAMMING_DIR_NAME, DEVELOPMENT_DOCUMENT);
        if (fs.existsSync(developerMdPath)) {
            fs.writeFileSync(developerMdPath, content, 'utf8');
        }
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

    async handleChatSummaryError(message: string): Promise<void> {
        return handleChatSummaryFailure(message);
    }

    async isNaturalProgrammingDirectoryExists(projectPath: string): Promise<boolean> {
        const dirPath = path.join(projectPath, NATURAL_PROGRAMMING_DIR_NAME);
        if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
            return false; // Directory doesn't exist or isn't a folder
        }
        return true;
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

    async getRelevantLibrariesAndFunctions(params: RelevantLibrariesAndFunctionsRequest): Promise<RelevantLibrariesAndFunctionsResponse> {
        const selectedLibs: string[] = await getSelectedLibraries(params.query, GenerationType.CODE_GENERATION);
        const relevantTrimmedFuncs: Library[] = await selectRequiredFunctions(params.query, selectedLibs, GenerationType.CODE_GENERATION);
        return {
            libraries: relevantTrimmedFuncs
        };
    }

    async generateOpenAPI(params: GenerateOpenAPIRequest): Promise<void> {
        await generateOpenAPISpec(params);
    }

    async generateCode(params: GenerateCodeRequest): Promise<void> {
        // await generateCode(params);
    }

    async repairGeneratedCode(params: RepairParams): Promise<void> {
        // await triggerGeneratedCodeRepair(params);
    }

    async generateTestPlan(params: TestPlanGenerationRequest): Promise<void> {
        // await generateTestPlan(params);
    }

    async generateFunctionTests(params: TestGeneratorIntermediaryState): Promise<void> {
        // await generateFunctionTests(params);
    }

    async generateHealthcareCode(params: GenerateCodeRequest): Promise<void> {
        // await generateHealthcareCode(params);
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
            // Import executor
            const { FunctionMappingExecutor } = await import('../../features/ai/executors/datamapper/FunctionMappingExecutor');
            const { createWebviewEventHandler } = await import('../../features/ai/utils/events');

            // Create execution context from current state machine context
            const stateMachineContext = StateMachine.context();
            const executionContext: ExecutionContext = {
                projectPath: stateMachineContext.projectPath,
                workspacePath: stateMachineContext.workspacePath
            };

            // Create event handler
            const eventHandler = createWebviewEventHandler(Command.DataMap);

            // Generate unique message ID
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

            // Create abort controller
            const abortController = new AbortController();

            // Create executor config
            const config = {
                executionContext,
                eventHandler,
                messageId,
                abortController
            };

            // Instantiate and execute
            const executor = new FunctionMappingExecutor(config, params);

            // Execute with lifecycle management
            try {
                await executor.initialize();
                await executor.execute();
            } finally {
                await executor.cleanup();
            }
        } catch (error) {
            console.error('[RPC Manager] Error in generateMappingCode:', error);
            throw error;
        }
    }

    async generateInlineMappingCode(params: MetadataWithAttachments): Promise<void> {
        try {
            // Import executor
            const { InlineMappingExecutor } = await import('../../features/ai/executors/datamapper/InlineMappingExecutor');
            const { createWebviewEventHandler } = await import('../../features/ai/utils/events');

            // Create execution context from current state machine context
            const stateMachineContext = StateMachine.context();
            const executionContext: ExecutionContext = {
                projectPath: stateMachineContext.projectPath,
                workspacePath: stateMachineContext.workspacePath
            };

            // Create event handler
            const eventHandler = createWebviewEventHandler(Command.DataMap);

            // Generate unique message ID
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

            // Create abort controller
            const abortController = new AbortController();

            // Create executor config
            const config = {
                executionContext,
                eventHandler,
                messageId,
                abortController
            };

            // Instantiate and execute
            const executor = new InlineMappingExecutor(config, params);

            // Execute with lifecycle management
            try {
                await executor.initialize();
                await executor.execute();
            } finally {
                await executor.cleanup();
            }
        } catch (error) {
            console.error('[RPC Manager] Error in generateInlineMappingCode:', error);
            throw error;
        }
    }

    async generateContextTypes(params: ProcessContextTypeCreationRequest): Promise<void> {
        try {
            // Import executor
            const { ContextTypesExecutor } = await import('../../features/ai/executors/datamapper/ContextTypesExecutor');
            const { createWebviewEventHandler } = await import('../../features/ai/utils/events');

            // Create execution context from current state machine context
            const stateMachineContext = StateMachine.context();
            const executionContext: ExecutionContext = {
                projectPath: stateMachineContext.projectPath,
                workspacePath: stateMachineContext.workspacePath
            };

            // Create event handler
            const eventHandler = createWebviewEventHandler(Command.TypeCreator);

            // Generate unique message ID
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

            // Create abort controller
            const abortController = new AbortController();

            // Create executor config
            const config = {
                executionContext,
                eventHandler,
                messageId,
                abortController
            };

            // Instantiate and execute
            const executor = new ContextTypesExecutor(config, params);

            // Execute with lifecycle management
            try {
                await executor.initialize();
                await executor.execute();
            } finally {
                await executor.cleanup();
            }
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
        try {
            const isPlanModeEnabled = workspace.getConfiguration('ballerina.ai').get<boolean>('planMode', false);

            if (!isPlanModeEnabled) {
                params.isPlanMode = false;
            }
            // Import executor
            const { AgentExecutor } = await import('../../features/ai/agent/AgentExecutor');
            const { createWebviewEventHandler } = await import('../../features/ai/utils/events');

            // Create execution context from current state machine context
            const stateMachineContext = StateMachine.context();
            const executionContext: ExecutionContext = {
                projectPath: stateMachineContext.projectPath,
                workspacePath: stateMachineContext.workspacePath
            };

            // Create event handler
            const eventHandler = createWebviewEventHandler(Command.Agent);

            // Generate unique message ID
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

            // Create abort controller
            const abortController = new AbortController();

            // Create executor config
            const config = {
                executionContext,
                eventHandler,
                messageId,
                abortController
            };

            // Instantiate and execute
            const executor = new AgentExecutor(config, params);

            // Execute with lifecycle management
            try {
                await executor.initialize();
                await executor.execute();
                return true;
            } finally {
                await executor.cleanup();
            }
        } catch (error) {
            console.error('[RPC Manager] Error in generateAgent:', error);
            throw error;
        }
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
        const reviewContext = getPendingReviewContext();
        
        if (!reviewContext) {
            console.warn("[Review Actions] No pending review context found for accept");
            return;
        }

        try {
            // Integrate code to workspace if there are modified files
            if (reviewContext.modifiedFiles.length > 0) {
                const { integrateCodeToWorkspace } = await import("../../features/ai/agent/utils");
                const modifiedFilesSet = new Set(reviewContext.modifiedFiles);
                await integrateCodeToWorkspace(reviewContext.tempProjectPath, modifiedFilesSet, reviewContext.ctx);
                console.log(`[Review Actions] Integrated ${reviewContext.modifiedFiles.length} file(s) to workspace`);
            }

            // Cleanup
            const { sendAgentDidCloseForProjects } = await import("../../features/ai/utils/project/ls-schema-notifications");
            const { cleanupTempProject } = await import("../../features/ai/utils/project/temp-project");
            
            sendAgentDidCloseForProjects(reviewContext.tempProjectPath, reviewContext.projects);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (reviewContext.shouldCleanup) {
                cleanupTempProject(reviewContext.tempProjectPath);
            }
            
            clearPendingReviewContext();

            // Update runtime state
            runtimeStateManager.setShowReviewActions(false);
        } catch (error) {
            console.error("[Review Actions] Error accepting changes:", error);
            throw error;
        }
    }

    async declineChanges(): Promise<void> {
        const reviewContext = getPendingReviewContext();
        
        if (!reviewContext) {
            console.warn("[Review Actions] No pending review context found for decline");
            return;
        }

        try {
            // Just cleanup without integrating changes
            const { sendAgentDidCloseForProjects } = await import("../../features/ai/utils/project/ls-schema-notifications");
            const { cleanupTempProject } = await import("../../features/ai/utils/project/temp-project");
            
            sendAgentDidCloseForProjects(reviewContext.tempProjectPath, reviewContext.projects);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (reviewContext.shouldCleanup) {
                cleanupTempProject(reviewContext.tempProjectPath);
            }
            
            clearPendingReviewContext();

            // Update runtime state
            runtimeStateManager.setShowReviewActions(false);
        } catch (error) {
            console.error("[Review Actions] Error declining changes:", error);
            throw error;
        }
    }

    async showReviewActions(): Promise<void> {
        runtimeStateManager.setShowReviewActions(true);
    }

    async hideReviewActions(): Promise<void> {
        runtimeStateManager.setShowReviewActions(false);
    }

    async approvePlan(params: { requestId: string; comment?: string }): Promise<void> {
        const { approvalManager } = await import('../../features/ai/state/ApprovalManager');
        approvalManager.resolvePlanApproval(params.requestId, true, params.comment);
    }

    async declinePlan(params: { requestId: string; comment?: string }): Promise<void> {
        const { approvalManager } = await import('../../features/ai/state/ApprovalManager');
        approvalManager.resolvePlanApproval(params.requestId, false, params.comment);
    }

    async approveTask(params: { requestId: string; approvedTaskDescription?: string }): Promise<void> {
        const { approvalManager } = await import('../../features/ai/state/ApprovalManager');
        approvalManager.resolveTaskApproval(params.requestId, true, undefined, params.approvedTaskDescription);
    }

    async declineTask(params: { requestId: string; comment?: string }): Promise<void> {
        const { approvalManager } = await import('../../features/ai/state/ApprovalManager');
        approvalManager.resolveTaskApproval(params.requestId, false, params.comment);
    }

    async provideConnectorSpec(params: { requestId: string; spec: any }): Promise<void> {
        const { approvalManager } = await import('../../features/ai/state/ApprovalManager');
        approvalManager.resolveConnectorSpec(params.requestId, true, params.spec);
    }

    async cancelConnectorSpec(params: { requestId: string; comment?: string }): Promise<void> {
        const { approvalManager } = await import('../../features/ai/state/ApprovalManager');
        approvalManager.resolveConnectorSpec(params.requestId, false, undefined, params.comment);
    }

    async setAutoApprove(params: SetAutoApproveRequest): Promise<void> {
        runtimeStateManager.setAutoApproveEnabled(params.enabled);
    }

    async restoreCheckpoint(params: RestoreCheckpointRequest): Promise<void> {
        const { chatStateManager } = await import('../../features/ai/state/ChatStateManager');
        const projectId = await this.getProjectUuid();
        const context = chatStateManager.loadState(projectId);

        if (!context) {
            throw new Error('No chat state found');
        }

        const checkpoint = context.checkpoints?.find(c => c.id === params.checkpointId);
        if (!checkpoint) {
            throw new Error(`Checkpoint ${params.checkpointId} not found`);
        }

        // Add fileAttachments field for type compatibility
        const contextWithAttachments = { ...context, fileAttachments: [] };
        await chatStateManager.restoreContextToCheckpoint(contextWithAttachments as any, params.checkpointId);
    }

    async clearChat(): Promise<void> {
        const { chatStateManager } = await import('../../features/ai/state/ChatStateManager');
        const projectId = await this.getProjectUuid();
        chatStateManager.clearState(projectId);
        runtimeStateManager.clearState();
    }

    async updateChatMessage(params: UpdateChatMessageRequest): Promise<void> {
        const { chatStateManager } = await import('../../features/ai/state/ChatStateManager');
        const projectId = await this.getProjectUuid();
        const context = chatStateManager.loadState(projectId);

        if (!context) {
            return;
        }

        const message = context.chatHistory?.find((m: any) => m.id === params.messageId);
        if (message) {
            message.content = params.content;
            // Ensure fileAttachments field exists for type compatibility
            const contextWithAttachments = { ...context, fileAttachments: [] };
            chatStateManager.saveState(projectId, contextWithAttachments as any);
        }
    }
}

interface SummaryResponse {
    summary: string;
}

async function setupProjectEnvironment(project: ProjectSource): Promise<{ langClient: ExtendedLangClient, tempDir: string } | null> {
    //TODO: Move this to LS
    let projectPath = StateMachine.context().projectPath;
    const workspacePath = StateMachine.context().workspacePath;
    if (workspacePath) {
        projectPath = workspacePath;
    }
    if (!projectPath) {
        return null;
    }

    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `bal-proj-${randomNum}-`));
    fs.cpSync(projectPath, tempDir, { recursive: true });
    //Copy project
    const langClient = StateMachine.langClient();
    //Apply edits
    for (const sourceFile of project.sourceFiles) {
        // Update lastUpdatedBalFile if it's a .bal file
        if (sourceFile.filePath.endsWith('.bal')) {
            const tempFilePath = path.join(tempDir, sourceFile.filePath);
            writeBallerinaFileDidOpenTemp(tempFilePath, sourceFile.content);
        }
    }

    return { langClient, tempDir };
}


function getErrorDiagnostics(diagnostics: Diagnostics[]): DiagnosticEntry[] {
    const errorDiagnostics: DiagnosticEntry[] = [];

    for (const diagParam of diagnostics) {
        for (const diag of diagParam.diagnostics) {
            if (diag.severity === 1) {
                const fileName = path.basename(diagParam.uri);
                const msgPrefix = `[${fileName}:${diag.range.start.line},${diag.range.start.character}:${diag.range.end.line},${diag.range.end.character}] `;
                errorDiagnostics.push({
                    code: diag.code.toString(),
                    message: msgPrefix + diag.message
                });
            }
        }
    }

    return errorDiagnostics;
}

export async function postProcess(req: PostProcessRequest): Promise<PostProcessResponse> {
    // Fix import statement format
    const processedSourceFiles = req.sourceFiles.map(sf => ({
        ...sf,
        content: sf.content.replace(/import ballerinax\/client\.config/g, "import ballerinax/'client.config")
    }));

    const project: ProjectSource = {
        sourceFiles: processedSourceFiles,
        projectName: "",
        packagePath: "",
        isActive: true
    };

    const environment = await setupProjectEnvironment(project);
    if (!environment) {
        return { sourceFiles: processedSourceFiles, diagnostics: { diagnostics: [] } };
    }

    let { langClient, tempDir } = environment;
    let remainingDiags: Diagnostics[] = [];
    if (StateMachine.context().workspacePath) {
        // this is a workspace project
        // assign active project path to tempDir
        const projectTempDir = path.join(tempDir, path.basename(StateMachine.context().projectPath));
        remainingDiags = await attemptRepairProject(langClient, projectTempDir);
    } else {
        remainingDiags = await attemptRepairProject(langClient, tempDir);
    }

    const filteredDiags: DiagnosticEntry[] = getErrorDiagnostics(remainingDiags);

    // Read repaired files from temp directory
    const repairedSourceFiles = [];
    for (const sourceFile of project.sourceFiles) {
        const newContentPath = path.join(tempDir, sourceFile.filePath);
        if (!fs.existsSync(newContentPath) && !(sourceFile.filePath.endsWith('.bal'))) {
            repairedSourceFiles.push({ filePath: sourceFile.filePath, content: sourceFile.content });
            continue;
        }
        repairedSourceFiles.push({ filePath: sourceFile.filePath, content: fs.readFileSync(newContentPath, 'utf-8') });
    }

    await closeAllBallerinaFiles(tempDir);
    return {
        sourceFiles: repairedSourceFiles,
        diagnostics: {
            diagnostics: filteredDiags
        }
    };
}


