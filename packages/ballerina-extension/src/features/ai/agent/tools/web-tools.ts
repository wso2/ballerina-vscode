// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

import { tool, generateText, stepCountIs } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { v4 as uuidv4 } from 'uuid';
import { CopilotEventHandler } from '../../utils/events';
import { approvalManager } from '../../state/ApprovalManager';
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from '../../utils/ai-client';
import { sendWebToolToggleNotification } from '../../utils/ai-utils';

const WEB_TOOL_NOTIFICATION_TYPE = "webtool";
approvalManager.registerNotificationHandler(WEB_TOOL_NOTIFICATION_TYPE, (active) => {
    sendWebToolToggleNotification(active);
});

export const WEB_SEARCH_TOOL_NAME = "web_search";
export const WEB_FETCH_TOOL_NAME = "web_fetch";

const WebSearchInputSchema = z.object({
    query: z.string().describe('The search query.'),
});
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

const WebFetchInputSchema = z.object({
    url: z.string().url().describe('The URL to fetch.'),
    prompt: z.string().describe('What to extract or analyze from the fetched page.'),
});
export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;


interface ExecuteWebToolOpts {
    toolName: "web_search" | "web_fetch";
    displayContent: string;
    prompt: string;
    providerTools: Record<string, any>;
    toolInput: Record<string, any>;
    webSearchEnabled: boolean;
    eventHandler: CopilotEventHandler;
    toolCallId: string;
}

async function executeWebTool(opts: ExecuteWebToolOpts): Promise<string> {
    const { toolName, displayContent, prompt, providerTools, toolInput, webSearchEnabled, eventHandler, toolCallId } = opts;

    // Approval gate — skip if toggle is already on
    if (!webSearchEnabled) {
        const requestId = `web-${uuidv4()}`;
        const { approved } = await approvalManager.requestWebToolApproval(
            requestId,
            toolName,
            displayContent,
            eventHandler,
        );
        if (!approved) {
            return `User denied ${toolName === 'web_search' ? 'web search' : 'web fetch'}. Continue without web access.`;
        }
    }

    // Emit tool_call UI event before execution
    eventHandler({ type: "tool_call", toolName, toolInput, toolCallId });

    const label = toolName === 'web_search' ? 'WebSearchTool' : 'WebFetchTool';

    try {
        // Track active web tool count inside try so finally always pairs with it
        if (!webSearchEnabled) {
            approvalManager.trackNotificationStart(WEB_TOOL_NOTIFICATION_TYPE);
        }
        console.log(`[${label}] Running: ${displayContent}`);
        const result = await generateText({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            prompt,
            tools: providerTools,
            stopWhen: stepCountIs(1),
        });

        // Extract raw output from the tool result step; fall back to LLM summary text
        const stepWithResults = (result.steps ?? []).find(
            (step: any) => Array.isArray(step?.toolResults) && step.toolResults.length > 0
        );
        const toolOutput = stepWithResults?.toolResults?.[0]?.output;
        const rawContent = toolOutput !== undefined
            ? (typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput, null, 2))
            : result.text;
        console.log(`[${label}] Completed. Content length: ${rawContent?.length ?? 0}`);

        // Emit tool_result UI event after execution
        eventHandler({ type: "tool_result", toolName, toolOutput: { content: rawContent }, toolCallId });

        return rawContent || `${toolName === 'web_search' ? 'Web search' : 'Web fetch'} completed.`;
    } catch (error: any) {
        console.error(`[${label}] Failed:`, error?.message || error);
        throw error;
    } finally {
        if (!webSearchEnabled) {
            approvalManager.trackNotificationEnd(WEB_TOOL_NOTIFICATION_TYPE);
        }
    }
}

/**
 * Creates a web_search tool that asks for user approval before searching,
 * unless the user has pre-approved web access via the toggle (webSearchEnabled=true).
 */
export function createWebSearchTool(eventHandler: CopilotEventHandler, webSearchEnabled: boolean) {
    return tool({
        description: 'Search the web for up-to-date information. Use for external docs, recent data, or any URL the user provides.',
        inputSchema: WebSearchInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;
            return executeWebTool({
                toolName: WEB_SEARCH_TOOL_NAME,
                displayContent: `Search the web for: "${input.query}"`,
                prompt: `Search query: ${input.query}\nUse the web_search tool and return the raw results.`,
                providerTools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }) },
                toolInput: { query: input.query },
                webSearchEnabled,
                eventHandler,
                toolCallId,
            });
        },
    });
}

/**
 * Creates a web_fetch tool that asks for user approval before fetching a URL,
 * unless the user has pre-approved web access via the toggle (webSearchEnabled=true).
 */
export function createWebFetchTool(eventHandler: CopilotEventHandler, webSearchEnabled: boolean) {
    return tool({
        description: 'Fetch and analyze content from a specific URL.',
        inputSchema: WebFetchInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;
            return executeWebTool({
                toolName: WEB_FETCH_TOOL_NAME,
                displayContent: `Fetch content from: ${input.url}`,
                prompt: `URL: ${input.url}\nTask: ${input.prompt}\nUse the web_fetch tool to retrieve the raw page content.`,
                providerTools: { web_fetch: anthropic.tools.webFetch_20250910({ maxUses: 3 }) },
                toolInput: { url: input.url },
                webSearchEnabled,
                eventHandler,
                toolCallId,
            });
        },
    });
}
