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

import { McpConfigFile, McpScope, McpServerConfig } from "./types";

const COPILOT_ROOT = path.join(os.homedir(), ".ballerina", "copilot");
export const USER_MCP_CONFIG_PATH = path.join(COPILOT_ROOT, "mcp.json");
/** Bare-name `.mcp.json` matches Claude Code / Cline convention for tool-agnostic config. */
export const PROJECT_MCP_FILENAME = ".mcp.json";

export const EMPTY_CONFIG: McpConfigFile = { mcpServers: {} };

/**
 * Project-scope MCP config lives in the user's workspace tree (versioned with
 * the repo), at `<workspacePath>/.mcp.json`. Standard adopted from Claude Code.
 */
export function workspaceMcpConfigPath(workspacePath: string): string {
    return path.join(path.resolve(workspacePath), PROJECT_MCP_FILENAME);
}

/** Returns the on-disk path for the given scope. Throws if scope=workspace without a workspace path. */
export function configFilePath(scope: McpScope, workspacePath?: string): string {
    if (scope === "user") {
        return USER_MCP_CONFIG_PATH;
    }
    if (!workspacePath) {
        throw new Error("Workspace path is required for workspace-scope config.");
    }
    return workspaceMcpConfigPath(workspacePath);
}

interface ReadResult {
    file: McpConfigFile;
    error?: string;
}

function readConfigFile(filePath: string): ReadResult {
    try {
        if (!fs.existsSync(filePath)) {
            return { file: EMPTY_CONFIG };
        }
        const raw = fs.readFileSync(filePath, "utf8");
        if (!raw.trim()) {
            return { file: EMPTY_CONFIG };
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch (parseErr: any) {
            const msg = parseErr?.message ?? String(parseErr);
            console.warn(`[mcp] Invalid JSON at ${filePath}:`, msg);
            return { file: EMPTY_CONFIG, error: `Invalid JSON: ${msg}` };
        }
        if (!parsed || typeof parsed !== "object" || !(parsed as any).mcpServers || typeof (parsed as any).mcpServers !== "object") {
            const msg = "Missing or non-object 'mcpServers' key.";
            console.warn(`[mcp] Ignoring invalid config at ${filePath}: ${msg}`);
            return { file: EMPTY_CONFIG, error: msg };
        }
        return { file: parsed as McpConfigFile };
    } catch (err: any) {
        const msg = err?.message ?? String(err);
        console.warn(`[mcp] Failed to read config at ${filePath}:`, msg);
        return { file: EMPTY_CONFIG, error: msg };
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

function normaliseEntries(scope: McpScope, file: McpConfigFile): Array<{ name: string; config: McpServerConfig; scope: McpScope }> {
    const servers = file.mcpServers ?? {};
    const out: Array<{ name: string; config: McpServerConfig; scope: McpScope }> = [];
    for (const [name, cfg] of Object.entries(servers)) {
        if (!cfg || typeof cfg !== "object") {
            console.warn(`[mcp] Ignoring server '${name}' (${scope}): entry is not an object`);
            continue;
        }
        const normalized = inferTransport(cfg);
        const isStdio = normalized.type === "stdio" || ("command" in normalized && normalized.command);
        const isHttp = normalized.type === "http" || ("url" in normalized && normalized.url);
        if (!isStdio && !isHttp) {
            console.warn(`[mcp] Ignoring server '${name}' (${scope}): must specify 'command' (stdio) or 'url' (http)`);
            continue;
        }
        out.push({ name, config: normalized, scope });
    }
    return out;
}

/**
 * Reads the user-global mcp.json plus, when both a workspace path is provided
 * and `allowWorkspace` is true, the project-tree `<workspacePath>/.mcp.json`.
 * Returns a flat list tagged with scope. The two scopes are independent:
 * `{user, foo}` and `{workspace, foo}` can coexist.
 *
 * `allowWorkspace` is the workspace-trust gate — callers pass `false` for
 * untrusted workspaces so arbitrary `command` entries in a cloned `.mcp.json`
 * don't auto-spawn processes.
 */
export interface McpLoadErrors {
    user?: string;
    workspace?: string;
}

export interface McpLoadResult {
    entries: Array<{ name: string; config: McpServerConfig; scope: McpScope }>;
    errors: McpLoadErrors;
}

export function loadMcpConfig(workspacePath?: string, allowWorkspace: boolean = true): McpLoadResult {
    const entries: Array<{ name: string; config: McpServerConfig; scope: McpScope }> = [];
    const errors: McpLoadErrors = {};

    const userRead = readConfigFile(USER_MCP_CONFIG_PATH);
    if (userRead.error) {
        errors.user = userRead.error;
    }
    entries.push(...normaliseEntries("user", userRead.file));

    if (workspacePath && allowWorkspace) {
        const wsFile = workspaceMcpConfigPath(workspacePath);
        const wsRead = readConfigFile(wsFile);
        if (wsRead.error) {
            errors.workspace = wsRead.error;
        }
        entries.push(...normaliseEntries("workspace", wsRead.file));
    }
    return { entries, errors };
}

export function ensureMcpConfigFileExists(scope: McpScope = "user", workspacePath?: string): string {
    const filePath = configFilePath(scope, workspacePath);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({ mcpServers: {} }, null, 2), "utf8");
    }
    return filePath;
}

/**
 * Atomically adds a new server entry to the chosen scope's mcp.json.
 *
 * Throws if a server with the same name already exists in that scope.
 * Reads the file fresh before mutating, so external edits made while a form
 * was open are preserved.
 */
export function writeMcpServer(name: string, config: McpServerConfig, scope: McpScope = "user", workspacePath?: string): void {
    const filePath = ensureMcpConfigFileExists(scope, workspacePath);
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed: McpConfigFile = raw.trim() ? JSON.parse(raw) : { mcpServers: {} };
    const servers = parsed.mcpServers ?? {};
    if (Object.prototype.hasOwnProperty.call(servers, name)) {
        throw new Error(`Server '${name}' already exists in ${scope} mcp.json.`);
    }
    servers[name] = config;
    parsed.mcpServers = servers;
    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(parsed, null, 2), "utf8");
        fs.renameSync(tmpPath, filePath);
    } catch (err) {
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        throw err;
    }
}

