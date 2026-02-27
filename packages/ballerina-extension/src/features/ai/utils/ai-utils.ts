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
    IntermidaryState,
    onChatNotify,
    ProjectSource,
    SourceFile,
    ToolCall,
    ToolResult,
    Command,
    DocumentationGeneratorIntermediaryState,
    PayloadContext,
    HttpPayloadContext,
    MessageQueuePayloadContext,
    FileAttatchment,
    OperationType,
    Protocol
} from "@wso2/ballerina-core";
import { ModelMessage } from "ai";
import { MessageRole } from "./ai-types";
import { RPCLayer } from "../../../RPCLayer";
import { AiPanelWebview } from "../../../views/ai-panel/webview";
import { GenerationType } from "./libs/libraries";
// import { REQUIREMENTS_DOCUMENT_KEY } from "./code/np_prompts";

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

export function populateHistoryForAgent(chatHistory: any[]): ModelMessage[] {
    if (!chatHistory || chatHistory.length === 0) {
        return [];
    }
    const messages: ModelMessage[] = [];
    for (const entry of chatHistory) {
        if ('role' in entry) {
            messages.push({
                role: entry.role,
                content: entry.content,
            });
        }
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
        .filter(sourceFile => sourceFile.filePath.toLowerCase().endsWith("Requirements.md"))
        .slice(0, 1)
        .map(sourceFile => sourceFile.content);

    if (requirementFiles.length === 0) {
        return "";
    }
    return requirementFiles[0];
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

export function sendReviewActionsNotification(): void {
    const msg: ChatNotify = {
        type: "review_actions",
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

export function sendIntermidateStateNotification(intermediaryState: DocumentationGeneratorIntermediaryState): void {
    const msg: IntermidaryState = {
        type: "intermediary_state",
        state: intermediaryState,
    };
    sendAIPanelNotification(msg);
}

export function sendToolCallNotification(toolName: string, toolInput?: any, toolCallId?: string): void {
    const msg: ToolCall = {
        type: "tool_call",
        toolName: toolName,
        toolInput: toolInput,
        toolCallId: toolCallId,
    };
    sendAIPanelNotification(msg);
}

export function sendToolResultNotification(toolName: string, toolOutput?: any, toolCallId?: string): void {
    const msg: ToolResult = {
        type: "tool_result",
        toolName: toolName,
        toolOutput: toolOutput,
        toolCallId: toolCallId,
    };
    sendAIPanelNotification(msg);
}

export function sendTaskApprovalRequestNotification(approvalType: "plan" | "completion", tasks: any[], taskDescription?: string, message?: string, requestId?: string): void {
    const msg: ChatNotify = {
        type: "task_approval_request",
        requestId: requestId || `approval-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        approvalType: approvalType,
        tasks: tasks,
        taskDescription: taskDescription,
        message: message,
    };
    sendAIPanelNotification(msg);
}

export function sendAbortNotification(command: Command): void {
    const msg: ChatNotify = {
        type: "abort",
        command
    };
    sendAIPanelNotification(msg);
}

export function sendSaveChatNotification(command: Command, messageId: string): void {
    const msg: ChatNotify = {
        type: "save_chat",
        command,
        messageId
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

export function sendConnectorGenerationNotification(event: ChatNotify & { type: "connector_generation_notification" }): void {
    sendAIPanelNotification(event);
}

export function sendConfigurationCollectionNotification(event: ChatNotify & { type: "configuration_collection_event" }): void {
    sendAIPanelNotification(event);
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
            return "Usage limit exceeded.";
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
            return "Usage limit exceeded.";
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
    return context.protocol === Protocol.HTTP;
}

export function isMessageQueuePayloadContext(context: PayloadContext): context is MessageQueuePayloadContext {
    return context.protocol === Protocol.MESSAGE_BROKER;
}
