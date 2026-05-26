/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, Icon } from "@wso2/ui-toolkit";

import { AIChatView, DangerActionButton, PrimaryActionButton, SuccessActionButton } from "../styles";
import { AIMachineEventType, McpServerStatusDTO } from "@wso2/ballerina-core";
import { CustomizeRow, CustomizeEntry } from "./CustomizeRow";
import type { PanelRoute } from "../components/AIChat";

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

const PanelContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const PanelFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-top: 1px solid var(--vscode-panel-border);
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
    font-family: var(--vscode-font-family);
`;

// ── Section ───────────────────────────────────────────────────────────────────

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SectionHeader = styled.h3`
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vscode-descriptionForeground);
    margin: 0;
    font-family: var(--vscode-font-family);
`;

const SettingRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
`;

const SettingInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const SettingLabel = styled.span`
    font-size: 13px;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
`;

const SettingDescription = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family);
`;

const EntryList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

// ── Component ─────────────────────────────────────────────────────────────────

interface SettingsPanelProps {
    onClose: () => void;
    onNavigate?: (route: PanelRoute) => void;
    mcpToolsEnabled?: boolean;
}

export const SettingsPanel = (props: SettingsPanelProps) => {
    const { rpcClient } = useRpcContext();

    const [copilotAuthorized, setCopilotAuthorized] = React.useState(false);
    const [mcpEnabled, setMcpEnabled] = useState(!!props.mcpToolsEnabled);
    const [mcpServers, setMcpServers] = useState<McpServerStatusDTO[]>([]);

    useEffect(() => {
        isCopilotAuthorized().then(setCopilotAuthorized);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const api = rpcClient.getAiPanelRpcClient();
        api.getMcpToolsEnabled().then(v => !cancelled && setMcpEnabled(v)).catch(() => { /* noop */ });
        if (props.mcpToolsEnabled) {
            api.listMcpServers().then(list => !cancelled && setMcpServers(list)).catch(() => { /* noop */ });
        }
        const dispose = rpcClient.onMcpServersChanged((list: McpServerStatusDTO[]) => {
            if (!cancelled) setMcpServers(list);
        });
        return () => { cancelled = true; dispose(); };
    }, [rpcClient, props.mcpToolsEnabled]);

    const mcpSubtitle = (() => {
        if (!mcpEnabled) return "Off";
        if (mcpServers.length === 0) return "No servers configured";
        const connected = mcpServers.filter(s => s.status === "connected").length;
        const tools = mcpServers.reduce((acc, s) => acc + s.tools.length, 0);
        return `${connected}/${mcpServers.length} connected · ${tools} tool${tools === 1 ? "" : "s"}`;
    })();

    const customizeEntries: CustomizeEntry[] = [
        {
            id: "mcp",
            icon: <Icon name="PowerPlug" sx={{ fontSize: "18px", display: "flex", alignItems: "center" }} />,
            label: "MCP servers",
            subtitle: mcpSubtitle,
            onOpenPanel: () => props.onNavigate?.("mcp"),
        },
        {
            id: "skills",
            icon: <span className="codicon codicon-lightbulb-sparkle" style={{ fontSize: 16 }} />,
            label: "Skills",
            subtitle: "Coming soon",
            disabled: true,
            onOpenPanel: () => props.onNavigate?.("skills"),
        },
        {
            id: "agents",
            icon: <span className="codicon codicon-file" style={{ fontSize: 16 }} />,
            label: "Agent instructions",
            subtitle: "Coming soon",
            disabled: true,
            toggle: { on: false, onToggle: () => { /* noop */ } },
            onEditFile: () => { /* noop */ },
            editFileTitle: "Edit AGENTS.md",
        },
    ];

    const handleCopilotLogout = () => {
        rpcClient.sendAIStateEvent(AIMachineEventType.LOGOUT);
    };

    const handleAuthorizeCopilot = async () => {
        const resp = await rpcClient.getAiPanelRpcClient().promptGithubAuthorize();
        setCopilotAuthorized(!!resp);
    };

    const isCopilotAuthorized = async () => {
        return await rpcClient.getAiPanelRpcClient().isCopilotSignedIn();
    };

    return (
        <AIChatView>
            <PanelHeader>
                <Button appearance="icon" onClick={() => props.onClose()} tooltip="Back to chat">
                    <Codicon name="arrow-left" />
                </Button>
                <PanelTitle>Settings</PanelTitle>
            </PanelHeader>

            <PanelContent>
                {/* Customize Copilot */}
                <Section>
                    <SectionHeader>Customize Copilot</SectionHeader>
                    <EntryList>
                        {customizeEntries.map(entry => (
                            <CustomizeRow key={entry.id} entry={entry} />
                        ))}
                    </EntryList>
                </Section>

                {/* Integrations */}
                <Section>
                    <SectionHeader>Integrations</SectionHeader>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>GitHub Copilot</SettingLabel>
                            <SettingDescription>Enable inline completions via GitHub Copilot</SettingDescription>
                        </SettingInfo>
                        {copilotAuthorized ? (
                            <SuccessActionButton type="button" disabled>
                                <span className="codicon codicon-check" style={{ fontSize: 12 }} />
                                Authorized
                            </SuccessActionButton>
                        ) : (
                            <PrimaryActionButton type="button" onClick={handleAuthorizeCopilot}>
                                Authorize
                            </PrimaryActionButton>
                        )}
                    </SettingRow>
                </Section>

                {/* Account */}
                <Section>
                    <SectionHeader>Account</SectionHeader>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>Sign out</SettingLabel>
                            <SettingDescription>End your session and disconnect from AI services</SettingDescription>
                        </SettingInfo>
                        <DangerActionButton type="button" onClick={handleCopilotLogout}>
                            <span className="codicon codicon-sign-out" style={{ fontSize: 12 }} />
                            Sign out
                        </DangerActionButton>
                    </SettingRow>
                </Section>
            </PanelContent>

            <PanelFooter>
                <span>Settings persist across sessions</span>
            </PanelFooter>
        </AIChatView>
    );
};
