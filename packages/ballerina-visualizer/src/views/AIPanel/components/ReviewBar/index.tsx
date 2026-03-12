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
import { SemanticDiff, ChangeTypeEnum } from "@wso2/ballerina-core";
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

const ChangeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ChangeCard = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    background-color: var(--vscode-textCodeBlock-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--vscode-font-family);
    text-align: left;
    width: 100%;
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
    }
    &:disabled {
        cursor: default;
        pointer-events: none;
        opacity: 0.6;
    }
`;

const CardLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
`;

const CardKindLabel = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
`;

const CardFileName = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const TypePill = styled.span<{ changeType: number }>`
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 10px;
    flex-shrink: 0;
    color: ${({ changeType }: { changeType: number }) => {
        switch (changeType) {
            case ChangeTypeEnum.ADDITION: return "var(--vscode-charts-green)";
            case ChangeTypeEnum.DELETION: return "var(--vscode-charts-red)";
            case ChangeTypeEnum.MODIFICATION: return "var(--vscode-charts-yellow)";
            default: return "var(--vscode-charts-blue)";
        }
    }};
    background-color: ${({ changeType }: { changeType: number }) => {
        switch (changeType) {
            case ChangeTypeEnum.ADDITION: return "color-mix(in srgb, var(--vscode-charts-green) 15%, transparent)";
            case ChangeTypeEnum.DELETION: return "color-mix(in srgb, var(--vscode-charts-red) 15%, transparent)";
            case ChangeTypeEnum.MODIFICATION: return "color-mix(in srgb, var(--vscode-charts-yellow) 15%, transparent)";
            default: return "color-mix(in srgb, var(--vscode-charts-blue) 15%, transparent)";
        }
    }};
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const CompactContainer = styled.div`
    display: inline-flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 10px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin: 4px 0;
    align-self: flex-start;
`;

const TitleRow = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font-size: 11px;
    font-weight: 400;
    color: var(--vscode-descriptionForeground);
    text-align: left;
    &:hover {
        opacity: 0.8;
    }
