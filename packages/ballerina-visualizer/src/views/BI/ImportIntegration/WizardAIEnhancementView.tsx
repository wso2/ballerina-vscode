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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "@emotion/styled";
import { ChatNotify } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import MarkdownRenderer from "../../AIPanel/components/MarkdownRenderer";
import { splitContent, SegmentType } from "../../AIPanel/components/AIChat/segment";
import ToolCallSegment from "../../AIPanel/components/ToolCallSegment";
import ToolCallGroupSegment, { ToolCallItem } from "../../AIPanel/components/ToolCallGroupSegment";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type EnhancementStatus = "running" | "completed" | "error" | "aborted";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers (mirrors AIChat tool-call markup injection)
// ──────────────────────────────────────────────────────────────────────────────

function formatFileNameForDisplay(filePath: string): string {
    let displayName = filePath.replace(/\.bal$/, "");
    const lastSlashIndex = displayName.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
        const directory = displayName.substring(0, lastSlashIndex + 1);
        const fileName = displayName.substring(lastSlashIndex + 1);
        displayName = directory + fileName.replace(/[_-]/g, " ");
    } else {
        displayName = displayName.replace(/[_-]/g, " ");
    }
    return displayName;
}

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
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
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
    max-height: 60vh;
    overflow-y: auto;
    padding: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background-color: var(--vscode-editor-background);
    font-size: 13px;
    line-height: 1.6;
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

