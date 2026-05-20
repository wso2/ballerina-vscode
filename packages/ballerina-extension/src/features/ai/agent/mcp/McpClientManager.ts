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

import { loadMcpConfig } from "./configLoader";
import {
    McpConnectionStatus,
    McpServerConfig,
    McpServerStatus,
    McpToolSummary,
    McpTransportType,
} from "./types";

// The MCP SDK ships its public API via package `exports` (ESM `dist/esm/...`
// and CJS `dist/cjs/...`). TypeScript's classic `moduleResolution: "node"`
// in this workspace doesn't consult `exports`, so we can't type-resolve
// `@modelcontextprotocol/sdk/client/index.js` directly. Webpack and Node
// honour `exports` at runtime, so a plain `require()` resolves to the
// CJS variant. We type the surface we touch locally — enough for safety
// without forcing a tsconfig change for the whole extension.
interface McpToolRaw {
    name: string;
    description?: string;
    inputSchema?: unknown;
}
interface McpClient {
    connect(transport: unknown, options?: unknown): Promise<void>;
    listTools(params?: unknown): Promise<{ tools: McpToolRaw[] }>;
    callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<unknown>;
    close(): Promise<void>;
}
type McpClientCtor = new (info: { name: string; version: string }) => McpClient;
type StdioCtor = new (params: { command: string; args?: string[]; env?: Record<string, string> }) => unknown;
type StreamableHttpCtor = new (url: URL, opts?: { requestInit?: { headers?: Record<string, string> } }) => unknown;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client: McpClientImpl } = require("@modelcontextprotocol/sdk/client/index.js") as { Client: McpClientCtor };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js") as { StdioClientTransport: StdioCtor };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js") as { StreamableHTTPClientTransport: StreamableHttpCtor };

const CLIENT_NAME = "wso2-integrator-copilot";
const CLIENT_VERSION = "1.0.0";

interface McpToolDescriptor {
    name: string;
    description?: string;
    inputSchema: unknown;
}

interface ConnectedServer {
    name: string;
    config: McpServerConfig;
    transport: McpTransportType;
    client: McpClient;
    tools: McpToolDescriptor[];
}

interface ServerState {
    name: string;
    config: McpServerConfig;
    transport: McpTransportType;
    status: McpConnectionStatus;
    error?: string;
    tools: McpToolDescriptor[];
    client?: McpClient;
}

export type EnabledOverrideStore = {
    get(name: string): boolean | undefined;
    set(name: string, enabled: boolean): Promise<void>;
};

function transportOf(cfg: McpServerConfig): McpTransportType {
    if (cfg.type === "stdio" || ("command" in cfg && cfg.command)) {
        return "stdio";
    }
    return "http";
}

function configKey(cfg: McpServerConfig): string {
    return JSON.stringify(cfg);
}

/**
 * Manages MCP client connections for the Copilot agent.
 *
 * Lifecycle:
 *  - {@link refresh} reads the user-level mcp.json, opens clients for enabled
 *    servers, and closes clients for servers that were removed or disabled.
 *  - {@link listServers} returns a per-server snapshot for the UI.
 *  - {@link bridgeTools} (see toolBridge) returns a Vercel `ai`-compatible
 *    tool map for merging into the agent's tool registry.
 *  - {@link dispose} closes all clients; safe to call multiple times.
 *
 * A broken server (bad command, unreachable URL, schema-mismatched tool) is
 * recorded with status `failed` and an error message; it never throws out of
 * `refresh` so the agent can keep going with the remaining servers.
 */
export class McpClientManager {
    private servers = new Map<string, ServerState>();
    private enabledOverrides: EnabledOverrideStore;
    private refreshing?: Promise<void>;
    private disposed = false;

    constructor(enabledOverrides: EnabledOverrideStore) {
        this.enabledOverrides = enabledOverrides;
    }

    async refresh(): Promise<void> {
        if (this.disposed) {
            return;
        }
        if (this.refreshing) {
            return this.refreshing;
        }
        this.refreshing = this.doRefresh().finally(() => {
            this.refreshing = undefined;
        });
        return this.refreshing;
    }

    private async doRefresh(): Promise<void> {
        const desired = loadMcpConfig();
        const desiredNames = new Set(Object.keys(desired));

        // Close servers that disappeared or whose effective enabled-state went off.
        for (const [name, state] of [...this.servers.entries()]) {
            const desiredCfg = desired[name];
            const stillWanted = !!desiredCfg && this.isEffectivelyEnabled(name, desiredCfg);
            const configChanged = desiredCfg && configKey(desiredCfg) !== configKey(state.config);
            if (!stillWanted || configChanged) {
                await this.disconnect(state);
                this.servers.delete(name);
            }
        }

        // Open clients for newly-enabled or newly-added servers.
        const opens: Promise<void>[] = [];
        for (const name of desiredNames) {
            const cfg = desired[name];
            if (!this.isEffectivelyEnabled(name, cfg)) {
                this.servers.set(name, {
                    name,
                    config: cfg,
                    transport: transportOf(cfg),
                    status: "disconnected",
                    tools: [],
                });
                continue;
            }
            // Skip only if already connected or a connect is in flight. Existing
            // `disconnected`/`failed` states fall through so re-enabling actually
            // reconnects instead of leaving the server in its prior status.
            const existing = this.servers.get(name);
            if (existing && (existing.status === "connected" || existing.status === "connecting")) {
                continue;
            }
            const state: ServerState = {
                name,
                config: cfg,
                transport: transportOf(cfg),
                status: "connecting",
                tools: [],
            };
            this.servers.set(name, state);
            opens.push(this.connect(state));
        }

        await Promise.allSettled(opens);
    }

