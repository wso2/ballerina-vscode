/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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
import { useBiWsContext } from "../wsManager/WsClientContext";
import MarkdownRenderer from "../../AIPanel/components/MarkdownRenderer";
import { splitContent, SegmentType } from "../../AIPanel/components/AIChat/segment";
import ToolCallSegment from "../../AIPanel/components/ToolCallSegment";
import ToolCallGroupSegment, { ToolCallItem } from "../../AIPanel/components/ToolCallGroupSegment";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type EnhancementStatus = "checking_auth" | "sign_in_required" | "signing_in" | "running" | "paused" | "completed" | "error" | "aborted";

type LoginMethod = "none" | "sso" | "anthropic" | "aws" | "vertex";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function formatFileNameForDisplay(filePath: string): string {
    // Normalize Windows backslashes to forward slashes; preserve full path including extension
    return filePath.replace(/\\/g, "/");
}

/** Escapes regex metacharacters so a value can be embedded literally in a RegExp. */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    justify-content: flex-end;
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

const SignInPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background-color: var(--vscode-editor-background);
`;

const SignInMessage = styled.p`
    margin: 0;
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    line-height: 1.5;
`;

const SignInErrorText = styled.p`
    margin: 0;
    font-size: 11px;
    color: var(--vscode-errorForeground);
`;

const SignInDivider = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    &::before, &::after {
        content: "";
        flex: 1;
        height: 1px;
        background: var(--vscode-panel-border);
    }
`;

const TextLinkButton = styled.button`
    background: none;
    border: none;
    padding: 0;
    font-size: 12px;
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    text-align: left;
    text-decoration: underline;
    &:hover {
        color: var(--vscode-textLink-activeForeground);
    }
`;

const CredentialForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const CredentialInput = styled.input`
    width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 12px;
    box-sizing: border-box;
    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        border-color: var(--vscode-focusBorder);
    }
`;

// Multi-line variant for pasted PEM keys — a single-line <input> silently strips
// the newlines a PEM private key depends on.
const CredentialTextArea = styled.textarea`
    width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    box-sizing: border-box;
    resize: vertical;
    min-height: 72px;
    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        border-color: var(--vscode-focusBorder);
    }
`;

const CredentialLabel = styled.label`
    display: block;
    font-size: 11px;
    color: var(--vscode-foreground);
    margin-bottom: 2px;
`;

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

interface WizardAIEnhancementViewProps {
    projectCount: number;
    isMultiProject: boolean;
    onFinish: () => void;
}

