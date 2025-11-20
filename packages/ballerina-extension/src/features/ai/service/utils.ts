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

import {
    ChatEntry,
    ChatError,
    ChatNotify,
    ChatStart,
    DiagnosticEntry,
    GENERATE_CODE_AGAINST_THE_REQUIREMENT,
    GENERATE_TEST_AGAINST_THE_REQUIREMENT,
    GenerateCodeRequest,
    IntermidaryState,
    onChatNotify,
    ProjectSource,
    SourceFile,
    TestGeneratorIntermediaryState,
    ToolCall,
    ToolResult,
    Command,
    DocumentationGeneratorIntermediaryState,
    PayloadContext,
    HttpPayloadContext,
    MessageQueuePayloadContext,
    FileAttatchment,
    OperationType
} from "@wso2/ballerina-core";
import { ModelMessage } from "ai";
import { MessageRole } from "./types";
import { RPCLayer } from "../../../../src/RPCLayer";
import { AiPanelWebview } from "../../../views/ai-panel/webview";
import { GenerationType } from "./libs/libs";
import { REQUIREMENTS_DOCUMENT_KEY } from "./code/np_prompts";

export function populateHistory(chatHistory: ChatEntry[]): ModelMessage[] {
    if (!chatHistory || chatHistory.length === 0) {
        return [];
    }

    const messages: ModelMessage[] = [];
    for (const history of chatHistory) {
        // Map actor to role, defaulting to "user" if not "assistant"
        const role: MessageRole = history.actor === "assistant" ? "assistant" : "user";

        messages.push({
            role: role,
            content: history.message,
        });
    }
    return messages;
}

/**
 * Builds file paths for project files with workspace-aware prefixing.
 * Returns structured data including file path, content, package name, and active status.
 *
 * @param projects - Array of project sources to process
 * @param fileFilter - Optional filter function to include/exclude files
 * @returns Array of file objects with path, content, and metadata
 */
export function buildFilePaths(
    projects: ProjectSource[],
    fileFilter?: (filePath: string) => boolean
): Array<{ filePath: string; content: string; packageName?: string; isActive: boolean }> {
    const usePackagePrefix = projects.length > 1;
    const result: Array<{ filePath: string; content: string; packageName?: string; isActive: boolean }> = [];

    for (const project of projects) {
        const packagePrefix = usePackagePrefix && project.packagePath ? `${project.packagePath}/` : "";
        const packageName = project.projectName;
        const isActive = project.isActive;

        // Process root files
        for (const file of project.sourceFiles) {
            const filePath = packagePrefix + file.filePath;
            if (!fileFilter || fileFilter(filePath)) {
                result.push({ filePath, content: file.content, packageName, isActive });
            }
        }

        // Process module files
        project.projectModules?.forEach((module) => {
            let basePath = packagePrefix;
            basePath += module.isGenerated ? "generated/" : "modules/";
            basePath += module.moduleName + "/";

            for (const file of module.sourceFiles) {
                const filePath = basePath + file.filePath;
                if (!fileFilter || fileFilter(filePath)) {
                    result.push({ filePath, content: file.content, packageName, isActive });
                }
            }
        });
    }

    return result;
}

export function flattenProjectToFiles(projects: ProjectSource[]): SourceFile[] {
    return buildFilePaths(projects).map(({ filePath, content }) => ({
        filePath,
        content
    }));
}

/**
 * Creates workspace context message for AI prompts.
 * Handles single vs multi-package scenarios and provides instructions for working with workspaces.
 *
 * @param projects - Array of project sources
 * @param packageName - Name of the current active package
 * @returns Formatted context string for AI prompts
 */
export function buildPackageContext(projects: ProjectSource[], packageName: string): string {
    const hasMultiplePackages = projects.length > 1;

    if (!hasMultiplePackages) {
        return `Current Package name: ${packageName}`;
    }

    return `Current Active Package: ${packageName}

Note: This is a Ballerina workspace with multiple packages. File paths are prefixed with their package paths (e.g., "mainpackage/main.bal").
Files from external packages (not the active package) are marked with the externalPackageName attribute (e.g., <file filename="otherpackage/main.bal" externalPackageName="otherpackage">).
You can import these packages by just using the package name (e.g., import otherpackage;).
When creating or modifying files, you should always prefer making edits for the current active package. Make sure to include the package path as prefix for the file edits.`;
}

/**
 * Formats file upload contents for AI prompts.
 * Returns empty string if no files are uploaded.
 *
 * @param fileUploadContents - Array of file attachments
 * @returns Formatted string with file names and contents
 */
export function formatFileUploadContents(fileUploadContents: FileAttatchment[]): string {
    if (fileUploadContents.length === 0) {
        return "";
    }

    const formattedFiles = fileUploadContents
        .map(file => `File Name: ${file.fileName}
Content: ${file.content}`)
        .join("\n");

    return `4. File Upload Contents. : Contents of the file which the user uploaded as additional information for the query.

${formattedFiles}`;
}

export function extractResourceDocumentContent(sourceFiles: readonly SourceFile[]): string {
    const requirementFiles = sourceFiles
        .filter(sourceFile => sourceFile.filePath.toLowerCase().endsWith(REQUIREMENTS_DOCUMENT_KEY))
        .slice(0, 1)
        .map(sourceFile => sourceFile.content);

    if (requirementFiles.length === 0) {
        return "";
    }
    return requirementFiles[0];
}

