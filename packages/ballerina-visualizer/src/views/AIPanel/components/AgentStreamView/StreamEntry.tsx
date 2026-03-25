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

import React from "react";
import MarkdownRenderer from "../MarkdownRenderer";
import TodoSection from "../TodoSection";
import ConfigCard from "./ConfigCard";
import ConnectorCard from "./ConnectorCard";
import CommandOutputCard from "./CommandOutputCard";
import TryItCard from "./TryItCard";
import {
    DoneCircle,
    DotWrapper,
    EntryBlock,
    EntryContent,
    EntryHeader,
    EntryRail,
    ExpandIcon,
    ItemDetail,
    ItemLabel,
    ItemMarkdownWrapper,
    ItemRow,
    ItemsArea,
    ItemsInner,
    NodeLabel,
    ProgressDone,
    ProgressSpinner,
    SonarCenter,
    SonarRing,
    SonarWrapper,
    ToolIcon,
} from "./styles";
import { StreamEntry, StreamItem } from "./types";

const COMMAND_OUTPUT_TOOLS = new Set(["runBallerinaPackage", "runTests", "getServiceLogs", "stopBallerinaService"]);

// ── Tool icon mapping ─────────────────────────────────────────────────────────

interface ToolIconEntry { loading: string; done?: string; }

const TOOL_ICON_MAP: Record<string, ToolIconEntry> = {
    file_read:                     { loading: "codicon-go-to-file" },
    file_write:                    { loading: "codicon-edit" },
    file_edit:                     { loading: "codicon-edit" },
    file_batch_edit:               { loading: "codicon-edit" },
    LibrarySearchTool:             { loading: "codicon-package" },
    LibraryGetTool:                { loading: "codicon-package" },
    HealthcareLibraryProviderTool: { loading: "codicon-package" },
    web_search:                    { loading: "codicon-search" },
    web_fetch:                     { loading: "codicon-globe" },
    runTests:                      { loading: "codicon-beaker" },
    runBallerinaPackage:           { loading: "codicon-play" },
    getServiceLogs:                { loading: "codicon-output" },
    stopBallerinaService:          { loading: "codicon-debug-stop" },
    getCompilationErrors:          { loading: "codicon-pulse", done: "codicon-pass-filled" },
    TaskWrite:                     { loading: "codicon-checklist" },
    ConfigCollector:               { loading: "codicon-settings-gear" },
    ConnectorGeneratorTool:        { loading: "codicon-plug" },
};
const DEFAULT_TOOL_ICON = "codicon-symbol-property";

function getToolIcon(toolName: string | undefined, state: "loading" | "done" = "loading"): string {
    const entry = toolName ? TOOL_ICON_MAP[toolName] : undefined;
    if (!entry) return DEFAULT_TOOL_ICON;
    return state === "done" ? (entry.done ?? entry.loading) : entry.loading;
}

function getToolResultIcon(toolName: string | undefined, toolOutput: any): string {
    if (toolName === "getCompilationErrors") {
        const count = toolOutput?.diagnostics?.length ?? 0;
        return count > 0 ? "codicon-warning" : "codicon-pass-filled";
    }
    return getToolIcon(toolName, "done");
}

// ── Tool display helpers ───────────────────────────────────────────────────────

function getFileName(filePath: string | undefined): string {
    if (!filePath) return "file";
    const i = filePath.lastIndexOf("/");
    return i !== -1 ? filePath.substring(i + 1) : filePath;
}

function getToolCallDisplay(toolName: string | undefined, toolInput: any): { label: string; detail?: string } {
    switch (toolName) {
        case "file_read":    return { label: "Reading",   detail: getFileName(toolInput?.fileName) + "..." };
        case "file_write":   return { label: "Creating",  detail: getFileName(toolInput?.fileName) + "..." };
        case "file_edit":
        case "file_batch_edit": return { label: "Updating", detail: getFileName(toolInput?.fileName) + "..." };
        case "TaskWrite":    return { label: "Planning..." };
        case "LibrarySearchTool": {
            const desc = toolInput?.searchDescription;
            return { label: desc ? `Searching for ${desc}...` : "Searching libraries..." };
        }
        case "LibraryGetTool": return { label: "Fetching library details..." };
        case "HealthcareLibraryProviderTool": return { label: "Analyzing healthcare libraries..." };
        case "getCompilationErrors": return { label: "Checking for errors..." };
        case "ConfigCollector": return { label: "Reading config..." };
        case "ConnectorGeneratorTool": return { label: "Generating connector..." };
        case "runTests": return { label: "Running tests..." };
        case "curlRequest": return { label: "Sending HTTP request..." };
        case "runBallerinaPackage": return { label: `Running ${toolInput?.runType === "service" ? "service" : "program"}...` };
        case "getServiceLogs": return { label: "Fetching logs..." };
        case "stopBallerinaService": return { label: "Stopping service..." };
        case "web_search": return { label: toolInput?.query ? "Searching the web:" : "Searching the web...", detail: toolInput?.query };
        case "web_fetch":  return { label: toolInput?.url ? "Fetching from web:" : "Fetching from web...", detail: toolInput?.url };
        default: return { label: "Working..." };
    }
}

