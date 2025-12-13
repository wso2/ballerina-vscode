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

import { ToolCallDispatcher } from "../stream-event-handler";
import { StreamContext } from "../stream-context";
import {
    FILE_WRITE_TOOL_NAME,
    FILE_SINGLE_EDIT_TOOL_NAME,
    FILE_BATCH_EDIT_TOOL_NAME,
} from "../../../libs/text_editor_tool";
import { HEALTHCARE_LIBRARY_PROVIDER_TOOL } from "../../../libs/healthcareLibraryProviderTool";

/**
 * Base class for all tool call dispatchers
 */
export abstract class BaseToolCallDispatcher implements ToolCallDispatcher {
    abstract readonly supportedTools: string[];

    canHandle(toolName: string): boolean {
        return this.supportedTools.includes(toolName);
    }

    abstract dispatch(part: any, context: StreamContext): void;
}

/**
 * Dispatcher for library provider tools (LibraryProviderTool, HealthcareLibraryProviderTool)
 */
export class LibraryToolCallDispatcher extends BaseToolCallDispatcher {
    readonly supportedTools = ["LibraryProviderTool", HEALTHCARE_LIBRARY_PROVIDER_TOOL];

    dispatch(part: any, context: StreamContext): void {
        context.selectedLibraries = (part.input as any)?.libraryNames || [];
        context.eventHandler({ type: "tool_call", toolName: part.toolName });
    }
}

/**
 * Dispatcher for file editor tools (file_write, file_edit, file_batch_edit)
 */
export class FileToolCallDispatcher extends BaseToolCallDispatcher {
    readonly supportedTools = [
        FILE_WRITE_TOOL_NAME,
        FILE_SINGLE_EDIT_TOOL_NAME,
        FILE_BATCH_EDIT_TOOL_NAME,
    ];

    dispatch(part: any, context: StreamContext): void {
        const input = part.input as any;
        const fileName = input?.file_path || 'file';
        context.eventHandler({
            type: "tool_call",
            toolName: part.toolName,
            toolInput: { fileName }
        });
    }
}

/**
 * Default dispatcher for all other tools
 */
export class DefaultToolCallDispatcher extends BaseToolCallDispatcher {
    readonly supportedTools: string[] = []; // Catches all

    canHandle(toolName: string): boolean {
        return true; // Always returns true as fallback
    }

    dispatch(part: any, context: StreamContext): void {
        context.eventHandler({ type: "tool_call", toolName: part.toolName });
    }
}
