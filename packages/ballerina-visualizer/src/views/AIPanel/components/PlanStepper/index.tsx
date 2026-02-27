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

import { keyframes } from "@emotion/css";
import styled from "@emotion/styled";
import React, { useEffect, useRef, useState } from "react";
import MarkdownRenderer from "../MarkdownRenderer";
import TodoSection from "../TodoSection";

// ── Animations ────────────────────────────────────────────────────────────────

// Node: sonar ripple — ring expands and fades outward
const sonarRing = keyframes`
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.4); opacity: 0;   }
`;

// Tool icon: horizontal flip for loading state
const flip = keyframes`
    0%   { transform: scaleX(1); }
    50%  { transform: scaleX(-1); }
    100% { transform: scaleX(1); }
`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExecutionEvent {
    type?: "tool" | "text";
    toolCallId?: string;
    toolName?: string;
    text: string;
    loading: boolean;
    failed?: boolean;
}

export interface ExecutionTask {
    description: string;
    events: ExecutionEvent[];
    planTasks?: any[];
    planMessage?: string;
    planApprovalStatus?: "approved" | "revised";
    planRevisionComment?: string;
    configData?: Record<string, any>;
    connectorData?: Record<string, any>;
}

// ── Pipeline container ────────────────────────────────────────────────────────

const PipelineContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 8px 0 4px 0;
    font-family: var(--vscode-font-family);
`;

// ── Task block: two-column layout — left rail (dot + line) + right content ───

const TaskBlock = styled.div`
    display: flex;
    flex-direction: row;
    padding: 0 10px 0 0;
`;

// Left rail: fixed-width column that holds the dot and the vertical line.
// position: relative so the ::before pseudo-element (the line) can be absolutely positioned.
const TaskRail = styled.div<{ isLast: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 20px;
    flex-shrink: 0;

    /* Vertical connector line — runs from the dot center to the bottom of the rail */
    &::before {
        content: '';
        position: absolute;
        top: 12px;
        bottom: ${(props: { isLast: boolean }) => props.isLast ? '6px' : '0'};
        left: 50%;
        transform: translateX(-50%);
        width: 1.5px;
        background-color: var(--vscode-panel-border);
        opacity: 0.9;
    }

`;

// Wrapper that sits at the top of the rail and holds the dot, on top of the line
const DotWrapper = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 24px;
    flex-shrink: 0;
    /* Mask the line behind the dot with a background patch */
    background-color: var(--vscode-editor-background);
`;

// Right content column: task label on top, events below
const TaskContent = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    padding-left: 6px;
`;

// Task header row: clickable to toggle events
const TaskRow = styled.div`
    display: flex;
    align-items: center;
    min-height: 24px;
    cursor: pointer;
    user-select: none;
`;

// Smooth collapse wrapper using grid-template-rows trick (animates actual content height)
const EventsArea = styled.div<{ expanded: boolean }>`
    display: grid;
    grid-template-rows: ${(props: { expanded: boolean }) => props.expanded ? '1fr' : '0fr'};
    opacity: ${(props: { expanded: boolean }) => props.expanded ? 1 : 0};
    transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const EventsInner = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    padding-bottom: 4px;
`;

const EventRow = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 2px 0;
    min-height: 18px;
`;

const EventMarkdownWrapper = styled.div`
    font-size: 13px;
    line-height: 1.5;
    p, ul, ol, pre, blockquote { margin: 0; padding: 0; }
    p + p { margin-top: 2px; }
`;

// ── Task node indicators ──────────────────────────────────────────────────────

// Sonar indicator: filled center dot + expanding ring
const SonarWrapper = styled.span`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
`;

const SonarCenter = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--vscode-charts-blue);
    position: relative;
    z-index: 1;
`;

const SonarRing = styled.span`
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--vscode-charts-blue);
    animation: ${sonarRing} 1.6s ease-out infinite;
`;

// Done state: solid filled circle — charts-green is reliably visible in both themes
const DoneCircle = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background-color: var(--vscode-charts-green, #388a34);
`;

const NodeLabel = styled.span<{ nodeStatus: "active" | "done" }>`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-editor-foreground);
    opacity: ${(props: { nodeStatus: string }) => props.nodeStatus === "done" ? 0.75 : 1};
