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

// ─── Setup ────────────────────────────────────────────────────────────────────

const WEB_TOOL_NOTIFICATION_TYPE = "webtool";

export const WEB_SEARCH_TOOL_NAME = "web_search";
export const WEB_FETCH_TOOL_NAME = "web_fetch";

// Register the globe-toggle notification handler once at module load
approvalManager.registerNotificationHandler(WEB_TOOL_NOTIFICATION_TYPE, (active) => {
    sendWebToolToggleNotification(active);
});

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Requests user approval for a web tool call when the web toggle is off.
 * Returns true if the call should proceed.
 */
async function requestApprovalIfNeeded(
    toolName: typeof WEB_SEARCH_TOOL_NAME | typeof WEB_FETCH_TOOL_NAME,
    displayContent: string,
    webSearchEnabled: boolean,
    eventHandler: CopilotEventHandler,
): Promise<boolean> {
    if (webSearchEnabled) return true;
    const requestId = `web-${uuidv4()}`;
    const { approved } = await approvalManager.requestWebToolApproval(requestId, toolName, displayContent, eventHandler);
    return approved;
}

/**
 * Extracts the raw string output from the first tool result step in a generateText response.
 * Falls back to result.text if no tool result is found.
 */
function extractToolOutput(result: any): string {
    const stepWithResults = (result.steps ?? []).find(
        (step: any) => Array.isArray(step?.toolResults) && step.toolResults.length > 0
    );
    const toolOutput = stepWithResults?.toolResults?.[0]?.output;
    return toolOutput !== undefined
        ? (typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput, null, 2))
        : result.text;
}

// ─── web_search ───────────────────────────────────────────────────────────────

const WebSearchInputSchema = z.object({
    query: z.string().describe('The search query.'),
    context: z.string().describe('What you are trying to accomplish with this search. Helps focus the synthesized results.'),
});
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

const WEB_SEARCH_SYSTEM_PROMPT = `You are a research assistant. Search the web and return a comprehensive, well-structured answer.
Rules:
- Do NOT narrate your search process ("I'll search...", "Let me look...", "Based on the results..."). Output only the answer.
- Search multiple times if needed to gather complete information before answering.
- Include all relevant details, facts, and code examples. Cite sources where applicable.
- If you made a significant decision while researching (e.g. chose one version/approach over another), briefly state why — this helps the main agent reason correctly.`;

/**
 * Creates a web_search tool that acts as a research sub-agent.
 * Searches the web and returns a synthesized, detailed answer — not raw results.
 * Asks for user approval before searching unless the web toggle is already on.
 */
export function createWebSearchTool(eventHandler: CopilotEventHandler, webSearchEnabled: boolean) {
    return tool({
        description: 'Search the web for information on a query. Acts as a research sub-agent: performs the search and returns a synthesized, detailed answer with relevant facts and sources — not raw results. Provide the search query and the context of what you are trying to accomplish so the results can be focused.',
        inputSchema: WebSearchInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;
            return executeWebSearch(input, webSearchEnabled, eventHandler, toolCallId);
        },
    });
}

async function executeWebSearch(
    input: WebSearchInput,
    webSearchEnabled: boolean,
    eventHandler: CopilotEventHandler,
    toolCallId: string
): Promise<string> {
    const displayContent = `Search the web for: "${input.query}"`;

    const approved = await requestApprovalIfNeeded(WEB_SEARCH_TOOL_NAME, displayContent, webSearchEnabled, eventHandler);
    if (!approved) {
        return 'User denied web search. Continue without web access.';
    }

    eventHandler({ type: "tool_call", toolName: WEB_SEARCH_TOOL_NAME, toolInput: { query: input.query }, toolCallId });

    try {
        if (!webSearchEnabled) {
            approvalManager.trackNotificationStart(WEB_TOOL_NOTIFICATION_TYPE);
        }

        console.log(`[WebSearchTool] Searching: ${input.query}`);
        const result = await generateText({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            system: WEB_SEARCH_SYSTEM_PROMPT,
            prompt: `Context: ${input.context}\n\nSearch query: ${input.query}\n\nSearch the web and provide a detailed, accurate answer based on the results.`,
            tools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }) },
        });

        const content = result.text || 'Web search completed but returned no content.';
        console.log(`[WebSearchTool] Completed. Content length: ${content.length}`);

        eventHandler({ type: "tool_result", toolName: WEB_SEARCH_TOOL_NAME, toolOutput: { content }, toolCallId });
        return content;
    } catch (error: any) {
        console.error('[WebSearchTool] Failed:', error?.message || error);
        throw error;
    } finally {
        if (!webSearchEnabled) {
            approvalManager.trackNotificationEnd(WEB_TOOL_NOTIFICATION_TYPE);
        }
    }
}

// ─── web_fetch ────────────────────────────────────────────────────────────────

const WebFetchInputSchema = z.object({
    url: z.string().url().describe('The URL to fetch.'),
    prompt: z.string().describe('What to extract or analyze from the fetched page.'),
});
export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;

/**
 * Creates a web_fetch tool that retrieves raw content from a specific URL.
 * Asks for user approval before fetching unless the web toggle is already on.
 */
export function createWebFetchTool(eventHandler: CopilotEventHandler, webSearchEnabled: boolean) {
    return tool({
        description: 'Fetch and return the raw content of a specific URL. Use this when you have an exact URL (documentation page, API spec, JSON endpoint, etc.) and need its content. Returns the raw page content as-is.',
        inputSchema: WebFetchInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;
            return executeWebFetch(input, webSearchEnabled, eventHandler, toolCallId);
        },
    });
}

async function executeWebFetch(
    input: WebFetchInput,
    webSearchEnabled: boolean,
    eventHandler: CopilotEventHandler,
    toolCallId: string
): Promise<string> {
    const displayContent = `Fetch content from: ${input.url}`;

    const approved = await requestApprovalIfNeeded(WEB_FETCH_TOOL_NAME, displayContent, webSearchEnabled, eventHandler);
    if (!approved) {
        return 'User denied web fetch. Continue without web access.';
    }

    eventHandler({ type: "tool_call", toolName: WEB_FETCH_TOOL_NAME, toolInput: { url: input.url }, toolCallId });

    try {
        if (!webSearchEnabled) {
            approvalManager.trackNotificationStart(WEB_TOOL_NOTIFICATION_TYPE);
        }

        console.log(`[WebFetchTool] Fetching: ${input.url}`);
        const result = await generateText({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            prompt: `URL: ${input.url}\nTask: ${input.prompt}\nUse the web_fetch tool to retrieve the page content.`,
            tools: { web_fetch: anthropic.tools.webFetch_20250910({ maxUses: 3 }) },
            stopWhen: stepCountIs(1),
        });

        const content = extractToolOutput(result);
        console.log(`[WebFetchTool] Completed. Content length: ${content?.length ?? 0}`);

        eventHandler({ type: "tool_result", toolName: WEB_FETCH_TOOL_NAME, toolOutput: { content }, toolCallId });
        return content || 'Web fetch completed.';
    } catch (error: any) {
        console.error('[WebFetchTool] Failed:', error?.message || error);
        throw error;
    } finally {
        if (!webSearchEnabled) {
            approvalManager.trackNotificationEnd(WEB_TOOL_NOTIFICATION_TYPE);
        }
    }
}
