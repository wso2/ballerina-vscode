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
import { McpLoadErrorsDTO, McpScope, McpServerConfigDTO, McpServerStatusDTO } from "@wso2/ballerina-core";

import { AIChatView, DangerActionButton, PrimaryActionButton, SecondaryActionButton } from "../styles";
import AddMcpServerModal from "../components/AIChatInput/AddMcpServerModal";
import { ExperimentalTag } from "../components/ExperimentalTag";
import { Loader } from "../components/Loader";

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
`;

const TitleGroup = styled.div`
    flex: 1;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const HeaderActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

const HeaderDivider = styled.div`
    width: 1px;
    height: 14px;
    background: var(--vscode-widget-border, var(--vscode-panel-border));
    opacity: 0.6;
    flex-shrink: 0;
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

const WarningBanner = styled.button`
    width: 100%;
    text-align: left;
    background: var(--vscode-inputValidation-warningBackground, rgba(255, 200, 0, 0.1));
    color: var(--vscode-inputValidation-warningForeground, var(--vscode-foreground));
    border: 1px solid var(--vscode-inputValidation-warningBorder, var(--vscode-charts-orange));
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 8px;

    &:hover {
        background: var(--vscode-inputValidation-warningBackground, rgba(255, 200, 0, 0.18));
    }
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

// Card-row action buttons reuse the shared AI-panel button system
// (Secondary = Edit/Cancel, Danger = Delete). Aliased locally for readability.
const ActionButton = SecondaryActionButton;
const DeleteButton = DangerActionButton;

const ConfirmRow = styled.div`
    flex: 1;
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
    const [loadErrors, setLoadErrors] = useState<McpLoadErrorsDTO>({});
    const [mcpToolsEnabled, setMcpToolsEnabled] = useState(false);
    const [hasWorkspace, setHasWorkspace] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
    // True while we're waiting for the first server list after toggling MCP
    // on/off (or on initial mount). Prevents the "No servers" empty-state from
    // flashing during boot/teardown.
    const [togglePending, setTogglePending] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const api = rpcClient.getAiPanelRpcClient();
        api.getMcpToolsEnabled().then(v => !cancelled && setMcpToolsEnabled(v)).catch(() => { /* noop */ });
        api.getMcpWorkspaceContext().then(ctx => !cancelled && setHasWorkspace(ctx.hasWorkspace)).catch(() => { /* noop */ });
        api.listMcpServers()
            .then(list => { if (!cancelled) { setServers(list); setTogglePending(false); } })
            .catch(() => { if (!cancelled) setTogglePending(false); });
        api.getMcpLoadErrors().then(errs => !cancelled && setLoadErrors(errs)).catch(() => { /* noop */ });
        const disposeServers = rpcClient.onMcpServersChanged((list: McpServerStatusDTO[]) => {
            if (cancelled) return;
            setServers(list);
            setTogglePending(false);
        });
        const disposeErrors = rpcClient.onMcpLoadErrorsChanged((errs: McpLoadErrorsDTO) => {
            if (!cancelled) setLoadErrors(errs);
        });
        return () => {
            cancelled = true;
            disposeServers();
            disposeErrors();
        };
    }, [rpcClient]);

    const grouped = useMemo(() => {
        const byScope = new Map<McpScope, McpServerStatusDTO[]>();
        for (const scope of SCOPE_ORDER) byScope.set(scope, []);
        for (const s of servers) byScope.get(s.scope)?.push(s);
        return byScope;
    }, [servers]);

    const handleToggleGlobal = async () => {
        const next = !mcpToolsEnabled;
        // Optimistic UI; the config_change notification handled by AIChat keeps state in sync.
        setMcpToolsEnabled(next);
        // Backend will tear down or spawn MCP clients asynchronously after the
        // setting update. Show the loader until onMcpServersChanged fires.
        // The 8s safety net guards against a missed notification.
        setTogglePending(true);
        window.setTimeout(() => setTogglePending(false), 8000);
        try {
            await rpcClient.getAiPanelRpcClient().setMcpToolsEnabled({ enabled: next });
        } catch (err) {
            console.warn("[mcp] setMcpToolsEnabled failed:", err);
            setMcpToolsEnabled(prev => !prev);
            setTogglePending(false);
        }
    };

    const [reloading, setReloading] = useState(false);
    const handleReload = async () => {
        setReloading(true);
        try {
            const api = rpcClient.getAiPanelRpcClient();
            const [list, errs] = await Promise.all([
                api.listMcpServers(),
                api.getMcpLoadErrors(),
            ]);
            setServers(list);
            setLoadErrors(errs);
        } catch (err) {
            console.warn("[mcp] reload failed:", err);
        } finally {
            // Brief spin so the user sees the action happened even on fast networks.
            setTimeout(() => setReloading(false), 300);
        }
    };

    const handleToggleServer = async (s: McpServerStatusDTO) => {
        await rpcClient.getAiPanelRpcClient().setMcpServerEnabled({ scope: s.scope, name: s.name, enabled: !s.enabled });
    };

    const handleOpenJsonUser = () => rpcClient.getAiPanelRpcClient().openMcpConfig({ scope: "user" });
    const handleOpenJsonProject = () => rpcClient.getAiPanelRpcClient().openMcpConfig({ scope: "workspace" });

    const hasErrors = !!loadErrors.user || !!loadErrors.workspace;

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
                <TitleGroup>
                    <PanelTitle>MCP Servers</PanelTitle>
                    <ExperimentalTag size="sm" tooltip="MCP tool support is experimental and may change." />
                    <HeaderInlineToggle
                        type="button"
                        on={mcpToolsEnabled}
                        title={mcpToolsEnabled ? "Disable MCP" : "Enable MCP"}
                        onClick={handleToggleGlobal}
                    />
                </TitleGroup>
                <HeaderDivider />
                <HeaderActions>
                    <Button
                        appearance="icon"
                        tooltip="Reload servers"
                        disabled={!mcpToolsEnabled || reloading}
                        onClick={handleReload}
                    >
                        <span className={`codicon codicon-refresh${reloading ? " codicon-modifier-spin" : ""}`} />
                    </Button>
                    <PrimaryActionButton
                        type="button"
                        disabled={!mcpToolsEnabled}
                        onClick={() => setShowAddModal(true)}
                        title="Add a new MCP server"
                    >
                        <span className="codicon codicon-add" style={{ fontSize: 12 }} />
                        Add server
                    </PrimaryActionButton>
                </HeaderActions>
            </PanelHeader>

            <PanelContent>
                {hasErrors && mcpToolsEnabled && (
                    <>
                        {loadErrors.user && (
                            <WarningBanner type="button" onClick={handleOpenJsonUser} title={loadErrors.user}>
                                <span className="codicon codicon-warning" style={{ fontSize: 14, marginTop: 1 }} />
                                <span>Couldn't read user mcp.json — click to open in editor.</span>
                            </WarningBanner>
                        )}
                        {loadErrors.workspace && (
                            <WarningBanner type="button" onClick={handleOpenJsonProject} title={loadErrors.workspace}>
                                <span className="codicon codicon-warning" style={{ fontSize: 14, marginTop: 1 }} />
                                <span>Couldn't read project .mcp.json — click to open in editor.</span>
                            </WarningBanner>
                        )}
                    </>
                )}
                {!mcpToolsEnabled ? (
                    <EmptyHint>
                        MCP tool support is off. Toggle it on in the header to load servers.
                    </EmptyHint>
                ) : togglePending ? (
                    <Loader label="Loading MCP servers…" />
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
