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
import { TestUseCase, TestEventResult, RepairUsageRecord, UsageMetrics, TokenUsageRecord } from '../types';
import { validateCacheUsage } from './cache-analysis';

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
    let initialUsage: TokenUsageRecord | null = null;
    const repairUsages: RepairUsageRecord[] = [];
    let repairCounter = 0;
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
            case "tool_call":
                console.log(`[${useCase?.id || 'unknown'}] Tool called: ${event.toolName}`);
                break;
            case "tool_result":
                if (event.toolName == "LibraryProviderTool") {
                    console.log(
                        `[${useCase?.id || "unknown"}] Tool result from ${event.toolName}: ${
                            event.toolOutput?.join(", ") || "no libraries"
                        }`
                    );
                }
                else{
                    console.log(`[${useCase?.id || "unknown"}] Tool result from ${event.toolName}:`);
                    console.log(JSON.stringify(event.toolOutput, null, 2));
                }
                break;
            case "evals_tool_result":
                console.log(`[${useCase?.id || 'unknown'}] [EVALS] Tool result from ${event.toolName}:`);
                console.log(JSON.stringify(event.output, null, 2));
                break;
            case "usage_metrics":
                console.log(`[${useCase?.id || 'unknown'}] Usage metrics received:`, {
                    usage: event.usage,
                    isRepair: event.isRepair
                });
                if (event.isRepair) {
                    repairCounter++;
                    const repairRecord: RepairUsageRecord = {
                        ...event.usage,
                        iteration: repairCounter
                    };
                    repairUsages.push(repairRecord);
                } else {
                    initialUsage = event.usage;
                }
                break;
            default:
                console.warn(`[${useCase?.id || 'unknown'}] Unhandled event type: ${(event as unknown as { type: string }).type}`);
                break;
        }
    };

    const getResult = (): TestEventResult => {
        let usageMetrics: UsageMetrics | undefined;

        if (initialUsage || repairUsages.length > 0) {
            // Calculate cache validation using raw token data
            const validationResults = validateCacheUsage(initialUsage, repairUsages);

            usageMetrics = {
                usage: {
                    initial: initialUsage,
                    repairs: repairUsages,
                    overallCachePerformanceValidation: validationResults
                }
            };
        }

        return {
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
            usageMetrics,
        };
    };

    return { handler, getResult };
}