function getToolResultDisplay(toolName: string | undefined, toolOutput: any, hint?: string): { label: string; detail?: string } {
    switch (toolName) {
        case "file_read":    return { label: "Read",    detail: getFileName(toolOutput?.fileName) };
        case "file_write":   return { label: toolOutput?.action === "updated" ? "Updated" : "Created", detail: getFileName(toolOutput?.fileName) };
        case "file_edit":
        case "file_batch_edit": return { label: "Updated", detail: getFileName(toolOutput?.fileName) };
        case "TaskWrite":    return { label: "Plan ready" };
        case "LibrarySearchTool": {
            const desc = toolOutput?.searchDescription;
            return { label: desc ? `${desc.charAt(0).toUpperCase() + desc.slice(1)} search completed` : "Library search completed" };
        }
        case "LibraryGetTool": {
            const names: string[] = toolOutput || [];
            return { label: names.length > 0 ? `Fetched: [${names.join(", ")}]` : "No relevant libraries found" };
        }
        case "HealthcareLibraryProviderTool": {
            const names: string[] = toolOutput || [];
            return { label: names.length > 0 ? `Fetched: [${names.join(", ")}]` : "No relevant healthcare libraries found" };
        }
        case "getCompilationErrors": {
            const count = toolOutput?.diagnostics?.length ?? 0;
            return { label: count > 0 ? `Found ${count} error(s)` : "No issues found" };
        }
        case "ConfigCollector": return { label: "Config loaded" };
        case "ConnectorGeneratorTool": return { label: "Connector ready" };
        case "runTests": return { label: toolOutput?.summary ?? "Tests completed" };
        case "curlRequest": return { label: "HTTP request completed" };
        case "runBallerinaPackage": {
            const status = toolOutput?.status ?? "completed";
            return { label: status === "started" ? "Service started" : status === "completed" ? "Program completed" : status === "timeout" ? "Program timed out" : "Run failed" };
        }
        case "getServiceLogs": {
            const status = toolOutput?.status ?? "running";
            return { label: status === "exited" ? "Service exited" : status === "not_found" ? "Service not found" : "Logs retrieved" };
        }
        case "stopBallerinaService": {
            const status = toolOutput?.status ?? "stopped";
            return { label: status === "stopped" ? "Service stopped" : status === "already_exited" ? "Service already exited" : "Service not found" };
        }
        case "web_search": return { label: hint ? "Web search:" : "Web search completed", detail: hint };
        case "web_fetch":  return { label: hint ? "Web fetch:" : "Web fetch completed",  detail: hint };
        default: return { label: "Done" };
    }
}

// ── Item renderer — order-preserving, used by both floating and named entries ─