    private isEffectivelyEnabled(name: string, cfg: McpServerConfig): boolean {
        const override = this.enabledOverrides.get(name);
        if (override !== undefined) {
            return override;
        }
        return cfg.disabled !== true;
    }

    private async connect(state: ServerState): Promise<void> {
        try {
            const client = new McpClientImpl({ name: CLIENT_NAME, version: CLIENT_VERSION });
            const transport = this.buildTransport(state.config);
            await client.connect(transport);
            const { tools } = await client.listTools();
            const filtered: McpToolDescriptor[] = [];
            for (const t of tools) {
                if (!t || typeof t.name !== "string" || !t.name) {
                    continue;
                }
                if (!t.inputSchema || typeof t.inputSchema !== "object") {
                    console.warn(`[mcp] Skipping tool '${state.name}/${t.name}': missing/invalid inputSchema`);
                    continue;
                }
                filtered.push({
                    name: t.name,
                    description: typeof t.description === "string" ? t.description : undefined,
                    inputSchema: t.inputSchema,
                });
            }
            state.client = client;
            state.tools = filtered;
            state.status = "connected";
            state.error = undefined;
        } catch (err: any) {
            state.status = "failed";
            state.error = err?.message ?? String(err);
            state.client = undefined;
            state.tools = [];
            console.warn(`[mcp] Failed to connect to '${state.name}':`, state.error);
        }
    }

    private buildTransport(cfg: McpServerConfig): unknown {
        const t = transportOf(cfg);
        if (t === "stdio") {
            if (!("command" in cfg) || !cfg.command) {
                throw new Error("stdio MCP server config requires 'command'");
            }
            const env: Record<string, string> = {};
            for (const [k, v] of Object.entries(process.env)) {
                if (typeof v === "string") {
                    env[k] = v;
                }
            }
            if (cfg.env) {
                Object.assign(env, cfg.env);
            }
            return new StdioClientTransport({
                command: cfg.command,
                args: cfg.args ?? [],
                env,
            });
        }
        if (!("url" in cfg) || !cfg.url) {
            throw new Error("http MCP server config requires 'url'");
        }
        const url = new URL(cfg.url);
        const headers = cfg.headers ?? {};
        return new StreamableHTTPClientTransport(url, {
            requestInit: { headers },
        });
    }

    private async disconnect(state: ServerState): Promise<void> {
        if (!state.client) {
            return;
        }
        try {
            await state.client.close();
        } catch (err) {
            console.warn(`[mcp] Error closing client '${state.name}':`, err);
        } finally {
            state.client = undefined;
        }
    }

    /** Snapshot of all known servers (connected, disconnected, or failed). */
    listServers(): McpServerStatus[] {
        const out: McpServerStatus[] = [];
        for (const state of this.servers.values()) {
            out.push({
                name: state.name,
                transport: state.transport,
                enabled: this.isEffectivelyEnabled(state.name, state.config),
                status: state.status,
                error: state.error,
                tools: state.tools.map<McpToolSummary>(t => ({ name: t.name, description: t.description })),
            });
        }
        return out;
    }

    /** Returns the connected servers and their tool descriptors for bridging. */
    getConnectedTools(): ConnectedServer[] {
        const out: ConnectedServer[] = [];
        for (const state of this.servers.values()) {
            if (state.status === "connected" && state.client) {
                out.push({
                    name: state.name,
                    config: state.config,
                    transport: state.transport,
                    client: state.client,
                    tools: state.tools,
                });
            }
        }
        return out;
    }

    /** Invoke a tool on a specific server. */
    async callTool(serverName: string, toolName: string, args: unknown): Promise<unknown> {
        const state = this.servers.get(serverName);
        if (!state || state.status !== "connected" || !state.client) {
            throw new Error(`MCP server '${serverName}' is not connected`);
        }
        return state.client.callTool({
            name: toolName,
            arguments: (args as Record<string, unknown>) ?? {},
        });
    }

    async setEnabled(name: string, enabled: boolean): Promise<void> {
        await this.enabledOverrides.set(name, enabled);
        await this.refresh();
    }

    async dispose(): Promise<void> {
        this.disposed = true;
        const closes: Promise<void>[] = [];
        for (const state of this.servers.values()) {
            closes.push(this.disconnect(state));
        }
        await Promise.allSettled(closes);
        this.servers.clear();
    }
}

let singleton: McpClientManager | undefined;

export function initMcpClientManager(overrides: EnabledOverrideStore): McpClientManager {
    if (!singleton) {
        singleton = new McpClientManager(overrides);
    }
    return singleton;
}

export function getMcpClientManager(): McpClientManager | undefined {
    return singleton;
}

export async function disposeMcpClientManager(): Promise<void> {
    if (singleton) {
        await singleton.dispose();
        singleton = undefined;
    }
}
