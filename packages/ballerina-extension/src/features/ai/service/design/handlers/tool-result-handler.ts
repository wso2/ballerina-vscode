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

import { StreamEventHandler, ToolResultDispatcher } from "./stream-event-handler";
import { StreamContext } from "./stream-context";
import { saveToolResult } from "./helper-functions";
import {
    TaskWriteResultDispatcher,
    LibraryResultDispatcher,
    FileResultDispatcher,
    DiagnosticsResultDispatcher,
    DefaultResultDispatcher
} from "./dispatchers/tool-result-dispatcher";

/**
 * Handles tool-result events from the stream.
 * Uses a chain of dispatchers to handle different tool result types.
 */
export class ToolResultHandler implements StreamEventHandler {
    readonly eventType = "tool-result";
    private dispatchers: ToolResultDispatcher[];

    constructor() {
        // Order matters - most specific first, default last
        this.dispatchers = [
            new TaskWriteResultDispatcher(),
            new LibraryResultDispatcher(),
            new FileResultDispatcher(),
            new DiagnosticsResultDispatcher(),
            new DefaultResultDispatcher(), // Catches everything else
        ];
    }

    canHandle(eventType: string): boolean {
        return eventType === this.eventType;
    }

    async handle(part: any, context: StreamContext): Promise<void> {
        const toolName = part.toolName;
        const result = part.output;

        // Save to message accumulator
        saveToolResult(part, context.accumulatedMessages, context.currentAssistantContent);

        // Find the appropriate dispatcher
        const dispatcher = this.dispatchers.find(d => d.canHandle(toolName));
        if (dispatcher) {
            dispatcher.dispatch(part, result, context);
        }
    }
}
