// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { Command, GenerateAgentCodeRequest, ProjectSource, AIChatMachineEventType, ExecutionContext} from "@wso2/ballerina-core";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { getAnthropicClient, getProviderCacheControl, ANTHROPIC_SONNET_4 } from "../utils/ai-client";
import { getErrorMessage, populateHistoryForAgent } from "../utils/ai-utils";
import { CopilotEventHandler, createWebviewEventHandler } from "../utils/events";
import { AIPanelAbortController } from "../../../rpc-managers/ai-panel/utils";
import { createTaskWriteTool, TASK_WRITE_TOOL_NAME } from "../tools/task-writer";
import { createDiagnosticsTool, DIAGNOSTICS_TOOL_NAME } from "../tools/diagnostics";
import { createBatchEditTool, createEditExecute, createEditTool, createMultiEditExecute, createReadExecute, createReadTool, createWriteExecute, createWriteTool, FILE_BATCH_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME, FILE_SINGLE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME } from "../tools/text-editor";
import { sendAgentDidOpenForProjects } from "../utils/project/ls-schema-notifications";
import { getLibraryProviderTool } from "../tools/library-provider";
import { GenerationType, getAllLibraries, LIBRARY_PROVIDER_TOOL } from "../utils/libs/libraries";
import { getHealthcareLibraryProviderTool, HEALTHCARE_LIBRARY_PROVIDER_TOOL } from "../tools/healthcare-library";
import { AIChatStateMachine } from "../../../views/ai-panel/aiChatMachine";
import { getTempProject as createTempProjectOfWorkspace } from "../utils/project/temp-project";
import { getSystemPrompt, getUserPrompt } from "./prompts";
import { createConnectorGeneratorTool, CONNECTOR_GENERATOR_TOOL } from "../tools/connector-generator";
import { LangfuseExporter } from 'langfuse-vercel';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { getProjectSource } from "../utils/project/temp-project";
import { StateMachine } from "../../../stateMachine";
import { createAgentEventRegistry } from "./stream-handlers/create-agent-event-registry";
import { StreamContext } from "./stream-handlers/stream-context";
import { StreamErrorException, StreamAbortException, StreamFinishException } from "./stream-handlers/stream-event-handler";

// const LANGFUSE_SECRET = process.env.LANGFUSE_SECRET;
// const LANGFUSE_PUBLIC = process.env.LANGFUSE_PUBLIC;

// const langfuseExporter = new LangfuseExporter({
//     secretKey: LANGFUSE_SECRET,
//     publicKey: LANGFUSE_PUBLIC,
//     baseUrl: 'https://cloud.langfuse.com', // 🇪🇺 EU region
// });
// const sdk = new NodeSDK({
//     traceExporter: langfuseExporter,
//     instrumentations: [getNodeAutoInstrumentations()],
// });
// sdk.start();

// ==================================
// ExecutionContext Factory Functions
// ==================================

/**
 * Creates an ExecutionContext from StateMachine's current state.
 * Used by production RPC handlers to create context from current UI state.
 *
 * @returns ExecutionContext with paths from StateMachine
 */
export function createExecutionContextFromStateMachine(): ExecutionContext {
    const context = StateMachine.context();
    return {
        projectPath: context.projectPath,
        workspacePath: context.workspacePath
    };
}

/**
 * Creates an ExecutionContext with explicit paths.
 * Used by tests to create isolated contexts per test case.
 *
 * @param projectPath - Absolute path to the project
 * @param workspacePath - Optional workspace path
 * @returns ExecutionContext with specified paths
 */
export function createExecutionContext(
    projectPath: string,
    workspacePath?: string
): ExecutionContext {
    return { projectPath, workspacePath };
}

