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

import { useState, useMemo } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Codicon } from "@wso2/ui-toolkit";

interface FileDiff {
    path: string;
    additions: number;
    deletions: number;
    hunks: DiffHunk[];
}

interface DiffHunk {
    header: string;
    lines: DiffLine[];
}

interface DiffLine {
    type: "add" | "del" | "context";
    content: string;
    oldNum?: number;
    newNum?: number;
}

function parseDiff(raw: string): FileDiff[] {
    const files: FileDiff[] = [];
    const fileSections = raw.split(/^diff --git /m).filter(Boolean);

    for (const section of fileSections) {
        const lines = section.split("\n");

        // Extract file path from the first line: "a/path b/path"
        const pathMatch = lines[0]?.match(/a\/(.+?)\s+b\/(.+)/);
        const filePath = pathMatch?.[2] ?? pathMatch?.[1] ?? "unknown";

        let additions = 0;
        let deletions = 0;
        const hunks: DiffHunk[] = [];
        let currentHunk: DiffHunk | null = null;
        let oldLine = 0;
        let newLine = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];

            // Skip file metadata lines
            if (
                line.startsWith("index ") ||
                line.startsWith("--- ") ||
                line.startsWith("+++ ") ||
                line.startsWith("old mode") ||
                line.startsWith("new mode") ||
                line.startsWith("deleted file") ||
                line.startsWith("new file") ||
                line.startsWith("similarity index") ||
                line.startsWith("rename from") ||
                line.startsWith("rename to") ||
                line.startsWith("Binary files")
            ) {
                continue;
            }

            // Hunk header
            if (line.startsWith("@@")) {
                const hunkMatch = line.match(
                    /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/
                );
                oldLine = hunkMatch ? parseInt(hunkMatch[1]) : 0;
                newLine = hunkMatch ? parseInt(hunkMatch[2]) : 0;
                currentHunk = {
                    header: line,
                    lines: [],
                };
                hunks.push(currentHunk);
                continue;
            }

            if (!currentHunk) continue;

            if (line.startsWith("+")) {
                additions++;
                currentHunk.lines.push({
                    type: "add",
                    content: line.substring(1),
                    newNum: newLine++,
                });
            } else if (line.startsWith("-")) {
                deletions++;
                currentHunk.lines.push({
                    type: "del",
                    content: line.substring(1),
                    oldNum: oldLine++,
                });
            } else if (line.startsWith(" ") || line === "") {
                currentHunk.lines.push({
                    type: "context",
                    content: line.substring(1),
                    oldNum: oldLine++,
                    newNum: newLine++,
                });
            }
        }

        if (hunks.length > 0) {
            files.push({ path: filePath, additions, deletions, hunks });
        }
    }

    return files;
}

// --- Styled Components ---

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
`;

const Modal = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    width: 100%;
    max-width: 900px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    overflow: hidden;
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBar-background);
    flex-shrink: 0;
`;

const ModalTitle = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CloseBtn = styled.button`
    background: none;
    border: none;
    color: var(--vscode-descriptionForeground);
    font-size: 18px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    line-height: 1;

    &:hover {
        background: var(--vscode-list-hoverBackground);
        color: var(--vscode-editor-foreground);
    }
`;

const RestoreBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
    background: var(--vscode-button-secondaryBackground, transparent);
    color: var(--vscode-button-secondaryForeground, var(--vscode-editor-foreground));
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground));
    }
`;

const ConfirmBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--vscode-editorWarning-foreground, #cca700);
`;

const ConfirmBtn = styled.button`
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: none;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: var(--vscode-button-hoverBackground);
    }
`;

const CancelBtn = styled.button`
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
    background: transparent;
    color: var(--vscode-editor-foreground);
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const StatusLabel = styled.span<{ variant: "success" | "error" }>`
    font-size: 11px;
    color: ${(p: { variant: "success" | "error" }) =>
        p.variant === "success"
            ? "var(--vscode-editorGutter-addedBackground, #2ea043)"
            : "var(--vscode-editorGutter-deletedBackground, #f85149)"};
`;

const ModalBody = styled.div`
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
`;

const FileList = styled.div`
    width: 240px;
    flex-shrink: 0;
    border-right: 1px solid var(--vscode-panel-border);
    overflow-y: auto;
    background: var(--vscode-sideBar-background);
