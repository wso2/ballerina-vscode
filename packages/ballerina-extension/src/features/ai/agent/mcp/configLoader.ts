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

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { McpConfigFile, McpServerConfig } from "./types";

const COPILOT_ROOT = path.join(os.homedir(), ".ballerina", "copilot");
export const USER_MCP_CONFIG_PATH = path.join(COPILOT_ROOT, "mcp.json");

export const EMPTY_CONFIG: McpConfigFile = { mcpServers: {} };

function readConfigFile(filePath: string): McpConfigFile {
    try {
        if (!fs.existsSync(filePath)) {
            return EMPTY_CONFIG;
        }
        const raw = fs.readFileSync(filePath, "utf8");
        if (!raw.trim()) {
            return EMPTY_CONFIG;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.mcpServers || typeof parsed.mcpServers !== "object") {
            console.warn(`[mcp] Ignoring invalid config at ${filePath}: missing or non-object 'mcpServers'`);
            return EMPTY_CONFIG;
        }
        return parsed as McpConfigFile;
    } catch (err) {
        console.warn(`[mcp] Failed to read config at ${filePath}:`, err);
        return EMPTY_CONFIG;
    }
}

function inferTransport(cfg: McpServerConfig): McpServerConfig {
    if (cfg.type) {
        return cfg;
    }
    if ("command" in cfg && cfg.command) {
        return { ...cfg, type: "stdio" };
    }
    if ("url" in cfg && cfg.url) {
        return { ...cfg, type: "http" };
    }
    return cfg;
}

/**
 * Reads the user-global MCP config and returns a normalized record of servers.
 * Invalid entries are dropped with a console warning.
 */
export function loadMcpConfig(): Record<string, McpServerConfig> {
    const file = readConfigFile(USER_MCP_CONFIG_PATH);
    const servers = file.mcpServers ?? {};
    const out: Record<string, McpServerConfig> = {};
    for (const [name, cfg] of Object.entries(servers)) {
        if (!cfg || typeof cfg !== "object") {
            console.warn(`[mcp] Ignoring server '${name}': entry is not an object`);
            continue;
        }
        const normalized = inferTransport(cfg);
        const isStdio = normalized.type === "stdio" || ("command" in normalized && normalized.command);
        const isHttp = normalized.type === "http" || ("url" in normalized && normalized.url);
        if (!isStdio && !isHttp) {
            console.warn(`[mcp] Ignoring server '${name}': must specify 'command' (stdio) or 'url' (http)`);
            continue;
        }
        out[name] = normalized;
    }
    return out;
}

export function ensureMcpConfigFileExists(): string {
    if (!fs.existsSync(COPILOT_ROOT)) {
        fs.mkdirSync(COPILOT_ROOT, { recursive: true });
    }
    if (!fs.existsSync(USER_MCP_CONFIG_PATH)) {
        fs.writeFileSync(USER_MCP_CONFIG_PATH, JSON.stringify({ mcpServers: {} }, null, 2), "utf8");
    }
    return USER_MCP_CONFIG_PATH;
}

/**
 * Atomically adds a new server entry to the user mcp.json.
 *
 * Throws if a server with the same name already exists (case-sensitive).
 * Reads the file fresh before mutating, so external edits made while a form
 * was open are preserved.
 */
export function writeMcpServer(name: string, config: McpServerConfig): void {
    ensureMcpConfigFileExists();
    const raw = fs.readFileSync(USER_MCP_CONFIG_PATH, "utf8");
    const parsed: McpConfigFile = raw.trim() ? JSON.parse(raw) : { mcpServers: {} };
    const servers = parsed.mcpServers ?? {};
    if (Object.prototype.hasOwnProperty.call(servers, name)) {
        throw new Error(`Server '${name}' already exists in mcp.json.`);
    }
    servers[name] = config;
    parsed.mcpServers = servers;
    const tmpPath = `${USER_MCP_CONFIG_PATH}.tmp.${process.pid}.${Date.now()}`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(parsed, null, 2), "utf8");
        fs.renameSync(tmpPath, USER_MCP_CONFIG_PATH);
    } catch (err) {
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        throw err;
    }
}

/**
 * Subscribes to user-level config changes and returns a disposer. Uses
 * `fs.watchFile` with a polling interval because some platforms drop
 * `fs.watch` events when the file is replaced atomically (the editor pattern
 * used by VS Code's `workspace.fs.writeFile`).
 */
export function watchMcpConfig(onChange: () => void): () => void {
    if (!fs.existsSync(COPILOT_ROOT)) {
        try { fs.mkdirSync(COPILOT_ROOT, { recursive: true }); } catch { /* ignore */ }
    }
    const listener = () => onChange();
    fs.watchFile(USER_MCP_CONFIG_PATH, { interval: 1500 }, listener);
    return () => fs.unwatchFile(USER_MCP_CONFIG_PATH, listener);
}
