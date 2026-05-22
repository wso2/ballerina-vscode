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

import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "@emotion/styled";
import { McpScope, McpServerStatusDTO } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

const TOOLTIP_SHOW_MS = 150;
const TOOLTIP_HIDE_MS = 200;
const POPUP_MAX_HEIGHT = 360;

interface McpToolsChipProps {
    mcpToolsEnabled: boolean;
    onOpenMcpManager: () => void;
}

const ChipWrapper = styled.div`
    position: relative;
    display: inline-flex;
    align-items: center;
    margin-right: 4px;
`;

const Chip = styled.button<{ disabled?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 8px;
    background: var(--vscode-editor-background);
    color: ${(p: { disabled?: boolean }) => (p.disabled ? "var(--vscode-descriptionForeground)" : "var(--vscode-foreground)")};
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 10px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
    }

    .codicon {
        opacity: ${(p: { disabled?: boolean }) => (p.disabled ? 0.6 : 1)};
    }
`;

const StatusDot = styled.span<{ status: McpServerStatusDTO["status"] }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${(p: { status: McpServerStatusDTO["status"] }) => {
        switch (p.status) {
            case "connected": return "var(--vscode-charts-green, #388a34)";
            case "connecting": return "var(--vscode-charts-blue, #007acc)";
            case "failed": return "var(--vscode-errorForeground, #f48771)";
            default: return "var(--vscode-descriptionForeground)";
        }
    }};
`;

const Popup = styled.div`
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    z-index: 1000;
    min-width: 280px;
    max-width: 340px;
    background: var(--vscode-editorHoverWidget-background);
    border: 1px solid var(--vscode-editorHoverWidget-border);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    color: var(--vscode-editorHoverWidget-foreground);
    font-size: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    &::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 0;
        right: 0;
        height: 8px;
    }
`;

const StickyHeader = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    gap: 8px;
`;

const HeaderLeft = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

const HeaderRight = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

const HeaderTitle = styled.span`
    font-weight: 600;
    font-size: 12px;
