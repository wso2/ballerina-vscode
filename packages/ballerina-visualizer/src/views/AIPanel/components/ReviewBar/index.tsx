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

import React, { useMemo, useState } from "react";
import styled from "@emotion/styled";
import { SemanticDiff, ChangeTypeEnum, ReviewViewItem } from "@wso2/ballerina-core";
import { Button } from "@wso2/ui-toolkit";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin: 8px 0 4px;
`;

const Title = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const FileList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const FileChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    white-space: nowrap;
    &:hover {
        opacity: 0.8;
    }
    &:disabled {
        cursor: default;
        opacity: 0.5;
        pointer-events: none;
    }
`;

const ChipSymbol = styled.span`
    font-weight: 700;
    opacity: 0.8;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const StatusLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
`;

// nodeKind === 2 is TYPE in semantic diffs
const NODE_KIND_TYPE = 2;

interface DiffEntry {
    symbol: string;
    filename: string;
    nodeKind: number;
    viewIndex: number;
}

interface ReviewBarProps {
    modifiedFiles: string[];
    semanticDiffs?: SemanticDiff[];
    loadDesignDiagrams?: boolean;
    status: "pending" | "accepted" | "discarded";
    rpcClient?: any;
    isActive?: boolean;
    onStatusChange?: (status: "accepted" | "discarded") => void;
}

function getFileName(filePath: string): string {
    const i = filePath.lastIndexOf("/");
    return i !== -1 ? filePath.substring(i + 1) : filePath;
}

function getSymbol(changeType: number): string {
    switch (changeType) {
        case ChangeTypeEnum.ADDITION: return "+";
        case ChangeTypeEnum.DELETION: return "-";
        case ChangeTypeEnum.MODIFICATION: return "~";
        default: return "~";
    }
}

function getDiagramType(nodeKind: number): 'flow' | 'type' {
    return nodeKind === NODE_KIND_TYPE ? 'type' : 'flow';
}

function getNodeKindLabel(nodeKind: number): string {
    switch (nodeKind) {
        case 0: return "fn";
        case 1: return "resource";
        case 2: return "type";
        default: return "fn";
    }
}

export const ReviewBar: React.FC<ReviewBarProps> = ({
    modifiedFiles,
    semanticDiffs,
    loadDesignDiagrams,
    status,
    rpcClient,
    isActive = false,
    onStatusChange,
}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    // Build chips and prebuiltViews from semanticDiffs, mirroring ReviewMode's allViews construction:
    // 1. Design diagram views first (one per package when loadDesignDiagrams=true)
    // 2. Semantic diff views with type dedup
    const { chips, prebuiltViews } = useMemo(() => {
        if (!semanticDiffs || semanticDiffs.length === 0) {
            return { chips: null, prebuiltViews: [] as ReviewViewItem[] };
        }

        const views: ReviewViewItem[] = [];
        const diffChips: DiffEntry[] = [];

        // Design diagram: one view at index 0 if loadDesignDiagrams
        const designCount = loadDesignDiagrams ? 1 : 0;
        if (loadDesignDiagrams) {
            views.push({
                type: 'component',
                filePath: '',
                position: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 },
                projectPath: '',
            });
        }

        let hasTypeView = false;
        let viewIndex = designCount;

        for (const diff of semanticDiffs) {
            const isType = diff.nodeKind === NODE_KIND_TYPE;
            if (isType && hasTypeView) continue;
            if (isType) hasTypeView = true;

            diffChips.push({
                symbol: getSymbol(diff.changeType),
                filename: getFileName(diff.uri),
                nodeKind: diff.nodeKind,
                viewIndex,
            });
            views.push({
                type: getDiagramType(diff.nodeKind),
                filePath: diff.uri,
                position: {
                    startLine: diff.lineRange.startLine.line,
                    endLine: diff.lineRange.endLine.line,
                    startColumn: diff.lineRange.startLine.offset,
                    endColumn: diff.lineRange.endLine.offset,
                },
                projectPath: '',
                changeType: diff.changeType,
            });
            viewIndex++;
        }

        return { chips: diffChips, prebuiltViews: views };
    }, [semanticDiffs, loadDesignDiagrams]);

    const openReviewMode = (index = 0) => {
        if (!rpcClient) return;
        rpcClient.getVisualizerRpcClient().openReviewModeAtIndex(index);
    };

    const handleAccept = async () => {
        if (!rpcClient) return;
        try {
            setIsProcessing(true);
            await rpcClient.getAiPanelRpcClient().acceptChanges();
            onStatusChange?.("accepted");
            rpcClient.getVisualizerRpcClient().reviewAccepted();
        } catch (error) {
            console.error("[ReviewBar] Error accepting changes:", error);
            rpcClient.getVisualizerRpcClient().reviewAccepted();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDiscard = async () => {
        if (!rpcClient) return;
        try {
            setIsProcessing(true);
            await rpcClient.getAiPanelRpcClient().declineChanges();
            onStatusChange?.("discarded");
            rpcClient.getVisualizerRpcClient().reviewDiscarded();
        } catch (error) {
            console.error("[ReviewBar] Error discarding changes:", error);
            rpcClient.getVisualizerRpcClient().reviewDiscarded();
        } finally {
            setIsProcessing(false);
        }
    };

    const titleText = status === "accepted"
        ? "Changes accepted"
        : status === "discarded"
        ? "Changes discarded"
        : "Changes ready to review";
    const chipsDisabled = status !== "pending";

    return (
        <Container>
            <Title>{titleText}</Title>
            <FileList>
                {chips && chips.length > 0
                    ? chips.map((entry, i) => (
                        <FileChip key={i} disabled={chipsDisabled} onClick={() => openReviewMode(entry.viewIndex)} title={entry.filename}>
                            <ChipSymbol>{entry.symbol}</ChipSymbol>
                            <span style={{ opacity: 0.7, fontSize: "10px" }}>{getNodeKindLabel(entry.nodeKind)}</span>
                            {entry.filename}
                        </FileChip>
                    ))
                    : modifiedFiles.map((file, i) => (
                        <FileChip key={i} disabled={chipsDisabled} onClick={() => openReviewMode(0)} title={file}>
                            <span className="codicon codicon-file" style={{ fontSize: "10px" }} />
                            {getFileName(file)}
                        </FileChip>
                    ))
                }
            </FileList>
            {status === "pending" && isActive && (
                <ButtonRow>
                    <Button appearance="secondary" onClick={handleDiscard} disabled={isProcessing}>
                        Discard
                    </Button>
                    <Button appearance="primary" onClick={handleAccept} disabled={isProcessing}>
                        Keep
                    </Button>
                    <Button onClick={() => openReviewMode(0)} disabled={isProcessing}>
                        Review
                    </Button>
                </ButtonRow>
            )}
            {status === "accepted" && (
                <StatusLabel>
                    <span className="codicon codicon-pass-filled" />
                    Accepted
                </StatusLabel>
            )}
            {status === "discarded" && (
                <StatusLabel>
                    <span className="codicon codicon-error" />
                    Discarded
                </StatusLabel>
            )}
        </Container>
    );
};

export default ReviewBar;