/**
 * Atomically replaces an existing server entry in the chosen scope's mcp.json.
 * Throws if no entry with `name` exists.
 */
export function updateMcpServer(name: string, config: McpServerConfig, scope: McpScope = "user", workspacePath?: string): void {
    const filePath = configFilePath(scope, workspacePath);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Server '${name}' not found — no ${scope} mcp.json exists.`);
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed: McpConfigFile = raw.trim() ? JSON.parse(raw) : { mcpServers: {} };
    const servers = parsed.mcpServers ?? {};
    if (!Object.prototype.hasOwnProperty.call(servers, name)) {
        throw new Error(`Server '${name}' not found in ${scope} mcp.json.`);
    }
    servers[name] = config;
    parsed.mcpServers = servers;
    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(parsed, null, 2), "utf8");
        fs.renameSync(tmpPath, filePath);
    } catch (err) {
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        throw err;
    }
}

/**
 * Atomically removes a server entry from the chosen scope's mcp.json.
 * No-op if the file or entry doesn't exist.
 */
export function deleteMcpServer(name: string, scope: McpScope = "user", workspacePath?: string): void {
    const filePath = configFilePath(scope, workspacePath);
    if (!fs.existsSync(filePath)) {
        return;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed: McpConfigFile = raw.trim() ? JSON.parse(raw) : { mcpServers: {} };
    const servers = parsed.mcpServers ?? {};
    if (!Object.prototype.hasOwnProperty.call(servers, name)) {
        return;
    }
    delete servers[name];
    parsed.mcpServers = servers;
    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(parsed, null, 2), "utf8");
        fs.renameSync(tmpPath, filePath);
    } catch (err) {
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        throw err;
    }
}

/**
 * Subscribes to config file changes for both the user-global and (if provided)
 * the per-workspace file. Returns a single disposer that releases both watchers.
 * Uses `fs.watchFile` polling because some platforms drop `fs.watch` events
 * when the file is replaced atomically.
 */
export function watchMcpConfig(workspacePath: string | undefined, onChange: () => void): () => void {
    if (!fs.existsSync(COPILOT_ROOT)) {
        try { fs.mkdirSync(COPILOT_ROOT, { recursive: true }); } catch { /* ignore */ }
    }
    const listener = () => onChange();
    const watched: string[] = [USER_MCP_CONFIG_PATH];
    fs.watchFile(USER_MCP_CONFIG_PATH, { interval: 1500 }, listener);
    if (workspacePath) {
        const wsFile = workspaceMcpConfigPath(workspacePath);
        const wsDir = path.dirname(wsFile);
        try { fs.mkdirSync(wsDir, { recursive: true }); } catch { /* ignore */ }
        fs.watchFile(wsFile, { interval: 1500 }, listener);
        watched.push(wsFile);
    }
    return () => {
        for (const p of watched) {
            try { fs.unwatchFile(p, listener); } catch { /* ignore */ }
        }
    };
}
