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
import React, { useEffect } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon } from "@wso2/ui-toolkit";

import { AIChatView } from "../styles";
import { AIMachineEventType } from "@wso2/ballerina-core";

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

// ── Action buttons ────────────────────────────────────────────────────────────

const SignOutButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: var(--vscode-font-family);
    transition: color 0.15s ease, border-color 0.15s ease;
    color: var(--vscode-descriptionForeground);
    background: transparent;
    border: 1px solid var(--vscode-panel-border, var(--vscode-input-border));
    &:hover {
        color: var(--vscode-errorForeground);
        border-color: var(--vscode-errorForeground);
    }
`;

const CopilotButton = styled.button<{ authorized: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: var(--vscode-font-family);
    transition: all 0.15s ease;

    ${(props: { authorized: boolean }) => props.authorized ? `
        color: var(--vscode-charts-green, #388a34);
        background: transparent;
        border: 1px solid var(--vscode-charts-green, #388a34);
        cursor: default;
        opacity: 0.85;
    ` : `
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
        border: 1px solid transparent;
        &:hover { background: var(--vscode-button-hoverBackground); }
    `}
`;

// ── Component ─────────────────────────────────────────────────────────────────

export const SettingsPanel = (props: { onClose: () => void }) => {
    const { rpcClient } = useRpcContext();

    const [copilotAuthorized, setCopilotAuthorized] = React.useState(false);

    useEffect(() => {
        isCopilotAuthorized().then(setCopilotAuthorized);
    }, []);

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
                {/* Integrations */}
                <Section>
                    <SectionHeader>Integrations</SectionHeader>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>GitHub Copilot</SettingLabel>
                            <SettingDescription>Enable inline completions via GitHub Copilot</SettingDescription>
                        </SettingInfo>
                        <CopilotButton authorized={copilotAuthorized} onClick={copilotAuthorized ? undefined : handleAuthorizeCopilot}>
                            {copilotAuthorized ? "Authorized" : "Authorize"}
                        </CopilotButton>
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
                        <SignOutButton onClick={handleCopilotLogout}>
                            <span className="codicon codicon-sign-out" style={{ fontSize: 12 }} />
                            Sign out
                        </SignOutButton>
                    </SettingRow>
                </Section>
            </PanelContent>

            <PanelFooter>
                <span>Settings persist across sessions</span>
            </PanelFooter>
        </AIChatView>
    );
};
