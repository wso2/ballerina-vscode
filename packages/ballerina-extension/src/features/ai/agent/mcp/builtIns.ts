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

import { McpServerConfig } from "./types";

export interface BuiltInMcpServer {
    /** Stable id used as the server name when added to the user's config. */
    id: string;
    displayName: string;
    description: string;
    /** The config that will be written into the user's `mcp.json` on enable. */
    defaultConfig: McpServerConfig;
    /**
     * Marks servers that need credentials before they will connect. v1 surfaces
     * the flag in the UI but does not run any auth flow yet.
     */
    requiresAuth?: boolean;
    /**
     * Optional. When `true`, this server is on by default on first run —
     * useful for trusted WSO2 connectors that should "just work". When the
     * field is omitted or `false`, the server is off until the user toggles
     * it on. Either way, the user's choice overrides this and persists.
     */
    autoEnable?: boolean;
}

/** Built-in MCP servers shipped with the Copilot. Empty until curated connectors land. */
export const BUILT_IN_MCP_SERVERS: readonly BuiltInMcpServer[] = [];
