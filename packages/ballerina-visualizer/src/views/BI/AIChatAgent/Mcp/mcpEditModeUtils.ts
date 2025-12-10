/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
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
    moduleVariables: FlowNode[],
    rpcClient: BallerinaRpcClient,
    projectPathUri: string
): Promise<ResolutionResult> {
    let error = "";

    // Try to resolve server URL
    let resolvedUrl = "";
    try {
        resolvedUrl = await resolveVariableValue(
            serverUrl,
            moduleVariables,
            rpcClient,
            projectPathUri
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

    // Try to resolve auth
    let resolvedAuthValue = "";
    if (auth && auth.trim()) {
        try {
            resolvedAuthValue = await resolveAuthConfig(
                auth,
                moduleVariables,
                rpcClient,
                projectPathUri
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
} {
    const serverUrl = (node.properties?.serverUrl?.value as string) || "";
    const auth = (node.properties?.auth?.value as string) || "";
    const permittedToolsValue = (node.properties?.permittedTools?.value as string) || "";
    const permittedTools = parseToolsString(permittedToolsValue, true);
    const requiresAuth = Boolean(auth && auth.trim());

    return {
        serverUrl,
        auth,
        permittedTools,
        requiresAuth
    };
}