function renderItem(item: StreamItem, idx: number, items: StreamItem[], streamActive: boolean, rpcClient?: any): React.ReactNode {
    switch (item.kind) {
        case "text": {
            const trimmed = item.text.trim();
            if (!trimmed) return null;
            return (
                <ItemMarkdownWrapper key={idx}>
                    <MarkdownRenderer markdownContent={trimmed} />
                </ItemMarkdownWrapper>
            );
        }
        case "tool_call": {
            if (item.toolName === "curlRequest") {
                return <TryItCard key={idx} input={item.toolInput} />;
            }
            if (COMMAND_OUTPUT_TOOLS.has(item.toolName ?? "")) {
                return <CommandOutputCard key={idx} toolName={item.toolName} toolInput={item.toolInput} />;
            }
            const { label, detail } = getToolCallDisplay(item.toolName, item.toolInput);
            return (
                <ItemRow key={idx}>
                    <ToolIcon loading={streamActive}>
                        <span className={`codicon ${getToolIcon(item.toolName, "loading")}`} />
                    </ToolIcon>
                    <ItemLabel loading={streamActive}>
                        {label}{detail && <ItemDetail title={detail}>{detail}</ItemDetail>}
                    </ItemLabel>
                </ItemRow>
            );
        }
        case "tool_result": {
            if (item.toolName === "curlRequest") {
                return <TryItCard key={idx} input={item.toolOutput} output={item.toolOutput} />;
            }
            if (COMMAND_OUTPUT_TOOLS.has(item.toolName ?? "")) {
                return <CommandOutputCard key={idx} toolName={item.toolName} toolOutput={item.toolOutput} isResult={true} />;
            }
            const hint = item.toolOutput?.query ?? item.toolOutput?.url;
            const { label, detail } = getToolResultDisplay(item.toolName, item.toolOutput, hint);
            return (
                <ItemRow key={idx}>
                    <ToolIcon loading={false} failed={item.failed}>
                        <span className={`codicon ${getToolResultIcon(item.toolName, item.toolOutput)}`} />
                    </ToolIcon>
                    <ItemLabel loading={false} failed={item.failed}>
                        {label}{detail && <ItemDetail title={detail}>{detail}</ItemDetail>}
                    </ItemLabel>
                </ItemRow>
            );
        }
        case "plan":
            return (
                <TodoSection
                    key={idx}
                    tasks={item.tasks}
                    message={item.message}
                    initialExpanded={!item.approvalStatus}
                    approvalStatus={item.approvalStatus}
                    approvalComment={item.approvalComment}
                />
            );
        case "config":
            return <ConfigCard key={idx} data={item.data} rpcClient={rpcClient} />;
        case "connector":
            return <ConnectorCard key={idx} data={item.data} rpcClient={rpcClient} />;
        case "component":
            if (item.componentType === "progress") {
                if (item.data.status === "end") return null;
                const isCompleted = items.slice(idx + 1).some(
                    i => i.kind === "component" && i.componentType === "progress" &&
                         i.data.status === "end" && i.data.text === item.data.text
                );
                // If stream stopped before this progress item got its "end", treat as done
                const isSpinning = !isCompleted && streamActive;
                return (
                    <ItemRow key={idx}>
                        {isSpinning
                            ? <ProgressSpinner><span className="codicon codicon-sync" /></ProgressSpinner>
                            : <ProgressDone><span className="codicon codicon-pass-filled" /></ProgressDone>
                        }
                        <ItemLabel loading={isSpinning}>{item.data.text}</ItemLabel>
                    </ItemRow>
                );
            }
            return null;
        default:
            return null;
    }
}

// ── NodeStatus helper ─────────────────────────────────────────────────────────

function getNodeStatus(entry: StreamEntry, isLast: boolean, isLoading: boolean): "active" | "done" {
    if (entry.status === "completed") return "done";
    const hasActiveItem = entry.items.some(i => i.kind === "tool_call");
    if (hasActiveItem || (isLast && isLoading)) return "active";
    return "done";
}

// ── StreamEntryComponent ──────────────────────────────────────────────────────

interface StreamEntryComponentProps {
    entry: StreamEntry;
    isLast: boolean;
    isLoading: boolean;
    expanded: boolean;
    onToggle: () => void;
    innerRef?: (el: HTMLDivElement | null) => void;
    rpcClient?: any;
    hasNextNamedEntry?: boolean;
}

const StreamEntryComponent: React.FC<StreamEntryComponentProps> = ({
    entry,
    isLast,
    isLoading,
    expanded,
    onToggle,
    innerRef,
    rpcClient,
    hasNextNamedEntry = false,
}) => {
    const hasItems = entry.items.length > 0;

    // Floating entry — no rail, no dot, items render directly in arrival order
    if (!entry.description) {
        if (!hasItems) return null;
        return (
            <EntryBlock style={{ flexDirection: "column" }}>
                {entry.items.map((item, idx) => renderItem(item, idx, entry.items, isLast && isLoading, rpcClient))}
            </EntryBlock>
        );
    }

    // Named task entry — rail + dot + collapsible items area
    const nodeStatus = getNodeStatus(entry, isLast, isLoading);

    return (
        <EntryBlock style={{ marginLeft: "-7px" }}>
            <EntryRail showLine={expanded || hasNextNamedEntry}>
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
            </EntryRail>

            <EntryContent>
                <EntryHeader onClick={() => hasItems && onToggle()}>
                    <NodeLabel nodeStatus={nodeStatus}>{entry.description}</NodeLabel>
                    {hasItems && <ExpandIcon expanded={expanded} className="codicon codicon-ellipsis" />}
                </EntryHeader>
                {hasItems && (
                    <ItemsArea expanded={expanded}>
                        <ItemsInner ref={innerRef}>
                            {entry.items.map((item, idx) => renderItem(item, idx, entry.items, isLast && isLoading, rpcClient))}
                        </ItemsInner>
                    </ItemsArea>
                )}
            </EntryContent>
        </EntryBlock>
    );
};

export { StreamEntryComponent, getNodeStatus };
export default StreamEntryComponent;
