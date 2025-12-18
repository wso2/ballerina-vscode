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

import { StreamEventHandler, ToolCallDispatcher } from "../stream-event-handler";
import { StreamContext } from "../stream-context";
import { accumulateToolCall } from "./helper-functions";
import {
    LibraryToolCallDispatcher,
    FileToolCallDispatcher,
    DefaultToolCallDispatcher
} from "../dispatchers/tool-call-dispatcher";

/**
 * Handles tool-call events from the stream.
 * Uses a chain of dispatchers to handle different tool types.
 */
export class ToolCallHandler implements StreamEventHandler {
    readonly eventType = "tool-call";
    private dispatchers: ToolCallDispatcher[];

    constructor() {
        // Order matters - most specific first, default last
        this.dispatchers = [
            new LibraryToolCallDispatcher(),
            new FileToolCallDispatcher(),
            new DefaultToolCallDispatcher(), // Catches everything else
        ];
    }

    canHandle(eventType: string): boolean {
        return eventType === this.eventType;
    }

    async handle(part: any, context: StreamContext): Promise<void> {
        const toolName = part.toolName;

        // Accumulate for message history
        accumulateToolCall(context.currentAssistantContent, part);

        // Find the appropriate dispatcher
        const dispatcher = this.dispatchers.find(d => d.canHandle(toolName));
        if (dispatcher) {
            dispatcher.dispatch(part, context);
        }
    }
}
