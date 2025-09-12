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

import { ChatNotify } from "@wso2/ballerina-core";
export type CopilotEventHandler = (event: ChatNotify) => void;
import { TestUseCase, TestEventResult } from '../types';

/**
 * Creates a test event handler that captures events for testing
 */
export function createTestEventHandler(useCase?: TestUseCase): { 
    handler: CopilotEventHandler; 
    getResult: () => TestEventResult; 
} {
    const events: ChatNotify[] = [];
    let fullContent = "";
    let hasStarted = false;
    let hasCompleted = false;
    let errorOccurred: string | null = null;
    const diagnostics: unknown[] = [];
    const messages: unknown[] = [];
    let startTime: number | undefined;
    let endTime: number | undefined;

    const handler: CopilotEventHandler = (event: ChatNotify): void => {
        events.push(event);

        switch (event.type) {
            case "start":
                hasStarted = true;
                startTime = Date.now();
                console.log(`[${useCase?.id || 'unknown'}] Code generation started`);
                break;
            case "content_block":
                fullContent += event.content;
                break;
            case "content_replace":
                fullContent = event.content;
                console.log(`[${useCase?.id || 'unknown'}] Content replaced`);
                break;
            case "error":
                errorOccurred = event.content;
                console.error(`[${useCase?.id || 'unknown'}] Error occurred during code generation:`, event.content);
                break;
            case "stop":
                hasCompleted = true;
                endTime = Date.now();
                console.log(`[${useCase?.id || 'unknown'}] Code generation completed`);
                if (startTime) {
                    console.log(`[${useCase?.id || 'unknown'}] Duration:`, endTime - startTime, "ms");
                }
                break;
            case "intermediary_state":
                console.log(`[${useCase?.id || 'unknown'}] Intermediary state:`, event.state);
                break;
            case "messages":
                console.log(`[${useCase?.id || 'unknown'}] Messages received`);
                messages.push(...(event.messages || []));
                break;
            case "diagnostics":
                console.log(`[${useCase?.id || 'unknown'}] Diagnostics received`);
                diagnostics.push(...(event.diagnostics || []));
                break;
            default:
                console.warn(`[${useCase?.id || 'unknown'}] Unhandled event type: ${(event as unknown as { type: string }).type}`);
                break;
        }
    };

    const getResult = (): TestEventResult => ({
        events,
        fullContent,
        hasStarted,
        hasCompleted,
        errorOccurred,
        diagnostics,
        messages,
        useCase,
        startTime,
        endTime,
        duration: startTime && endTime ? endTime - startTime : undefined,
    });

    return { handler, getResult };
}