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
    InlineCardHeader,
    InlineCardIcon,
    InlineCardTitle,
} from "./styles";

// ── Styled components ─────────────────────────────────────────────────────────

const CommandBadge = styled.span`
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    font-family: var(--vscode-editor-font-family);
    color: var(--vscode-badge-foreground);
    background-color: var(--vscode-badge-background);
    flex-shrink: 0;
`;

const StatusText = styled.span<{ status: "running" | "success" | "error" }>`
    font-size: 11px;
    font-weight: 600;
    color: ${(props: { status: string }) =>
        props.status === "running"
            ? "var(--vscode-descriptionForeground)"
            : props.status === "success"
            ? "var(--vscode-charts-green, #388a34)"
            : "var(--vscode-errorForeground)"};
    flex-shrink: 0;
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 22px;
    flex-wrap: wrap;
`;

const ExpandButton = styled.button`
    background: none;
    border: none;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    font-size: 11px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: auto;
    &:hover {
        color: var(--vscode-foreground);
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const OutputBlock = styled.pre`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    padding: 5px 8px;
    margin: 4px 0 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
    max-height: 300px;
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
        // Check summary for partial failures (e.g. "3/4 passing" means not all passed)
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

    useEffect(() => {
        if (status === "error" && prevStatusRef.current !== "error") {
            setExpanded(true);
        }
        prevStatusRef.current = status;
    }, [status]);

    return (
        <InlineCard>
            <InlineCardHeader>
                <InlineCardIcon>
                    <span className={`codicon ${iconClass}`} />
                </InlineCardIcon>
                <InlineCardTitle>{title}</InlineCardTitle>
            </InlineCardHeader>

            <HeaderRow>
                {isResult ? (
                    <InlineCardIcon style={{ fontSize: 12, color: status === "error" ? "var(--vscode-errorForeground)" : "var(--vscode-charts-green, #388a34)" }}>
                        <span className={`codicon ${status === "error" ? "codicon-chrome-close" : "codicon-check"}`} />
                    </InlineCardIcon>
                ) : (
                    <InlineCardIcon style={{ fontSize: 12, color: "var(--vscode-descriptionForeground)" }}>
                        <span className="codicon codicon-loading codicon-modifier-spin" />
                    </InlineCardIcon>
                )}
                {command && <CommandBadge>{command}</CommandBadge>}
                <StatusText status={status}>{statusLabel}</StatusText>
                {output && (
                    <ExpandButton onClick={() => setExpanded(p => !p)} title={expanded ? "Collapse" : "Expand"}>
                        <span className={`codicon ${expanded ? "codicon-chevron-up" : "codicon-chevron-down"}`} />
                    </ExpandButton>
                )}
            </HeaderRow>

            {expanded && output && (
                <OutputBlock>{output}</OutputBlock>
            )}
        </InlineCard>
    );
};

export default CommandOutputCard;
