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

export const MCP_TOOL_PREFIX = "mcp__";
const MAX_TOOL_NAME_LENGTH = 64;
const INVALID_CHAR_REGEX = /[^a-zA-Z0-9_.-]/g;

function sanitize(part: string): string {
    return part.replace(INVALID_CHAR_REGEX, "_");
}

/**
 * Build the namespaced tool name `mcp__<server>__<tool>` and truncate to fit
 * Anthropic's 64-char limit on tool names. Sanitization replaces any character
 * outside `[a-zA-Z0-9_.-]` with `_`.
 */
export function namespaceToolName(serverName: string, toolName: string): string {
    const safeServer = sanitize(serverName);
    const safeTool = sanitize(toolName);
    const full = `${MCP_TOOL_PREFIX}${safeServer}__${safeTool}`;
    return full.length > MAX_TOOL_NAME_LENGTH ? full.slice(0, MAX_TOOL_NAME_LENGTH) : full;
}

export interface ParsedMcpToolName {
    serverName: string;
    toolName: string;
}

/**
 * Reverse {@link namespaceToolName} on a best-effort basis. The split uses the
 * first `__` after the prefix as the server/tool boundary; if the tool name
 * itself contained `__` the boundary may be off. Returns `null` for names that
 * don't start with the MCP prefix.
 */
export function parseMcpToolName(namespacedName: string): ParsedMcpToolName | null {
    if (!namespacedName.startsWith(MCP_TOOL_PREFIX)) {
        return null;
    }
    const rest = namespacedName.slice(MCP_TOOL_PREFIX.length);
    const sepIdx = rest.indexOf("__");
    if (sepIdx <= 0) {
        return null;
    }
    return {
        serverName: rest.slice(0, sepIdx),
        toolName: rest.slice(sepIdx + 2),
    };
}
