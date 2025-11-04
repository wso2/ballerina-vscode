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
    AllDataMapperSourceRequest,
    BIModuleNodesRequest,
    BISourceCodeResponse,
    CodeSegment,
    Command,
    CreateTempFileRequest,
    DMModel,
    DataMapperModelResponse,
    DatamapperModelContext,
    DeleteFromProjectRequest,
    DeveloperDocument,
    DiagnosticEntry,
    Diagnostics,
    DocGenerationRequest,
    ExpandedDMModel,
    ExtendedDataMapperMetadata,
    FetchDataRequest,
    FetchDataResponse,
    GenerateCodeRequest,
    GenerateAgentCodeRequest,
    GenerateMappingsResponse,
    GenerateOpenAPIRequest,
    GenerateTypesFromRecordRequest,
    GenerateTypesFromRecordResponse,
    GetFromFileRequest,
    GetModuleDirParams,
    LLMDiagnostics,
    LinePosition,
    LoginMethod,
    MappingElement,
    MetadataWithAttachments,
    NotifyAIMappingsRequest,
    OperationType,
    PostProcessRequest,
    PostProcessResponse,
    ProjectDiagnostics,
    ProjectModule,
    ProjectSource,
    RelevantLibrariesAndFunctionsRequest,
    RelevantLibrariesAndFunctionsResponse,
    RepairParams,
    RequirementSpecification,
    SourceFile,
    SubmitFeedbackRequest,
    SyntaxTree,
    TemplateId,
    TestGenerationMentions,
    TestGenerationRequest,
    TestGenerationResponse,
    TestGeneratorIntermediaryState,
    TestPlanGenerationRequest,
    TextEdit,
} from "@wso2/ballerina-core";
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import path from "path";
import { parse } from 'toml';
import { Uri, commands, window, workspace } from 'vscode';