const SubText = styled.span`
    font-size: 11px;
    font-weight: 400;
    color: var(--vscode-descriptionForeground);
    margin-top: 1px;
`;

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function WizardAIEnhancementView() {
    const { rpcClient } = useRpcContext();
    const scrollRef = useRef<HTMLDivElement>(null);
    const enhancementTriggered = useRef(false);

    const [status, setStatus] = useState<EnhancementStatus>("running");
    // Single content string with inline <toolcall>/<toolresult> markup,
    // exactly like the AI Panel's approach.
    const [content, setContent] = useState("");
    // Uptime counter – seconds since the enhancement started
    const [elapsed, setElapsed] = useState(0);

    // Track terminal status in a ref so the callback always sees the latest
    // value without needing `status` in its dependency array.
    const terminalRef = useRef(false);

    // ── Uptime counter ─────────────────────────────────────────────────────
    useEffect(() => {
        if (status !== "running") {
            return;
        }
        setElapsed(0);
        const id = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [status]);

    function formatElapsed(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        }
        return `${m}:${String(s).padStart(2, "0")}`;
    }

    // ── Helper to update content ──────────────────────────────────────────
    const updateContent = useCallback(
        (updater: (prev: string) => string) => setContent(updater),
        []
    );

    // ── Chat event handler ────────────────────────────────────────────────
    const handleChatEvent = useCallback(
        (event: ChatNotify) => {
            if (terminalRef.current) {
                return;
            }

            switch (event.type) {
                case "start":
                    setStatus("running");
                    setContent("");
                    break;

                case "content_block":
                    updateContent((prev) => prev + event.content);
                    break;

                case "content_replace":
                    setContent(event.content);
                    break;

                // ── Inject <toolcall> markup into the content string ──────
                case "tool_call": {
                    const toolName = event.toolName;
                    const toolCallId = event.toolCallId;
                    const toolInput = event.toolInput;

                    if (toolName === "LibrarySearchTool") {
                        const desc = toolInput?.searchDescription;
                        const msg = desc
                            ? `Searching for ${desc}...`
                            : "Searching for libraries...";
                        updateContent(
                            (prev) =>
                                prev +
                                `\n\n<toolcall id="${toolCallId}" tool="${toolName}">${msg}</toolcall>`
                        );
                    } else if (toolName === "LibraryGetTool") {
                        updateContent(
                            (prev) =>
                                prev +
                                `\n\n<toolcall id="${toolCallId}" tool="${toolName}">Fetching library details...</toolcall>`
                        );
                    } else if (toolName === "HealthcareLibraryProviderTool") {
                        updateContent(
                            (prev) =>
                                prev +
                                `\n\n<toolcall tool="${toolName}">Analyzing request & selecting healthcare libraries...</toolcall>`
                        );
                    } else if (
                        ["file_write", "file_edit", "file_batch_edit"].includes(
                            toolName
                        )
                    ) {
                        const fileName =
                            toolInput?.fileName || "file";
                        const displayName =
                            formatFileNameForDisplay(fileName);
                        const msg =
                            toolName === "file_write"
                                ? `Creating ${displayName}...`
                                : `Updating ${displayName}...`;
                        updateContent(
                            (prev) =>
                                prev +
                                `\n\n<toolcall tool="${toolName}">${msg}</toolcall>`
                        );
                    } else if (toolName === "getCompilationErrors") {
                        updateContent(
                            (prev) =>
                                prev +
                                `\n\n<toolcall tool="${toolName}">Checking for errors...</toolcall>`
                        );
                    } else if (toolName === "runTests") {
                        updateContent(
                            (prev) =>
                                prev +
                                `\n\n<toolcall id="${toolCallId}" tool="${toolName}">Running tests...</toolcall>`
                        );
                    }
                    break;
                }

                // ── Replace <toolcall> with <toolresult> ─────────────────
                case "tool_result": {
                    const toolName = event.toolName;
                    const toolCallId = event.toolCallId;
                    const toolOutput = event.toolOutput;

                    if (toolName === "LibrarySearchTool") {
                        const desc = toolOutput?.searchDescription;
                        const origMsg = desc
                            ? `Searching for ${desc}...`
                            : "Searching for libraries...";
                        const doneMsg = desc
                            ? `${desc.charAt(0).toUpperCase() + desc.slice(1)} search completed`
                            : "Library search completed";
                        updateContent((prev) =>
                            prev.replace(
                                `<toolcall id="${toolCallId}" tool="${toolName}">${origMsg}</toolcall>`,
                                `<toolresult id="${toolCallId}" tool="${toolName}">${doneMsg}</toolresult>`
                            )
                        );
                    } else if (toolName === "LibraryGetTool") {
                        const libs = toolOutput || [];
                        const resultMsg =
                            libs.length === 0
                                ? "No relevant libraries found"
                                : `Fetched libraries: [${libs.join(", ")}]`;
                        updateContent((prev) =>
                            prev.replace(
                                `<toolcall id="${toolCallId}" tool="${toolName}">Fetching library details...</toolcall>`,
                                `<toolresult id="${toolCallId}" tool="${toolName}">${resultMsg}</toolresult>`
                            )
                        );
                    } else if (toolName === "HealthcareLibraryProviderTool") {
                        const libs = toolOutput || [];
                        const resultMsg =
                            libs.length === 0
                                ? "No relevant healthcare libraries found."
                                : `Fetched healthcare libraries: [${libs.join(", ")}]`;
                        updateContent((prev) =>
                            prev.replace(
                                `<toolcall tool="${toolName}">Analyzing request & selecting healthcare libraries...</toolcall>`,
                                `<toolresult tool="${toolName}">${resultMsg}</toolresult>`
                            )
                        );
                    } else if (
                        ["file_write", "file_edit", "file_batch_edit"].includes(
                            toolName
                        )
                    ) {
                        updateContent((prev) => {
                            const creatingPattern =
                                /<toolcall tool="([^"]+)">Creating (.+?)\.\.\.<\/toolcall>/;
                            const updatingPattern =
                                /<toolcall tool="([^"]+)">Updating (.+?)\.\.\.<\/toolcall>/;

                            if (creatingPattern.test(prev)) {
                                const action = toolOutput?.action;
                                const resultText =
                                    action === "updated"
                                        ? "Updated"
                                        : "Created";
                                return prev.replace(
                                    creatingPattern,
                                    (_m, tn, fn) =>
                                        `<toolresult tool="${tn}">${resultText} ${fn}</toolresult>`
                                );
                            }
                            if (updatingPattern.test(prev)) {
                                return prev.replace(
                                    updatingPattern,
                                    (_m, tn, fn) =>
                                        `<toolresult tool="${tn}">Updated ${fn}</toolresult>`
                                );
                            }
                            return prev;
                        });
                    } else if (toolName === "getCompilationErrors") {
                        const errors =
                            toolOutput?.diagnostics || [];
                        const errorCount = errors.length;
                        const msg =
                            errorCount === 0
                                ? "No errors found"
                                : `Found ${errorCount} error${errorCount > 1 ? "s" : ""}`;
                        const pattern = new RegExp(
                            `<toolcall tool="${toolName}">Checking for errors\\.\\.\\.<\\/toolcall>`
                        );
                        updateContent((prev) =>
                            prev.replace(
                                pattern,
                                `<toolresult tool="${toolName}">${msg}</toolresult>`
                            )
                        );
                    } else if (toolName === "runTests") {
                        if (toolCallId) {
                            const resultMsg =
                                toolOutput?.summary ?? "Tests completed";
                            updateContent((prev) =>
                                prev.replace(
                                    `<toolcall id="${toolCallId}" tool="${toolName}">Running tests...</toolcall>`,
                                    `<toolresult id="${toolCallId}" tool="${toolName}">${resultMsg}</toolresult>`
                                )
                            );
                        }
                    }
                    break;
                }

                case "stop":
                    terminalRef.current = true;
                    setStatus("completed");
                    break;

                case "error":
                    updateContent(
                        (prev) =>
                            prev +
                            `\n\n**Error:** ${event.content ?? "An unexpected error occurred."}`
                    );
                    terminalRef.current = true;
                    setStatus("error");
                    break;

                case "abort":
                    terminalRef.current = true;
                    setStatus("aborted");
                    break;

                default:
                    break;
            }
        },
        [updateContent]
    );

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

        const client = rpcClient.getMigrateIntegrationRpcClient();
        client.wizardEnhancementReady().catch((err: unknown) => {
            console.error(
                "[WizardAIEnhancementView] wizardEnhancementReady failed:",
                err
            );
            setStatus("error");
        });
    }, [rpcClient]);

    // ── Auto-scroll ───────────────────────────────────────────────────────
    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [content]);

    // ── Parse content into segments ───────────────────────────────────────
    const segments = useMemo(() => splitContent(content), [content]);

    // ── Actions ───────────────────────────────────────────────────────────
    const handleOpenProject = useCallback(() => {
        rpcClient
            .getMigrateIntegrationRpcClient()
            .openMigratedProject()
            .catch((err: unknown) => {
                console.error(
                    "[WizardAIEnhancementView] openMigratedProject failed:",
                    err
                );
            });
    }, [rpcClient]);

    const handleSkipAndOpen = useCallback(() => {
        const client = rpcClient.getMigrateIntegrationRpcClient();
        client.abortMigrationAgent().catch(() => {
            /* best effort */
        });
        client.openMigratedProject().catch((err: unknown) => {
            console.error(
                "[WizardAIEnhancementView] openMigratedProject (skip) failed:",
                err
            );
        });
    }, [rpcClient]);

    // ── Render ────────────────────────────────────────────────────────────
    const isRunning = status === "running";
    const isDone =
        status === "completed" ||
        status === "error" ||
        status === "aborted";

    return (
        <Container>
            <HeaderRow>
                {isRunning && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <SpinnerIcon className="codicon codicon-sync" />
                            <StatusText variant="running">
                                AI Enhancement in progress…
                            </StatusText>
                            <span style={{ fontSize: "11px", color: "var(--vscode-descriptionForeground)", fontVariantNumeric: "tabular-nums" }}>
                                [{formatElapsed(elapsed)}]
                            </span>
                        </div>
                        <SubText>This may take a while.</SubText>
                    </>
                )}
                {status === "completed" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                            className="codicon codicon-check"
                            style={{
                                color: "var(--vscode-testing-iconPassed)",
                            }}
                        />
                        <StatusText variant="success">
                            AI Enhancement completed
                        </StatusText>
                    </div>
                )}
                {status === "error" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                            className="codicon codicon-error"
                            style={{
                                color: "var(--vscode-errorForeground)",
                            }}
                        />
                        <StatusText variant="error">
                            AI Enhancement encountered an error
                        </StatusText>
                    </div>
                )}
                {status === "aborted" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="codicon codicon-circle-slash" />
                        <StatusText>
                            AI Enhancement was skipped
                        </StatusText>
                    </div>
                )}
            </HeaderRow>

            <StreamArea ref={scrollRef}>
                {/* Render parsed segments inline — text, tool calls, etc. */}
                {segments.map((segment, i) => {
                    if (segment.type === SegmentType.Text) {
                        if (!segment.text.trim()) {
                            return null;
                        }
                        return (
                            <MarkdownRenderer
                                key={`text-${i}`}
                                markdownContent={segment.text}
                            />
                        );
                    }

                    if (segment.type === SegmentType.ToolCall) {
                        const currentToolName = segment.toolName;

                        // Skip if the next non-whitespace segment is the
                        // same tool (will be grouped from that later segment).
                        let nextIdx = i + 1;
                        while (
                            nextIdx < segments.length &&
                            segments[nextIdx].type === SegmentType.Text &&
                            segments[nextIdx].text.trim() === ""
                        ) {
                            nextIdx++;
                        }
                        const nextSeg = segments[nextIdx];
                        if (
                            nextSeg &&
                            nextSeg.type === SegmentType.ToolCall &&
                            nextSeg.toolName === currentToolName
                        ) {
                            return null;
                        }

                        // Collect consecutive same-tool segments backward
                        const groupItems: ToolCallItem[] = [];
                        let j = i;
                        while (j >= 0) {
                            const seg = segments[j];
                            if (
                                seg.type === SegmentType.ToolCall &&
                                seg.toolName === currentToolName
                            ) {
                                groupItems.unshift({
                                    text: seg.text,
                                    loading: seg.loading,
                                    failed: seg.failed,
                                    toolName: seg.toolName,
                                });
                            } else if (
                                seg.type === SegmentType.Text &&
                                seg.text.trim() === ""
                            ) {
                                j--;
                                continue;
                            } else {
                                break;
                            }
                            j--;
                        }

                        if (groupItems.length === 1) {
                            return (
                                <ToolCallSegment
                                    key={`tool-${i}`}
                                    text={segment.text}
                                    loading={segment.loading}
                                    failed={segment.failed}
                                />
                            );
                        }

                        return (
                            <ToolCallGroupSegment
                                key={`tool-group-${i}`}
                                segments={groupItems}
                            />
                        );
                    }

                    // Fallback: render as markdown
                    if (segment.text.trim()) {
                        return (
                            <MarkdownRenderer
                                key={`fallback-${i}`}
                                markdownContent={segment.text}
                            />
                        );
                    }
                    return null;
                })}

                {/* Placeholder while waiting for first event */}
                {isRunning && segments.length === 0 && (
                    <StatusText variant="running">
                        Starting AI enhancement agent…
                    </StatusText>
                )}
            </StreamArea>

            <ButtonRow>
                {isDone && (
                    <ActionButton
                        variant="primary"
                        onClick={handleOpenProject}
                    >
                        <span className="codicon codicon-folder-opened" />
                        Open Project
                    </ActionButton>
                )}
                {isRunning && (
                    <ActionButton
                        variant="secondary"
                        onClick={handleSkipAndOpen}
                    >
                        <span className="codicon codicon-debug-step-over" />
                        Pause &amp; Open
                    </ActionButton>
                )}
            </ButtonRow>
        </Container>
    );
}