export function WizardAIEnhancementView({ projectCount, isMultiProject, onFinish }: WizardAIEnhancementViewProps) {
    const { wsClient } = useBiWsContext();
    const scrollRef = useRef<HTMLDivElement>(null);
    const enhancementTriggered = useRef(false);

    const [status, setStatus] = useState<EnhancementStatus>("checking_auth");
    const [content, setContent] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const [signInError, setSignInError] = useState<string | undefined>();
    const [loginMethod, setLoginMethod] = useState<LoginMethod>("none");

    // Anthropic credentials
    const [anthropicApiKey, setAnthropicApiKey] = useState("");
    // AWS Bedrock credentials
    const [awsAccessKeyId, setAwsAccessKeyId] = useState("");
    const [awsSecretAccessKey, setAwsSecretAccessKey] = useState("");
    const [awsRegion, setAwsRegion] = useState("");
    const [awsSessionToken, setAwsSessionToken] = useState("");
    // Vertex AI credentials
    const [vertexProjectId, setVertexProjectId] = useState("");
    const [vertexLocation, setVertexLocation] = useState("");
    const [vertexClientEmail, setVertexClientEmail] = useState("");
    const [vertexPrivateKey, setVertexPrivateKey] = useState("");

    const terminalRef = useRef(false);
    const userPausedRef = useRef(false);
    // Accumulates total elapsed seconds across multiple run segments (pause/resume cycles)
    const accumulatedRef = useRef(0);
    const segmentStartRef = useRef<number | null>(null);
    // Tracks exact tool-call message text keyed by effectiveId (for file tools)
    const toolCallMessagesRef = useRef<Map<string, string>>(new Map());
    // Queue of synthetic IDs for file tools that don't emit a real toolCallId
    const pendingFileToolIdsRef = useRef<string[]>([]);
    // Queue of synthetic IDs for getCompilationErrors which also lacks a real toolCallId
    const pendingDiagToolIdsRef = useRef<string[]>([]);

    // ── Uptime counter ──────────────────────────────────────────────────────
    useEffect(() => {
        if (status !== "running") {
            return;
        }
        // Record start of this run segment; do NOT reset accumulated total.
        segmentStartRef.current = Date.now();
        const id = setInterval(() => {
            const segmentElapsed = segmentStartRef.current
                ? Math.floor((Date.now() - segmentStartRef.current) / 1000)
                : 0;
            setElapsed(accumulatedRef.current + segmentElapsed);
        }, 1000);
        return () => {
            clearInterval(id);
            // Persist elapsed time for the segment that just ended.
            if (segmentStartRef.current) {
                accumulatedRef.current += Math.floor((Date.now() - segmentStartRef.current) / 1000);
                segmentStartRef.current = null;
            }
        };
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

    const updateContent = useCallback(
        (updater: (prev: string) => string) => setContent(updater),
        []
    );

    // ── Chat event handler ──────────────────────────────────────────────────
    const handleChatEvent = useCallback(
        (event: ChatNotify) => {
            if (event.type === "start") {
                terminalRef.current = false;
                setStatus("running");
                setContent("");
                toolCallMessagesRef.current.clear();
                pendingFileToolIdsRef.current = [];
                pendingDiagToolIdsRef.current = [];
                return;
            }

            if (terminalRef.current) {
                return;
            }

            switch (event.type) {

                case "content_block":
                    updateContent((prev) => prev + event.content);
                    break;

                case "content_replace":
                    setContent((prev) => {
                        const callEnd = prev.lastIndexOf("</toolcall>");
                        const resultEnd = prev.lastIndexOf("</toolresult>");
                        const lastAnnotationEnd = Math.max(
                            callEnd !== -1 ? callEnd + "</toolcall>".length : -1,
                            resultEnd !== -1 ? resultEnd + "</toolresult>".length : -1,
                        );
                        if (lastAnnotationEnd <= 0) { return event.content; }
                        return prev.substring(0, lastAnnotationEnd) + event.content;
                    });
                    break;

                case "tool_call": {
                    const toolName = event.toolName;
                    const toolCallId = event.toolCallId;
                    const toolInput = event.toolInput;

                    if (toolName === "LibrarySearchTool") {
                        const desc = toolInput?.searchDescription;
                        const msg = desc ? `Searching for ${desc}...` : "Searching for libraries...";
                        updateContent((prev) => prev + `\n\n<toolcall id="${toolCallId}" tool="${toolName}">${msg}</toolcall>`);
                    } else if (toolName === "LibraryGetTool") {
                        updateContent((prev) => prev + `\n\n<toolcall id="${toolCallId}" tool="${toolName}">Fetching library details...</toolcall>`);
                    } else if (toolName === "HealthcareLibraryProviderTool") {
                        updateContent((prev) => prev + `\n\n<toolcall id="${toolCallId}" tool="${toolName}">Analyzing request & selecting healthcare libraries...</toolcall>`);
                    } else if (["file_write", "file_edit", "file_batch_edit"].includes(toolName)) {
                        const fileName = toolInput?.fileName || "file";
                        const displayName = formatFileNameForDisplay(fileName);
                        const msg = toolName === "file_write" ? `Creating ${displayName}` : `Updating ${displayName}`;
                        // Use the real toolCallId if present; otherwise generate a synthetic one so the
                        // matching tool_result can still find and replace the <toolcall> tag.
                        const effectiveId = toolCallId ?? `__file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                        toolCallMessagesRef.current.set(effectiveId, msg);
                        if (!toolCallId) { pendingFileToolIdsRef.current.push(effectiveId); }
                        updateContent((prev) => prev + `\n\n<toolcall id="${effectiveId}" tool="${toolName}">${msg}</toolcall>`);
                    } else if (toolName === "getCompilationErrors") {
                        const diagId = toolCallId ?? `__diag_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                        if (!toolCallId) { pendingDiagToolIdsRef.current.push(diagId); }
                        updateContent((prev) => prev + `\n\n<toolcall id="${diagId}" tool="${toolName}">Checking for errors...</toolcall>`);
                    } else if (toolName === "runTests") {
                        updateContent((prev) => prev + `\n\n<toolcall id="${toolCallId}" tool="${toolName}">Running tests...</toolcall>`);
                    }
                    break;
                }

                case "tool_result": {
                    const toolName = event.toolName;
                    const toolCallId = event.toolCallId;
                    const toolOutput = event.toolOutput;

                    if (toolName === "LibrarySearchTool") {
                        const desc = toolOutput?.searchDescription;
                        const doneMsg = desc
                            ? `${desc.charAt(0).toUpperCase() + desc.slice(1)} search completed`
                            : "Library search completed";
                        const failedAttrLS = event.failed ? ` failed="true"` : "";
                        // Match the in-progress tag by id + tool, not by its inner text: the
                        // in-progress message is built from tool *input*'s searchDescription while
                        // this result carries the *output*'s — they can differ, and a literal-string
                        // replace would then miss, leaving the spinner stuck forever.
                        const idPattern = escapeRegExp(toolCallId ?? "");
                        updateContent((prev) =>
                            prev.replace(
                                new RegExp(`<toolcall id="${idPattern}" tool="${toolName}">[^<]*</toolcall>`),
                                `<toolresult id="${toolCallId}" tool="${toolName}"${failedAttrLS}>${doneMsg}</toolresult>`
                            )
                        );
                    } else if (toolName === "LibraryGetTool") {
                        const libs = toolOutput || [];
                        const resultMsg = libs.length === 0 ? "No relevant libraries found" : `Fetched libraries: [${libs.join(", ")}]`;
                        const failedAttrLG = event.failed ? ` failed="true"` : "";
                        updateContent((prev) =>
                            prev.replace(
                                `<toolcall id="${toolCallId}" tool="${toolName}">Fetching library details...</toolcall>`,
                                `<toolresult id="${toolCallId}" tool="${toolName}"${failedAttrLG}>${resultMsg}</toolresult>`
                            )
                        );
                    } else if (toolName === "HealthcareLibraryProviderTool") {
                        const libs = toolOutput || [];
                        const resultMsg = libs.length === 0
                            ? "No relevant healthcare libraries found."
                            : `Fetched healthcare libraries: [${libs.join(", ")}]`;
                        const failedAttrHL = event.failed ? ` failed="true"` : "";
                        if (toolCallId) {
                            updateContent((prev) =>
                                prev.replace(
                                    `<toolcall id="${toolCallId}" tool="${toolName}">Analyzing request & selecting healthcare libraries...</toolcall>`,
                                    `<toolresult id="${toolCallId}" tool="${toolName}"${failedAttrHL}>${resultMsg}</toolresult>`
                                )
                            );
                        }
                    } else if (["file_write", "file_edit", "file_batch_edit"].includes(toolName)) {
                        const failedAttrF = event.failed ? ` failed="true"` : "";
                        // Prefer the real toolCallId; fall back to the oldest pending synthetic ID
                        const effectiveId = toolCallId ?? pendingFileToolIdsRef.current.shift();
                        if (effectiveId) {
                            const origMsg = toolCallMessagesRef.current.get(effectiveId) ?? "";
                            toolCallMessagesRef.current.delete(effectiveId);
                            const isCreating = origMsg.startsWith("Creating ");
                            const displayText = origMsg.replace(/^(Creating|Updating) /, "");
                            const resultText = !isCreating || toolOutput?.action === "updated" ? "Updated" : "Created";
                            // Defer the replacement to the next task so React renders the in-progress
                            // <toolcall> (spinner) state first before replacing it with <toolresult> (tick).
                            setTimeout(() => {
                                updateContent((prev) =>
                                    prev.replace(
                                        `<toolcall id="${effectiveId}" tool="${toolName}">${origMsg}</toolcall>`,
                                        `<toolresult id="${effectiveId}" tool="${toolName}"${failedAttrF}>${resultText} ${displayText}</toolresult>`,
                                    )
                                );
                            }, 0);
                        }
                    } else if (toolName === "getCompilationErrors") {
                        const errors = toolOutput?.diagnostics || [];
                        const errorCount = errors.length;
                        const msg = errorCount === 0 ? "No errors found" : `Found ${errorCount} error${errorCount > 1 ? "s" : ""}`;
                        const failedAttrCE = event.failed ? ` failed="true"` : "";
                        const diagResultId = toolCallId ?? pendingDiagToolIdsRef.current.shift();
                        if (diagResultId) {
                            setTimeout(() => {
                                updateContent((prev) =>
                                    prev.replace(
                                        `<toolcall id="${diagResultId}" tool="${toolName}">Checking for errors...</toolcall>`,
                                        `<toolresult id="${diagResultId}" tool="${toolName}"${failedAttrCE}>${msg}</toolresult>`
                                    )
                                );
                            }, 0);
                        }
                    } else if (toolName === "runTests") {
                        if (toolCallId) {
                            const resultMsg = toolOutput?.summary ?? "Tests completed";
                            const failedAttrRT = event.failed ? ` failed="true"` : "";
                            updateContent((prev) =>
                                prev.replace(
                                    `<toolcall id="${toolCallId}" tool="${toolName}">Running tests...</toolcall>`,
                                    `<toolresult id="${toolCallId}" tool="${toolName}"${failedAttrRT}>${resultMsg}</toolresult>`
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

                case "error": {
                    const rawMsg = event.content ?? "An unexpected error occurred.";
                    updateContent((prev) => prev + `\n\n**Error:** ${rawMsg}`);
                    terminalRef.current = true;
                    setStatus("error");
                    break;
                }

                case "abort":
                    terminalRef.current = true;
                    // Only mark as aborted if the user didn't pause manually.
                    if (!userPausedRef.current) {
                        setStatus("aborted");
                    }
                    break;

                default:
                    break;
            }
        },
        [updateContent]
    );

    // ── Subscribe to streaming events ───────────────────────────────────────
    useEffect(() => {
        const unsubscribe = wsClient.onChatNotify((event: ChatNotify) => {
            handleChatEvent(event);
        });
        return () => unsubscribe();
    }, [wsClient, handleChatEvent]);

    // ── Trigger the agent ───────────────────────────────────────────────────
    useEffect(() => {
        if (enhancementTriggered.current) {
            return;
        }
        enhancementTriggered.current = true;

        const client = wsClient;
        client.checkAIAuth()
            .then((isAuthenticated) => {
                if (isAuthenticated) {
                    setStatus("running");
                    return client.wizardEnhancementReady();
                } else {
                    setStatus("sign_in_required");
                }
            })
            .catch((err: unknown) => {
                console.error("[WizardAIEnhancementView] checkAIAuth failed:", err);
                setStatus("error");
            });
    }, [wsClient]);

    // ── Auto-scroll (pauses when user scrolls up; resumes once back at bottom) ─
    const isUserScrolledUpRef = useRef(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const threshold = 60; // px — within this from the bottom counts as "at bottom"
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
            isUserScrolledUpRef.current = !atBottom;
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!isUserScrolledUpRef.current) {
            scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [content]);

    // ── Parse content into segments ─────────────────────────────────────────
    const segments = useMemo(() => splitContent(content), [content]);

    // ── Actions ─────────────────────────────────────────────────────────────
    const handleOpenProject = useCallback(() => {
        wsClient.openMigratedProject().catch((err: unknown) => {
            console.error("[WizardAIEnhancementView] openMigratedProject failed:", err);
        });
    }, [wsClient]);

    const handlePause = useCallback(() => {
        userPausedRef.current = true;
        setStatus("paused");
        wsClient.abortMigrationAgent().catch(() => { /* best effort */ });
    }, [wsClient]);

    const handleResume = useCallback(() => {
        userPausedRef.current = false;
        terminalRef.current = false;
        setStatus("running");
        wsClient.wizardEnhancementReady().catch((err: unknown) => {
            console.error("[WizardAIEnhancementView] wizardEnhancementReady (resume) failed:", err);
            userPausedRef.current = true;
            setStatus("paused");
        });
    }, [wsClient]);

    const handleDone = useCallback(() => {
        onFinish();
    }, [onFinish]);

    const handleSignIn = useCallback(() => {
        setSignInError(undefined);
        setLoginMethod("sso");
        setStatus("signing_in");
        const client = wsClient;
        client.triggerAICopilotSignIn()
            .then((result) => {
                if (result.success) {
                    setStatus("running");
                    return client.wizardEnhancementReady();
                } else {
                    setSignInError(result.error || "Sign-in was cancelled. Please try again.");
                    setStatus("sign_in_required");
                    setLoginMethod("none");
                }
            })
            .catch(() => {
                setSignInError("Sign-in failed. Please try again.");
                setStatus("sign_in_required");
                setLoginMethod("none");
            });
    }, [wsClient]);

    const handleAnthropicSubmit = useCallback(() => {
        if (!anthropicApiKey.trim()) { return; }
        setSignInError(undefined);
        setStatus("signing_in");
        const client = wsClient;
        client.triggerAnthropicKeySignIn({ apiKey: anthropicApiKey.trim() })
            .then((result) => {
                if (result.success) {
                    setStatus("running");
                    return client.wizardEnhancementReady();
                } else {
                    setSignInError(result.error || "Authentication failed. Please check your API key.");
                    setStatus("sign_in_required");
                }
            })
            .catch(() => {
                setSignInError("Authentication failed. Please try again.");
                setStatus("sign_in_required");
            });
    }, [wsClient, anthropicApiKey]);

    const handleAwsBedrockSubmit = useCallback(() => {
        if (!awsAccessKeyId.trim() || !awsSecretAccessKey.trim() || !awsRegion.trim()) { return; }
        setSignInError(undefined);
        setStatus("signing_in");
        const client = wsClient;
        client.triggerAwsBedrockSignIn({
            accessKeyId: awsAccessKeyId.trim(),
            secretAccessKey: awsSecretAccessKey.trim(),
            region: awsRegion.trim(),
            ...(awsSessionToken.trim() ? { sessionToken: awsSessionToken.trim() } : {}),
        })
            .then((result) => {
                if (result.success) {
                    setStatus("running");
                    return client.wizardEnhancementReady();
                } else {
                    setSignInError(result.error || "Authentication failed. Please check your AWS credentials.");
                    setStatus("sign_in_required");
                }
            })
            .catch(() => {
                setSignInError("Authentication failed. Please try again.");
                setStatus("sign_in_required");
            });
    }, [wsClient, awsAccessKeyId, awsSecretAccessKey, awsRegion, awsSessionToken]);

    const handleVertexAiSubmit = useCallback(() => {
        if (!vertexProjectId.trim() || !vertexLocation.trim() || !vertexClientEmail.trim() || !vertexPrivateKey.trim()) { return; }
        setSignInError(undefined);
        setStatus("signing_in");
        const client = wsClient;
        client.triggerVertexAiSignIn({
            projectId: vertexProjectId.trim(),
            location: vertexLocation.trim(),
            clientEmail: vertexClientEmail.trim(),
            privateKey: vertexPrivateKey.trim(),
        })
            .then((result) => {
                if (result.success) {
                    setStatus("running");
                    return client.wizardEnhancementReady();
                } else {
                    setSignInError(result.error || "Authentication failed. Please check your Google Vertex AI credentials.");
                    setStatus("sign_in_required");
                }
            })
            .catch(() => {
                setSignInError("Authentication failed. Please try again.");
                setStatus("sign_in_required");
            });
    }, [wsClient, vertexProjectId, vertexLocation, vertexClientEmail, vertexPrivateKey]);

    // ── Render ───────────────────────────────────────────────────────────────
    const isRunning = status === "running";
    const isPaused = status === "paused";
    const isAuthPhase = status === "checking_auth" || status === "sign_in_required" || status === "signing_in";
    const openProjectDisabled = projectCount > 15;

    return (
        <Container>
            <HeaderRow>
                {status === "checking_auth" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <SpinnerIcon className="codicon codicon-sync" />
                        <StatusText variant="running">Checking authentication…</StatusText>
                    </div>
                )}
                {status === "sign_in_required" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="codicon codicon-account" />
                        <StatusText>Sign in required</StatusText>
                    </div>
                )}
                {status === "signing_in" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <SpinnerIcon className="codicon codicon-sync" />
                        <StatusText variant="running">Signing in…</StatusText>
                    </div>
                )}
                {isRunning && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <SpinnerIcon className="codicon codicon-sync" />
                            <StatusText variant="running">AI enhancement in progress…</StatusText>
                            <span style={{ fontSize: "11px", color: "var(--vscode-descriptionForeground)", fontVariantNumeric: "tabular-nums" }}>
                                [{formatElapsed(elapsed)}]
                            </span>
                        </div>
                        <SubText>This may take a while.</SubText>
                    </>
                )}
                {status === "completed" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="codicon codicon-check" style={{ color: "var(--vscode-testing-iconPassed)" }} />
                        <StatusText variant="success">AI Enhancement completed</StatusText>
                    </div>
                )}
                {status === "error" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="codicon codicon-error" style={{ color: "var(--vscode-errorForeground)" }} />
                        <StatusText variant="error">AI Enhancement encountered an error</StatusText>
                    </div>
                )}
                {status === "aborted" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="codicon codicon-circle-slash" />
                        <StatusText>AI Enhancement was skipped</StatusText>
                    </div>
                )}
                {isPaused && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="codicon codicon-debug-pause" style={{ color: "var(--vscode-descriptionForeground)" }} />
                        <StatusText>AI Enhancement paused</StatusText>
                        <span style={{ fontSize: "11px", color: "var(--vscode-descriptionForeground)", fontVariantNumeric: "tabular-nums" }}>
                            [{formatElapsed(elapsed)}]
                        </span>
                    </div>
                )}
            </HeaderRow>

            {status === "sign_in_required" && (
                <SignInPanel>
                    {signInError && <SignInErrorText>{signInError}</SignInErrorText>}

                    {loginMethod === "none" && (
                        <>
                            <SignInMessage>
                                Sign in to use AI Enhancement. Choose one of the options below.
                            </SignInMessage>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <ActionButton variant="primary" onClick={handleSignIn}>
                                        <span className="codicon codicon-account" />
                                        Login using WSO2 Integration Platform
                                    </ActionButton>
                                    <ActionButton variant="secondary" onClick={onFinish}>
                                        Skip and Done
                                    </ActionButton>
                                </div>
                                <SignInDivider>or</SignInDivider>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <TextLinkButton onClick={() => { setLoginMethod("anthropic"); setSignInError(undefined); }}>
                                        Enter your Anthropic API key
                                    </TextLinkButton>
                                    <TextLinkButton onClick={() => { setLoginMethod("aws"); setSignInError(undefined); }}>
                                        Enter your AWS Bedrock credentials
                                    </TextLinkButton>
                                    <TextLinkButton onClick={() => { setLoginMethod("vertex"); setSignInError(undefined); }}>
                                        Enter your Google Vertex AI credentials
                                    </TextLinkButton>
                                </div>
                            </div>
                        </>
                    )}

                    {loginMethod === "anthropic" && (
                        <>
                            <SignInMessage>Enter your Anthropic API key:</SignInMessage>
                            <CredentialForm>
                                <div>
                                    <CredentialLabel htmlFor="anthropic-api-key">Anthropic API Key</CredentialLabel>
                                    <CredentialInput
                                        id="anthropic-api-key"
                                        type="password"
                                        placeholder="sk-ant-..."
                                        value={anthropicApiKey}
                                        onChange={(e) => setAnthropicApiKey(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleAnthropicSubmit()}
                                    />
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <ActionButton variant="primary" onClick={handleAnthropicSubmit} disabled={!anthropicApiKey.trim()}>
                                        Submit
                                    </ActionButton>
                                    <ActionButton variant="secondary" onClick={() => { setLoginMethod("none"); setSignInError(undefined); }}>
                                        Back
                                    </ActionButton>
                                </div>
                            </CredentialForm>
                        </>
                    )}

                    {loginMethod === "aws" && (
                        <>
                            <SignInMessage>Enter your AWS Bedrock credentials:</SignInMessage>
                            <CredentialForm>
                                <div>
                                    <CredentialLabel htmlFor="aws-access-key-id">Access Key ID</CredentialLabel>
                                    <CredentialInput
                                        id="aws-access-key-id"
                                        type="text"
                                        placeholder="AKIAIOSFODNN7EXAMPLE"
                                        value={awsAccessKeyId}
                                        onChange={(e) => setAwsAccessKeyId(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <CredentialLabel htmlFor="aws-secret-access-key">Secret Access Key</CredentialLabel>
                                    <CredentialInput
                                        id="aws-secret-access-key"
                                        type="password"
                                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                                        value={awsSecretAccessKey}
                                        onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <CredentialLabel htmlFor="aws-region">Region</CredentialLabel>
                                    <CredentialInput
                                        id="aws-region"
                                        type="text"
                                        placeholder="us-east-1"
                                        value={awsRegion}
                                        onChange={(e) => setAwsRegion(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <CredentialLabel htmlFor="aws-session-token">Session Token (optional)</CredentialLabel>
                                    <CredentialInput
                                        id="aws-session-token"
                                        type="password"
                                        placeholder="Temporary session token"
                                        value={awsSessionToken}
                                        onChange={(e) => setAwsSessionToken(e.target.value)}
                                    />
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <ActionButton variant="primary" onClick={handleAwsBedrockSubmit} disabled={!awsAccessKeyId.trim() || !awsSecretAccessKey.trim() || !awsRegion.trim()}>
                                        Submit
                                    </ActionButton>
                                    <ActionButton variant="secondary" onClick={() => { setLoginMethod("none"); setSignInError(undefined); }}>
                                        Back
                                    </ActionButton>
                                </div>
                            </CredentialForm>
                        </>
                    )}

                    {loginMethod === "vertex" && (
                        <>
                            <SignInMessage>Enter your Google Vertex AI credentials:</SignInMessage>
                            <CredentialForm>
                                <div>
                                    <CredentialLabel htmlFor="vertex-project-id">Project ID</CredentialLabel>
                                    <CredentialInput
                                        id="vertex-project-id"
                                        type="text"
                                        placeholder="my-gcp-project"
                                        value={vertexProjectId}
                                        onChange={(e) => setVertexProjectId(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <CredentialLabel htmlFor="vertex-location">Location</CredentialLabel>
                                    <CredentialInput
                                        id="vertex-location"
                                        type="text"
                                        placeholder="us-central1"
                                        value={vertexLocation}
                                        onChange={(e) => setVertexLocation(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <CredentialLabel htmlFor="vertex-client-email">Client Email</CredentialLabel>
                                    <CredentialInput
                                        id="vertex-client-email"
                                        type="text"
                                        placeholder="service-account@project.iam.gserviceaccount.com"
                                        value={vertexClientEmail}
                                        onChange={(e) => setVertexClientEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <CredentialLabel htmlFor="vertex-private-key">Private Key</CredentialLabel>
                                    <CredentialTextArea
                                        id="vertex-private-key"
                                        rows={4}
                                        placeholder="-----BEGIN PRIVATE KEY-----"
                                        value={vertexPrivateKey}
                                        onChange={(e) => setVertexPrivateKey(e.target.value)}
                                    />
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <ActionButton variant="primary" onClick={handleVertexAiSubmit} disabled={!vertexProjectId.trim() || !vertexLocation.trim() || !vertexClientEmail.trim() || !vertexPrivateKey.trim()}>
                                        Submit
                                    </ActionButton>
                                    <ActionButton variant="secondary" onClick={() => { setLoginMethod("none"); setSignInError(undefined); }}>
                                        Back
                                    </ActionButton>
                                </div>
                            </CredentialForm>
                        </>
                    )}
                </SignInPanel>
            )}

            {status === "signing_in" && (
                <SignInPanel>
                    <SignInMessage>
                        {loginMethod === "sso" || loginMethod === "none"
                            ? "Complete sign-in in the browser window that opened. Return here when done."
                            : "Authenticating with your credentials…"}
                    </SignInMessage>
                </SignInPanel>
            )}

            {!isAuthPhase && <StreamArea ref={scrollRef}>
                {segments.map((segment, i) => {
                    if (segment.type === SegmentType.Text) {
                        if (!segment.text.trim()) {
                            return null;
                        }
                        return <MarkdownRenderer key={`text-${i}`} markdownContent={segment.text} />;
                    }

                    if (segment.type === SegmentType.ToolCall) {
                        const currentToolName = segment.toolName;

                        let nextIdx = i + 1;
                        while (
                            nextIdx < segments.length &&
                            segments[nextIdx].type === SegmentType.Text &&
                            segments[nextIdx].text.trim() === ""
                        ) {
                            nextIdx++;
                        }
                        const nextSeg = segments[nextIdx];
                        if (nextSeg && nextSeg.type === SegmentType.ToolCall && nextSeg.toolName === currentToolName) {
                            return null;
                        }

                        const groupItems: ToolCallItem[] = [];
                        let j = i;
                        while (j >= 0) {
                            const seg = segments[j];
                            if (seg.type === SegmentType.ToolCall && seg.toolName === currentToolName) {
                                groupItems.unshift({
                                    text: seg.text,
                                    loading: seg.loading,
                                    failed: seg.failed,
                                    toolName: seg.toolName,
                                });
                            } else if (seg.type === SegmentType.Text && seg.text.trim() === "") {
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

                        return <ToolCallGroupSegment key={`tool-group-${i}`} segments={groupItems} />;
                    }

                    if (segment.text.trim()) {
                        return <MarkdownRenderer key={`fallback-${i}`} markdownContent={segment.text} />;
                    }
                    return null;
                })}

                {isRunning && segments.length === 0 && (
                    <StatusText variant="running">Starting AI enhancement agent…</StatusText>
                )}
            </StreamArea>}

            {!isAuthPhase && <ButtonRow>
                {isRunning && (
                    <ActionButton variant="primary" onClick={handlePause}>
                        Pause
                    </ActionButton>
                )}
                {isPaused && (
                    <ActionButton variant="primary" onClick={handleResume}>
                        Resume
                    </ActionButton>
                )}

                {/* Open Project — disabled while running (agent active), guarded by project count when paused/done */}
                <span
                    style={{ display: "inline-block" }}
                    title={
                        isRunning
                            ? "AI enhancement is in progress. Pause first to open the project."
                            : openProjectDisabled
                                ? `Opening ${projectCount} projects simultaneously may cause the editor to become unresponsive. Navigate to the destination path to open them manually.`
                                : undefined
                    }
                >
                    <ActionButton
                        variant="secondary"
                        onClick={handleOpenProject}
                        disabled={isRunning || openProjectDisabled}
                    >
                        {isMultiProject ? "Open Workspace" : "Open Project"}
                    </ActionButton>
                </span>
                {/* Done — always visible like Open Project, disabled while running */}
                <span
                    style={{ display: "inline-block" }}
                    title={isRunning ? "AI enhancement is in progress. Pause first." : undefined}
                >
                    <ActionButton
                        variant={isPaused || isRunning ? "secondary" : "primary"}
                        onClick={handleDone}
                        disabled={isRunning}
                    >
                        Done
                    </ActionButton>
                </span>
            </ButtonRow>}
        </Container>
    );
}
