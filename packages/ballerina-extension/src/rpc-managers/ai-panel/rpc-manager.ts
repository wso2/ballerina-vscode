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
    BIModuleNodesRequest,
    BISourceCodeResponse,
    DeleteFromProjectRequest,
    DeveloperDocument,
    DiagnosticEntry,
    Diagnostics,
    DocGenerationRequest,
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
    OperationType,
    PostProcessRequest,
    PostProcessResponse,
    ProcessContextTypeCreationRequest,
    ProcessMappingParametersRequest,
    ProjectDiagnostics,
    ProjectModule,
    ProjectSource,
    RelevantLibrariesAndFunctionsRequest,
    RelevantLibrariesAndFunctionsResponse,
    RepairParams,
    RequirementSpecification,
    SourceFile,
    SubmitFeedbackRequest,
    TestGenerationMentions,
    TestGenerationRequest,
    TestGenerationResponse,
    TestGeneratorIntermediaryState,
    TestPlanGenerationRequest,
} from "@wso2/ballerina-core";
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import path from "path";
import { parse } from 'toml';
import { workspace } from 'vscode';

import { isNumber } from "lodash";
import { ExtendedLangClient } from "src/core";
import { fetchWithAuth } from "../../../src/features/ai/service/connection";
import { generateContextTypes, generateInlineMappingCode, generateMappingCode, openChatWindowWithCommand } from "../../../src/features/ai/service/datamapper/datamapper";
import { generateDesign } from "../../../src/features/ai/service/design/design";
import { generateOpenAPISpec } from "../../../src/features/ai/service/openapi/openapi";
import { AIStateMachine, openAIPanelWithPrompt } from "../../../src/views/ai-panel/aiMachine";
import { checkToken } from "../../../src/views/ai-panel/utils";
import { extension } from "../../BalExtensionContext";
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
import { writeBallerinaFileDidOpen, writeBallerinaFileDidOpenTemp } from "../../utils/modification";
import { updateSourceCode } from "../../utils/source-utils";
import { refreshDataMapper } from "../data-mapper/utils";
import {
    DEVELOPMENT_DOCUMENT,
    NATURAL_PROGRAMMING_DIR_NAME, REQUIREMENT_DOC_PREFIX,
    REQUIREMENT_MD_DOCUMENT,
    REQUIREMENT_TEXT_DOCUMENT,
    REQ_KEY, TEST_DIR_NAME
} from "./constants";
import { attemptRepairProject, checkProjectDiagnostics } from "./repair-utils";
import { AIPanelAbortController, addToIntegration, cleanDiagnosticMessages, isErrorCode, requirementsSpecification, searchDocumentation } from "./utils";
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
        const projectPath = StateMachine.context().projectUri;
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
        updateView();
        const datamapperMetadata = StateMachine.context().dataMapperMetadata;
        await refreshDataMapper(balFilePath, datamapperMetadata.codeData, datamapperMetadata.name);
        return true;
    }


    async getFromFile(req: GetFromFileRequest): Promise<string> {
        const projectPath = StateMachine.context().projectUri;
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
        const projectPath = StateMachine.context().projectUri;
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
        const projectPath = StateMachine.context().projectUri;
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

    async getGeneratedTests(params: TestGenerationRequest): Promise<TestGenerationResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectRoot = StateMachine.context().projectUri;

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
                const projectRoot = StateMachine.context().projectUri;
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
                const projectRoot = StateMachine.context().projectUri;
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
                const projectRoot = StateMachine.context().projectUri;
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
                const projectRoot = StateMachine.context().projectUri;
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
                const projectRoot = StateMachine.context().projectUri;
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

    async postProcess(req: PostProcessRequest): Promise<PostProcessResponse> {
        return await postProcess(req);
    }

    async applyDoOnFailBlocks(): Promise<void> {
        const projectRoot = StateMachine.context().projectUri;

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

    async getGeneratedDocumentation(params: DocGenerationRequest): Promise<void> {
        await generateDocumentationForService(params);
    }

    async addFilesToProject(params: AddFilesToProjectRequest): Promise<boolean> {
        try {
            const projectPath = StateMachine.context().projectUri; 

            const ballerinaProjectFile = path.join(projectPath, "Ballerina.toml");
            if (!fs.existsSync(ballerinaProjectFile)) {
                throw new Error("Not a Ballerina project.");
            }
            await addToIntegration(projectPath, params.fileChanges);
            updateView();
            return true;
        } catch (error) {
            console.error(">>> Failed to add files to the project", error);
            return false; //silently fail for timeout issues.
        }
    }

    async generateMappingCode(params: ProcessMappingParametersRequest): Promise<void> {
        await generateMappingCode(params);
    }

    async generateInlineMappingCode(params: MetadataWithAttachments): Promise<void> {
        await generateInlineMappingCode(params);
    }

    async generateContextTypes(params: ProcessContextTypeCreationRequest): Promise<boolean> {
        await generateContextTypes(params);
        return true;
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

    async generateDesign(params: GenerateAgentCodeRequest): Promise<boolean> {
        await generateDesign(params);
        return true;
    }

    async openAIPanel(params: AIPanelPrompt): Promise<void> {
        openAIPanelWithPrompt(params)
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

async function setupProjectEnvironment(project: ProjectSource): Promise<{ langClient: ExtendedLangClient, tempDir: string } | null> {
    //TODO: Move this to LS
    const projectRoot = StateMachine.context().projectUri;
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
    const projectRoot = StateMachine.context().projectUri;

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