`;

// ── Event indicators ──────────────────────────────────────────────────────────

// Tool icon for tool call events
const ToolIcon = styled.span<{ loading?: boolean; failed?: boolean }>`
    font-size: 10px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: ${(props: { loading?: boolean; failed?: boolean }) =>
        props.failed
            ? "var(--vscode-errorForeground)"
            : props.loading
            ? "var(--vscode-charts-blue)"
            : "var(--vscode-descriptionForeground)"};
    opacity: ${(props: { loading?: boolean; failed?: boolean }) => props.loading ? 1 : 0.75};
    ${(props: { loading?: boolean; failed?: boolean }) => props.loading ? `animation: ${flip} 1.4s ease-in-out infinite;` : ""}
`;

const EventLabel = styled.span<{ loading: boolean; failed?: boolean }>`
    font-size: 13px;
    color: ${(props: { loading: boolean; failed?: boolean }) =>
        props.failed
            ? "var(--vscode-errorForeground)"
            : props.loading
            ? "var(--vscode-editor-foreground)"
            : "var(--vscode-descriptionForeground)"};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const FileNameChip = styled.span`
    font-weight: 600;
    color: var(--vscode-editor-foreground);
    margin-left: 3px;
    font-size: 12px;
`;


// ── Inline card (config / connector) ──────────────────────────────────────────

const InlineCard = styled.div<{ status?: "active" | "done" | "error" }>`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 3px 6px;
    margin: 0 0 4px 0;
    font-family: var(--vscode-font-family);
`;

const InlineCardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
`;

const InlineCardIcon = styled.span`
    display: flex;
    align-items: center;
    font-size: 12px;
    flex-shrink: 0;
    color: var(--vscode-descriptionForeground);
`;

const InlineCardTitle = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-editor-foreground);
    flex: 1;
`;

const InlineCardSubtitle = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const InlineCardActions = styled.div`
    display: flex;
    gap: 6px;
    margin: 4px 0 2px 0;
`;

const InlineButton = styled.button<{ variant?: "primary" | "secondary" }>`
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 3px;
    border: none;
    cursor: pointer;
    font-family: var(--vscode-font-family);
    background-color: ${(props: { variant?: string }) =>
        props.variant === "primary"
            ? "var(--vscode-button-background)"
            : "var(--vscode-button-secondaryBackground)"};
    color: ${(props: { variant?: string }) =>
        props.variant === "primary"
            ? "var(--vscode-button-foreground)"
            : "var(--vscode-button-secondaryForeground)"};
    &:hover:not(:disabled) {
        opacity: 0.85;
    }
    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

const InlineInput = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    padding: 4px 6px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    resize: vertical;
    min-height: 72px;
    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
`;

const InlineUrlRow = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
    margin: 4px 0 2px 0;
`;

const InlineUrlInput = styled.input`
    flex: 1;
    padding: 3px 6px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
`;

const InlineTabRow = styled.div`
    display: flex;
    gap: 2px;
    margin: 2px 0 6px 0;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const InlineTab = styled.button<{ active: boolean }>`
    padding: 3px 8px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    background: transparent;
    border: none;
    border-bottom: 2px solid ${(props: { active: boolean }) => props.active ? "var(--vscode-focusBorder)" : "transparent"};
    color: ${(props: { active: boolean }) => props.active ? "var(--vscode-focusBorder)" : "var(--vscode-descriptionForeground)"};
    cursor: pointer;
    font-weight: ${(props: { active: boolean }) => props.active ? "600" : "400"};
`;

const InlineErrorText = styled.span`
    font-size: 11px;
    color: var(--vscode-inputValidation-errorForeground);
    margin-top: 2px;
    display: block;
`;

const InlineStatusRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    padding: 1px 0 2px 0;
`;

const InlineDetailRow = styled.div`
    display: flex;
    gap: 6px;
    font-size: 11px;
    padding: 1px 0;
