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

import React, { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { McpScope, McpServerConfigDTO, McpServerStatusDTO } from "@wso2/ballerina-core";

import { AIChatView } from "../styles";
import AddMcpServerModal from "../components/AIChatInput/AddMcpServerModal";

interface Props {
    onClose: () => void;
}

// ── Layout ────────────────────────────────────────────────────────────────────

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
`;

const PanelTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    flex: 1;
`;

const HeaderActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

const HeaderInlineToggle = styled.button<{ on: boolean }>`
    width: 30px;
    height: 16px;
    border-radius: 8px;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
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
        left: ${(p: { on: boolean }) => (p.on ? "15px" : "1px")};
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--vscode-foreground);
        transition: left 0.15s;
    }
`;

const PanelContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: var(--vscode-font-family);
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
`;

const SectionTitle = styled.h3`
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
    margin: 0;
`;

const SectionDivider = styled.div`
    flex: 1;
    height: 1px;
    background: var(--vscode-widget-border, var(--vscode-panel-border));
    opacity: 0.5;
    align-self: center;
`;

const EmptyHint = styled.div`
    padding: 16px;
    border: 1px dashed var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 6px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    text-align: center;
`;

const CenteredEmpty = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 48px 24px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
`;

const CenteredEmptyTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const CenteredEmptyBody = styled.div`
    font-size: 12px;
    line-height: 1.5;
    max-width: 360px;
`;

const ServerCard = styled.div`
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 6px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--vscode-editor-background);
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CardName = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
`;

const StatusDot = styled.span<{ status: McpServerStatusDTO["status"] }>`
    width: 8px;
    height: 8px;
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

const CardSubline = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const CardError = styled.div`
    font-size: 11px;
    color: var(--vscode-errorForeground);
    word-break: break-word;
`;

const ToolsExpand = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    align-self: flex-start;

    &:hover { opacity: 0.85; }
`;

const ToolsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 8px;
    margin-top: 4px;
    background: var(--vscode-list-hoverBackground, transparent);
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
`;

const ToolRow = styled.div`
    font-size: 11px;
    color: var(--vscode-foreground);
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const ToolName = styled.span`
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--vscode-textPreformat-foreground, var(--vscode-foreground));
`;

const ToolDesc = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
`;

const ActionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
`;

const ToggleSwitch = styled.button<{ on: boolean }>`
    width: 30px;
    height: 16px;
    border-radius: 8px;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
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
        left: ${(p: { on: boolean }) => (p.on ? "15px" : "1px")};
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--vscode-foreground);
        transition: left 0.15s;
    }
`;

const ActionButton = styled.button`
    background: transparent;
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 3px;
    padding: 3px 10px;
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

const DeleteButton = styled(ActionButton)`
    color: var(--vscode-errorForeground);
    border-color: var(--vscode-errorForeground);

    &:hover:not(:disabled) {
        background: var(--vscode-inputValidation-errorBackground, rgba(255, 0, 0, 0.08));
    }
`;

const ConfirmRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--vscode-foreground);
`;

const Spacer = styled.div`
    flex: 1;
`;

// ── Component ─────────────────────────────────────────────────────────────────

interface EditTarget {
    name: string;
    scope: McpScope;
    config: McpServerConfigDTO;
}

const SCOPE_ORDER: McpScope[] = ["workspace", "user"];

function scopeHeading(scope: McpScope): string {
    return scope === "workspace" ? "Project" : "User";
}

export const McpManagerPanel: React.FC<Props> = ({ onClose }) => {
    const { rpcClient } = useRpcContext();
    const [servers, setServers] = useState<McpServerStatusDTO[]>([]);
    const [mcpToolsEnabled, setMcpToolsEnabled] = useState(false);
    const [hasWorkspace, setHasWorkspace] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

    useEffect(() => {
        let cancelled = false;
        const api = rpcClient.getAiPanelRpcClient();
        api.getMcpToolsEnabled().then(v => !cancelled && setMcpToolsEnabled(v)).catch(() => { /* noop */ });
        api.getMcpWorkspaceContext().then(ctx => !cancelled && setHasWorkspace(ctx.hasWorkspace)).catch(() => { /* noop */ });
        api.listMcpServers().then(list => !cancelled && setServers(list)).catch(() => { /* noop */ });
        const dispose = rpcClient.onMcpServersChanged((list: McpServerStatusDTO[]) => {
            if (!cancelled) setServers(list);
        });
        return () => {
            cancelled = true;
            dispose();
        };
    }, [rpcClient]);

    const grouped = useMemo(() => {
        const byScope = new Map<McpScope, McpServerStatusDTO[]>();
        for (const scope of SCOPE_ORDER) byScope.set(scope, []);
        for (const s of servers) byScope.get(s.scope)?.push(s);
        return byScope;
    }, [servers]);

    const handleToggleGlobal = async () => {
        try {
            await rpcClient.getAiPanelRpcClient().setMcpToolsEnabled({ enabled: !mcpToolsEnabled });
            // Optimistic; the actual config_change notification handled by AIChat will sync state on next open.
            setMcpToolsEnabled(prev => !prev);
        } catch (err) {
            console.warn("[mcp] setMcpToolsEnabled failed:", err);
        }
    };

    const handleToggleServer = async (s: McpServerStatusDTO) => {
        await rpcClient.getAiPanelRpcClient().setMcpServerEnabled({ scope: s.scope, name: s.name, enabled: !s.enabled });
    };

    const handleOpenJsonUser = () => rpcClient.getAiPanelRpcClient().openMcpConfig({ scope: "user" });
    const handleOpenJsonProject = () => rpcClient.getAiPanelRpcClient().openMcpConfig({ scope: "workspace" });

    const handleEdit = (s: McpServerStatusDTO) => {
        setEditTarget({ name: s.name, scope: s.scope, config: s.config });
    };

    const handleDelete = async (s: McpServerStatusDTO) => {
        const res = await rpcClient.getAiPanelRpcClient().deleteMcpServer({ name: s.name, scope: s.scope });
        if (!res.success && res.error) {
            console.warn("[mcp] delete failed:", res.error);
        }
        setConfirmDelete(null);
    };

    const toggleExpanded = (key: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const renderCard = (s: McpServerStatusDTO) => {
        const key = `${s.scope}:${s.name}`;
        const isExpanded = expanded.has(key);
        const isConfirming = confirmDelete === key;
        const toolCount = s.tools.length;
        const subline = s.status === "connected"
            ? `${s.transport} · ${toolCount} tool${toolCount === 1 ? "" : "s"}`
            : s.status === "connecting"
                ? `${s.transport} · connecting…`
                : s.status === "failed"
                    ? `${s.transport} · failed`
                    : `${s.transport} · disabled`;

        return (
            <ServerCard key={key}>
                <CardHeader>
                    <StatusDot status={s.status} />
                    <CardName title={s.name}>{s.name}</CardName>
                </CardHeader>
                <CardSubline>{subline}{s.shadowed ? " · shadowed by project" : ""}</CardSubline>
                {s.status === "failed" && s.error && <CardError>{s.error}</CardError>}

                {toolCount > 0 && (
                    <>
                        <ToolsExpand type="button" onClick={() => toggleExpanded(key)}>
                            <span className={`codicon codicon-${isExpanded ? "chevron-down" : "chevron-right"}`} style={{ fontSize: 12 }} />
                            Tools ({toolCount})
                        </ToolsExpand>
                        {isExpanded && (
                            <ToolsList>
                                {s.tools.map(t => (
                                    <ToolRow key={t.name}>
                                        <ToolName>{t.name}</ToolName>
                                        {t.description && <ToolDesc>{t.description}</ToolDesc>}
                                    </ToolRow>
                                ))}
                            </ToolsList>
                        )}
                    </>
                )}

                <ActionRow>
                    {isConfirming ? (
                        <ConfirmRow>
                            <span>Delete this server?</span>
                            <Spacer />
                            <DeleteButton type="button" onClick={() => handleDelete(s)}>Yes, delete</DeleteButton>
                            <ActionButton type="button" onClick={() => setConfirmDelete(null)}>Cancel</ActionButton>
                        </ConfirmRow>
                    ) : (
                        <>
                            <ToggleSwitch
                                type="button"
                                on={s.enabled}
                                title={s.enabled ? "Disable" : "Enable"}
                                onClick={() => handleToggleServer(s)}
                            />
                            <Spacer />
                            <ActionButton type="button" onClick={() => handleEdit(s)}>Edit</ActionButton>
                            <DeleteButton type="button" onClick={() => setConfirmDelete(key)}>Delete</DeleteButton>
                        </>
                    )}
                </ActionRow>
            </ServerCard>
        );
    };

    /** Render a section only when it has servers. Empty sections collapse to nothing. */
    const renderSection = (scope: McpScope) => {
        const items = grouped.get(scope) ?? [];
        if (items.length === 0) {
            return null;
        }
        const jsonDisabled = scope === "workspace" && !hasWorkspace;
        return (
            <Section key={scope}>
                <SectionHeader>
                    <SectionTitle>{scopeHeading(scope)} ({items.length})</SectionTitle>
                    <SectionDivider />
                    <Button
                        appearance="icon"
                        tooltip={jsonDisabled ? "No trusted project is open" : "Edit raw JSON"}
                        disabled={jsonDisabled}
                        onClick={scope === "user" ? handleOpenJsonUser : handleOpenJsonProject}
                    >
                        <Codicon name="go-to-file" />
                    </Button>
                </SectionHeader>
                {items.map(renderCard)}
            </Section>
        );
    };

    const hasAnyServers = servers.length > 0;

    return (
        <AIChatView>
            <PanelHeader>
                <Button appearance="icon" onClick={onClose} tooltip="Back to chat">
                    <Codicon name="arrow-left" />
                </Button>
                <PanelTitle>MCP Servers</PanelTitle>
                <HeaderActions>
                    <Button
                        appearance="primary"
                        disabled={!mcpToolsEnabled}
                        onClick={() => setShowAddModal(true)}
                        tooltip="Add a new MCP server"
                    >
                        + Add server
                    </Button>
                    <HeaderInlineToggle
                        type="button"
                        on={mcpToolsEnabled}
                        title={mcpToolsEnabled ? "Disable MCP" : "Enable MCP"}
                        onClick={handleToggleGlobal}
                    />
                </HeaderActions>
            </PanelHeader>

            <PanelContent>
                {!mcpToolsEnabled ? (
                    <EmptyHint>
                        MCP tool support is off. Toggle it on in the header to load servers.
                    </EmptyHint>
                ) : !hasAnyServers ? (
                    <CenteredEmpty>
                        <CenteredEmptyTitle>No MCP servers yet</CenteredEmptyTitle>
                        <CenteredEmptyBody>
                            Click <b>+ Add server</b> at the top right to set up your first one.
                            {!hasWorkspace && (
                                <><br />Open and trust a project to add project-scope servers.</>
                            )}
                        </CenteredEmptyBody>
                    </CenteredEmpty>
                ) : (
                    <>{SCOPE_ORDER.map(renderSection)}</>
                )}
            </PanelContent>

            <AddMcpServerModal
                isOpen={showAddModal || !!editTarget}
                servers={servers}
                hasWorkspace={hasWorkspace}
                editTarget={editTarget ?? undefined}
                onClose={() => { setShowAddModal(false); setEditTarget(null); }}
                onAdded={() => { /* mcpServersChanged refreshes the list */ }}
            />
        </AIChatView>
    );
};

export default McpManagerPanel;