`;

const ManageButton = styled.button`
    background: transparent;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    color: var(--vscode-foreground);
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    cursor: pointer;

    &:hover:not(:disabled) {
        background: var(--vscode-toolbar-hoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const IconAction = styled.button`
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 3px;
    color: var(--vscode-icon-foreground);
    cursor: pointer;

    &:hover:not(:disabled) {
        background: var(--vscode-toolbar-hoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }

    .codicon-modifier-spin {
        animation: codicon-spin 1.2s steps(30) infinite;
    }
    @keyframes codicon-spin {
        100% { transform: rotate(360deg); }
    }
`;

const ScrollBody = styled.div`
    flex: 1;
    overflow-y: auto;
    max-height: ${POPUP_MAX_HEIGHT}px;
    padding: 4px;
`;

const GroupLabel = styled.div`
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
    padding: 6px 4px 2px;
`;

const EmptyState = styled.div`
    padding: 16px 8px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
`;

const ServerRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
    border-radius: 3px;

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const ServerMeta = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const ServerName = styled.div`
    font-size: 12px;
    color: var(--vscode-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ServerSubline = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ToggleSwitch = styled.button<{ on: boolean; disabled?: boolean }>`
    width: 26px;
    height: 14px;
    border-radius: 7px;
    cursor: ${(p: { disabled?: boolean }) => (p.disabled ? "default" : "pointer")};
    position: relative;
    flex-shrink: 0;
    opacity: ${(p: { disabled?: boolean }) => (p.disabled ? 0.5 : 1)};
    background: ${(p: { on: boolean }) => (p.on
        ? "var(--vscode-inputOption-activeBackground, var(--vscode-focusBorder))"
        : "var(--vscode-input-background)")};
    border: 1px solid ${(p: { on: boolean }) => (p.on
        ? "var(--vscode-inputOption-activeBorder, var(--vscode-checkbox-border, transparent))"
        : "var(--vscode-checkbox-border, var(--vscode-input-border, transparent))")};
    transition: background 0.15s, border-color 0.15s;

    &::after {
        content: "";
        position: absolute;
        top: 1px;
        left: ${(p: { on: boolean }) => (p.on ? "13px" : "1px")};
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--vscode-foreground);
        transition: left 0.15s;
    }
`;

const OffMessage = styled.div`
    padding: 24px 12px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    line-height: 1.5;
`;

const SCOPE_ORDER: McpScope[] = ["workspace", "user"];

function transportLabel(s: McpServerStatusDTO): string {
    if (s.shadowed) {
        return `${s.transport} · shadowed by project`;
    }
    if (s.status === "failed" && s.error) {
        return `Failed: ${s.error}`;
    }
    if (s.status === "disconnected") {
        return `${s.transport} · disabled`;
    }
    if (s.status === "connecting") {
        return `${s.transport} · connecting`;
    }
    const n = s.tools.length;
    return `${s.transport} · ${n} tool${n === 1 ? "" : "s"}`;
}

export const McpToolsChip: React.FC<McpToolsChipProps> = ({ mcpToolsEnabled, onOpenMcpManager }) => {
    const { rpcClient } = useRpcContext();
    const [servers, setServers] = useState<McpServerStatusDTO[]>([]);
    const [visible, setVisible] = useState(false);
    const [reloading, setReloading] = useState(false);
    const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!mcpToolsEnabled) {
            // Don't fetch when globally off; clear stale state.
            setServers([]);
            return;
        }
        rpcClient.getAiPanelRpcClient().listMcpServers().then((list) => {
            if (!cancelled) setServers(list);
        }).catch((err) => console.warn("[mcp] listMcpServers failed:", err));
        const dispose = rpcClient.onMcpServersChanged((list: McpServerStatusDTO[]) => {
            if (!cancelled) setServers(list);
        });
        return () => {
            cancelled = true;
            dispose();
        };
    }, [rpcClient, mcpToolsEnabled]);

    // Group + sort: scope groups in fixed order (Project → User). Built-in is reserved for future.
    const grouped = useMemo(() => {
        const byScope = new Map<McpScope, McpServerStatusDTO[]>();
        for (const scope of SCOPE_ORDER) byScope.set(scope, []);
        for (const s of servers) {
            byScope.get(s.scope)?.push(s);
        }
        return SCOPE_ORDER
            .map(scope => byScope.get(scope) ?? [])
            .filter(group => group.length > 0);
    }, [servers]);

    const connectedCount = servers.filter((s) => s.status === "connected").length;
    const totalTools = servers.reduce((acc, s) => acc + s.tools.length, 0);
    const headlineStatus: McpServerStatusDTO["status"] = !mcpToolsEnabled
        ? "disconnected"
        : servers.some((s) => s.status === "failed")
            ? "failed"
            : connectedCount > 0
                ? "connected"
                : servers.some((s) => s.status === "connecting")
                    ? "connecting"
                    : "disconnected";

    const scheduleShow = () => {
        if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
        showTimer.current = setTimeout(() => setVisible(true), TOOLTIP_SHOW_MS);
    };
    const scheduleHide = () => {
        if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
        hideTimer.current = setTimeout(() => setVisible(false), TOOLTIP_HIDE_MS);
    };
    const toggleVisible = () => setVisible((v) => !v);

    const handleReload = async () => {
        setReloading(true);
        try {
            const list = await rpcClient.getAiPanelRpcClient().listMcpServers();
            setServers(list);
        } catch (err) {
            console.warn("[mcp] reload failed:", err);
        } finally {
            setReloading(false);
        }
    };

    const handleToggleServer = async (scope: McpScope, name: string, currentEnabled: boolean) => {
        await rpcClient.getAiPanelRpcClient().setMcpServerEnabled({ scope, name, enabled: !currentEnabled });
    };

    const handleToggleGlobal = async () => {
        try {
            await rpcClient.getAiPanelRpcClient().setMcpToolsEnabled({ enabled: !mcpToolsEnabled });
            // State update arrives via config_change('mcpToolsEnabled') flowing through AIChat down via props.
        } catch (err) {
            console.warn("[mcp] setMcpToolsEnabled failed:", err);
        }
    };

    const chipTitle = !mcpToolsEnabled
        ? "MCP is off — click to manage"
        : servers.length === 0
            ? "No MCP servers configured"
            : `${connectedCount}/${servers.length} MCP server${servers.length === 1 ? "" : "s"} connected · ${totalTools} tool${totalTools === 1 ? "" : "s"}`;

    return (
        <ChipWrapper onMouseEnter={scheduleShow} onMouseLeave={scheduleHide}>
            <Chip
                type="button"
                disabled={!mcpToolsEnabled}
                title={chipTitle}
                onClick={toggleVisible}
            >
                <span className="codicon codicon-plug" style={{ fontSize: 11 }} />
                <StatusDot status={headlineStatus} />
                <span>MCP</span>
            </Chip>

            {visible && (
                <Popup onMouseEnter={scheduleShow} onMouseLeave={scheduleHide}>
                    <StickyHeader>
                        <HeaderLeft>
                            <ToggleSwitch
                                type="button"
                                on={mcpToolsEnabled}
                                title={mcpToolsEnabled ? "Disable MCP" : "Enable MCP"}
                                onClick={handleToggleGlobal}
                            />
                            <HeaderTitle>MCP</HeaderTitle>
                        </HeaderLeft>
                        <HeaderRight>
                            <IconAction
                                type="button"
                                title="Reload servers"
                                disabled={reloading || !mcpToolsEnabled}
                                onClick={handleReload}
                            >
                                <span
                                    className={`codicon codicon-refresh${reloading ? " codicon-modifier-spin" : ""}`}
                                    style={{ fontSize: 12 }}
                                />
                            </IconAction>
                            <ManageButton
                                type="button"
                                disabled={!mcpToolsEnabled}
                                onClick={() => { setVisible(false); onOpenMcpManager(); }}
                            >
                                Manage
                            </ManageButton>
                        </HeaderRight>
                    </StickyHeader>

                    {!mcpToolsEnabled ? (
                        <OffMessage>
                            MCP tool support is off.<br />
                            Toggle it on to load servers.
                        </OffMessage>
                    ) : servers.length === 0 ? (
                        <EmptyState>
                            No servers configured. Click <b>Manage</b> to add one.
                        </EmptyState>
                    ) : (
                        <ScrollBody>
                            {grouped.map((group) => (
                                <React.Fragment key={group[0].scope}>
                                    <GroupLabel>{group[0].scope === "workspace" ? "Project" : "User"}</GroupLabel>
                                    {group.map((s) => (
                                        <ServerRow key={`${s.scope}:${s.name}`}>
                                            <StatusDot status={s.status} />
                                            <ServerMeta>
                                                <ServerName title={s.name}>{s.name}</ServerName>
                                                <ServerSubline title={transportLabel(s)}>{transportLabel(s)}</ServerSubline>
                                            </ServerMeta>
                                            <ToggleSwitch
                                                type="button"
                                                on={s.enabled}
                                                title={s.enabled ? "Disable this server" : "Enable this server"}
                                                onClick={() => handleToggleServer(s.scope, s.name, s.enabled)}
                                            />
                                        </ServerRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </ScrollBody>
                    )}
                </Popup>
            )}
        </ChipWrapper>
    );
};

export default McpToolsChip;
