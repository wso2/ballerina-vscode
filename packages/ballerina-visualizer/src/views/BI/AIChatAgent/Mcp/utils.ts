/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { FlowNode } from "@wso2/ballerina-core";
import type { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";
import { resolveVariableValue, resolveAuthConfig, parseToolsString } from "../utils";
import { cleanServerUrl } from "../formUtils";

export interface Tool {
    name: string;
    description?: string;
}

export interface ResolutionResult {
    canResolve: boolean;
    resolvedUrl: string;
    resolvedAuth: string;
    error: string;
}

export async function attemptValueResolution(
    serverUrl: string,
    auth: string,
    rpcClient: BallerinaRpcClient,
    projectPathUri: string,
    filePath: string
): Promise<ResolutionResult> {
    let error = "";

    // Try to resolve server URL
    let resolvedUrl = null;
    try {
        resolvedUrl = await resolveVariableValue(
            serverUrl,
            rpcClient,
            projectPathUri,
            filePath
        );

        // Check if resolution actually worked (not just returned the variable name)
        const cleanUrl = cleanServerUrl(resolvedUrl);
        if (cleanUrl === null || resolvedUrl === serverUrl) {
            // Resolution failed or returned same value (likely a variable)
            error = "Server URL contains unresolvable variables";
        }
    } catch (e) {
        error = `Failed to resolve server URL: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Default to "" so no-auth servers count as resolved; null signals a real failure.
    let resolvedAuthValue: string | null = "";
    if (auth && auth.trim()) {
        try {
            resolvedAuthValue = await resolveAuthConfig(
                auth,
                rpcClient,
                projectPathUri,
                filePath
            );
            if (resolvedAuthValue === null) {
                error = "Authentication configuration contains unresolvable variables";
            }
        } catch (e) {
            if (!error) {
                error = `Failed to resolve auth: ${e instanceof Error ? e.message : String(e)}`;
            }
        }
    }

    return {
        canResolve: !error && resolvedAuthValue !== null && resolvedUrl !== null && resolvedUrl !== serverUrl,
        resolvedUrl: resolvedUrl,
        resolvedAuth: resolvedAuthValue,
        error: error
    };
}

export function createMockTools(toolNames: string[]): Tool[] {
    return toolNames.map(name => ({
        name: name,
        description: undefined as string | undefined
    }));
}

export function extractOriginalValues(node: FlowNode): {
    serverUrl: string;
    auth: string;
    permittedTools: string[];
    requiresAuth: boolean;
    result: string;
    toolKitName: string;
    toolScopes: Record<string, string[]>;
} {
    const serverUrl = (node.properties?.serverUrl?.value as string) || "";
    const auth = (node.properties?.auth?.value as string) || "";
    const rawPermittedTools = node.properties?.permittedTools?.value;
    const permittedTools = Array.isArray(rawPermittedTools)
        ? rawPermittedTools.map((tool: any) => tool.value).filter(Boolean)
        : parseToolsString((rawPermittedTools as string) || "", true);
    const requiresAuth = Boolean(auth && auth.trim());
    const result = (node.properties?.variable?.value as string) || "";
    const toolKitName = (node.properties?.toolKitName?.value as string) || "";

    let toolScopes: Record<string, string[]> = {};
    const toolScopesValue = (node.properties?.toolScopes?.value as string) || "";
    if (toolScopesValue) {
        try {
            const parsed = JSON.parse(toolScopesValue);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                toolScopes = parsed;
            }
        } catch {
            // Invalid JSON, leave as empty
        }
    }

    return {
        serverUrl,
        auth,
        permittedTools,
        requiresAuth,
        result,
        toolKitName,
        toolScopes
    };
}

export const generateToolKitName = (resultValue: string): string => {
    const trimmed = resultValue?.trim();
    if (!trimmed) return "";
    const pascalCase = convertToPascalCase(trimmed);
    return /toolkit/i.test(trimmed) ? pascalCase : `${pascalCase}Toolkit`;
};

const convertToPascalCase = (input: string): string => {
    if (!input) return "";

    const words = input.split(/[_\-\s]+/).filter(word => word.length > 0);
    if (words.length > 1) {
        return words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join("");
    }
    return input.charAt(0).toUpperCase() + input.slice(1);
};
