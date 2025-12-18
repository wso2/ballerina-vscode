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

import { StreamContext } from "./stream-context";

/**
 * Base interface for all stream event handlers.
 * Each handler is responsible for processing a specific event type from the fullStream.
 */
export interface StreamEventHandler {
    /**
     * The event type this handler is responsible for (e.g., "text-delta", "tool-call")
     */
    readonly eventType: string;

    /**
     * Checks if this handler can handle the given event type
     */
    canHandle(eventType: string): boolean;

    /**
     * Handles the stream event
     * @param part - The stream event part
     * @param context - Shared context containing state and dependencies
     */
    handle(part: any, context: StreamContext): Promise<void>;
}

/**
 * Base interface for tool call dispatchers.
 * Dispatchers handle tool-specific logic for tool-call events.
 */
export interface ToolCallDispatcher {
    /**
     * The tools this dispatcher can handle
     */
    readonly supportedTools: string[];

    /**
     * Checks if this dispatcher can handle the given tool
     */
    canHandle(toolName: string): boolean;

    /**
     * Dispatches the tool call to the appropriate handler
     */
    dispatch(part: any, context: StreamContext): void;
}

/**
 * Base interface for tool result dispatchers.
 * Dispatchers handle tool-specific logic for tool-result events.
 */
export interface ToolResultDispatcher {
    /**
     * The tools this dispatcher can handle
     */
    readonly supportedTools: string[];

    /**
     * Checks if this dispatcher can handle the given tool
     */
    canHandle(toolName: string): boolean;

    /**
     * Dispatches the tool result to the appropriate handler
     */
    dispatch(part: any, result: any, context: StreamContext): void;
}

/**
 * Custom exception thrown by error handler to signal stream termination
 */
export class StreamErrorException extends Error {
    constructor(public readonly tempProjectPath: string) {
        super("Stream terminated due to error");
        this.name = "StreamErrorException";
    }
}

/**
 * Custom exception thrown by abort handler to signal stream termination
 */
export class StreamAbortException extends Error {
    constructor(public readonly tempProjectPath: string) {
        super("Stream terminated due to user abort");
        this.name = "StreamAbortException";
    }
}

/**
 * Custom exception thrown by finish handler to signal stream completion
 */
export class StreamFinishException extends Error {
    constructor(public readonly tempProjectPath: string) {
        super("Stream completed successfully");
        this.name = "StreamFinishException";
    }
}
