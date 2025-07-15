import { generateText, CoreMessage } from "ai";
import { anthropic } from "../connection";
import { 
    getServiceTestGenerationSystemPrompt, 
    getServiceTestDiagnosticsSystemPrompt, 
    getFunctionTestGenerationSystemPrompt,
    createServiceTestGenMessages,
    createFunctionTestGenMessages
} from "./prompts";
import { 
    extractCodeFromResponse, 
    extractConfigFromResponse
} from "./utils";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { getErrorMessage } from "../utils";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";

// Core test generation function that emits events
export async function generateTestFromLLMCore(request: TestGenerationRequest1, eventHandler: CopilotEventHandler): Promise<TestGenerationResponse> {
    try {
        const streamContent = await getStreamedTestResponse(request);
        const testCode = extractCodeFromResponse(streamContent);
        const configContent = extractConfigFromResponse(streamContent);
        
        return {
            testSource: testCode,
            testConfig: configContent
        };
    } catch (error) {
        console.error("Error during test generation:", error);
        eventHandler({ type: 'error', content: getErrorMessage(error) });
        throw error;
    }
}

// Main public function that uses the default event handler
export async function generateTestFromLLM(request: TestGenerationRequest1): Promise<TestGenerationResponse> {
    const eventHandler = createWebviewEventHandler();
    return await generateTestFromLLMCore(request, eventHandler);
}

export type ProjectModule = {
    moduleName: string;
    sourceFiles: SourceFile[];
};

export type SourceFile = {
    fileName: string;
    content: string;
};

export type ProjectSource = {
    projectModules?: ProjectModule[];
    sourceFiles: SourceFile[];
    configToml?: string;
};

export type Diagnostic = {
    message: string;
};

export type TestGenerationRequest1 = {
    targetType: "service" | "function";
    targetIdentifier: string;
    projectSource: ProjectSource;
    openApiSpec?: string;
    testPlan?: string;
    diagnostics?: Diagnostic[];
    existingTests?: string;
};

type TestGenerationResponse = {
    testSource: string;
    testConfig?: string;
};

async function getStreamedTestResponse(request: TestGenerationRequest1): Promise<string> {
    const systemPrompt = createTestGenerationSystemPrompt(request);
    let messages: CoreMessage[] = [];
    
    if (request.targetType === "service") {
        messages = createServiceTestGenMessages(request);
    } else if (request.targetType === "function") {
        messages = createFunctionTestGenMessages(request);
    } else {
        throw new Error(`Unsupported target type specified: ${request.targetType}. Please use 'service' or 'function'.`);
    }

    const { text } = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        maxTokens: 16384,
        temperature: 0,
        system: systemPrompt,
        messages: messages,
        abortSignal: AIPanelAbortController.getInstance().signal
    });

    return text;
}

function createTestGenerationSystemPrompt(request: TestGenerationRequest1): string {
    if (request.targetType === "service") {
        if (!request.diagnostics || !request.existingTests) {
            return getServiceTestGenerationSystemPrompt();
        } else {
            return getServiceTestDiagnosticsSystemPrompt();
        }
    } else if (request.targetType === "function") {
        return getFunctionTestGenerationSystemPrompt();
    }
    throw new Error(`Unsupported target type specified: ${request.targetType}. Please use 'service' or 'function'.`);
}
