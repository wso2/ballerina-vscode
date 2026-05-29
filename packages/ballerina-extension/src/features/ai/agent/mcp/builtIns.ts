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
    /** Stable id, also used as the server name. */
    id: string;
    displayName: string;
    description: string;
    defaultConfig: McpServerConfig;
    /** When true, the server is on by default on first run; the user's toggle still overrides and persists. */
    autoEnable?: boolean;
}

/** Built-in MCP servers shipped with the Copilot. Empty until curated connectors land. */
export const BUILT_IN_MCP_SERVERS: readonly BuiltInMcpServer[] = [];
