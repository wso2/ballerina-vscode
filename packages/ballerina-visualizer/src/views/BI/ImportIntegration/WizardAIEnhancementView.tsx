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

import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { ChatNotify } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import MarkdownRenderer from "../../AIPanel/components/MarkdownRenderer";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface ToolCallEntry {
    name: string;
    id?: string;
}

type EnhancementStatus = "running" | "completed" | "error" | "aborted";

// ──────────────────────────────────────────────────────────────────────────────
// Styled Components
// ──────────────────────────────────────────────────────────────────────────────

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
`;

const StatusText = styled.span<{ variant?: "success" | "error" | "running" }>`
    font-size: 12px;
    font-weight: 500;
    color: ${(props: { variant?: string }) => {
        switch (props.variant) {
            case "success":
                return "var(--vscode-testing-iconPassed)";
            case "error":
                return "var(--vscode-errorForeground)";
            default:
                return "var(--vscode-descriptionForeground)";
        }
    }};
`;

const StreamArea = styled.div`
    flex: 1;
    max-height: 400px;
    overflow-y: auto;
    padding: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background-color: var(--vscode-editor-background);
    font-size: 13px;
    line-height: 1.6;
`;

const ToolCallBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    margin: 2px 0;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
`;

const ToolCallList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 4px 0;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const ActionButton = styled.button<{ variant?: "primary" | "secondary" }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid
        ${(props: { variant?: string }) =>
            props.variant === "secondary"
                ? "var(--vscode-button-secondaryBackground)"
                : "var(--vscode-button-background)"};
    background-color: ${(props: { variant?: string }) =>
        props.variant === "secondary"
            ? "var(--vscode-button-secondaryBackground)"
            : "var(--vscode-button-background)"};
    color: ${(props: { variant?: string }) =>
        props.variant === "secondary"
            ? "var(--vscode-button-secondaryForeground)"
            : "var(--vscode-button-foreground)"};

    &:hover {
        opacity: 0.85;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SpinnerIcon = styled.span`
    display: inline-block;
    animation: spin 1s linear infinite;
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function WizardAIEnhancementView() {
    const { rpcClient } = useRpcContext();
    const scrollRef = useRef<HTMLDivElement>(null);
    const enhancementTriggered = useRef(false);

    const [status, setStatus] = useState<EnhancementStatus>("running");
    const [currentContent, setCurrentContent] = useState("");
    const [completedContent, setCompletedContent] = useState<string[]>([]);
    const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([]);

    // Track terminal status in a ref so the callback always sees the latest
    // value without needing `status` in its dependency array.
    const terminalRef = useRef(false);

    // ── Chat event handler ────────────────────────────────────────────────
    const handleChatEvent = useCallback((event: ChatNotify) => {
        // Once we reach a terminal state, ignore further events (the SDK
        // may still have in-flight tool calls that emit events).
        if (terminalRef.current) {
            return;
        }

        switch (event.type) {
            case "start":
                setStatus("running");
                setCurrentContent("");
                break;

            case "content_block":
                setCurrentContent((prev) => prev + event.content);
                break;

            case "content_replace":
                setCurrentContent(event.content);
                break;

            case "tool_call":
                setToolCalls((prev) => [
                    ...prev,
                    { name: event.toolName, id: event.toolCallId },
                ]);
                break;

            case "tool_result":
                // We don't need full tool results in the wizard view — the
                // badge list already shows which tools were invoked.
                break;

            case "stop":
                // Flush any remaining streamed content
                setCurrentContent((prev) => {
                    if (prev.trim()) {
                        setCompletedContent((msgs) => [...msgs, prev]);
                    }
                    return "";
                });
                terminalRef.current = true;
                setStatus("completed");
                break;

            case "error":
                setCurrentContent((prev) => {
                    if (prev.trim()) {
                        setCompletedContent((msgs) => [...msgs, prev]);
                    }
                    return "";
                });
                setCompletedContent((msgs) => [
                    ...msgs,
                    `**Error:** ${event.content ?? "An unexpected error occurred."}`,
                ]);
                terminalRef.current = true;
                setStatus("error");
                break;

            case "abort":
                terminalRef.current = true;
                setStatus("aborted");
                setCurrentContent("");
                break;

            default:
                break;
        }
    }, []);

    // ── Subscribe to streaming events & trigger the agent ─────────────────
    useEffect(() => {
        rpcClient.onChatNotify((event: ChatNotify) => {
            handleChatEvent(event);
        });
    }, [rpcClient, handleChatEvent]);

    useEffect(() => {
        if (enhancementTriggered.current) {
            return;
        }
        enhancementTriggered.current = true;

        // Signal the backend to start the wizard-level AI enhancement agent
        const client = rpcClient.getMigrateIntegrationRpcClient();
        client.wizardEnhancementReady().catch((err: unknown) => {
            console.error("[WizardAIEnhancementView] wizardEnhancementReady failed:", err);
            setStatus("error");
        });
    }, [rpcClient]);

    // ── Auto-scroll ───────────────────────────────────────────────────────
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [currentContent, completedContent, toolCalls]);

    // ── Actions ───────────────────────────────────────────────────────────
    const handleOpenProject = useCallback(() => {
        rpcClient.getMigrateIntegrationRpcClient().openMigratedProject().catch((err: unknown) => {
            console.error("[WizardAIEnhancementView] openMigratedProject failed:", err);
        });
    }, [rpcClient]);

    const handleSkipAndOpen = useCallback(() => {
        // Abort the running agent, then open the project
        const client = rpcClient.getMigrateIntegrationRpcClient();
        client.abortMigrationAgent().catch(() => { /* best effort */ });
        client.openMigratedProject().catch((err: unknown) => {
            console.error("[WizardAIEnhancementView] openMigratedProject (skip) failed:", err);
        });
    }, [rpcClient]);

    // ── Render ────────────────────────────────────────────────────────────
    const isRunning = status === "running";
    const isDone = status === "completed" || status === "error" || status === "aborted";

    return (
        <Container>
            <HeaderRow>
                {isRunning && (
                    <>
                        <SpinnerIcon className="codicon codicon-sync" />
                        <StatusText variant="running">AI Enhancement in progress…</StatusText>
                    </>
                )}
                {status === "completed" && (
                    <>
                        <span className="codicon codicon-check" style={{ color: "var(--vscode-testing-iconPassed)" }} />
                        <StatusText variant="success">AI Enhancement completed</StatusText>
                    </>
                )}
                {status === "error" && (
                    <>
                        <span className="codicon codicon-error" style={{ color: "var(--vscode-errorForeground)" }} />
                        <StatusText variant="error">AI Enhancement encountered an error</StatusText>
                    </>
                )}
                {status === "aborted" && (
                    <>
                        <span className="codicon codicon-circle-slash" />
                        <StatusText>AI Enhancement was skipped</StatusText>
                    </>
                )}
            </HeaderRow>

            <StreamArea ref={scrollRef}>
                {/* Completed content blocks */}
                {completedContent.map((block, idx) => (
                    <div key={`block-${idx}`}>
                        <MarkdownRenderer markdownContent={block} />
                    </div>
                ))}

                {/* Currently streaming content */}
                {currentContent && (
                    <div>
                        <MarkdownRenderer markdownContent={currentContent} />
                    </div>
                )}

                {/* Tool call badges */}
                {toolCalls.length > 0 && (
                    <ToolCallList>
                        {toolCalls.map((tc, idx) => (
                            <ToolCallBadge key={`tc-${idx}`}>
                                <span className="codicon codicon-tools" style={{ fontSize: "10px" }} />
                                {tc.name}
                            </ToolCallBadge>
                        ))}
                    </ToolCallList>
                )}

                {/* Placeholder while waiting for first event */}
                {isRunning && !currentContent && completedContent.length === 0 && toolCalls.length === 0 && (
                    <StatusText variant="running">
                        Starting AI enhancement agent…
                    </StatusText>
                )}
            </StreamArea>

            <ButtonRow>
                {isDone && (
                    <ActionButton variant="primary" onClick={handleOpenProject}>
                        <span className="codicon codicon-folder-opened" />
                        Open Project
                    </ActionButton>
                )}
                {isRunning && (
                    <ActionButton variant="secondary" onClick={handleSkipAndOpen}>
                        <span className="codicon codicon-debug-step-over" />
                        Skip &amp; Open Project
                    </ActionButton>
                )}
            </ButtonRow>
        </Container>
    );
}