//TODO: This should be a query rewriter ideally.
export function getRewrittenPrompt(params: GenerateCodeRequest, projects: ProjectSource[]) {
    const prompt = params.usecase;
    if (prompt.trim() === GENERATE_CODE_AGAINST_THE_REQUIREMENT) {
        const sourceFiles = flattenProjectToFiles(projects);
        const resourceContent = extractResourceDocumentContent(sourceFiles);
        return `${GENERATE_CODE_AGAINST_THE_REQUIREMENT}:
${resourceContent}`;
    }
    if (prompt.trim() === GENERATE_TEST_AGAINST_THE_REQUIREMENT) {
        const sourceFiles = flattenProjectToFiles(projects);
        const resourceContent = extractResourceDocumentContent(sourceFiles);
        return `${GENERATE_TEST_AGAINST_THE_REQUIREMENT}:
${resourceContent}`;
    }

    if (!prompt.toLowerCase().includes("readme")) {
        return prompt;
    }

    const sourceFiles = flattenProjectToFiles(projects);
    const readmeFiles = sourceFiles
        .filter((sourceFile) => sourceFile.filePath.toLowerCase().endsWith("readme.md"))
        .map((sourceFile) => sourceFile.content);

    if (readmeFiles.length === 0) {
        return prompt;
    }

    const readmeContent = readmeFiles[0];

    return `${prompt}
Readme Contents:
${readmeContent}`;
}

export function sendMessagesNotification(messages: any[]): void {
    const msg: ChatNotify = {
        type: "messages",
        messages: messages,
    };
    sendAIPanelNotification(msg);
}

export function sendDiagnosticMessageNotification(diags: DiagnosticEntry[]): void {
    const msg: ChatNotify = {
        type: "diagnostics",
        diagnostics: diags,
    };
    sendAIPanelNotification(msg);
}

export function sendContentReplaceNotification(content: string): void {
    const msg: ChatNotify = {
        type: "content_replace",
        content: content,
    };
    sendAIPanelNotification(msg);
}

export function sendContentAppendNotification(chunk: string): void {
    const msg: ChatNotify = {
        type: "content_block",
        content: chunk,
    };
    sendAIPanelNotification(msg);
}

export function sendMessageStopNotification(command: Command): void {
    const msg: ChatNotify = {
        type: "stop",
        command
    };
    sendAIPanelNotification(msg);
}

export function sendErrorNotification(errorMessage: string): void {
    const msg: ChatError = {
        type: "error",
        content: errorMessage,
    };
    sendAIPanelNotification(msg);
}

export function sendMessageStartNotification(): void {
    const msg: ChatStart = {
        type: "start",
    };
    sendAIPanelNotification(msg);
}

export function sendIntermidateStateNotification(intermediaryState: TestGeneratorIntermediaryState | DocumentationGeneratorIntermediaryState): void {
    const msg: IntermidaryState = {
        type: "intermediary_state",
        state: intermediaryState,
    };
    sendAIPanelNotification(msg);
}

export function sendToolCallNotification(toolName: string): void {
    const msg: ToolCall = {
        type: "tool_call",
        toolName: toolName,
    };
    sendAIPanelNotification(msg);
}

export function sendToolResultNotification(toolName: string, toolOutput: any): void {
    const msg: ToolResult = {
        type: "tool_result",
        toolName: toolName,
        toolOutput: toolOutput,
    };
    sendAIPanelNotification(msg);
}

export function sendGeneratedSourcesNotification(fileArray: SourceFile[]): void {
    const msg: ChatNotify = {
        type: "generated_sources",
        fileArray: fileArray,
    };
    sendAIPanelNotification(msg);
}

function sendAIPanelNotification(msg: ChatNotify): void {
    RPCLayer._messenger.sendNotification(onChatNotify, { type: "webview", webviewType: AiPanelWebview.viewType }, msg);
}

export function getGenerationMode(generationType: GenerationType) {
    return generationType === GenerationType.CODE_GENERATION ? "CORE" : "HEALTHCARE";
}

/**
 * Normalize any thrown value into a string message.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        // Standard Error objects have a .message property
        if (error.name === "UsageLimitError") {
            return "Usage limit exceeded. Please try again later.";
        }
        if (error.name === "AI_RetryError") {
            return "An error occured connecting with the AI service. Please try again later.";
        }
        if (error.name === "AbortError") {
            return "Generation stopped by the user.";
        }

        return error.message;
    }
    // If it's an object with a .message field, use that
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as Record<string, unknown>).message === "string"
    ) {
        // Check if it has a statusCode property indicating 429
        if ("statusCode" in error && (error as any).statusCode === 429) {
            return "Usage limit exceeded. Please try again later.";
        }
        return (error as { message: string }).message;
    }
    // Fallback: try to JSON-stringify, otherwise call toString()
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

export function isHttpPayloadContext(context: PayloadContext): context is HttpPayloadContext {
    return context.protocol === "HTTP";
}

export function isMessageQueuePayloadContext(context: PayloadContext): context is MessageQueuePayloadContext {
    return context.protocol === "MESSAGE_BROKER";
}

/**
 * Parses XML-formatted assistant response to extract source files.
 * Extracts code blocks with format: <code filename="...">```ballerina...```</code>
 *
 * @param xmlString - The assistant response containing XML code blocks
 * @returns Array of SourceFile objects parsed from the XML
 */
export function parseSourceFilesFromXML(xmlString: string): SourceFile[] {
    const sourceFiles: SourceFile[] = [];
    const regex = /<code filename="([^"]+)">\s*```ballerina([\s\S]*?)```\s*<\/code>/g;
    let match;

    while ((match = regex.exec(xmlString)) !== null) {
        const filePath = match[1];
        const fileContent = match[2].trim();
        sourceFiles.push({
            filePath,
            content: fileContent
        });
    }

    return sourceFiles;
}
