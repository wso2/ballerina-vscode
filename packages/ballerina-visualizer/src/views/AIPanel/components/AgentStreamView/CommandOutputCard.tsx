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

import styled from "@emotion/styled";
import React, { useState, useEffect, useRef } from "react";
import {
    InlineCard,
    InlineCardIcon,
    InlineCardTitle,
} from "./styles";

// ── Styled components ─────────────────────────────────────────────────────────

const CardToggleHeader = styled.div<{ clickable: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
    border-radius: 2px;
    cursor: ${(props: { clickable: boolean }) => props.clickable ? "pointer" : "default"};
    &:hover {
        background-color: ${(props: { clickable: boolean }) => props.clickable ? "var(--vscode-toolbar-hoverBackground)" : "transparent"};
    }
`;

const StatusText = styled.span<{ status: "running" | "success" | "error" }>`
    font-size: 11px;
    font-weight: 600;
    color: ${(props: { status: string }) =>
        props.status === "error"
            ? "var(--vscode-errorForeground)"
            : "var(--vscode-descriptionForeground)"};
    flex-shrink: 0;
`;

const ChevronIcon = styled.span<{ expanded: boolean }>`
    font-size: 11px;
    flex-shrink: 0;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    transform: rotate(${(props: { expanded: boolean }) => props.expanded ? "0deg" : "-90deg"});
    transition: transform 0.2s ease;
`;

const OutputBlock = styled.div`
    border-top: 1px solid var(--vscode-panel-border);
    margin-top: 2px;
    background-color: var(--vscode-editor-background);
    border-radius: 0 0 3px 3px;
    overflow: hidden;
`;

const CommandLine = styled.div`
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    color: var(--vscode-editor-foreground);
    padding: 4px 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
    display: flex;
    gap: 6px;
`;

const OutputPre = styled.pre`
    padding: 5px 8px;
    margin: 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const TOOL_TITLES: Record<string, string> = {
    runBallerinaPackage: "Running Program",
    runTests: "Running Tests",
    getServiceLogs: "Service Logs",
    stopBallerinaService: "Stopping Service",
};

const TOOL_ICONS: Record<string, string> = {
    runBallerinaPackage: "codicon-play",
    runTests: "codicon-beaker",
    getServiceLogs: "codicon-output",
    stopBallerinaService: "codicon-debug-stop",
};

function getStatus(isResult: boolean, toolName: string | undefined, toolOutput: any): "running" | "success" | "error" {
    if (!isResult) return "running";
    const s = toolOutput?.status;
    if (toolName === "runTests") {
        const summary: string = toolOutput?.summary ?? "";
        const match = summary.match(/(\d+)\/(\d+) passing/);
        if (match && match[1] !== match[2]) return "error";
        if (s === "error") return "error";
        return "success";
    }
    if (s === "completed" || s === "started" || s === "stopped" || s === "already_exited" || s === "running") return "success";
    return "error";
}

function getStatusLabel(isResult: boolean, toolName: string | undefined, toolOutput: any): string {
    if (!isResult) return "Running...";
    const s = toolOutput?.status;
    if (toolName === "runBallerinaPackage") {
        if (s === "started") return "Service started";
        if (s === "completed") return "Completed";
        if (s === "timeout") return "Timed out";
        return "Failed";
    }
    if (toolName === "runTests") {
        return toolOutput?.summary ?? "Tests completed";
    }
    if (toolName === "getServiceLogs") {
        if (s === "exited") return "Service exited";
        if (s === "not_found") return "Not found";
        return "Logs retrieved";
    }
    if (toolName === "stopBallerinaService") {
        if (s === "stopped") return "Stopped";
        if (s === "already_exited") return "Already exited";
        return "Not found";
    }
    return "Done";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CommandOutputCardProps {
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
    isResult?: boolean;
}

const CommandOutputCard: React.FC<CommandOutputCardProps> = ({ toolName, toolInput, toolOutput, isResult = false }) => {
    const [expanded, setExpanded] = useState(false);
    const prevStatusRef = useRef<string | undefined>(undefined);

    const title = TOOL_TITLES[toolName ?? ""] ?? "Command";
    const iconClass = TOOL_ICONS[toolName ?? ""] ?? "codicon-terminal";
    const command = toolOutput?.command ?? toolInput?.command;
    const output = toolOutput?.output ?? toolOutput?.logs;
    const status = getStatus(isResult, toolName, toolOutput);
    const statusLabel = getStatusLabel(isResult, toolName, toolOutput);
    const isRunning = status === "running";

    useEffect(() => {
        if (status === "error" && prevStatusRef.current !== "error") {
            setExpanded(true);
        }
        prevStatusRef.current = status;
    }, [status]);

    return (
        <InlineCard>
            <CardToggleHeader
                clickable={!isRunning && !!output}
                onClick={() => !isRunning && output && setExpanded(p => !p)}
            >
                <InlineCardIcon>
                    {isRunning ? (
                        <span className="codicon codicon-loading codicon-modifier-spin" />
                    ) : (
                        <span className={`codicon ${iconClass}`} />
                    )}
                </InlineCardIcon>
                <InlineCardTitle>{title}</InlineCardTitle>
                <StatusText status={status}>{statusLabel}</StatusText>
                {!isRunning && output && (
                    <ChevronIcon expanded={expanded}>
                        <span className="codicon codicon-chevron-down" />
                    </ChevronIcon>
                )}
            </CardToggleHeader>

            {expanded && output && (
                <OutputBlock>
                    {command && (
                        <CommandLine>
                            <span style={{ color: "var(--vscode-charts-green, #388a34)", userSelect: "none" }}>$</span>
                            <span>{command}</span>
                        </CommandLine>
                    )}
                    <OutputPre>{output}</OutputPre>
                </OutputBlock>
            )}
        </InlineCard>
    );
};

export default CommandOutputCard;
