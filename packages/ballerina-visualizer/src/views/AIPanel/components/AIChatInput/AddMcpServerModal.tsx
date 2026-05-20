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
import { McpServerConfigDTO } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

const NAME_REGEX = /^[a-zA-Z0-9_.-]{1,64}$/;

type Transport = "stdio" | "http";

interface Props {
    isOpen: boolean;
    existingNames: string[];
    onClose: () => void;
    onAdded: () => void;
}

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1999;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Dialog = styled.div`
    z-index: 2000;
    width: 480px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    font-family: var(--vscode-font-family);
    font-size: 13px;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const Title = styled.h2`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-icon-foreground);
    cursor: pointer;
    width: 22px;
    height: 22px;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
    }
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
`;

const TabRow = styled.div`
    display: flex;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const Tab = styled.button<{ active: boolean }>`
    background: transparent;
    border: none;
    color: ${(p: { active: boolean }) => p.active ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)"};
    font-weight: ${(p: { active: boolean }) => p.active ? 600 : 400};
    font-size: 12px;
    font-family: var(--vscode-font-family);
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 2px solid ${(p: { active: boolean }) => p.active ? "var(--vscode-focusBorder, var(--vscode-button-background))" : "transparent"};
    margin-bottom: -1px;
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const Input = styled.input<{ hasError?: boolean }>`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid ${(p: { hasError?: boolean }) => p.hasError ? "var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground))" : "var(--vscode-input-border, var(--vscode-widget-border, var(--vscode-panel-border)))"};
    border-radius: 3px;
    padding: 6px 8px;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    width: 100%;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder, var(--vscode-button-background));
    }

    &::placeholder {
        color: var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground));
    }
`;

const Hint = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const FieldError = styled.div`
    font-size: 11px;
    color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
`;

const Banner = styled.div`
    background: var(--vscode-inputValidation-errorBackground, rgba(255, 0, 0, 0.1));
    color: var(--vscode-errorForeground);
    border: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
    border-radius: 3px;
    padding: 6px 8px;
    font-size: 11px;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const BaseButton = styled.button`
    border-radius: 3px;
    padding: 4px 12px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    min-width: 64px;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const PrimaryButton = styled(BaseButton)`
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: 1px solid var(--vscode-button-background);

    &:hover:not(:disabled) {
        background: var(--vscode-button-hoverBackground, var(--vscode-button-background));
    }
`;

const SecondaryButton = styled(BaseButton)`
    background: var(--vscode-button-secondaryBackground, transparent);
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border: 1px solid var(--vscode-button-border, var(--vscode-widget-border, var(--vscode-panel-border)));

    &:hover:not(:disabled) {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground));
    }