export async function generateAgentCore(
    params: GenerateAgentCodeRequest,
    eventHandler: CopilotEventHandler,
    ctx: ExecutionContext
): Promise<string> {
    const isPlanModeEnabled = params.isPlanMode;
    const messageId = params.messageId;

    const tempProjectPath = (await createTempProjectOfWorkspace(ctx)).path;
    const shouldCleanup = !process.env.AI_TEST_ENV;
    const projectPath = ctx.projectPath;

    const projects: ProjectSource[] = await getProjectSource(params.operationType, ctx);
    // Send didOpen for all initial project files
    sendAgentDidOpenForProjects(tempProjectPath, projectPath, projects);

    const historyMessages = populateHistoryForAgent(params.chatHistory);

    const cacheOptions = await getProviderCacheControl();

    const modifiedFiles: string[] = [];

    const userMessageContent = getUserPrompt(params.usecase, tempProjectPath, projects, isPlanModeEnabled, params.codeContext);
    const allMessages: ModelMessage[] = [
        {
            role: "system",
            content: getSystemPrompt(),
            providerOptions: cacheOptions,
        },
        ...historyMessages,
        {
            role: "user",
            content: userMessageContent,
        },
    ];

    const allLibraries = await getAllLibraries(GenerationType.CODE_GENERATION);
    const libraryDescriptions = allLibraries.length > 0
        ? allLibraries.map((lib) => `- ${lib.name}: ${lib.description}`).join("\n")
        : "- No libraries available";

    const tools = {
        [TASK_WRITE_TOOL_NAME]: createTaskWriteTool(eventHandler, tempProjectPath, modifiedFiles),
        [LIBRARY_PROVIDER_TOOL]: getLibraryProviderTool(libraryDescriptions, GenerationType.CODE_GENERATION),
        [HEALTHCARE_LIBRARY_PROVIDER_TOOL]: getHealthcareLibraryProviderTool(libraryDescriptions),
        [CONNECTOR_GENERATOR_TOOL]: createConnectorGeneratorTool(eventHandler, tempProjectPath, projects[0].projectName, modifiedFiles),
        [FILE_WRITE_TOOL_NAME]: createWriteTool(createWriteExecute(tempProjectPath, projectPath, modifiedFiles)),
        [FILE_SINGLE_EDIT_TOOL_NAME]: createEditTool(createEditExecute(tempProjectPath, projectPath, modifiedFiles)),
        [FILE_BATCH_EDIT_TOOL_NAME]: createBatchEditTool(createMultiEditExecute(tempProjectPath, projectPath, modifiedFiles)),
        [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(tempProjectPath)),
        [DIAGNOSTICS_TOOL_NAME]: createDiagnosticsTool(tempProjectPath),
    };

    const { fullStream, response } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 8192,
        temperature: 0,
        messages: allMessages,
        stopWhen: stepCountIs(50),
        tools,
        abortSignal: AIPanelAbortController.getInstance().signal,
        experimental_telemetry: { isEnabled: true },
    });


    AIChatStateMachine.sendEvent({
        type: AIChatMachineEventType.PLANNING_STARTED
    });

    eventHandler({ type: "start" });

    // Create stream context for handlers
    const streamContext: StreamContext = {
        eventHandler,
        modifiedFiles,
        accumulatedMessages: [],
        currentAssistantContent: [],
        selectedLibraries: [],
        tempProjectPath,
        projects,
        shouldCleanup,
        messageId,
        userMessageContent,
        response,
        ctx,
    };

    // Create event registry
    const registry = createAgentEventRegistry();

    try {
        for await (const part of fullStream) {
            await registry.handleEvent(part, streamContext);
        }
    } catch (e) {
        //TODO: Refactor
        if (e instanceof StreamErrorException ||
            e instanceof StreamAbortException ||
            e instanceof StreamFinishException) {
            return e.tempProjectPath;
        }
        throw e;
    }

    return tempProjectPath;
}

export async function generateAgent(params: GenerateAgentCodeRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.Agent);
    try {
        const ctx = createExecutionContextFromStateMachine();
        await generateAgentCore(params, eventHandler, ctx);
    } catch (error) {
        console.error("Error during agent generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}
