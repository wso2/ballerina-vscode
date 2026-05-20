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

import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { McpServerStatusDTO } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import AddMcpServerModal from "./AddMcpServerModal";

const TOOLTIP_SHOW_MS = 150;
const TOOLTIP_HIDE_MS = 200;

const ChipWrapper = styled.div`
    position: relative;
    display: inline-flex;
    align-items: center;
    margin-right: 4px;
`;

const Chip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 8px;
    background: var(--vscode-editor-background);
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 10px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
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
    min-width: 260px;
    max-width: 340px;
    padding: 8px;
    background: var(--vscode-editorHoverWidget-background);
    border: 1px solid var(--vscode-editorHoverWidget-border);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    color: var(--vscode-editorHoverWidget-foreground);
    font-size: 12px;

    &::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 0;
        right: 0;
        height: 8px;
    }
`;

const PopupHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 6px;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    margin-bottom: 4px;
`;

const PopupTitle = styled.span`
    font-weight: 600;
`;

const HeaderActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
`;

const HeaderAction = styled.button`
    background: transparent;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    color: var(--vscode-foreground);
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    cursor: pointer;

    &:hover {
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

const EmptyState = styled.div`
    padding: 12px 4px;
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

const ToggleSwitch = styled.button<{ on: boolean }>`
    width: 26px;
    height: 14px;
    border-radius: 7px;
    border: none;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    background: ${(p: { on: boolean }) => (p.on
        ? "var(--vscode-button-background)"
        : "var(--vscode-input-background)")};

    &::after {
        content: "";
        position: absolute;
        top: 2px;
        left: ${(p: { on: boolean }) => (p.on ? "14px" : "2px")};
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--vscode-foreground);
        transition: left 0.15s;
    }
`;

function transportLabel(s: McpServerStatusDTO): string {
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

export const McpToolsChip: React.FC = () => {
    const { rpcClient } = useRpcContext();
    const [servers, setServers] = useState<McpServerStatusDTO[]>([]);
    const [visible, setVisible] = useState(false);
    const [reloading, setReloading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;
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
    }, [rpcClient]);

    const handleReload = async () => {
        setReloading(true);
        try {
            // listMcpServers calls manager.refresh() server-side, which re-reads
            // mcp.json and retries any failed/disconnected servers.
            const list = await rpcClient.getAiPanelRpcClient().listMcpServers();
            setServers(list);
        } catch (err) {
            console.warn("[mcp] reload failed:", err);
        } finally {
            setReloading(false);
        }
    };

    const connectedCount = servers.filter((s) => s.status === "connected").length;
    const totalTools = servers.reduce((acc, s) => acc + s.tools.length, 0);
    const headlineStatus: McpServerStatusDTO["status"] = servers.some((s) => s.status === "failed")
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

    const handleToggle = async (name: string, currentEnabled: boolean) => {
        await rpcClient.getAiPanelRpcClient().setMcpServerEnabled({ name, enabled: !currentEnabled });
    };

    const handleOpenConfig = async () => {
        await rpcClient.getAiPanelRpcClient().openMcpConfig();
    };

    return (
        <ChipWrapper onMouseEnter={scheduleShow} onMouseLeave={scheduleHide}>
            <Chip
                type="button"
                title={servers.length === 0
                    ? "No MCP servers configured"
                    : `${connectedCount}/${servers.length} MCP server${servers.length === 1 ? "" : "s"} connected · ${totalTools} tool${totalTools === 1 ? "" : "s"}`}
                onClick={toggleVisible}
            >
                <span className="codicon codicon-plug" style={{ fontSize: 11 }} />
                <StatusDot status={headlineStatus} />
                <span>MCP</span>
            </Chip>

            {visible && (
                <Popup onMouseEnter={scheduleShow} onMouseLeave={scheduleHide}>
                    <PopupHeader>
                        <PopupTitle>MCP servers</PopupTitle>
                        <HeaderActions>
                            <IconAction
                                type="button"
                                title="Reload servers"
                                disabled={reloading}
                                onClick={handleReload}
                            >
                                <span
                                    className={`codicon codicon-refresh${reloading ? " codicon-modifier-spin" : ""}`}
                                    style={{ fontSize: 12 }}
                                />
                            </IconAction>
                            <HeaderAction type="button" onClick={() => setShowAddModal(true)}>
                                + Add server
                            </HeaderAction>
                            <HeaderAction type="button" onClick={handleOpenConfig}>
                                Edit config
                            </HeaderAction>
                        </HeaderActions>
                    </PopupHeader>

                    {servers.length === 0 ? (
                        <EmptyState>
                            No servers configured. Click <b>+ Add server</b> to set one up.
                        </EmptyState>
                    ) : (
                        servers.map((s) => (
                            <ServerRow key={s.name}>
                                <StatusDot status={s.status} />
                                <ServerMeta>
                                    <ServerName title={s.name}>{s.name}</ServerName>
                                    <ServerSubline title={transportLabel(s)}>{transportLabel(s)}</ServerSubline>
                                </ServerMeta>
                                <ToggleSwitch
                                    type="button"
                                    on={s.enabled}
                                    title={s.enabled ? "Disable this server" : "Enable this server"}
                                    onClick={() => handleToggle(s.name, s.enabled)}
                                />
                            </ServerRow>
                        ))
                    )}
                </Popup>
            )}
            <AddMcpServerModal
                isOpen={showAddModal}
                existingNames={servers.map((s) => s.name)}
                onClose={() => setShowAddModal(false)}
                onAdded={() => { /* mcpServersChanged notification refreshes the list */ }}
            />
        </ChipWrapper>
    );
};

export default McpToolsChip;