import { FunctionDefinition, ModulePart, STKindChecker, STNode } from "@wso2/syntax-tree";
import { isNumber } from "lodash";
import { URI } from "vscode-uri";
import { NOT_SUPPORTED } from "../../../src/core/extended-language-client";
import { CLOSE_AI_PANEL_COMMAND, OPEN_AI_PANEL_COMMAND } from "../../../src/features/ai/constants";
import { fetchWithAuth } from "../../../src/features/ai/service/connection";
import { generateOpenAPISpec } from "../../../src/features/ai/service/openapi/openapi";
import { AIStateMachine } from "../../../src/views/ai-panel/aiMachine";
import { extension } from "../../BalExtensionContext";
import { createTempDataMappingFile, generateTypeCreation } from "../../features/ai/dataMapping";
import { generateCode, triggerGeneratedCodeRepair } from "../../features/ai/service/code/code";
import { generateDocumentationForService } from "../../features/ai/service/documentation/doc_generator";
import { generateHealthcareCode } from "../../features/ai/service/healthcare/healthcare";
import { selectRequiredFunctions } from "../../features/ai/service/libs/funcs";
import { GenerationType, getSelectedLibraries } from "../../features/ai/service/libs/libs";
import { Library } from "../../features/ai/service/libs/libs_types";
import { generateFunctionTests } from "../../features/ai/service/test/function_tests";
import { generateTestPlan } from "../../features/ai/service/test/test_plan";
import { generateTest, getDiagnostics, getResourceAccessorDef, getResourceAccessorNames, getServiceDeclaration, getServiceDeclarationNames } from "../../features/ai/testGenerator";
import { OLD_BACKEND_URL, closeAllBallerinaFiles } from "../../features/ai/utils";
import { getLLMDiagnosticArrayAsString, handleChatSummaryFailure } from "../../features/natural-programming/utils";
import { StateMachine, updateView } from "../../stateMachine";
import { getAccessToken, getLoginMethod, getRefreshedAccessToken, loginGithubCopilot } from "../../utils/ai/auth";
import { modifyFileContent, writeBallerinaFileDidOpen, writeBallerinaFileDidOpenTemp } from "../../utils/modification";
import { updateSourceCode } from "../../utils/source-utils";
import { expandDMModel, refreshDataMapper, updateAndRefreshDataMapper } from "../data-mapper/utils";
import {
    DEVELOPMENT_DOCUMENT,
    NATURAL_PROGRAMMING_DIR_NAME, REQUIREMENT_DOC_PREFIX,
    REQUIREMENT_MD_DOCUMENT,
    REQUIREMENT_TEXT_DOCUMENT,
    REQ_KEY, TEST_DIR_NAME
} from "./constants";
import { attemptRepairProject, checkProjectDiagnostics } from "./repair-utils";
import { AIPanelAbortController, addToIntegration, cleanDiagnosticMessages, handleStop, isErrorCode, processMappings, requirementsSpecification, searchDocumentation } from "./utils";
import { fetchData } from "./utils/fetch-data-utils";
import { generateDesign, generateDesignCore } from "../../../src/features/ai/service/design/design";

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
                const workspaceFolderPath = workspace.workspaceFolders[0].uri.fsPath;

                const hash = crypto.createHash('sha256')
                    .update(workspaceFolderPath)
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
                const accessToken = await getAccessToken();
                if (!accessToken) {
                    reject(new Error("Access Token is undefined"));
                    return;
                }
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

        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error("No workspaces found.");
        }

        const workspaceFolderPath = workspaceFolders[0].uri.fsPath;
        // Check if workspaceFolderPath is a Ballerina project
        // Assuming a Ballerina project must contain a 'Ballerina.toml' file
        const ballerinaProjectFile = path.join(workspaceFolderPath, 'Ballerina.toml');
        if (!fs.existsSync(ballerinaProjectFile)) {
            throw new Error("Not a Ballerina project.");
        }

        let balFilePath = path.join(workspaceFolderPath, req.filePath);

        const directory = path.dirname(balFilePath);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        await writeBallerinaFileDidOpen(balFilePath, req.content);
        updateView();
        const datamapperMetadata = StateMachine.context().dataMapperMetadata;
        await refreshDataMapper(balFilePath, datamapperMetadata.codeData, datamapperMetadata.name);
        return true;
    }

    async getFromFile(req: GetFromFileRequest): Promise<string> {
        return new Promise(async (resolve) => {
            const workspaceFolders = workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error("No workspaces found.");
            }

            const workspaceFolderPath = workspaceFolders[0].uri.fsPath;
            const ballerinaProjectFile = path.join(workspaceFolderPath, 'Ballerina.toml');
            if (!fs.existsSync(ballerinaProjectFile)) {
                throw new Error("Not a Ballerina project.");
            }

            const balFilePath = path.join(workspaceFolderPath, req.filePath);
            const content = fs.promises.readFile(balFilePath, 'utf-8');
            resolve(content);
        });
    }

    async deleteFromProject(req: DeleteFromProjectRequest): Promise<void> {
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error("No workspaces found.");
        }

        const workspaceFolderPath = workspaceFolders[0].uri.fsPath;
        const ballerinaProjectFile = path.join(workspaceFolderPath, 'Ballerina.toml');
        if (!fs.existsSync(ballerinaProjectFile)) {
            throw new Error("Not a Ballerina project.");
        }

        const balFilePath = path.join(workspaceFolderPath, req.filePath);
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
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error("No workspaces found.");
        }

        const workspaceFolderPath = workspaceFolders[0].uri.fsPath;
        const ballerinaProjectFile = path.join(workspaceFolderPath, 'Ballerina.toml');
        if (!fs.existsSync(ballerinaProjectFile)) {
            throw new Error("Not a Ballerina project.");
        }

        const balFilePath = path.join(workspaceFolderPath, req.filePath);
        if (fs.existsSync(balFilePath)) {
            return true;
        }
        return false;
    }

    async notifyAIMappings(params: NotifyAIMappingsRequest): Promise<boolean> {
        const { newFnPosition, prevFnSource, filePath } = params;
        const fileUri = Uri.file(filePath).toString();
        const undoAction = 'Undo';
        const msg = 'You have automatically generated mappings. Do you want to undo the changes?';
        const result = await window.showInformationMessage(msg, undoAction, 'Close');

        if (result === undoAction) {
            const res = await StateMachine.langClient().stModify({
                astModifications: [{
                    type: "INSERT",
                    config: { STATEMENT: prevFnSource },
                    ...newFnPosition
                }],
                documentIdentifier: {
                    uri: fileUri
                }
            });

            const { source } = res as SyntaxTree;
            await modifyFileContent({ filePath, content: source });
            updateView();
        }

        return true;
    }

    async stopAIMappings(): Promise<GenerateMappingsResponse> {
        handleStop();
        return { userAborted: true };
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

    async getGeneratedTests(params: TestGenerationRequest): Promise<TestGenerationResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectRoot = await getBallerinaProjectRoot();

                const generatedTests = await generateTest(projectRoot, params, AIPanelAbortController.getInstance());
                resolve(generatedTests);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getTestDiagnostics(params: TestGenerationResponse): Promise<ProjectDiagnostics> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectRoot = await getBallerinaProjectRoot();
                const diagnostics = await getDiagnostics(projectRoot, params);
                resolve(diagnostics);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getServiceSourceForName(params: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectRoot = await getBallerinaProjectRoot();
                const { serviceDeclaration, serviceDocFilePath } = await getServiceDeclaration(projectRoot, params);
                resolve(serviceDeclaration.source);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getResourceSourceForMethodAndPath(params: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectRoot = await getBallerinaProjectRoot();
                const { serviceDeclaration, resourceAccessorDef, serviceDocFilePath } = await getResourceAccessorDef(projectRoot, params);
                resolve(resourceAccessorDef.source);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getServiceNames(): Promise<TestGenerationMentions> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectRoot = await getBallerinaProjectRoot();
                const serviceDeclNames = await getServiceDeclarationNames(projectRoot);
                resolve({
                    mentions: serviceDeclNames
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async getResourceMethodAndPaths(): Promise<TestGenerationMentions> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectRoot = await getBallerinaProjectRoot();
                const resourceAccessorNames = await getResourceAccessorNames(projectRoot);
                resolve({
                    mentions: resourceAccessorNames
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async abortTestGeneration(): Promise<void> {
        AIPanelAbortController.getInstance().abort();
    }

    async getTypesFromRecord(params: GenerateTypesFromRecordRequest): Promise<GenerateTypesFromRecordResponse> {
        return await generateTypeCreation(params);
    }

    async postProcess(req: PostProcessRequest): Promise<PostProcessResponse> {
        return await postProcess(req);
    }

    async applyDoOnFailBlocks(): Promise<void> {
        const projectRoot = await getBallerinaProjectRoot();

        if (!projectRoot) {
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

        findBalFiles(projectRoot);

        for (const balFile of balFiles) {
            const req: BIModuleNodesRequest = {
                filePath: balFile
            };

            const resp: BISourceCodeResponse = await StateMachine.langClient().addErrorHandler(req);
            await updateSourceCode({ textEdits: resp.textEdits }, null, 'Error Handler Creation');
        }
    }

    async getActiveFile(): Promise<string> {
        const activeTabGroup = window.tabGroups.all.find(group => {
            return group.activeTab.isActive && group.activeTab?.input;
        });

        if (activeTabGroup && activeTabGroup.activeTab && activeTabGroup.activeTab.input) {
            const activeTabInput = activeTabGroup.activeTab.input as { uri: { fsPath: string } };

            if (activeTabInput.uri) {
                const fileUri = activeTabInput.uri;
                const fileName = fileUri.fsPath.split('/').pop();
                return fileName || '';
            }
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
        const naturalProgrammingDir = path.join(requirementsSpecification.filepath, 'natural-programming');
        const requirementsFilePath = path.join(naturalProgrammingDir, 'requirements.txt');

        // Create the 'natural-programming' directory if it doesn't exist
        if (!fs.existsSync(naturalProgrammingDir)) {
            fs.mkdirSync(naturalProgrammingDir, { recursive: true });
        }

        // Write the requirements to the 'requirements.txt' file
        fs.writeFileSync(requirementsFilePath, requirementsSpecification.content, 'utf8');
    }

    async getDriftDiagnosticContents(projectPath: string): Promise<LLMDiagnostics> {
        const result = await getLLMDiagnosticArrayAsString(projectPath);
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

    async createTestDirecoryIfNotExists(directoryPath: string) {
        const testDirName = path.join(directoryPath, TEST_DIR_NAME);
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
            const projectUri = params.filePath;
            const projectFsPath = URI.parse(projectUri).fsPath;
            const moduleName = params.moduleName;
            const generatedPath = path.join(projectFsPath, "generated", moduleName);
            if (fs.existsSync(generatedPath) && fs.statSync(generatedPath).isDirectory()) {
                resolve("generated");
            } else {
                resolve("modules");
            }
        });
    }

    async getContentFromFile(content: GetFromFileRequest): Promise<string> {
        return new Promise(async (resolve) => {
            const projectFsPath = URI.parse(content.filePath).fsPath;
            const fileContent = await fs.promises.readFile(projectFsPath, 'utf-8');
            resolve(fileContent);
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
        await generateCode(params);
    }

    async repairGeneratedCode(params: RepairParams): Promise<void> {
        await triggerGeneratedCodeRepair(params);
    }

    async generateTestPlan(params: TestPlanGenerationRequest): Promise<void> {
        await generateTestPlan(params);
    }

    async generateFunctionTests(params: TestGeneratorIntermediaryState): Promise<void> {
        await generateFunctionTests(params);
    }

    async generateHealthcareCode(params: GenerateCodeRequest): Promise<void> {
        await generateHealthcareCode(params);
    }

    async abortAIGeneration(): Promise<void> {
        AIPanelAbortController.getInstance().abort();
    }

    async createTempFileAndGenerateMetadata(params: CreateTempFileRequest): Promise<ExtendedDataMapperMetadata> {
        const projectRoot = await getBallerinaProjectRoot();
        const filePath = await createTempDataMappingFile(
            projectRoot,
            params.inputs,
            params.output,
            params.functionName,
            params.inputNames,
            params.imports
        );

        // Get the complete syntax tree
        const fileUri = Uri.file(filePath).toString();
        const st = (await StateMachine.langClient().getSyntaxTree({
            documentIdentifier: {
                uri: fileUri,
            },
        })) as SyntaxTree;

        let funcDefinitionNode: FunctionDefinition = null;
        const modulePart = st.syntaxTree as ModulePart;

        // Find the function definition by name
        modulePart.members.forEach((member) => {
            if (STKindChecker.isFunctionDefinition(member)) {
                const funcDef = member as FunctionDefinition;
                if (funcDef.functionName?.value === params.functionName) {
                    funcDefinitionNode = funcDef;
                }
            }
        });

        if (!funcDefinitionNode) {
            throw new Error(`Function ${params.functionName} not found in the generated file`);
        }

        // Create dataMapperMetadata with the found positions
        const dataMapperMetadata = {
            name: params.functionName,
            codeData: {
                lineRange: {
                    fileName: filePath,
                    startLine: {
                        line: funcDefinitionNode.position.startLine,
                        offset: funcDefinitionNode.position.startColumn,
                    },
                    endLine: {
                        line: funcDefinitionNode.position.endLine,
                        offset: funcDefinitionNode.position.endColumn,
                    },
                },
            },
        };

        const dataMapperModel = await this.generateDataMapperModel({
            documentUri: filePath,
            identifier: params.functionName,
            dataMapperMetadata: dataMapperMetadata
        });

        return {
            mappingsModel: dataMapperModel.mappingsModel as ExpandedDMModel,
            name: params.functionName,
            codeData: dataMapperMetadata.codeData
        };
    }

    async generateDataMapperModel(params: DatamapperModelContext): Promise<DataMapperModelResponse> {
        try {
            let filePath: string;
            let identifier: string;
            let dataMapperMetadata: any;

            if (params && params.documentUri && params.identifier) {
                filePath = params.documentUri;
                identifier = params.identifier;
                dataMapperMetadata = params.dataMapperMetadata;
            } else {
                const context = StateMachine.context();
                filePath = context.documentUri;
                identifier = context.identifier || context.dataMapperMetadata.name;
                dataMapperMetadata = context.dataMapperMetadata;
            }

            let position: LinePosition = {
                line: dataMapperMetadata.codeData.lineRange.startLine.line,
                offset: dataMapperMetadata.codeData.lineRange.startLine.offset
            };

            if (!dataMapperMetadata.codeData.hasOwnProperty('node') ||
                dataMapperMetadata.codeData.node !== "VARIABLE") {
                const fileUri = Uri.file(filePath).toString();
                const fnSTByRange = await StateMachine.langClient().getSTByRange({
                    lineRange: {
                        start: {
                            line: dataMapperMetadata.codeData.lineRange.startLine.line,
                            character: dataMapperMetadata.codeData.lineRange.startLine.offset
                        },
                        end: {
                            line: dataMapperMetadata.codeData.lineRange.endLine.line,
                            character: dataMapperMetadata.codeData.lineRange.endLine.offset
                        }
                    },
                    documentIdentifier: { uri: fileUri }
                });

                if (fnSTByRange === NOT_SUPPORTED) {
                    throw new Error("Syntax tree retrieval not supported");
                }

                const fnSt = (fnSTByRange as SyntaxTree).syntaxTree as STNode;

                if (STKindChecker.isFunctionDefinition(fnSt) &&
                    STKindChecker.isExpressionFunctionBody(fnSt.functionBody)) {
                    position = {
                        line: fnSt.functionBody.expression.position.startLine,
                        offset: fnSt.functionBody.expression.position.startColumn
                    };
                }
            }

            let dataMapperModel = await StateMachine
                .langClient()
                .getDataMapperMappings({
                    filePath,
                    codedata: dataMapperMetadata.codeData,
                    targetField: identifier,
                    position: position
                }) as DataMapperModelResponse;

            return {
                mappingsModel: expandDMModel(
                    dataMapperModel.mappingsModel as DMModel,
                    identifier
                )
            };
        } catch (error) {
            console.error("Failed to generate data mapper model:", error);
            throw error;
        }
    }

    async addCodeSegmentToWorkspace(params: CodeSegment): Promise<boolean> {
        try {
            let filePath = params.filePath && params.filePath.trim() !== ''
                ? params.filePath
                : StateMachine.context().documentUri;
            const datamapperMetadata = params.metadata
                ? params.metadata
                : StateMachine.context().dataMapperMetadata;

            let allTextEdits: { [key: string]: TextEdit[] };

            if (params.textEdit && params.textEdit.textEdits) {
                allTextEdits = params.textEdit.textEdits;
            } else {
                const textEdit: TextEdit = {
                    newText: params.segmentText,
                    range: {
                        start: {
                            line: datamapperMetadata.codeData.lineRange.startLine.line,
                            character: datamapperMetadata.codeData.lineRange.startLine.offset
                        },
                        end: {
                            line: datamapperMetadata.codeData.lineRange.endLine.line,
                            character: datamapperMetadata.codeData.lineRange.endLine.offset
                        }
                    }
                };
                allTextEdits = {
                    [filePath]: [textEdit]
                };
            }
            await updateSourceCode({ textEdits: allTextEdits }, null, 'AI Code Segment Creation');
            return true;
        } catch (error) {
            console.error(">>> Failed to add code segment to the workspace", error);
            throw error;
        }
    }

    async openAIMappingChatWindow(params: DataMapperModelResponse): Promise<void> {
        try {
            const context = StateMachine.context();
            const { identifier, dataMapperMetadata } = context;

            commands.executeCommand(CLOSE_AI_PANEL_COMMAND);
            commands.executeCommand(OPEN_AI_PANEL_COMMAND, {
                type: 'command-template',
                command: Command.DataMap,
                templateId: identifier ? TemplateId.MappingsForFunction : TemplateId.InlineMappings,
                ...(identifier && { params: { functionName: identifier } }),
                metadata: {
                    ...dataMapperMetadata,
                    mappingsModel: params.mappingsModel as ExpandedDMModel
                }
            });
        } catch (error) {
            console.error("Failed to open AI chat window for mapping:", error);
            throw error;
        }
    }

    async generateMappings(params: MetadataWithAttachments): Promise<AllDataMapperSourceRequest> {
        try {
            const filePath = params.useTemporaryFile
                ? params.metadata.codeData.lineRange.fileName
                : StateMachine.context().documentUri;

            const file = params.attachments && params.attachments.length > 0
                ? params.attachments[0]
                : undefined;

            const mappingElement = await processMappings(params.metadata.mappingsModel as ExpandedDMModel, file);

            const allMappingsRequest: AllDataMapperSourceRequest = {
                filePath,
                codedata: params.metadata.codeData,
                varName: params.metadata.name,
                position: {
                    line: params.metadata.codeData.lineRange.startLine.line,
                    offset: params.metadata.codeData.lineRange.startLine.offset
                },
                mappings: (mappingElement as MappingElement).mappings
            };

            return allMappingsRequest;
        } catch (error) {
            console.error("Failed to generate mappings:", error);
            throw error;
        }
    }

    async addInlineCodeSegmentToWorkspace(params: CodeSegment): Promise<void> {
        try {
            let filePath = StateMachine.context().documentUri;
            const datamapperMetadata = StateMachine.context().dataMapperMetadata;
            const textEdit: TextEdit = {
                newText: params.segmentText,
                range: {
                    start: {
                        line: datamapperMetadata.codeData.lineRange.startLine.line,
                        character: datamapperMetadata.codeData.lineRange.startLine.offset
                    },
                    end: {
                        line: datamapperMetadata.codeData.lineRange.endLine.line,
                        character: datamapperMetadata.codeData.lineRange.endLine.offset
                    }
                }
            };
            const allTextEdits: { [key: string]: TextEdit[] } = {
                [filePath]: [textEdit]
            };

            await updateAndRefreshDataMapper(
                allTextEdits,
                filePath,
                datamapperMetadata.codeData,
                datamapperMetadata.name,
                datamapperMetadata.name
            );
        } catch (error) {
            console.error(">>> Failed to add inline code segment to the workspace", error);
            throw error;
        }
    }

    async getGeneratedDocumentation(params: DocGenerationRequest): Promise<boolean> {
        await generateDocumentationForService(params);
        return true;
    }

    async addFilesToProject(params: AddFilesToProjectRequest): Promise<boolean> {
        try {
            const workspaceFolders = workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error("No workspaces found.");
            }

            const workspaceFolderPath = workspaceFolders[0].uri.fsPath;

            const ballerinaProjectFile = path.join(workspaceFolderPath, "Ballerina.toml");
            if (!fs.existsSync(ballerinaProjectFile)) {
                throw new Error("Not a Ballerina project.");
            }
            await addToIntegration(workspaceFolderPath, params.fileChanges);
            updateView();
            return true;
        } catch (error) {
            console.error(">>> Failed to add files to the project", error);
            return false; //silently fail for timeout issues.
        }
    }

    async generateDesign(params: GenerateAgentCodeRequest): Promise<boolean> {
        await generateDesign(params);
        return true;
    }
}

function getModifiedAssistantResponse(originalAssistantResponse: string, tempDir: string, project: ProjectSource): string {
    const newSourceFiles = [];
    for (const sourceFile of project.sourceFiles) {
        const newContentPath = path.join(tempDir, sourceFile.filePath);
        if (!fs.existsSync(newContentPath) && !(sourceFile.filePath.endsWith('.bal'))) {
            newSourceFiles.push({ filePath: sourceFile.filePath, content: sourceFile.content });
            continue;
        }
        newSourceFiles.push({ filePath: sourceFile.filePath, content: fs.readFileSync(newContentPath, 'utf-8') });
    }

    // Build a map from filenames to their new content
    const fileContentMap = new Map<string, string>();
    for (const sourceFile of newSourceFiles) {
        fileContentMap.set(sourceFile.filePath, sourceFile.content);
    }

    // Replace code blocks in originalAssistantResponse with new content
    const modifiedResponse = originalAssistantResponse.replace(
        /<code filename="([^"]+)">\s*```ballerina([\s\S]*?)```[\s\S]*?<\/code>/g,
        (match, filename) => {
            if (fileContentMap.has(filename)) {
                const newContent = fileContentMap.get(filename);
                return `<code filename="${filename}">\n\`\`\`ballerina\n${newContent}\n\`\`\`\n</code>`;
            } else {
                // If no new content, keep the original
                return match;
            }
        }
    );

    return modifiedResponse;
}

interface SummaryResponse {
    summary: string;
}

interface BalModification {
    fileUri: string;
    moduleName: string;
}

async function setupProjectEnvironment(project: ProjectSource): Promise<{ langClient: any, tempDir: string } | null> {
    //TODO: Move this to LS
    const projectRoot = await getBallerinaProjectRoot();
    if (!projectRoot) {
        return null;
    }

    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `bal-proj-${randomNum}-`));
    fs.cpSync(projectRoot, tempDir, { recursive: true });
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

export function getProjectFromResponse(req: string): ProjectSource {
    const sourceFiles: SourceFile[] = [];
    const regex = /<code filename="([^"]+)">\s*```ballerina([\s\S]*?)```\s*<\/code>/g;
    let match;

    while ((match = regex.exec(req)) !== null) {
        const filePath = match[1];
        const fileContent = match[2].trim();
        sourceFiles.push({ filePath, content: fileContent });
    }

    return { sourceFiles, projectName: "" };
}

function getContentInsideQuotes(input: string): string | null {
    const match = input.match(/'([^']+)'/);
    return match ? match[1] : null;
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

interface BallerinaProject {
    projectName: string;
    modules?: BallerinaModule[];
    sources: { [key: string]: string };
}

interface BallerinaModule {
    moduleName: string;
    sources: { [key: string]: string };
    isGenerated: boolean;
}

enum CodeGenerationType {
    CODE_FOR_USER_REQUIREMENT = "CODE_FOR_USER_REQUIREMENT",
    TESTS_FOR_USER_REQUIREMENT = "TESTS_FOR_USER_REQUIREMENT",
    CODE_GENERATION = "CODE_GENERATION"
}

async function getCurrentProjectSource(requestType: OperationType): Promise<BallerinaProject> {
    const projectRoot = await getBallerinaProjectRoot();

    if (!projectRoot) {
        return null;
    }

    // Read the Ballerina.toml file to get package name
    const ballerinaTomlPath = path.join(projectRoot, 'Ballerina.toml');
    let packageName;
    if (fs.existsSync(ballerinaTomlPath)) {
        const tomlContent = await fs.promises.readFile(ballerinaTomlPath, 'utf-8');
        // Simple parsing to extract the package.name field
        try {
            const tomlObj = parse(tomlContent);
            packageName = tomlObj.package.name;
        } catch (error) {
            packageName = '';
        }
    }

    const project: BallerinaProject = {
        modules: [],
        sources: {},
        projectName: packageName
    };

    // Read root-level .bal files
    const rootFiles = fs.readdirSync(projectRoot);
    for (const file of rootFiles) {
        if (file.endsWith('.bal') || file.toLowerCase() === "readme.md") {
            const filePath = path.join(projectRoot, file);
            project.sources[file] = await fs.promises.readFile(filePath, 'utf-8');
        }
    }

    if (requestType != "CODE_GENERATION") {
        const naturalProgrammingDirectory = projectRoot + `/${NATURAL_PROGRAMMING_DIR_NAME}`;
        if (fs.existsSync(naturalProgrammingDirectory)) {
            const reqFiles = fs.readdirSync(naturalProgrammingDirectory);
            for (const file of reqFiles) {
                const filePath = path.join(projectRoot, `${NATURAL_PROGRAMMING_DIR_NAME}`, file);
                if (file.toLowerCase() == REQUIREMENT_TEXT_DOCUMENT || file.toLowerCase() == REQUIREMENT_MD_DOCUMENT) {
                    project.sources[REQ_KEY] = await fs.promises.readFile(filePath, 'utf-8');
                    continue;
                } else if (file.toLowerCase().startsWith(REQUIREMENT_DOC_PREFIX)) {
                    const requirements = await requirementsSpecification(filePath);
                    if (!isErrorCode(requirements)) {
                        project.sources[REQ_KEY] = requirements.toString();
                        continue;
                    }
                    project.sources[REQ_KEY] = "";
                }
            }
        }
    }

    // Read modules
    const modulesDir = path.join(projectRoot, 'modules');
    const generatedDir = path.join(projectRoot, 'generated');
    await populateModules(modulesDir, project);
    await populateModules(generatedDir, project);
    return project;
}

async function populateModules(modulesDir: string, project: BallerinaProject) {
    if (fs.existsSync(modulesDir)) {
        const modules = fs.readdirSync(modulesDir, { withFileTypes: true });
        for (const moduleDir of modules) {
            if (moduleDir.isDirectory()) {
                const module: BallerinaModule = {
                    moduleName: moduleDir.name,
                    sources: {},
                    isGenerated: path.basename(modulesDir) !== 'modules'
                };

                const moduleFiles = fs.readdirSync(path.join(modulesDir, moduleDir.name));
                for (const file of moduleFiles) {
                    if (file.endsWith('.bal')) {
                        const filePath = path.join(modulesDir, moduleDir.name, file);
                        module.sources[file] = await fs.promises.readFile(filePath, 'utf-8');
                    }
                }

                project.modules.push(module);
            }
        }
    }
}

export async function getBallerinaProjectRoot(): Promise<string | null> {

    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders) {
        throw new Error("No workspaces found.");
    }

    const workspaceFolderPath = workspaceFolders[0].uri.fsPath;
    // Check if workspaceFolderPath is a Ballerina project
    // Assuming a Ballerina project must contain a 'Ballerina.toml' file
    const ballerinaProjectFile = path.join(workspaceFolderPath, 'Ballerina.toml');
    if (fs.existsSync(ballerinaProjectFile)) {
        return workspaceFolderPath;
    }
    return null;
}


export async function postProcess(req: PostProcessRequest): Promise<PostProcessResponse> {
    let assist_resp = req.assistant_response;
    assist_resp = assist_resp.replace(/import ballerinax\/client\.config/g, "import ballerinax/'client.config");
    const project: ProjectSource = getProjectFromResponse(assist_resp);
    const environment = await setupProjectEnvironment(project);
    if (!environment) {
        return { assistant_response: assist_resp, diagnostics: { diagnostics: [] } };
    }

    const { langClient, tempDir } = environment;
    // check project diagnostics
    let remainingDiags: Diagnostics[] = await attemptRepairProject(langClient, tempDir);

    const filteredDiags: DiagnosticEntry[] = getErrorDiagnostics(remainingDiags);
    const newAssistantResponse = getModifiedAssistantResponse(assist_resp, tempDir, project);
    await closeAllBallerinaFiles(tempDir);
    return {
        assistant_response: newAssistantResponse,
        diagnostics: {
            diagnostics: filteredDiags
        }
    };
}

export async function getProjectSource(requestType: OperationType): Promise<ProjectSource> {
    // Fetch the Ballerina project source
    const project: BallerinaProject = await getCurrentProjectSource(requestType);

    // Initialize the ProjectSource object
    const projectSource: ProjectSource = {
        sourceFiles: [],
        projectModules: [],
        projectName: project.projectName,
    };

    // Iterate through root-level sources
    for (const [filePath, content] of Object.entries(project.sources)) {
        projectSource.sourceFiles.push({ filePath, content });
    }

    // Iterate through module sources
    if (project.modules) {
        for (const module of project.modules) {
            const projectModule: ProjectModule = {
                moduleName: module.moduleName,
                sourceFiles: [],
                isGenerated: module.isGenerated
            };
            for (const [fileName, content] of Object.entries(module.sources)) {
                // const filePath = `modules/${module.moduleName}/${fileName}`;
                // projectSource.sourceFiles.push({ filePath, content });
                projectModule.sourceFiles.push({ filePath: fileName, content });
            }
            projectSource.projectModules.push(projectModule);
        }
    }

    return projectSource;
}