`;

function splitArgs(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed.split(/\s+/);
}

export const AddMcpServerModal: React.FC<Props> = ({ isOpen, existingNames, onClose, onAdded }) => {
    const { rpcClient } = useRpcContext();
    const [transport, setTransport] = useState<Transport>("stdio");
    const [name, setName] = useState("");
    const [command, setCommand] = useState("");
    const [argsText, setArgsText] = useState("");
    const [url, setUrl] = useState("");
    const [bearer, setBearer] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const existingSet = useMemo(() => new Set(existingNames), [existingNames]);

    useEffect(() => {
        if (!isOpen) {
            // Reset on close so reopening shows a fresh form.
            setTransport("stdio");
            setName("");
            setCommand("");
            setArgsText("");
            setUrl("");
            setBearer("");
            setSubmitting(false);
            setServerError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const trimmedName = name.trim();
    const nameError = (() => {
        if (!trimmedName) return null; // empty: don't show error yet, but disable submit
        if (!NAME_REGEX.test(trimmedName)) return "Use letters, digits, _, ., or - only (max 64 chars).";
        if (existingSet.has(trimmedName)) return "A server with this name already exists.";
        return null;
    })();

    const urlError = (() => {
        if (transport !== "http") return null;
        if (!url.trim()) return null;
        try { new URL(url.trim()); return null; }
        catch { return "Enter a valid URL (https://...)."; }
    })();

    const canSubmit = !submitting
        && !!trimmedName
        && !nameError
        && (transport === "stdio"
            ? !!command.trim()
            : !!url.trim() && !urlError);

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setServerError(null);
        const config: McpServerConfigDTO = transport === "stdio"
            ? {
                type: "stdio",
                command: command.trim(),
                ...(argsText.trim() ? { args: splitArgs(argsText) } : {}),
            }
            : {
                type: "http",
                url: url.trim(),
                ...(bearer.trim() ? { headers: { Authorization: `Bearer ${bearer.trim()}` } } : {}),
            };
        try {
            const res = await rpcClient.getAiPanelRpcClient().addMcpServer({ name: trimmedName, config });
            if (!res.success) {
                setServerError(res.error ?? "Failed to add server.");
                setSubmitting(false);
                return;
            }
            onAdded();
            onClose();
        } catch (err: any) {
            setServerError(err?.message ?? String(err));
            setSubmitting(false);
        }
    };

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <Overlay onClick={onClose}>
            <Dialog role="dialog" aria-modal="true" onClick={stopPropagation}>
                <Header>
                    <Title>Add MCP server</Title>
                    <CloseButton type="button" aria-label="Close" onClick={onClose}>
                        <span className="codicon codicon-close" style={{ fontSize: 14 }} />
                    </CloseButton>
                </Header>
                <Body>
                    {serverError && <Banner>{serverError}</Banner>}

                    <FieldGroup>
                        <Label htmlFor="mcp-name">Name</Label>
                        <Input
                            id="mcp-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my-server"
                            hasError={!!nameError}
                            autoFocus
                        />
                        {nameError && <FieldError>{nameError}</FieldError>}
                    </FieldGroup>

                    <FieldGroup>
                        <Label>Transport</Label>
                        <TabRow>
                            <Tab active={transport === "stdio"} onClick={() => setTransport("stdio")}>Stdio</Tab>
                            <Tab active={transport === "http"} onClick={() => setTransport("http")}>HTTP</Tab>
                        </TabRow>
                    </FieldGroup>

                    {transport === "stdio" ? (
                        <>
                            <FieldGroup>
                                <Label htmlFor="mcp-command">Command</Label>
                                <Input
                                    id="mcp-command"
                                    type="text"
                                    value={command}
                                    onChange={(e) => setCommand(e.target.value)}
                                    placeholder="npx"
                                />
                            </FieldGroup>
                            <FieldGroup>
                                <Label htmlFor="mcp-args">Arguments</Label>
                                <Input
                                    id="mcp-args"
                                    type="text"
                                    value={argsText}
                                    onChange={(e) => setArgsText(e.target.value)}
                                    placeholder="-y @modelcontextprotocol/server-everything"
                                />
                                <Hint>Space-separated. Use Edit config for arguments containing spaces.</Hint>
                            </FieldGroup>
                        </>
                    ) : (
                        <>
                            <FieldGroup>
                                <Label htmlFor="mcp-url">URL</Label>
                                <Input
                                    id="mcp-url"
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com/mcp"
                                    hasError={!!urlError}
                                />
                                {urlError && <FieldError>{urlError}</FieldError>}
                            </FieldGroup>
                            <FieldGroup>
                                <Label htmlFor="mcp-bearer">Bearer token</Label>
                                <Input
                                    id="mcp-bearer"
                                    type="password"
                                    value={bearer}
                                    onChange={(e) => setBearer(e.target.value)}
                                    placeholder="Optional"
                                />
                                <Hint>Saved as <code>Authorization: Bearer …</code> header. Use Edit config for other headers.</Hint>
                            </FieldGroup>
                        </>
                    )}
                </Body>
                <Footer>
                    <SecondaryButton type="button" onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
                    <PrimaryButton type="button" onClick={handleSubmit} disabled={!canSubmit}>
                        {submitting ? "Adding..." : "Add"}
                    </PrimaryButton>
                </Footer>
            </Dialog>
        </Overlay>
    );
};

export default AddMcpServerModal;