`;

// nodeKind === 2 is TYPE in semantic diffs
const NODE_KIND_TYPE = 2;

interface DiffEntry {
    symbol: string;
    changeType: number;
    label: string;
    kindLabel: string;
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

function getDiffLabel(diff: SemanticDiff): string {
    if (diff.metadata) {
        if (diff.nodeKind === 1) {
            const m = diff.metadata as { accessor: string; servicePath: string; resourcePath: string };
            return `${m.accessor} ${m.servicePath}/${m.resourcePath}`;
        }
        const m = diff.metadata as { name?: string };
        if (m.name) return m.name;
    }
    return getFileName(diff.uri);
}

function getSymbol(changeType: number): string {
    switch (changeType) {
        case ChangeTypeEnum.ADDITION: return "+";
        case ChangeTypeEnum.DELETION: return "-";
        case ChangeTypeEnum.MODIFICATION: return "~";
        default: return "~";
    }
}

function getDiffKindLabel(diff: SemanticDiff): string {
    if (diff.nodeKind === 0) {
        const m = diff.metadata as { name?: string } | undefined;
        return m?.name === "main" ? "automation" : "fn";
    }
    if (diff.nodeKind === 1) return "resource";
    if (diff.nodeKind === 2) return "type";
    return "fn";
}

function getChangeTypeLabel(changeType: number): string {
    switch (changeType) {
        case ChangeTypeEnum.ADDITION: return "+ Added";
        case ChangeTypeEnum.DELETION: return "- Deleted";
        case ChangeTypeEnum.MODIFICATION: return "~ Modified";
        default: return "~ Modified";
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
    const [isExpanded, setIsExpanded] = useState(false);

    // Build chips from semanticDiffs, mirroring ReviewMode's allViews construction:
    // 1. Design diagram views first (one per package when loadDesignDiagrams=true)
    // 2. Semantic diff views with type dedup
    const { chips } = useMemo(() => {
        if (!semanticDiffs || semanticDiffs.length === 0) {
            return { chips: null as DiffEntry[] | null };
        }

        const diffChips: DiffEntry[] = [];
        const designCount = loadDesignDiagrams ? 1 : 0;
        let hasTypeView = false;
        let viewIndex = designCount;

        for (const diff of semanticDiffs) {
            const isType = diff.nodeKind === NODE_KIND_TYPE;
            if (isType && hasTypeView) continue;
            if (isType) hasTypeView = true;

            diffChips.push({
                symbol: getSymbol(diff.changeType),
                changeType: diff.changeType,
                label: getDiffLabel(diff),
                kindLabel: getDiffKindLabel(diff),
                nodeKind: diff.nodeKind,
                viewIndex,
            });
            viewIndex++;
        }

        return { chips: diffChips };
    }, [semanticDiffs, loadDesignDiagrams]);

    const navigateReviewMode = (index = 0) => {
        if (!rpcClient) return;
        rpcClient.getVisualizerRpcClient().navigateReviewMode(index);
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
            rpcClient.getVisualizerRpcClient().goBack();
            onStatusChange?.("discarded");
        } catch (error) {
            console.error("[ReviewBar] Error discarding changes:", error);
            rpcClient.getVisualizerRpcClient().goBack();
        } finally {
            setIsProcessing(false);
        }
    };

    if (status !== "pending") {
        return (
            <CompactContainer>
                <TitleRow onClick={() => setIsExpanded(v => !v)}>
                    <span
                        className={`codicon ${isExpanded ? "codicon-chevron-down" : "codicon-chevron-right"}`}
                        style={{ fontSize: "11px" }}
                    />
                    {status === "accepted" ? "Changes accepted" : "Changes discarded"}
                </TitleRow>
                {isExpanded && (
                    chips && chips.length > 0
                        ? (
                            <ChangeList>
                                {chips.map((entry, i) => (
                                    <ChangeCard key={i} disabled title={entry.label}>
                                        <CardLeft>
                                            <CardKindLabel>{entry.kindLabel}</CardKindLabel>
                                            <CardFileName>{entry.label}</CardFileName>
                                        </CardLeft>
                                        <TypePill changeType={entry.changeType}>{getChangeTypeLabel(entry.changeType)}</TypePill>
                                    </ChangeCard>
                                ))}
                            </ChangeList>
                        )
                        : modifiedFiles.length > 0 && (
                            <ChangeList>
                                {modifiedFiles.map((file, i) => (
                                    <ChangeCard key={i} disabled title={file}>
                                        <CardLeft>
                                            <span className="codicon codicon-file" style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)" }} />
                                            <CardFileName>{getFileName(file)}</CardFileName>
                                        </CardLeft>
                                    </ChangeCard>
                                ))}
                            </ChangeList>
                        )
                )}
            </CompactContainer>
        );
    }

    return (
        <Container>
            <Title>Changes ready to review</Title>
            <ChangeList>
                {chips && chips.length > 0
                    ? chips.map((entry, i) => (
                        <ChangeCard key={i} onClick={() => navigateReviewMode(entry.viewIndex)} title={entry.label}>
                            <CardLeft>
                                <CardKindLabel>{entry.kindLabel}</CardKindLabel>
                                <CardFileName>{entry.label}</CardFileName>
                            </CardLeft>
                            <TypePill changeType={entry.changeType}>{getChangeTypeLabel(entry.changeType)}</TypePill>
                        </ChangeCard>
                    ))
                    : modifiedFiles.map((file, i) => (
                        <ChangeCard key={i} onClick={() => navigateReviewMode(0)} title={file}>
                            <CardLeft>
                                <span className="codicon codicon-file" style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)" }} />
                                <CardFileName>{getFileName(file)}</CardFileName>
                            </CardLeft>
                        </ChangeCard>
                    ))
                }
            </ChangeList>
            {isActive && (
                <ButtonRow>
                    <Button appearance="secondary" onClick={handleDiscard} disabled={isProcessing}>
                        Discard
                    </Button>
                    <Button appearance="primary" onClick={handleAccept} disabled={isProcessing}>
                        Keep
                    </Button>
                    <Button onClick={() => navigateReviewMode(0)} disabled={isProcessing}>
                        Review
                    </Button>
                </ButtonRow>
            )}
        </Container>
    );
};

export default ReviewBar;