`;

const InlineDetailLabel = styled.span`
    color: var(--vscode-descriptionForeground);
    min-width: 56px;
    flex-shrink: 0;
`;

const InlineDetailValue = styled.span`
    color: var(--vscode-editor-foreground);
    word-break: break-all;
`;

const InlineDetailsBlock = styled.div`
    display: flex;
    flex-direction: column;
    padding: 1px 0 2px 0;
`;

const InlineDivider = styled.div`
    height: 1px;
    background-color: var(--vscode-panel-border);
    margin: 4px 0 2px 0;
    opacity: 0.7;
`;

const InlineHint = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.7;
    align-self: center;
`;

// ── ConfigCard ─────────────────────────────────────────────────────────────────

interface ConfigCardProps {
    data: Record<string, any>;
    rpcClient: any;
}

const ConfigCard: React.FC<ConfigCardProps> = ({ data, rpcClient }) => {
    const stage: string = data.stage;

    const handleConfigure = () => {
        rpcClient?.getVisualizerRpcClient().reopenApprovalView({ requestId: data.requestId });
    };

    const handleSkip = async () => {
        try {
            await rpcClient?.getAiPanelRpcClient().cancelConfiguration({ requestId: data.requestId });
        } catch (e) {
            console.error("[ConfigCard] skip error:", e);
        }
    };

    if (stage === "collecting") {
        return (
            <InlineCard status="active">
                <InlineCardHeader>
                    <InlineCardIcon><span className="codicon codicon-key" /></InlineCardIcon>
                    <InlineCardTitle>{data.message || "Configure values"}</InlineCardTitle>
                </InlineCardHeader>
                <InlineCardActions>
                    <InlineButton variant="secondary" onClick={handleSkip}>Skip</InlineButton>
                    <InlineButton variant="primary" onClick={handleConfigure}>Configure</InlineButton>
                </InlineCardActions>
            </InlineCard>
        );
    }

    if (stage === "done") {
        return (
            <InlineCard status="done">
                <InlineCardHeader>
                    <InlineCardIcon><span className="codicon codicon-pass" /></InlineCardIcon>
                    <InlineCardTitle>{data.message || "Configuration done"}</InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    if (stage === "skipped") {
        return (
            <InlineCard status="done">
                <InlineCardHeader>
                    <InlineCardIcon><span className="codicon codicon-circle-slash" /></InlineCardIcon>
                    <InlineCardTitle>{data.message || "Configuration skipped"}</InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    if (stage === "error" && data.error) {
        return (
            <InlineCard status="error">
                <InlineCardHeader>
                    <InlineCardIcon><span className="codicon codicon-warning" /></InlineCardIcon>
                    <InlineCardTitle>Configuration failed</InlineCardTitle>
                </InlineCardHeader>
                <InlineStatusRow>{data.error.message}</InlineStatusRow>
            </InlineCard>
        );
    }

    return null;
};

// ── ConnectorCard ──────────────────────────────────────────────────────────────

interface ConnectorCardProps {
    data: Record<string, any>;
    rpcClient: any;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({ data, rpcClient }) => {
    const stage: string = data.stage;
    const [inputMethod, setInputMethod] = useState<"file" | "paste" | "url">("file");
    const [specContent, setSpecContent] = useState("");
    const [specUrl, setSpecUrl] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);

    const validateSpec = (content: string): string | null => {
        if (!content.trim()) return "Specification content cannot be empty";
        try { JSON.parse(content); return null; } catch { /* fall through */ }
        if (content.includes("openapi:") || content.includes("swagger:")) return null;
        return "Content must be valid JSON or YAML (OpenAPI/Swagger)";
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setValidationError(null);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const content = ev.target?.result as string;
            const err = validateSpec(content);
            if (err) { setValidationError(err); return; }
            await submit(content);
        };
        reader.readAsText(file);
    };

    const submit = async (spec: string) => {
        setIsProcessing(true);
        try {
            await rpcClient?.getAiPanelRpcClient().provideConnectorSpec({ requestId: data.requestId, spec });
        } catch (e: any) {
            setValidationError(e.message || "Failed to submit specification");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmitPaste = async () => {
        const err = validateSpec(specContent);
        if (err) { setValidationError(err); return; }
        setValidationError(null);
        await submit(specContent);
    };

    const handleSubmitUrl = async () => {
        setValidationError(null);
        setIsProcessing(true);
        try {
            const res = await fetch(specUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            const err = validateSpec(text);
            if (err) throw new Error(err);
            await submit(text);
        } catch (e: any) {
            setValidationError(e.message || "Failed to fetch specification");
            setIsProcessing(false);
        }
    };

    const handleSkip = async () => {
        try {
            await rpcClient?.getAiPanelRpcClient().cancelConnectorSpec({ requestId: data.requestId });
        } catch (e) {
            console.error("[ConnectorCard] skip error:", e);
        }
        setShowSkipConfirm(false);
    };

    if (stage === "requesting_input") {
        return (
            <InlineCard>
                {/* Header */}
                <InlineCardHeader>
                    <InlineCardIcon><span className="codicon codicon-plug" /></InlineCardIcon>
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                        <InlineCardTitle>
                            Generate Connector{data.serviceName ? `: ${data.serviceName}` : ""}
                        </InlineCardTitle>
                        {data.serviceDescription && (
                            <InlineCardSubtitle>{data.serviceDescription}</InlineCardSubtitle>
                        )}
                    </div>
                </InlineCardHeader>

                {/* Input method tabs */}
                <InlineTabRow>
                    {(["file", "url", "paste"] as const).map(m => (
                        <InlineTab
                            key={m}
                            active={inputMethod === m}
                            onClick={() => { setInputMethod(m); setValidationError(null); }}
                        >
                            {m === "file" ? "Upload File" : m === "url" ? "From URL" : "Paste Spec"}
                        </InlineTab>
                    ))}
                </InlineTabRow>

                {/* File upload */}
                {inputMethod === "file" && (
                    <InlineCardActions>
                        <label style={{ display: "contents" }}>
                            <input
                                type="file"
                                accept=".json,.yaml,.yml"
                                style={{ display: "none" }}
                                onChange={handleFileUpload}
                                disabled={isProcessing}
                            />
                            <InlineButton as="span" variant="primary" style={{ cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.45 : 1 }}>
                                <span className="codicon codicon-cloud-upload" style={{ marginRight: 5, fontSize: 11 }} />
                                {isProcessing ? "Processing..." : "Choose File"}
                            </InlineButton>
                        </label>
                        <InlineHint>.json, .yaml, .yml</InlineHint>
                    </InlineCardActions>
                )}

                {/* Paste spec */}
                {inputMethod === "paste" && (
                    <>
                        <InlineInput
                            placeholder="Paste your OpenAPI / Swagger spec (JSON or YAML)..."
                            value={specContent}
                            onChange={e => { setSpecContent(e.target.value); setValidationError(null); }}
                        />
                        <InlineCardActions>
                            <InlineButton
                                variant="primary"
                                onClick={handleSubmitPaste}
                                disabled={!specContent.trim() || isProcessing}
                            >
                                {isProcessing ? "Processing..." : "Submit"}
                            </InlineButton>
                        </InlineCardActions>
                    </>
                )}

                {/* From URL */}
                {inputMethod === "url" && (
                    <InlineUrlRow>
                        <InlineUrlInput
                            type="url"
                            placeholder="https://api.example.com/openapi.json"
                            value={specUrl}
                            onChange={e => { setSpecUrl(e.target.value); setValidationError(null); }}
                        />
                        <InlineButton
                            variant="primary"
                            onClick={handleSubmitUrl}
                            disabled={!specUrl.trim() || isProcessing}
                        >
                            {isProcessing ? "Fetching..." : "Fetch"}
                        </InlineButton>
                    </InlineUrlRow>
                )}

                {validationError && <InlineErrorText>{validationError}</InlineErrorText>}

                {/* Skip row */}
                <InlineDivider />
                <InlineCardActions>
                    {!showSkipConfirm ? (
                        <InlineButton variant="secondary" onClick={() => setShowSkipConfirm(true)} disabled={isProcessing}>
                            Skip
                        </InlineButton>
                    ) : (
                        <>
                            <InlineButton variant="secondary" onClick={() => setShowSkipConfirm(false)}>Cancel</InlineButton>
                            <InlineButton variant="primary" onClick={handleSkip}>Confirm Skip</InlineButton>
                        </>
                    )}
                </InlineCardActions>
            </InlineCard>
        );
    }

    if (stage === "generating") {
        return (
            <InlineCard>
                <InlineCardHeader>
                    <InlineCardIcon>
                        <span className="codicon codicon-loading codicon-modifier-spin" />
                    </InlineCardIcon>
                    <InlineCardTitle>
                        Generating connector{data.spec?.title ? ` for ${data.spec.title}` : "..."}
                    </InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    if (stage === "generated") {
        return (
            <InlineCard>
                <InlineCardHeader>
                    <InlineCardIcon style={{ color: "var(--vscode-charts-green, #388a34)" }}>
                        <span className="codicon codicon-pass" />
                    </InlineCardIcon>
                    <InlineCardTitle>
                        Connector ready{data.spec?.title ? `: ${data.spec.title}` : (data.serviceName ? `: ${data.serviceName}` : "")}
                    </InlineCardTitle>
                </InlineCardHeader>
                {(data.connector || data.spec) && (
                    <InlineDetailsBlock>
                        {data.connector && (
                            <>
                                <InlineDetailRow>
                                    <InlineDetailLabel>Module</InlineDetailLabel>
                                    <InlineDetailValue>{data.connector.moduleName}</InlineDetailValue>
                                </InlineDetailRow>
                                <InlineDetailRow>
                                    <InlineDetailLabel>Import</InlineDetailLabel>
                                    <InlineDetailValue>{data.connector.importStatement}</InlineDetailValue>
                                </InlineDetailRow>
                            </>
                        )}
                        {data.spec?.endpointCount !== undefined && (
                            <InlineDetailRow>
                                <InlineDetailLabel>Endpoints</InlineDetailLabel>
                                <InlineDetailValue>{data.spec.endpointCount}</InlineDetailValue>
                            </InlineDetailRow>
                        )}
                    </InlineDetailsBlock>
                )}
            </InlineCard>
        );
    }

    if (stage === "skipped") {
        return (
            <InlineCard>
                <InlineCardHeader>
                    <InlineCardIcon>
                        <span className="codicon codicon-circle-slash" />
                    </InlineCardIcon>
                    <InlineCardTitle>
                        Connector generation skipped{data.serviceName ? `: ${data.serviceName}` : ""}
                    </InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    if (stage === "error" && data.error) {
        return (
            <InlineCard>
                <InlineCardHeader>
                    <InlineCardIcon style={{ color: "var(--vscode-errorForeground)" }}>
                        <span className="codicon codicon-warning" />
                    </InlineCardIcon>
                    <InlineCardTitle>Connector generation failed</InlineCardTitle>
                </InlineCardHeader>
                <InlineStatusRow>{data.error.message}</InlineStatusRow>
            </InlineCard>
        );
    }

    return null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const FILE_TOOLS = ["file_read", "file_write", "file_edit", "file_batch_edit"];
const LIBRARY_SEARCH_TOOLS = ["LibrarySearchTool"];
const LIBRARY_FETCH_TOOLS = ["LibraryGetTool", "HealthcareLibraryProviderTool"];

// Split "Verb filename" text into prefix + fileName for highlighting
function splitFileLabel(text: string): { prefix: string; fileName?: string } {
    const match = text.match(/^(.+?)\s+(\S+)(\.\.\.)?\s*$/);
    if (match) {
        const trailingDots = match[3] || "";
        return { prefix: match[1] + trailingDots, fileName: match[2] };
    }
    return { prefix: text };
}

function getEventDisplay(toolName: string | undefined, text: string, loading: boolean): { prefix: string; fileName?: string } {
    if (toolName) {
        if (FILE_TOOLS.includes(toolName)) {
            const label = text || (loading ? "Working..." : "Done");
            return splitFileLabel(label);
        }
        if (LIBRARY_SEARCH_TOOLS.includes(toolName)) return { prefix: loading ? "Searching libraries..." : text || "Libraries found" };
        if (LIBRARY_FETCH_TOOLS.includes(toolName)) return { prefix: loading ? "Fetching libraries..." : text || "Libraries fetched" };
        if (toolName === "getCompilationErrors") return { prefix: loading ? "Checking for errors..." : text || "No issues found" };
        if (toolName === "ConfigCollector") return { prefix: loading ? "Reading config..." : text || "Config loaded" };
        if (toolName === "ConnectorGeneratorTool") return { prefix: loading ? "Generating connector..." : text || "Connector ready" };
        if (toolName === "runTests") return { prefix: loading ? "Running tests..." : text || "Tests completed" };
    }
    return { prefix: text };
}

function getNodeStatus(task: ExecutionTask, isLast: boolean, isLoading: boolean): "active" | "done" {
    const hasActiveEvent = task.events.some(e => e.loading);
    if (hasActiveEvent || (isLast && isLoading)) return "active";
    return "done";
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ExecutionStreamProps {
    executionStream: ExecutionTask[];
    isLoading?: boolean;
    rpcClient?: any;
}

const COLLAPSE_DELAY_MS = 300;

const PlanStepper: React.FC<ExecutionStreamProps> = ({ executionStream, isLoading = false, rpcClient }) => {
    // Track which tasks are expanded — key is task description
    const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
    const collapseTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const eventsInnerRefs = useRef<Record<string, HTMLDivElement | null>>({});
    // Tasks that have already been auto-collapsed once — never auto-collapse again
    const autoCollapsedTasks = useRef<Set<string>>(new Set());

    useEffect(() => {
        executionStream.forEach((task, taskIdx) => {
            if (!task.description) return;
            const isLastTask = taskIdx === executionStream.length - 1;
            const nodeStatus = getNodeStatus(task, isLastTask, isLoading);
            const key = task.description;

            if (nodeStatus === "active") {
                // Task became active — expand it and cancel any pending collapse
                if (collapseTimers.current[key]) {
                    clearTimeout(collapseTimers.current[key]);
                    delete collapseTimers.current[key];
                }
                setExpandedTasks(prev => prev[key] === true ? prev : { ...prev, [key]: true });
            } else if (nodeStatus === "done" && !autoCollapsedTasks.current.has(key)) {
                // Task just completed — collapse once after delay, then never auto-collapse again
                if (!collapseTimers.current[key]) {
                    collapseTimers.current[key] = setTimeout(() => {
                        autoCollapsedTasks.current.add(key);
                        setExpandedTasks(prev => ({ ...prev, [key]: false }));
                        delete collapseTimers.current[key];
                    }, COLLAPSE_DELAY_MS);
                }
            }
        });
    }, [executionStream, isLoading]);

    // Scroll to bottom when events change
    useEffect(() => {
        executionStream.forEach(task => {
            if (!task.description) return;
            const el = eventsInnerRefs.current[task.description];
            if (!el) return;
            if (expandedTasks[task.description]) {
                el.scrollTop = el.scrollHeight;
            }
        });
    }, [executionStream, expandedTasks]);

    // Clean up timers on unmount
    useEffect(() => {
        return () => {
            Object.values(collapseTimers.current).forEach(clearTimeout);
        };
    }, []);

    const toggleTask = (key: string) => {
        // Cancel pending collapse if user manually toggles
        if (collapseTimers.current[key]) {
            clearTimeout(collapseTimers.current[key]);
            delete collapseTimers.current[key];
        }
        setExpandedTasks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (executionStream.length === 0) return null;

    return (
        <PipelineContainer>
            {executionStream.map((task, taskIdx) => {
                const isLastTask = taskIdx === executionStream.length - 1;
                const nodeStatus = getNodeStatus(task, isLastTask, isLoading);
                const hasEvents = task.events.length > 0;

                // Floating entry (no task description) — render text, tool events, plan tasks, config, connector
                if (!task.description) {
                    const text = task.events
                        .filter(e => e.type === "text")
                        .map(e => e.text)
                        .join("");
                    const trimmed = text.trim();
                    const toolEvents = task.events.filter(e => e.type !== "text");
                    const hasPlanTasks = task.planTasks && task.planTasks.length > 0;
                    const hasPlanApproval = !!task.planApprovalStatus;
                    if (!trimmed && !toolEvents.length && !hasPlanTasks && !hasPlanApproval && !task.configData && !task.connectorData) return null;
                    return (
                        <TaskBlock key={taskIdx} style={{ flexDirection: "column" }}>
                            {trimmed && <MarkdownRenderer markdownContent={trimmed} />}
                            {toolEvents.map((event, eventIdx) => {
                                const { prefix, fileName } = getEventDisplay(event.toolName, event.text, event.loading);
                                return (
                                    <EventRow key={eventIdx}>
                                        <ToolIcon loading={event.loading} failed={event.failed}>
                                            <span className={"codicon codicon-symbol-property"} />
                                        </ToolIcon>
                                        <EventLabel loading={event.loading} failed={event.failed}>
                                            {prefix}{fileName && <FileNameChip>{fileName}</FileNameChip>}
                                        </EventLabel>
                                    </EventRow>
                                );
                            })}
                            {hasPlanTasks && (
                                <TodoSection
                                    tasks={task.planTasks!}
                                    message={task.planMessage}
                                    initialExpanded={!hasPlanApproval}
                                    approvalStatus={task.planApprovalStatus}
                                    approvalComment={task.planRevisionComment}
                                />
                            )}
                            {task.configData && <ConfigCard data={task.configData} rpcClient={rpcClient} />}
                            {task.connectorData && <ConnectorCard data={task.connectorData} rpcClient={rpcClient} />}
                        </TaskBlock>
                    );
                }

                const isExpanded = expandedTasks[task.description] ?? true;

                return (
                    <TaskBlock key={taskIdx} style={{ marginLeft: "-7px" }}>
                        {/* Left rail: dot on top, vertical line below (via ::before) */}
                        <TaskRail isLast={isLastTask}>
                            <DotWrapper>
                                {nodeStatus === "active" ? (
                                    <SonarWrapper>
                                        <SonarRing />
                                        <SonarCenter />
                                    </SonarWrapper>
                                ) : (
                                    <DoneCircle />
                                )}
                            </DotWrapper>
                        </TaskRail>

                        {/* Right content: label + events */}
                        <TaskContent>
                            <TaskRow onClick={() => hasEvents && toggleTask(task.description)}>
                                <NodeLabel nodeStatus={nodeStatus}>{task.description}</NodeLabel>
                            </TaskRow>
                            {hasEvents && (
                                <EventsArea expanded={isExpanded}>
                                    <EventsInner ref={el => { eventsInnerRefs.current[task.description] = el; }}>
                                        {task.events.map((event, eventIdx) => {
                                            if (event.type === "text") {
                                                const trimmed = event.text.trim();
                                                if (!trimmed) return null;
                                                return (
                                                    <EventRow key={eventIdx}>
                                                        <EventMarkdownWrapper>
                                                            <MarkdownRenderer markdownContent={trimmed} />
                                                        </EventMarkdownWrapper>
                                                    </EventRow>
                                                );
                                            }
                                            const { prefix, fileName } = getEventDisplay(event.toolName, event.text, event.loading);
                                            return (
                                                <EventRow key={eventIdx}>
                                                    <ToolIcon loading={event.loading} failed={event.failed}>
                                                        <span className={"codicon codicon-symbol-property"} />
                                                    </ToolIcon>
                                                    <EventLabel loading={event.loading} failed={event.failed}>
                                                        {prefix}{fileName && <FileNameChip>{fileName}</FileNameChip>}
                                                    </EventLabel>
                                                </EventRow>
                                            );
                                        })}
                                    </EventsInner>
                                </EventsArea>
                            )}
                        </TaskContent>
                    </TaskBlock>
                );
            })}
        </PipelineContainer>
    );
};

export default PlanStepper;