`;

const FileItem = styled.button<{ isActive: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: ${(p: { isActive: boolean }) =>
        p.isActive
            ? "var(--vscode-list-activeSelectionBackground)"
            : "transparent"};
    color: ${(p: { isActive: boolean }) =>
        p.isActive
            ? "var(--vscode-list-activeSelectionForeground, var(--vscode-editor-foreground))"
            : "var(--vscode-editor-foreground)"};
    text-align: left;
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;

    &:hover {
        background: ${(p: { isActive: boolean }) =>
            p.isActive
                ? "var(--vscode-list-activeSelectionBackground)"
                : "var(--vscode-list-hoverBackground)"};
    }
`;

const FileName = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
`;

const FileStats = styled.span`
    font-size: 10px;
    flex-shrink: 0;
    color: var(--vscode-descriptionForeground);
`;

const AddCount = styled.span`
    color: var(--vscode-editorGutter-addedBackground, #2ea043);
`;

const DelCount = styled.span`
    color: var(--vscode-editorGutter-deletedBackground, #f85149);
`;

const DiffPane = styled.div`
    flex: 1;
    overflow: auto;
    min-width: 0;

    > * {
        min-width: fit-content;
    }
`;

const HunkSeparator = styled.div`
    padding: 4px 16px;
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    background: var(--vscode-sideBar-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    border-top: 1px solid var(--vscode-panel-border);
    user-select: none;
    letter-spacing: 2px;
    text-align: center;
`;

const DiffLineRow = styled.div<{ lineType: "add" | "del" | "context" }>`
    display: flex;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    line-height: 20px;
    background: ${(p: { lineType: "add" | "del" | "context" }) => {
        if (p.lineType === "add") return "rgba(76, 175, 80, 0.1)";
        if (p.lineType === "del") return "rgba(244, 67, 54, 0.1)";
        return "transparent";
    }};

    &:hover {
        background: ${(p: { lineType: "add" | "del" | "context" }) => {
            if (p.lineType === "add") return "rgba(76, 175, 80, 0.15)";
            if (p.lineType === "del") return "rgba(244, 67, 54, 0.15)";
            return "var(--vscode-list-hoverBackground)";
        }};
    }
`;

const LineGutter = styled.span`
    display: inline-block;
    width: 44px;
    flex-shrink: 0;
    text-align: right;
    padding-right: 8px;
    color: var(--vscode-editorLineNumber-foreground, #858585);
    font-size: 11px;
    user-select: none;
`;

const LineBar = styled.span<{ lineType: "add" | "del" | "context" }>`
    display: inline-block;
    width: 3px;
    flex-shrink: 0;
    margin-right: 8px;
    user-select: none;
    background: ${(p: { lineType: "add" | "del" | "context" }) => {
        if (p.lineType === "add")
            return "var(--vscode-editorGutter-addedBackground, #2ea043)";
        if (p.lineType === "del")
            return "var(--vscode-editorGutter-deletedBackground, #f85149)";
        return "transparent";
    }};
`;

const LineContent = styled.span`
    flex: 1;
    padding-right: 16px;
    white-space: pre;
    min-width: 0;
`;

const InlineHighlight = styled.span<{ lineType: "add" | "del" }>`
    background: ${(p: { lineType: "add" | "del" }) =>
        p.lineType === "add"
            ? "rgba(76, 175, 80, 0.35)"
            : "rgba(244, 67, 54, 0.35)"};
    border-radius: 2px;
`;

const EmptyDiff = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    padding: 32px;
`;

const StatsSummary = styled.div`
    padding: 8px 16px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBar-background);
    flex-shrink: 0;
`;

// --- Inline diff helpers ---

interface InlineSegment {
    text: string;
    highlight: boolean;
}

function computeInlineSegments(
    oldContent: string,
    newContent: string
): { oldSegments: InlineSegment[]; newSegments: InlineSegment[] } {
    // Find common prefix length
    let prefixLen = 0;
    const minLen = Math.min(oldContent.length, newContent.length);
    while (prefixLen < minLen && oldContent[prefixLen] === newContent[prefixLen]) {
        prefixLen++;
    }

    // Find common suffix length (not overlapping with prefix)
    let suffixLen = 0;
    while (
        suffixLen < minLen - prefixLen &&
        oldContent[oldContent.length - 1 - suffixLen] === newContent[newContent.length - 1 - suffixLen]
    ) {
        suffixLen++;
    }

    const buildSegments = (content: string): InlineSegment[] => {
        const segments: InlineSegment[] = [];
        const midStart = prefixLen;
        const midEnd = content.length - suffixLen;

        if (midStart > 0) {
            segments.push({ text: content.slice(0, midStart), highlight: false });
        }
        if (midEnd > midStart) {
            segments.push({ text: content.slice(midStart, midEnd), highlight: true });
        }
        if (suffixLen > 0) {
            segments.push({ text: content.slice(midEnd), highlight: false });
        }
        // If no segments (empty string), push the whole content
        if (segments.length === 0) {
            segments.push({ text: content, highlight: false });
        }
        return segments;
    };

    return { oldSegments: buildSegments(oldContent), newSegments: buildSegments(newContent) };
}

/**
 * Pairs adjacent del/add lines within a hunk and computes inline highlights.
 * Returns a map: line index -> InlineSegment[] for lines that have a paired counterpart.
 */
function computeHunkInlineHighlights(lines: DiffLine[]): Map<number, InlineSegment[]> {
    const highlights = new Map<number, InlineSegment[]>();
    let i = 0;

    while (i < lines.length) {
        // Collect consecutive del lines
        const delStart = i;
        while (i < lines.length && lines[i].type === "del") i++;
        const delEnd = i;

        // Collect consecutive add lines right after
        const addStart = i;
        while (i < lines.length && lines[i].type === "add") i++;
        const addEnd = i;

        // Pair them up
        const delCount = delEnd - delStart;
        const addCount = addEnd - addStart;
        const pairCount = Math.min(delCount, addCount);

        for (let p = 0; p < pairCount; p++) {
            const delIdx = delStart + p;
            const addIdx = addStart + p;
            const { oldSegments, newSegments } = computeInlineSegments(
                lines[delIdx].content,
                lines[addIdx].content
            );
            // Only apply if there's an actual partial change (not entirely different)
            const oldHasUnhighlighted = oldSegments.some((s) => !s.highlight && s.text.length > 0);
            const newHasUnhighlighted = newSegments.some((s) => !s.highlight && s.text.length > 0);
            if (oldHasUnhighlighted && newHasUnhighlighted) {
                highlights.set(delIdx, oldSegments);
                highlights.set(addIdx, newSegments);
            }
        }

        // Skip context lines
        if (i === addEnd && i < lines.length && lines[i].type === "context") {
            i++;
        }
        // Avoid infinite loop if we didn't advance
        if (i === delStart) i++;
    }

    return highlights;
}

// --- Component ---

type RestoreState = "idle" | "confirming" | "restoring" | "success" | "error";

interface DiffViewerProps {
    diffFull: string;
    sha?: string;
    isDirty?: boolean;
    projectPath?: string;
    onClose: () => void;
    onRestoreComplete?: () => void;
}

export function DiffViewer({ diffFull, sha, isDirty, projectPath, onClose, onRestoreComplete }: DiffViewerProps) {
    const files = useMemo(() => {
        const parsed = parseDiff(diffFull);
        return parsed.sort((a, b) => {
            const aIsBal = a.path.endsWith(".bal") ? 0 : 1;
            const bIsBal = b.path.endsWith(".bal") ? 0 : 1;
            return aIsBal - bIsBal;
        });
    }, [diffFull]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [restoreState, setRestoreState] = useState<RestoreState>("idle");
    const [restoreError, setRestoreError] = useState("");
    const [wasStashed, setWasStashed] = useState(false);
    const { rpcClient } = useRpcContext();

    const activeFile = files[activeIndex];

    const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
    const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);

    const canRestore = sha && projectPath && files.length > 0;

    const handleRestore = async () => {
        if (restoreState === "idle") {
            setRestoreState("confirming");
            return;
        }
        if (restoreState !== "confirming" || !sha || !projectPath) return;

        setRestoreState("restoring");
        try {
            const resp = await rpcClient.getTestManagerRpcClient().restoreGitSnapshot({
                projectPath,
                sha,
                isDirty: isDirty ?? false,
            });
            if (resp.success) {
                setWasStashed(!!resp.safetyStashSha);
                setRestoreState("success");
                onRestoreComplete?.();
            } else {
                setRestoreError(resp.error ?? "Unknown error");
                setRestoreState("error");
            }
        } catch (e: any) {
            setRestoreError(e?.message ?? "Unknown error");
            setRestoreState("error");
        }
    };

    const renderRestoreAction = () => {
        if (!canRestore) return null;

        switch (restoreState) {
            case "idle":
                return (
                    <RestoreBtn onClick={handleRestore}>
                        <Codicon name="discard" />
                        Restore to this state
                    </RestoreBtn>
                );
            case "confirming":
                return (
                    <ConfirmBar>
                        <span>This will overwrite your current code. Continue?</span>
                        <ConfirmBtn onClick={handleRestore}>Restore</ConfirmBtn>
                        <CancelBtn onClick={() => setRestoreState("idle")}>Cancel</CancelBtn>
                    </ConfirmBar>
                );
            case "restoring":
                return <StatusLabel variant="success">Restoring...</StatusLabel>;
            case "success":
                return (
                    <StatusLabel variant="success">
                        {wasStashed ? "Restored (previous changes stashed)" : "Restored"}
                    </StatusLabel>
                );
            case "error":
                return (
                    <ConfirmBar>
                        <StatusLabel variant="error">{restoreError}</StatusLabel>
                        <CancelBtn onClick={() => { setRestoreState("idle"); setRestoreError(""); }}>
                            Dismiss
                        </CancelBtn>
                    </ConfirmBar>
                );
        }
    };

    if (files.length === 0) {
        return (
            <Overlay onClick={onClose}>
                <Modal onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: "none" }}>
                    <ModalHeader>
                        <ModalTitle>Code changes since this run</ModalTitle>
                        <CloseBtn onClick={onClose}>&times;</CloseBtn>
                    </ModalHeader>
                    <EmptyDiff>No changes — your code is the same as when this evaluation ran</EmptyDiff>
                </Modal>
            </Overlay>
        );
    }

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Code changes since this run</ModalTitle>
                    <HeaderActions>
                        {renderRestoreAction()}
                        <CloseBtn onClick={onClose}>&times;</CloseBtn>
                    </HeaderActions>
                </ModalHeader>
                <StatsSummary>
                    {files.length} file{files.length !== 1 ? "s" : ""} modified
                    {totalAdditions > 0 && (
                        <>{" — "}<AddCount>{totalAdditions} new line{totalAdditions !== 1 ? "s" : ""}</AddCount></>
                    )}
                    {totalDeletions > 0 && (
                        <>{totalAdditions > 0 ? ", " : " — "}<DelCount>{totalDeletions} removed</DelCount></>
                    )}
                    {" since this evaluation"}
                </StatsSummary>
                <ModalBody>
                    <FileList>
                        {files.map((file, idx) => (
                            <FileItem
                                key={file.path}
                                isActive={idx === activeIndex}
                                onClick={() => setActiveIndex(idx)}
                                title={file.path}
                            >
                                <FileName>{file.path.split("/").pop()}</FileName>
                                <FileStats>
                                    {file.additions > 0 && (
                                        <AddCount>+{file.additions}</AddCount>
                                    )}
                                    {file.additions > 0 && file.deletions > 0 && " "}
                                    {file.deletions > 0 && (
                                        <DelCount>-{file.deletions}</DelCount>
                                    )}
                                </FileStats>
                            </FileItem>
                        ))}
                    </FileList>
                    <DiffPane>
                        {activeFile ? (
                            <>
                                {activeFile.hunks.map((hunk, hi) => {
                                    const inlineHighlights = computeHunkInlineHighlights(hunk.lines);
                                    return (
                                        <div key={hi}>
                                            {hi > 0 && <HunkSeparator>···</HunkSeparator>}
                                            {hunk.lines.map((line, li) => {
                                                const segments = inlineHighlights.get(li);
                                                return (
                                                    <DiffLineRow
                                                        key={`${hi}-${li}`}
                                                        lineType={line.type}
                                                    >
                                                        <LineGutter>
                                                            {line.type === "del"
                                                                ? ""
                                                                : line.newNum ?? line.oldNum}
                                                        </LineGutter>
                                                        <LineBar lineType={line.type} />
                                                        <LineContent>
                                                            {segments ? (
                                                                segments.map((seg, si) =>
                                                                    seg.highlight ? (
                                                                        <InlineHighlight
                                                                            key={si}
                                                                            lineType={line.type as "add" | "del"}
                                                                        >
                                                                            {seg.text}
                                                                        </InlineHighlight>
                                                                    ) : (
                                                                        <span key={si}>{seg.text}</span>
                                                                    )
                                                                )
                                                            ) : (
                                                                line.content
                                                            )}
                                                        </LineContent>
                                                    </DiffLineRow>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            <EmptyDiff>No changes to display</EmptyDiff>
                        )}
                    </DiffPane>
                </ModalBody>
            </Modal>
        </Overlay>
    );
}
