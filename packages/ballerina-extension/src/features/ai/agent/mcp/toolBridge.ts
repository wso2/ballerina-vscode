/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { jsonSchema, tool, Tool } from "ai";

import { CopilotEventHandler } from "../../utils/events";
import { getMcpClientManager, McpClientManager } from "./McpClientManager";
import { namespaceToolName } from "./naming";

/**
 * Best-effort flattening of MCP's `CallToolResult` content blocks into a plain
 * string that the LLM can consume. Non-text blocks are stringified so the model
 * can still see they exist; the result preserves block order.
 */
function flattenToolResult(result: unknown): string {
    if (result === null || result === undefined) {
        return "";
    }
    if (typeof result === "string") {
        return result;
    }
    if (typeof result !== "object") {
        return String(result);
    }
    const r = result as { isError?: boolean; content?: Array<{ type?: string; text?: string;[k: string]: unknown }> };
    if (!Array.isArray(r.content)) {
        return JSON.stringify(result);
    }
    const parts: string[] = [];
    for (const block of r.content) {
        if (!block || typeof block !== "object") {
            continue;
        }
        if (block.type === "text" && typeof block.text === "string") {
            parts.push(block.text);
        } else {
            parts.push(JSON.stringify(block));
        }
    }
    const joined = parts.join("\n");
    return r.isError ? `[mcp tool error]\n${joined}` : joined;
}

export interface BridgeOptions {
    manager: McpClientManager;
    eventHandler: CopilotEventHandler;
}

/**
 * Converts every connected MCP server's tools into a Vercel `ai`-compatible
 * `Record<name, Tool>` that can be merged into the existing tool registry.
 *
 * Naming: each tool is namespaced `mcp__<server>__<tool>` (see {@link namespaceToolName}).
 * The pre-namespaced collision behaviour is "last write wins" — duplicate
 * namespaced names across servers (which can happen after sanitisation
 * truncates long names) are logged and skipped.
 */
export function bridgeMcpTools(opts: BridgeOptions): Record<string, Tool> {
    const { manager, eventHandler } = opts;
    const out: Record<string, Tool> = {};
    const connected = manager.getConnectedTools();
    for (const server of connected) {
        for (const mcpTool of server.tools) {
            const namespaced = namespaceToolName(server.name, mcpTool.name);
            if (out[namespaced]) {
                console.warn(`[mcp] Duplicate namespaced tool name '${namespaced}' — skipping ${server.name}/${mcpTool.name}`);
                continue;
            }
            const description = mcpTool.description ?? `MCP tool '${mcpTool.name}' from server '${server.name}'.`;
            out[namespaced] = tool({
                description,
                inputSchema: jsonSchema(mcpTool.inputSchema as Parameters<typeof jsonSchema>[0]),
                execute: async (input: unknown, context?: { toolCallId?: string }) => {
                    const toolCallId = context?.toolCallId ?? `mcp-${Date.now()}`;
                    eventHandler({
                        type: "tool_call",
                        toolName: namespaced,
                        toolInput: input,
                        toolCallId,
                    });
                    try {
                        const result = await manager.callTool(server.scope, server.name, mcpTool.name, input);
                        const text = flattenToolResult(result);
                        const isError = !!(result && typeof result === "object" && (result as { isError?: boolean }).isError);
                        eventHandler({
                            type: "tool_result",
                            toolName: namespaced,
                            toolOutput: { text },
                            toolCallId,
                            failed: isError,
                        });
                        return text;
                    } catch (err: any) {
                        const message = err?.message ?? String(err);
                        eventHandler({
                            type: "tool_result",
                            toolName: namespaced,
                            toolOutput: { error: message },
                            toolCallId,
                            failed: true,
                        });
                        return `MCP tool '${server.scope}:${server.name}/${mcpTool.name}' failed: ${message}`;
                    }
                },
            });
        }
    }
    return out;
}

/** Bridged tools from the active manager's connected servers; `{}` when MCP is off. */
export function getMcpTools(eventHandler: CopilotEventHandler): Record<string, Tool> {
    const manager = getMcpClientManager();
    return manager ? bridgeMcpTools({ manager, eventHandler }) : {};
}
