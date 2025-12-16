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

import { ToolResultDispatcher } from "../stream-event-handler";
import { StreamContext } from "../stream-context";
import {
    FILE_WRITE_TOOL_NAME,
    FILE_SINGLE_EDIT_TOOL_NAME,
    FILE_BATCH_EDIT_TOOL_NAME,
} from "../../../tools/text-editor";
import { HEALTHCARE_LIBRARY_PROVIDER_TOOL } from "../../../tools/healthcare-library";
import { TASK_WRITE_TOOL_NAME, TaskWriteResult } from "../../../tools/task-writer";
import { DIAGNOSTICS_TOOL_NAME } from "../../../tools/diagnostics";
import { Library } from "../../../utils/libs/library-types";

/**
 * Base class for all tool result dispatchers
 */
export abstract class BaseToolResultDispatcher implements ToolResultDispatcher {
    abstract readonly supportedTools: string[];

    canHandle(toolName: string): boolean {
        return this.supportedTools.includes(toolName);
    }

    abstract dispatch(part: any, result: any, context: StreamContext): void;
}

/**
 * Dispatcher for TaskWrite tool results
 */
export class TaskWriteResultDispatcher extends BaseToolResultDispatcher {
    readonly supportedTools = [TASK_WRITE_TOOL_NAME];

    dispatch(part: any, result: any, context: StreamContext): void {
        if (!result) {
            return;
        }

        const taskResult = result as TaskWriteResult;
        context.eventHandler({
            type: "tool_result",
            toolName: part.toolName,
            toolOutput: {
                success: taskResult.success,
                message: taskResult.message,
                allTasks: taskResult.tasks,
            },
        });
    }
}

/**
 * Dispatcher for library provider tool results
 */
export class LibraryResultDispatcher extends BaseToolResultDispatcher {
    readonly supportedTools = ["LibraryProviderTool", HEALTHCARE_LIBRARY_PROVIDER_TOOL];

    dispatch(part: any, result: any, context: StreamContext): void {
        const libraryNames = (part.output as Library[]).map((lib) => lib.name);
        
        // For HealthcareLibraryProviderTool, return all fetched libraries since it determines relevance internally
        // For LibraryProviderTool, filter based on selectedLibraries from the tool input
        const fetchedLibraries = part.toolName === HEALTHCARE_LIBRARY_PROVIDER_TOOL
            ? libraryNames
            : libraryNames.filter((name) => context.selectedLibraries.includes(name));
        
        context.eventHandler({ type: "tool_result", toolName: part.toolName, toolOutput: fetchedLibraries });
    }
}

/**
 * Dispatcher for file editor tool results
 */
export class FileResultDispatcher extends BaseToolResultDispatcher {
    readonly supportedTools = [
        FILE_WRITE_TOOL_NAME,
        FILE_SINGLE_EDIT_TOOL_NAME,
        FILE_BATCH_EDIT_TOOL_NAME,
    ];

    dispatch(part: any, result: any, context: StreamContext): void {
        // Extract action from result message for file_write
        let action = undefined;
        if (part.toolName === FILE_WRITE_TOOL_NAME && result) {
            const message = (result as any).message || '';
            if (message.includes('updated')) {
                action = 'updated';
            } else if (message.includes('created')) {
                action = 'created';
            }
        }

        context.eventHandler({
            type: "tool_result",
            toolName: part.toolName,
            toolOutput: { success: true, action }
        });
    }
}

/**
 * Dispatcher for diagnostics tool results
 */
export class DiagnosticsResultDispatcher extends BaseToolResultDispatcher {
    readonly supportedTools = [DIAGNOSTICS_TOOL_NAME];

    dispatch(part: any, result: any, context: StreamContext): void {
        context.eventHandler({
            type: "tool_result",
            toolName: part.toolName,
            toolOutput: result
        });
    }
}

/**
 * Default dispatcher for all other tool results
 */
export class DefaultResultDispatcher extends BaseToolResultDispatcher {
    readonly supportedTools: string[] = []; // Catches all

    canHandle(toolName: string): boolean {
        return true; // Always returns true as fallback
    }

    dispatch(part: any, result: any, context: StreamContext): void {
        context.eventHandler({ type: "tool_result", toolName: part.toolName });
    }
}
