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
import TryItCard from "./TryItCard";
import {
    DoneCircle,
    DotWrapper,
    EntryBlock,
    EntryContent,
    EntryHeader,
    EntryRail,
    ExpandIcon,
    FileNameChip,
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

// ── Tool display helpers ───────────────────────────────────────────────────────

function getFileName(filePath: string | undefined): string {
    if (!filePath) return "file";
    const i = filePath.lastIndexOf("/");
    return i !== -1 ? filePath.substring(i + 1) : filePath;
}

function getToolCallDisplay(toolName: string | undefined, toolInput: any): { prefix: string; fileName?: string } {
    switch (toolName) {
        case "file_read":    return { prefix: "Reading",   fileName: getFileName(toolInput?.fileName) + "..." };
        case "file_write":   return { prefix: "Creating",  fileName: getFileName(toolInput?.fileName) + "..." };
        case "file_edit":
        case "file_batch_edit": return { prefix: "Updating", fileName: getFileName(toolInput?.fileName) + "..." };
        case "TaskWrite":    return { prefix: "Planning..." };
        case "LibrarySearchTool": {
            const desc = toolInput?.searchDescription;
            return { prefix: desc ? `Searching for ${desc}...` : "Searching libraries..." };
        }
        case "LibraryGetTool": return { prefix: "Fetching library details..." };
        case "HealthcareLibraryProviderTool": return { prefix: "Analyzing healthcare libraries..." };
        case "getCompilationErrors": return { prefix: "Checking for errors..." };
        case "ConfigCollector": return { prefix: "Reading config..." };
        case "ConnectorGeneratorTool": return { prefix: "Generating connector..." };
        case "runTests": return { prefix: "Running tests..." };
        case "curlRequest": return { prefix: "Sending HTTP request..." };
        case "runBallerinaPackage": return { prefix: `Running ${toolInput?.runType === "service" ? "service" : "program"}...` };
        case "getServiceLogs": return { prefix: "Fetching logs..." };
        case "stopBallerinaService": return { prefix: "Stopping service..." };
        default: return { prefix: "Working..." };
    }
}

function getToolResultDisplay(toolName: string | undefined, toolOutput: any): { prefix: string; fileName?: string } {
    switch (toolName) {
        case "file_read":    return { prefix: "Read",    fileName: getFileName(toolOutput?.fileName) };
        case "file_write":   return { prefix: toolOutput?.action === "updated" ? "Updated" : "Created", fileName: getFileName(toolOutput?.fileName) };
        case "file_edit":
        case "file_batch_edit": return { prefix: "Updated", fileName: getFileName(toolOutput?.fileName) };
        case "TaskWrite":    return { prefix: "Plan ready" };
        case "LibrarySearchTool": {
            const desc = toolOutput?.searchDescription;
            return { prefix: desc ? `${desc.charAt(0).toUpperCase() + desc.slice(1)} search completed` : "Library search completed" };
        }
        case "LibraryGetTool": {
            const names: string[] = toolOutput || [];
            return { prefix: names.length > 0 ? `Fetched: [${names.join(", ")}]` : "No relevant libraries found" };
        }
        case "HealthcareLibraryProviderTool": {
            const names: string[] = toolOutput || [];
            return { prefix: names.length > 0 ? `Fetched: [${names.join(", ")}]` : "No relevant healthcare libraries found" };
        }
        case "getCompilationErrors": {
            const count = toolOutput?.diagnostics?.length ?? 0;
            return { prefix: count > 0 ? `Found ${count} error(s)` : "No issues found" };
        }
        case "ConfigCollector": return { prefix: "Config loaded" };
        case "ConnectorGeneratorTool": return { prefix: "Connector ready" };
        case "runTests": return { prefix: toolOutput?.summary ?? "Tests completed" };
        case "curlRequest": return { prefix: "HTTP request completed" };
        case "runBallerinaPackage": {
            const status = toolOutput?.status ?? "completed";
            return { prefix: status === "started" ? "Service started" : status === "completed" ? "Program completed" : status === "timeout" ? "Program timed out" : "Run failed" };
        }
        case "getServiceLogs": {
            const status = toolOutput?.status ?? "running";
            return { prefix: status === "exited" ? "Service exited" : status === "not_found" ? "Service not found" : "Logs retrieved" };
        }
        case "stopBallerinaService": {
            const status = toolOutput?.status ?? "stopped";
            return { prefix: status === "stopped" ? "Service stopped" : status === "already_exited" ? "Service already exited" : "Service not found" };
        }
        default: return { prefix: "Done" };
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
            const { prefix, fileName } = getToolCallDisplay(item.toolName, item.toolInput);
            return (
                <ItemRow key={idx}>
                    <ToolIcon loading={true}>
                        <span className="codicon codicon-symbol-property" />
                    </ToolIcon>
                    <ItemLabel loading={true}>
                        {prefix}{fileName && <FileNameChip>{fileName}</FileNameChip>}
                    </ItemLabel>
                </ItemRow>
            );
        }
        case "tool_result": {
            if (item.toolName === "curlRequest") {
                return <TryItCard key={idx} input={item.toolOutput} output={item.toolOutput} />;
            }
            const { prefix, fileName } = getToolResultDisplay(item.toolName, item.toolOutput);
            return (
                <ItemRow key={idx}>
                    <ToolIcon loading={false} failed={item.failed}>
                        <span className="codicon codicon-symbol-property" />
                    </ToolIcon>
                    <ItemLabel loading={false} failed={item.failed}>
                        {prefix}{fileName && <FileNameChip>{fileName}</FileNameChip>}
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
}

const StreamEntryComponent: React.FC<StreamEntryComponentProps> = ({
    entry,
    isLast,
    isLoading,
    expanded,
    onToggle,
    innerRef,
    rpcClient,
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
            <EntryRail isLast={isLast}>
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
