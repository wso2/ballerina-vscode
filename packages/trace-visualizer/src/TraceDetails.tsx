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

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { TraceData, SpanData } from "./index";
import { Codicon, Icon } from "@wso2/ui-toolkit";
import { SpanInputOutput } from "./components/SpanInputOutput";
import { WaterfallView } from "./components/WaterfallView";

interface TraceDetailsProps {
    traceData: TraceData;
    isAgentChat: boolean;
    focusSpanId?: string;
}

const Container = styled.div`
    margin: 0;
    padding: 16px;
    font-family: var(--vscode-font-family);
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-size: 13px;
    line-height: 1.5;
    height: 100vh;
    overflow-y: auto;
`;

const InfoGrid = styled.div`
    font-size: 13px;
    line-height: 1.4;
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 8px 12px;
`;

const TreeItem = styled.div<{ level: number; isSelected: boolean }>`
    display: flex;
    align-items: center;
    padding: 4px 6px;
    padding-left: ${(props: { level: number }) => props.level * 16}px;
    cursor: pointer;
    border-radius: 3px;
    gap: 8px;
    background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-inactiveSelectionBackground)' : 'transparent'};

    &:hover {
        background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-inactiveSelectionBackground)' : 'var(--vscode-list-hoverBackground)'};
    }
`;

const TreeChevron = styled.span`
    display: inline-flex;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const SpanNameInTree = styled.span`
    flex: 1;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const SpanKindBadge = styled.span`
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    flex-shrink: 0;
`;

// Span Details Panel Styles
const DetailsPanel = styled.div`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 4px;
`;

// Navigation button styles
const NavigationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;

const ModeToggleButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid var(--vscode-panel-border);
        color: var(--vscode-foreground);
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }

    &:active {
        transform: scale(0.98);
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`;

const ViewModeToggle = styled.div`
    display: flex;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
`;

const ViewModeButton = styled.button<{ isActive: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    background: ${(props: { isActive: boolean }) => props.isActive
        ? 'var(--vscode-button-background)'
        : 'transparent'};
    color: ${(props: { isActive: boolean }) => props.isActive
        ? 'var(--vscode-button-foreground)'
        : 'var(--vscode-foreground)'};
    border: none;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
        background: ${(props: { isActive: boolean }) => props.isActive
        ? 'var(--vscode-button-hoverBackground)'
        : 'var(--vscode-list-hoverBackground)'};
    }

    &:first-of-type {
        border-right: 1px solid var(--vscode-panel-border);
    }
`;

// Agent Chat Logs Styles
const AgentChatLogsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const AISpanTreeContainer = styled.div<{ height: number; maxHeight: number; minHeight: number }>`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 12px;
    height: ${(props: { height: number }) => props.height}px;
    max-height: ${(props: { maxHeight: number }) => props.maxHeight}px;
    min-height: ${(props: { minHeight: number }) => props.minHeight}px;
    overflow-y: auto;
    resize: vertical;
`;

const AISpanTreeItem = styled.div<{ level: number; isSelected: boolean }>`
    display: flex;
    align-items: center;
    padding: 6px 8px;
    padding-left: ${(props: { level: number }) => props.level * 20 + 8}px;
    cursor: pointer;
    border-radius: 3px;
    gap: 8px;
    position: relative;
    background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-hoverBackground)' : 'transparent'};
    flex-wrap: wrap;

    &:hover {
        background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-hoverBackground)' : 'var(--vscode-list-hoverBackground)'};
    }

    /* Vertical line for tree structure */
    ${(props: { level: number }) => props.level > 0 && `
        &::before {
            content: '';
            position: absolute;
            left: ${props.level * 20 - 4}px;
            top: 0;
            bottom: 50%;
            width: 1px;
            background-color: var(--vscode-tree-indentGuidesStroke);
            opacity: 0.4;
        }

        /* Horizontal branch line */
        &::after {
            content: '';
            position: absolute;
            left: ${props.level * 20 - 4}px;
            top: 50%;
            width: 8px;
            height: 1px;
            background-color: var(--vscode-tree-indentGuidesStroke);
            opacity: 0.4;
        }
    `}
`;

const AISpanBadge = styled.span<{ type: string }>`
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 3px;
    font-weight: 500;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: var(--vscode-editor-background);
    color: ${(props: { type: string }) => {
        switch (props.type) {
            case 'invoke': return 'var(--vscode-terminal-ansiCyan)';
            case 'chat': return 'var(--vscode-terminalSymbolIcon-optionForeground)';
            case 'tool': return 'var(--vscode-terminal-ansiBrightMagenta)';
            default: return 'var(--vscode-badge-foreground)';
        }
    }};
    border: 1px solid var(--vscode-dropdown-border);

    .ai-span-label {
        color: var(--vscode-foreground);
    }
`;

const AISpanLabel = styled.span`
    flex: 1;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
`;

const AISpanDuration = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    flex-shrink: 0;
    min-width: 80px;
    text-align: right;
`;

const AISpanTokenCount = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    flex-shrink: 0;
    min-width: 110px;
    text-align: right;
`;

const AISpanStartTime = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
    white-space: nowrap;
    min-width: 190px;
    text-align: right;
`;

const AISpanMetadataGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    margin-left: auto;
    flex-shrink: 0;
`;

const AdvancedSpanGroup = styled.div<{ level: number }>`
    margin-left: ${(props: { level: number }) => props.level * 20 + 8}px;
    margin-top: 4px;
    margin-bottom: 4px;
`;

const AdvancedSpanGroupHeader = styled.div<{ isExpanded: boolean }>`
    display: flex;
    align-items: center;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 3px;
    gap: 8px;
    background-color: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const AdvancedSpanGroupContent = styled.div`
    margin-left: 16px;
    border-left: 1px solid var(--vscode-tree-indentGuidesStroke);
    padding-left: 8px;
`;

const AdvancedSpanItem = styled.div<{ isSelected: boolean }>`
    display: flex;
    align-items: center;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 3px;
    gap: 8px;
    margin: 2px 0;
    background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-inactiveSelectionBackground)' : 'transparent'};

    &:hover {
        background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-inactiveSelectionBackground)' : 'var(--vscode-list-hoverBackground)'};
    }
`;

const AdvancedSpanName = styled.span`
    flex: 1;
    font-size: 12px;
    color: var(--vscode-foreground);
`;

const AdvancedSpanKind = styled.span`
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    background-color: var(--vscode-list-hoverBackground);
    color: var(--vscode-badge-foreground);
    flex-shrink: 0;
`;

const InfoSectionContainer = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background-color: var(--vscode-editor-background);
    overflow: hidden;
    margin-bottom: 12px;
`;

const InfoSectionHeader = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    font-size: 13px;
    font-weight: 500;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const InfoSectionContent = styled.div<{ isOpen: boolean }>`
    display: ${(props: { isOpen: boolean }) => props.isOpen ? 'block' : 'none'};
    border-top: 1px solid var(--vscode-panel-border);
    padding: 12px;
`;

const AISpanErrorIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--vscode-errorForeground);
    flex-shrink: 0;
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
    padding: 40px;
    color: var(--vscode-descriptionForeground);
`;

const EmptyStateIcon = styled.div`
    font-size: 48px;
    margin-bottom: 20px;
    opacity: 0.5;
`;

const EmptyStateText = styled.div`
    font-size: 16px;
    margin-bottom: 8px;
`;

// Helper functions
const getSpanTimeRange = (span: SpanData): { start: number; end: number } | null => {
    if (!span.startTime || !span.endTime) return null;
    return {
        start: new Date(span.startTime).getTime(),
        end: new Date(span.endTime).getTime()
    };
};

const timeContainsSpan = (parentSpan: SpanData, childSpan: SpanData): boolean => {
    const parentRange = getSpanTimeRange(parentSpan);
    const childRange = getSpanTimeRange(childSpan);

    if (!parentRange || !childRange) return false;

    // Parent contains child if it starts before/at and ends after/at, but they're not identical
    return parentRange.start <= childRange.start &&
        parentRange.end >= childRange.end &&
        (parentRange.start < childRange.start || parentRange.end > childRange.end);
};

const sortSpansByUmbrellaFirst = (spans: SpanData[]): SpanData[] => {
    return [...spans].sort((a, b) => {
        const aRange = getSpanTimeRange(a);
        const bRange = getSpanTimeRange(b);

        if (!aRange || !bRange) return 0;

        const aContainsB = timeContainsSpan(a, b);
        const bContainsA = timeContainsSpan(b, a);

        if (aContainsB) return -1; // a comes first (umbrella)
        if (bContainsA) return 1;  // b comes first (umbrella)

        // Neither contains the other, sort by start time
        return aRange.start - bRange.start;
    });
};

const formatDuration = (durationMs: number): string => {
    return durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(2)}s`;
};

const getSpanDuration = (span: SpanData): number | null => {
    const range = getSpanTimeRange(span);
    return range ? range.end - range.start : null;
};

// Chevron component for tree items
interface ChevronProps {
    hasChildren: boolean;
    isExpanded: boolean;
    onClick: (e: React.MouseEvent) => void;
}

const TreeChevronIcon: React.FC<ChevronProps> = ({ hasChildren, isExpanded, onClick }) => (
    <TreeChevron onClick={onClick}>
        {hasChildren ? (
            <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
        ) : (
            <span style={{ width: '16px', display: 'inline-block' }} />
        )}
    </TreeChevron>
);

// AI Span Badge Component
interface AIBadgeProps {
    type: string;
}

const AIBadge: React.FC<AIBadgeProps> = ({ type }) => {
    const getIconName = () => {
        switch (type) {
            case 'invoke': return 'bi-ai-agent';
            case 'chat': return 'bi-chat';
            case 'tool': return 'bi-wrench';
            default: return 'bi-action';
        }
    };

    const getLabel = () => {
        switch (type) {
            case 'invoke': return 'Invoke Agent';
            case 'chat': return 'Chat';
            case 'tool': return 'Execute Tool';
            default: return 'Operation';
        }
    };

    return (
        <AISpanBadge type={type}>
            <Icon
                name={getIconName()}
                sx={{
                    fontSize: '16px',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                iconSx={{
                    fontSize: "16px",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            />
            <span className="ai-span-label">{getLabel()}</span>
        </AISpanBadge>
    );
};

export function TraceDetails({ traceData, isAgentChat, focusSpanId }: TraceDetailsProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(['trace', 'resource', 'scope', 'spans'])
    );
    const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
    const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
    const [showFullTrace, setShowFullTrace] = useState<boolean>(false);
    const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<'tree' | 'timeline'>('tree');
    const [expandedAdvancedSpanGroups, setExpandedAdvancedSpanGroups] = useState<Set<string>>(new Set());
    const [containerWidth, setContainerWidth] = useState<number>(window.innerWidth);
    const [aiSpanTreeDimensions, setAISpanTreeDimensions] = useState({ height: 180, maxHeight: 600, minHeight: 50 });
    const [waterfallDimensions, setWaterfallDimensions] = useState({ height: 300, maxHeight: 800, minHeight: 150 });
    const [totalSpanCounts, setTotalSpanCounts] = useState({ aiCount: 0, nonAiCount: 0 });
    const containerRef = React.useRef<HTMLDivElement>(null);
    const hasAutoExpandedRef = React.useRef<boolean>(false);
    const hasFocusedRef = React.useRef<boolean>(false);

    // Track container width for responsive behavior
    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const toggleSpanExpansion = (spanId: string) => {
        const newExpanded = new Set(expandedSpans);
        if (newExpanded.has(spanId)) {
            newExpanded.delete(spanId);
        } else {
            newExpanded.add(spanId);
        }
        setExpandedSpans(newExpanded);
    };

    const selectSpan = (spanId: string) => {
        setSelectedSpanId(spanId);
        // Auto-expand parent spans
        expandParentSpans(spanId);
    };

    const expandParentSpans = (spanId: string) => {
        const span = traceData.spans.find(s => s.spanId === spanId);
        if (!span) return;

        const newExpanded = new Set(expandedSpans);
        let currentParentId = span.parentSpanId;

        while (currentParentId && currentParentId !== '0000000000000000') {
            const parentSpan = traceData.spans.find(s => s.spanId === currentParentId);
            if (parentSpan) {
                newExpanded.add(currentParentId);
                currentParentId = parentSpan.parentSpanId;
            } else {
                break;
            }
        }

        setExpandedSpans(newExpanded);
    };

    const duration = new Date(traceData.lastSeen).getTime() - new Date(traceData.firstSeen).getTime();

    const getSpanKindLabel = (kind: string | number): string => {
        if (typeof kind === 'string') {
            return kind;
        }
        const kindMap: { [key: number]: string } = {
            0: 'UNSPECIFIED',
            1: 'INTERNAL',
            2: 'SERVER',
            3: 'CLIENT',
            4: 'PRODUCER',
            5: 'CONSUMER'
        };
        return kindMap[kind] || `UNKNOWN(${kind})`;
    };

    // Build span hierarchy
    const spanMap = new Map<string, SpanData>();
    const rootSpans: SpanData[] = [];

    traceData.spans.forEach(span => {
        spanMap.set(span.spanId, span);
    });

    traceData.spans.forEach(span => {
        const parentSpanId = span.parentSpanId || '';
        if (!parentSpanId ||
            parentSpanId === '0000000000000000' ||
            parentSpanId === '' ||
            !spanMap.has(parentSpanId)) {
            rootSpans.push(span);
        }
    });

    // Sort root spans: umbrella spans (those that contain others) come first, then by start time
    const sortedRootSpans = sortSpansByUmbrellaFirst(rootSpans);

    // Select first span on load
    // Debug: Log when selectedSpanId changes
    useEffect(() => {
        console.log('[TraceDetails] selectedSpanId changed to:', selectedSpanId);
    }, [selectedSpanId]);

    useEffect(() => {
        // Don't auto-select if we have a focusSpanId or are focusing - let the focus effect handle it
        if (!selectedSpanId && sortedRootSpans.length > 0 && !focusSpanId && !hasFocusedRef.current) {
            console.log('[TraceDetails] Auto-selecting first root span:', sortedRootSpans[0].spanId);
            setSelectedSpanId(sortedRootSpans[0].spanId);
        }
    }, [sortedRootSpans.length, focusSpanId, selectedSpanId]);

    // Auto-expand first 3 levels of spans in advanced mode (only once)
    useEffect(() => {
        if (!isAdvancedMode || hasAutoExpandedRef.current || sortedRootSpans.length === 0) return;

        const spansToExpand = new Set<string>();

        const expandRecursively = (spanId: string, currentLevel: number) => {
            if (currentLevel >= 3) return;

            const children = getChildSpans(spanId);
            if (children.length > 0) {
                spansToExpand.add(spanId);
                children.forEach(child => expandRecursively(child.spanId, currentLevel + 1));
            }
        };

        // Start from root spans
        sortedRootSpans.forEach(rootSpan => {
            expandRecursively(rootSpan.spanId, 0);
        });

        setExpandedSpans(spansToExpand);
        hasAutoExpandedRef.current = true;
    }, [sortedRootSpans, isAdvancedMode]);

    // Auto-focus on specific span if focusSpanId is provided
    useEffect(() => {
        if (focusSpanId && traceData.spans.length > 0) {
            if (hasFocusedRef.current) {
                console.log('[TraceDetails] Already focused, skipping');
                return;
            }
            console.log('[TraceDetails] Focusing on span:', focusSpanId);
            hasFocusedRef.current = true;

            // Expand all parent spans to make the focused span visible FIRST
            const span = traceData.spans.find(s => s.spanId === focusSpanId);
            if (!span) {
                console.error('[TraceDetails] Span not found:', focusSpanId);
                return;
            }

            console.log('[TraceDetails] Found span:', span.name);

            const newExpanded = new Set(expandedSpans);
            let currentParentId = span.parentSpanId;

            while (currentParentId && currentParentId !== '0000000000000000') {
                const parentSpan = traceData.spans.find(s => s.spanId === currentParentId);
                if (parentSpan) {
                    newExpanded.add(currentParentId);
                    console.log('[TraceDetails] Expanding parent:', parentSpan.name);
                    currentParentId = parentSpan.parentSpanId;
                } else {
                    break;
                }
            }

            // Set expanded state and select span
            setExpandedSpans(newExpanded);
            setSelectedSpanId(focusSpanId);

            console.log('[TraceDetails] Switched to tree view and selected span:', focusSpanId);

            // Scroll to the focused span after rendering
            setTimeout(() => {
                const spanElement = document.querySelector(`[data-span-id="${focusSpanId}"]`);
                console.log('[TraceDetails] Looking for element with data-span-id:', focusSpanId, 'Found:', !!spanElement);
                if (spanElement) {
                    console.log('[TraceDetails] Scrolling to span element');
                    spanElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    console.error('[TraceDetails] Could not find span element to scroll to');
                }
            }, 500);
        }
    }, [focusSpanId]);

    const getChildSpans = (spanId: string): SpanData[] => {
        const children = traceData.spans.filter(s => s.parentSpanId === spanId);
        return sortSpansByUmbrellaFirst(children);
    };

    const renderTreeItem = (span: SpanData, level: number = 0): React.ReactNode => {
        const childSpans = getChildSpans(span.spanId);
        const hasChildren = childSpans.length > 0;
        const isExpanded = expandedSpans.has(span.spanId);
        const isSelected = selectedSpanId === span.spanId;
        const spanKind = getSpanKindLabel(span.kind);

        return (
            <React.Fragment key={span.spanId}>
                <TreeItem
                    level={level}
                    isSelected={isSelected}
                    onClick={() => selectSpan(span.spanId)}
                    data-span-id={span.spanId}
                >
                    <TreeChevronIcon
                        hasChildren={hasChildren}
                        isExpanded={isExpanded}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hasChildren) {
                                toggleSpanExpansion(span.spanId);
                            }
                        }}
                    />
                    <SpanNameInTree>
                        {span.name}
                    </SpanNameInTree>
                    <SpanKindBadge>{spanKind}</SpanKindBadge>
                </TreeItem>
                {hasChildren && isExpanded && (
                    <>
                        {childSpans.map(child => renderTreeItem(child, level + 1))}
                    </>
                )}
            </React.Fragment>
        );
    };

    const selectedSpan = selectedSpanId ? spanMap.get(selectedSpanId) : null;

    // Build AI span hierarchy based on time containment
    const buildAISpanHierarchy = () => {
        // First, identify all AI spans
        const aiSpans = traceData.spans.filter(span =>
            span.attributes?.some(attr => attr.key === 'span.type' && attr.value === 'ai')
        );

        // Use the helper function to check if span A contains span B based on time
        const timeContains = timeContainsSpan;

        // For each AI span, find its time-based parent (the smallest span that contains it)
        const timeBasedParents = new Map<string, string>();

        aiSpans.forEach(span => {
            let smallestParent: SpanData | null = null;
            let smallestParentDuration = Infinity;

            aiSpans.forEach(potentialParent => {
                if (potentialParent.spanId === span.spanId) return;

                if (timeContains(potentialParent, span)) {
                    const parentStart = new Date(potentialParent.startTime!).getTime();
                    const parentEnd = new Date(potentialParent.endTime!).getTime();
                    const parentDuration = parentEnd - parentStart;

                    // Find the smallest containing span (most immediate parent)
                    if (parentDuration < smallestParentDuration) {
                        smallestParent = potentialParent;
                        smallestParentDuration = parentDuration;
                    }
                }
            });

            if (smallestParent) {
                timeBasedParents.set(span.spanId, smallestParent.spanId);
            }
        });

        // Find root AI spans (those with no time-based parent)
        const rootAISpans = aiSpans.filter(span => !timeBasedParents.has(span.spanId));

        return rootAISpans.sort((a, b) => {
            const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
            const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
            return aTime - bTime;
        });
    };

    const rootAISpans = buildAISpanHierarchy();

    // Count total visible items in advanced mode (AI spans + non-AI span groups)
    const countTotalVisibleItems = (): { aiCount: number; nonAiCount: number } => {
        if (isAdvancedMode) {
            // In advanced mode, count all root spans and their expanded children
            const countSpanAndChildren = (span: SpanData): number => {
                let count = 1; // Count this span
                const children = getChildSpans(span.spanId);
                if (expandedSpans.has(span.spanId)) {
                    children.forEach(child => {
                        count += countSpanAndChildren(child);
                    });
                }
                return count;
            };

            let totalCount = 0;
            sortedRootSpans.forEach(span => {
                totalCount += countSpanAndChildren(span);
            });

            // Separate AI and non-AI counts
            const aiSpans = traceData.spans.filter(span => isAISpan(span));
            const aiCount = aiSpans.length;
            const nonAiCount = totalCount - aiCount;

            return { aiCount, nonAiCount };
        }

        // In simplified mode, count AI spans only
        const aiSpans = traceData.spans.filter(span =>
            span.attributes?.some(attr => attr.key === 'span.type' && attr.value === 'ai')
        );

        const aiCount = aiSpans.length;
        const nonAiCount = 0;

        return { aiCount, nonAiCount };
    };

    // Calculate total span counts once when spans change (for waterfall)
    useEffect(() => {
        const aiSpans = traceData.spans.filter(span => isAISpan(span));
        const aiCount = aiSpans.length;
        const nonAiCount = traceData.spans.length - aiCount;
        setTotalSpanCounts({ aiCount, nonAiCount });
    }, [traceData.spans]);

    // Calculate container dimensions based on number of items
    useEffect(() => {
        const { aiCount, nonAiCount } = countTotalVisibleItems();
        const aiItemHeight = 36; // Height per AI span item
        const nonAiItemHeight = 27 + 4; // Height per non-AI span item
        let calculatedHeight = (aiCount * aiItemHeight) + (nonAiCount * nonAiItemHeight);

        // Default height: content size up to 180px (or 400px in advanced mode)
        const maxDefaultHeight = isAdvancedMode ? 400 : 180;
        const height = Math.min(calculatedHeight, maxDefaultHeight);
        // Max height: content size up to 600px (or 800px in advanced mode for resizing)
        const maxHeight = calculatedHeight;
        // Min height: smaller of content or 50px
        const minHeight = Math.min(calculatedHeight, 50);

        setAISpanTreeDimensions({ height, maxHeight, minHeight });

        // Calculate waterfall height
        const spanBarHeight = 30;
        const waterfallSpanCount = isAdvancedMode
            ? (totalSpanCounts.aiCount + totalSpanCounts.nonAiCount)
            : totalSpanCounts.aiCount;
        const waterfallCalculatedHeight = (waterfallSpanCount * spanBarHeight) + 70;

        // Set waterfall dimensions (simpler, fixed heights)
        const maxDefaultWaterfallHeight = isAdvancedMode ? 400 : 300;
        const waterfallHeight = Math.min(waterfallCalculatedHeight, maxDefaultWaterfallHeight);
        const waterfallMaxHeight = waterfallCalculatedHeight;
        const waterfallMinHeight = Math.min(waterfallCalculatedHeight, 150);
        setWaterfallDimensions({ height: waterfallHeight, maxHeight: waterfallMaxHeight, minHeight: waterfallMinHeight });
    }, [traceData.spans, isAgentChat, showFullTrace, isAdvancedMode, expandedAdvancedSpanGroups, expandedSpans, totalSpanCounts]);

    // Select first AI span when in agent chat view
    useEffect(() => {
        // Don't auto-select if we have a focusSpanId or are focusing - let the focus effect handle it
        if (focusSpanId || hasFocusedRef.current) {
            return;
        }

        if (isAgentChat && !showFullTrace && rootAISpans.length > 0) {
            setSelectedSpanId(rootAISpans[0].spanId);
        } else if (!isAgentChat && !selectedSpanId && sortedRootSpans.length > 0) {
            setSelectedSpanId(sortedRootSpans[0].spanId);
        }
    }, [isAgentChat, showFullTrace, rootAISpans.length, sortedRootSpans.length, focusSpanId]);

    // Get span type badge
    const getSpanTypeBadge = (span: SpanData): string => {
        const operationName = span.attributes?.find(attr => attr.key === 'gen_ai.operation.name')?.value || '';
        if (operationName.startsWith('invoke_agent')) return 'invoke';
        if (operationName.startsWith('chat') || span.name.toLowerCase().startsWith('chat')) return 'chat';
        if (operationName.startsWith('execute_tool') || span.name.toLowerCase().startsWith('execute_tool')) return 'tool';
        return 'other';
    };

    // Check if span has an error
    const spanHasError = (span: SpanData): boolean => {
        return span.attributes?.some(attr => attr.key === 'error.message' && attr.value) || false;
    };

    // Calculate total tokens for a span
    const getSpanTokens = (span: SpanData): number => {
        const inputTokens = parseInt(span.attributes?.find(attr => attr.key === 'gen_ai.usage.input_tokens')?.value || '0');
        const outputTokens = parseInt(span.attributes?.find(attr => attr.key === 'gen_ai.usage.output_tokens')?.value || '0');
        return inputTokens + outputTokens;
    };

    // Format date for display in tree
    const formatStartTime = (dateString: string | undefined): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    // Remove common prefixes from span names
    const stripSpanPrefix = (spanName: string): string => {
        const prefixes = ['invoke_agent ', 'execute_tool ', 'chat '];
        for (const prefix of prefixes) {
            if (spanName.startsWith(prefix)) {
                return spanName.substring(prefix.length);
            }
        }
        return spanName;
    };

    // Get AI child spans based on time containment
    const getAIChildSpans = (spanId: string): SpanData[] => {
        const parentSpan = traceData.spans.find(s => s.spanId === spanId);
        if (!parentSpan || !parentSpan.startTime || !parentSpan.endTime) {
            return [];
        }

        const parentStart = new Date(parentSpan.startTime).getTime();
        const parentEnd = new Date(parentSpan.endTime).getTime();

        // Get all AI spans
        const aiSpans = traceData.spans.filter(span =>
            span.attributes?.some(attr => attr.key === 'span.type' && attr.value === 'ai')
        );

        // Find direct children: spans that are contained by this span but not by any smaller span
        const children: SpanData[] = [];

        aiSpans.forEach(potentialChild => {
            if (potentialChild.spanId === spanId) return;
            if (!potentialChild.startTime || !potentialChild.endTime) return;

            const childStart = new Date(potentialChild.startTime).getTime();
            const childEnd = new Date(potentialChild.endTime).getTime();

            // Check if parent contains this child
            const parentContainsChild = parentStart <= childStart && parentEnd >= childEnd &&
                (parentStart < childStart || parentEnd > childEnd);

            if (!parentContainsChild) return;

            // Check if there's any other span that also contains this child but is smaller than parent
            let hasIntermediateParent = false;
            aiSpans.forEach(intermediateSpan => {
                if (intermediateSpan.spanId === spanId || intermediateSpan.spanId === potentialChild.spanId) return;
                if (!intermediateSpan.startTime || !intermediateSpan.endTime) return;

                const intStart = new Date(intermediateSpan.startTime).getTime();
                const intEnd = new Date(intermediateSpan.endTime).getTime();

                // Check if intermediate span contains the child
                const intermediateContainsChild = intStart <= childStart && intEnd >= childEnd &&
                    (intStart < childStart || intEnd > childEnd);

                // Check if parent contains the intermediate span
                const parentContainsIntermediate = parentStart <= intStart && parentEnd >= intEnd &&
                    (parentStart < intStart || parentEnd > intEnd);

                if (intermediateContainsChild && parentContainsIntermediate) {
                    hasIntermediateParent = true;
                }
            });

            if (!hasIntermediateParent) {
                children.push(potentialChild);
            }
        });

        // Sort children by start time
        return children.sort((a, b) => {
            const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
            const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
            return aTime - bTime;
        });
    };

    // Get non-AI child spans within an AI span's timeframe
    const getNonAIChildSpans = (parentSpanId: string): SpanData[] => {
        const parentSpan = traceData.spans.find(s => s.spanId === parentSpanId);
        if (!parentSpan || !parentSpan.startTime || !parentSpan.endTime) {
            return [];
        }

        const parentStart = new Date(parentSpan.startTime).getTime();
        const parentEnd = new Date(parentSpan.endTime).getTime();

        // Get all non-AI spans
        const nonAISpans = traceData.spans.filter(span =>
            !span.attributes?.some(attr => attr.key === 'span.type' && attr.value === 'ai')
        );

        // Find spans contained within this AI span's timeframe
        const containedSpans: SpanData[] = [];

        nonAISpans.forEach(span => {
            if (!span.startTime || !span.endTime) return;

            const spanStart = new Date(span.startTime).getTime();
            const spanEnd = new Date(span.endTime).getTime();

            // Check if this span is contained within the parent's timeframe
            if (spanStart >= parentStart && spanEnd <= parentEnd) {
                // Check if this span is directly contained (not nested in another AI span that's a child of parent)
                const aiChildren = getAIChildSpans(parentSpanId);
                let isDirectChild = true;

                for (const aiChild of aiChildren) {
                    if (!aiChild.startTime || !aiChild.endTime) continue;
                    const aiChildStart = new Date(aiChild.startTime).getTime();
                    const aiChildEnd = new Date(aiChild.endTime).getTime();

                    // If this non-AI span is contained within an AI child, it's not a direct child
                    if (spanStart >= aiChildStart && spanEnd <= aiChildEnd) {
                        isDirectChild = false;
                        break;
                    }
                }

                if (isDirectChild) {
                    containedSpans.push(span);
                }
            }
        });

        // Sort by start time
        return containedSpans.sort((a, b) => {
            const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
            const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
            return aTime - bTime;
        });
    };

    // Group non-AI spans by type
    const groupNonAISpans = (spans: SpanData[]): Map<string, SpanData[]> => {
        const groups = new Map<string, SpanData[]>();

        spans.forEach(span => {
            const kind = getSpanKindLabel(span.kind);
            let category = 'Other';

            // Categorize based on attributes or name
            const httpAttr = span.attributes?.find(attr =>
                attr.key.toLowerCase().includes('http') ||
                attr.key.toLowerCase().includes('url')
            );
            const dbAttr = span.attributes?.find(attr =>
                attr.key.toLowerCase().includes('db') ||
                attr.key.toLowerCase().includes('sql')
            );

            if (httpAttr || span.name.toLowerCase().includes('http')) {
                category = 'HTTP Calls';
            } else if (dbAttr || span.name.toLowerCase().includes('db') || span.name.toLowerCase().includes('sql')) {
                category = 'Database Operations';
            } else if (kind === 'CLIENT') {
                category = 'Client Calls';
            } else if (kind === 'SERVER') {
                category = 'Server Operations';
            }

            if (!groups.has(category)) {
                groups.set(category, []);
            }
            groups.get(category)!.push(span);
        });

        return groups;
    };

    // Get child spans from a list of spans based on parent-child relationship
    const getChildSpansFromList = (parentSpanId: string, spanList: SpanData[]): SpanData[] => {
        const children = spanList.filter(s => s.parentSpanId === parentSpanId);
        return sortSpansByUmbrellaFirst(children);
    };

    // Check if a span is an AI span
    const isAISpan = (span: SpanData): boolean => {
        return span.attributes?.some(attr => attr.key === 'span.type' && attr.value === 'ai') || false;
    };

    // Render non-AI span tree item hierarchically
    const renderNonAISpanTreeItem = (span: SpanData, spanList: SpanData[], nestLevel: number = 0): React.ReactNode => {
        const children = getChildSpansFromList(span.spanId, spanList);
        const hasChildren = children.length > 0;
        const isExpanded = expandedSpans.has(span.spanId);
        const isSelected = selectedSpanId === span.spanId;
        const duration = getSpanDuration(span);

        return (
            <React.Fragment key={span.spanId}>
                <AdvancedSpanItem
                    isSelected={isSelected}
                    onClick={() => setSelectedSpanId(span.spanId)}
                    style={{ paddingLeft: `${8 + nestLevel * 16}px` }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                if (hasChildren) {
                                    toggleSpanExpansion(span.spanId);
                                }
                            }}
                            style={{ cursor: hasChildren ? 'pointer' : 'default', width: '16px', display: 'flex' }}
                        >
                            {hasChildren ? (
                                <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
                            ) : (
                                <span style={{ width: '16px' }} />
                            )}
                        </span>
                        <AdvancedSpanName>{span.name}</AdvancedSpanName>
                    </div>
                    {duration !== null && (
                        <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', minWidth: '60px', textAlign: 'right' }}>
                            {formatDuration(duration)}
                        </span>
                    )}
                </AdvancedSpanItem>
                {hasChildren && isExpanded && (
                    <>
                        {children.map(child => renderNonAISpanTreeItem(child, spanList, nestLevel + 1))}
                    </>
                )}
            </React.Fragment>
        );
    };

    // Render mixed AI and non-AI span tree for advanced mode (true hierarchy based on parentSpanId)
    const renderMixedSpanTreeItem = (span: SpanData, level: number = 0): React.ReactNode => {
        const isAI = isAISpan(span);
        const children = getChildSpans(span.spanId); // Use regular getChildSpans for true hierarchy
        const hasChildren = children.length > 0;
        const isExpanded = expandedSpans.has(span.spanId);
        const isSelected = selectedSpanId === span.spanId;
        const duration = getSpanDuration(span);

        if (isAI) {
            // Render as AI span
            const badgeType = getSpanTypeBadge(span);
            const totalTokens = getSpanTokens(span);
            const startTime = formatStartTime(span.startTime);
            const isNarrow = containerWidth < 700;
            const isVeryNarrow = containerWidth < 500;

            return (
                <React.Fragment key={span.spanId}>
                    <AISpanTreeItem
                        level={level}
                        isSelected={isSelected}
                        onClick={() => setSelectedSpanId(span.spanId)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasChildren) {
                                        toggleSpanExpansion(span.spanId);
                                    }
                                }}
                                style={{ cursor: hasChildren ? 'pointer' : 'default', width: '16px', display: 'flex', flexShrink: 0 }}
                            >
                                {hasChildren ? (
                                    <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
                                ) : (
                                    <span style={{ width: '16px' }} />
                                )}
                            </span>
                            <AISpanBadge type={badgeType}>
                                <Icon
                                    name={badgeType === 'invoke' ? 'bi-ai-agent' : badgeType === 'chat' ? 'bi-chat' : badgeType === 'tool' ? 'bi-wrench' : 'bi-action'}
                                    sx={{
                                        fontSize: '16px',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    iconSx={{
                                        fontSize: "16px",
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                />
                                <span className="ai-span-label">
                                    {badgeType === 'invoke' && 'Invoke Agent'}
                                    {badgeType === 'chat' && 'Chat'}
                                    {badgeType === 'tool' && 'Execute Tool'}
                                    {badgeType === 'other' && 'Operation'}
                                </span>
                            </AISpanBadge>
                            <AISpanLabel>
                                {stripSpanPrefix(span.name)}
                                {spanHasError(span) && (
                                    <AISpanErrorIcon>
                                        <Icon
                                            name="bi-error"
                                            sx={{
                                                fontSize: '16px',
                                                width: '16px',
                                                height: '16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            iconSx={{
                                                fontSize: "16px",
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        />
                                    </AISpanErrorIcon>
                                )}
                            </AISpanLabel>
                        </div>
                        <AISpanMetadataGroup>
                            {!isNarrow && (
                                <AISpanStartTime>
                                    {startTime ? `Started ${startTime}` : ''}
                                </AISpanStartTime>
                            )}
                            {!isVeryNarrow && (
                                <AISpanTokenCount>
                                    {totalTokens > 0 ? `${totalTokens.toLocaleString()} Tokens` : ''}
                                </AISpanTokenCount>
                            )}
                            <AISpanDuration>
                                {duration !== null ? (
                                    <>
                                        <Icon name="bi-clock" sx={{ fontSize: "16px", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ display: "flex" }} />
                                        {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`}
                                    </>
                                ) : ''}
                            </AISpanDuration>
                        </AISpanMetadataGroup>
                    </AISpanTreeItem>
                    {hasChildren && isExpanded && (
                        <>
                            {children.map(child => renderMixedSpanTreeItem(child, level + 1))}
                        </>
                    )}
                </React.Fragment>
            );
        } else {
            // Render as non-AI span
            return (
                <React.Fragment key={span.spanId}>
                    <AdvancedSpanItem
                        isSelected={isSelected}
                        onClick={() => setSelectedSpanId(span.spanId)}
                        style={{ paddingLeft: `${8 + level * 16}px` }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasChildren) {
                                        toggleSpanExpansion(span.spanId);
                                    }
                                }}
                                style={{ cursor: hasChildren ? 'pointer' : 'default', width: '16px', display: 'flex' }}
                            >
                                {hasChildren ? (
                                    <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
                                ) : (
                                    <span style={{ width: '16px' }} />
                                )}
                            </span>
                            <AdvancedSpanName>{span.name}</AdvancedSpanName>
                        </div>
                        {duration !== null && (
                            <AISpanDuration>
                                <>
                                    <Icon name="bi-clock" sx={{ fontSize: "16px", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ display: "flex" }} />
                                    {formatDuration(duration)}
                                </>
                            </AISpanDuration>
                        )}
                    </AdvancedSpanItem>
                    {hasChildren && isExpanded && (
                        <>
                            {children.map(child => renderMixedSpanTreeItem(child, level + 1))}
                        </>
                    )}
                </React.Fragment>
            );
        }
    };

    // Render AI span tree item recursively (always expanded)
    const renderAISpanTreeItem = (span: SpanData, level: number = 0): React.ReactNode => {
        const children = getAIChildSpans(span.spanId);
        const isSelected = selectedSpanId === span.spanId;
        const duration = getSpanDuration(span);
        const badgeType = getSpanTypeBadge(span);
        const totalTokens = getSpanTokens(span);
        const startTime = formatStartTime(span.startTime);

        // Determine what to show based on container width
        const isNarrow = containerWidth < 700;
        const isVeryNarrow = containerWidth < 500;

        // Get non-AI spans if in advanced mode
        const nonAISpans = isAdvancedMode ? getNonAIChildSpans(span.spanId) : [];
        const groupedNonAISpans = isAdvancedMode ? groupNonAISpans(nonAISpans) : new Map();
        const groupKey = `${span.spanId}-advanced`;

        return (
            <React.Fragment key={span.spanId}>
                <AISpanTreeItem
                    level={level}
                    isSelected={isSelected}
                    onClick={() => setSelectedSpanId(span.spanId)}
                    data-span-id={span.spanId}
                >
                    <AIBadge type={badgeType} />
                    <AISpanLabel>
                        {stripSpanPrefix(span.name)}
                        {spanHasError(span) && (
                            <AISpanErrorIcon>
                                <Icon
                                    name="bi-error"
                                    sx={{
                                        fontSize: '16px',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    iconSx={{
                                        fontSize: "16px",
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                />
                            </AISpanErrorIcon>
                        )}
                    </AISpanLabel>

                    <AISpanMetadataGroup>
                        {!isNarrow && (
                            <AISpanStartTime>
                                {startTime ? `Started ${startTime}` : ''}
                            </AISpanStartTime>
                        )}
                        {!isVeryNarrow && (
                            <AISpanTokenCount>
                                {totalTokens > 0 ? `${totalTokens.toLocaleString()} Tokens` : ''}
                            </AISpanTokenCount>
                        )}
                        <AISpanDuration>
                            {duration !== null ? (
                                <>
                                    <Icon name="bi-clock" sx={{ fontSize: "16px", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ display: "flex" }} />
                                    {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`}
                                </>
                            ) : ''}
                        </AISpanDuration>
                    </AISpanMetadataGroup>
                </AISpanTreeItem>

                {/* Render advanced mode spans if enabled */}
                {isAdvancedMode && groupedNonAISpans.size > 0 && (
                    <AdvancedSpanGroup level={level}>
                        {Array.from(groupedNonAISpans.entries()).map(([category, spans]) => {
                            const categoryKey = `${groupKey}-${category}`;
                            const isExpanded = expandedAdvancedSpanGroups.has(categoryKey);

                            // Find root spans in this category (spans without parent in the list)
                            const spanIdsInCategory = new Set(spans.map((s: SpanData) => s.spanId));
                            const rootSpansInCategory = spans.filter((s: SpanData) =>
                                !s.parentSpanId ||
                                s.parentSpanId === '0000000000000000' ||
                                !spanIdsInCategory.has(s.parentSpanId)
                            );

                            // Sort root spans by start time
                            rootSpansInCategory.sort((a: SpanData, b: SpanData) => {
                                const aStart = a.startTime ? new Date(a.startTime).getTime() : 0;
                                const bStart = b.startTime ? new Date(b.startTime).getTime() : 0;
                                return aStart - bStart;
                            });

                            return (
                                <div key={categoryKey}>
                                    <AdvancedSpanGroupHeader
                                        isExpanded={isExpanded}
                                        onClick={() => {
                                            const newExpanded = new Set(expandedAdvancedSpanGroups);
                                            if (isExpanded) {
                                                newExpanded.delete(categoryKey);
                                            } else {
                                                newExpanded.add(categoryKey);
                                            }
                                            setExpandedAdvancedSpanGroups(newExpanded);
                                        }}
                                    >
                                        <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
                                        <span>{category} ({spans.length})</span>
                                    </AdvancedSpanGroupHeader>
                                    {isExpanded && (
                                        <AdvancedSpanGroupContent>
                                            {rootSpansInCategory.map((rootSpan: SpanData) =>
                                                renderNonAISpanTreeItem(rootSpan, spans, 0)
                                            )}
                                        </AdvancedSpanGroupContent>
                                    )}
                                </div>
                            );
                        })}
                    </AdvancedSpanGroup>
                )}

                {/* Render AI children */}
                {children.length > 0 && (
                    <>
                        {children.map(child => renderAISpanTreeItem(child, level + 1))}
                    </>
                )}
            </React.Fragment>
        );
    };

    // Render Agent Chat Logs view
    const handleExportTrace = () => {
        // Dispatch custom event to communicate with webview script
        window.dispatchEvent(new CustomEvent('exportTrace', {
            detail: { traceData }
        }));
    };

    const renderAgentChatLogs = () => (
        <>
            <NavigationBar>
                <ViewModeToggle>
                    <ViewModeButton
                        isActive={viewMode === 'tree'}
                        onClick={() => setViewMode('tree')}
                        title="Tree View"
                    >
                        <Icon name="bi-list-tree"
                            sx={{
                                fontSize: '16px',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            iconSx={{
                                fontSize: "16px",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} />
                    </ViewModeButton>
                    <ViewModeButton
                        isActive={viewMode === 'timeline'}
                        onClick={() => setViewMode('timeline')}
                        title="Timeline View"
                    >
                        <Icon name="bi-timeline"
                            sx={{
                                fontSize: '16px',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            iconSx={{
                                fontSize: "16px",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} />
                    </ViewModeButton>
                </ViewModeToggle>
                <ButtonGroup>
                    <ModeToggleButton onClick={handleExportTrace} title="Export trace as JSON">
                        <Icon name="bi-download"
                            sx={{
                                fontSize: '16px',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            iconSx={{
                                fontSize: "16px",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} />
                    </ModeToggleButton>
                    <ModeToggleButton onClick={() => setIsAdvancedMode(!isAdvancedMode)}>
                        <Codicon name={isAdvancedMode ? 'eye-closed' : 'eye'} />
                        {isAdvancedMode ? 'Hide Advanced Spans' : 'Show Hidden Spans'}
                    </ModeToggleButton>
                </ButtonGroup>
            </NavigationBar>

            {/* Advanced mode: Show trace information sections */}
            {/* {isAdvancedMode && (
                <>
                    <InfoSectionContainer>
                        <InfoSectionHeader onClick={() => toggleSection('trace')}>
                            <Codicon name={expandedSections.has('trace') ? 'chevron-down' : 'chevron-right'} />
                            <span>Trace Information</span>
                        </InfoSectionHeader>
                        <InfoSectionContent isOpen={expandedSections.has('trace')}>
                            <InfoGrid>
                                <InfoLabel>Trace ID:</InfoLabel>
                                <InfoValue>{traceData.traceId}</InfoValue>
                                <InfoLabel>First Seen:</InfoLabel>
                                <InfoValue>{formatDate(traceData.firstSeen)}</InfoValue>
                                <InfoLabel>Last Seen:</InfoLabel>
                                <InfoValue>{formatDate(traceData.lastSeen)}</InfoValue>
                                <InfoLabel>Duration:</InfoLabel>
                                <InfoValue>{duration}ms</InfoValue>
                            </InfoGrid>
                        </InfoSectionContent>
                    </InfoSectionContainer>

                    <InfoSectionContainer>
                        <InfoSectionHeader onClick={() => toggleSection('resource')}>
                            <Codicon name={expandedSections.has('resource') ? 'chevron-down' : 'chevron-right'} />
                            <span>Resource</span>
                        </InfoSectionHeader>
                        <InfoSectionContent isOpen={expandedSections.has('resource')}>
                            <InfoGrid>
                                <InfoLabel>Name:</InfoLabel>
                                <InfoValue>{traceData.resource.name}</InfoValue>
                            </InfoGrid>
                            {traceData.resource.attributes && traceData.resource.attributes.length > 0 && (
                                <AttributesContainer>
                                    <InfoLabel style={{ marginBottom: '8px' }}>Attributes ({traceData.resource.attributes.length}):</InfoLabel>
                                    {traceData.resource.attributes.map((attr, index) => (
                                        <AttributeItem key={index}>
                                            <AttributeKey>{attr.key}:</AttributeKey>
                                            <AttributeValue>{attr.value}</AttributeValue>
                                        </AttributeItem>
                                    ))}
                                </AttributesContainer>
                            )}
                        </InfoSectionContent>
                    </InfoSectionContainer>

                    <InfoSectionContainer>
                        <InfoSectionHeader onClick={() => toggleSection('scope')}>
                            <Codicon name={expandedSections.has('scope') ? 'chevron-down' : 'chevron-right'} />
                            <span>Instrumentation Scope</span>
                        </InfoSectionHeader>
                        <InfoSectionContent isOpen={expandedSections.has('scope')}>
                            <InfoGrid>
                                <InfoLabel>Name:</InfoLabel>
                                <InfoValue>{traceData.scope.name}</InfoValue>
                                {traceData.scope.version && (
                                    <>
                                        <InfoLabel>Version:</InfoLabel>
                                        <InfoValue>{traceData.scope.version}</InfoValue>
                                    </>
                                )}
                            </InfoGrid>
                            {traceData.scope.attributes && traceData.scope.attributes.length > 0 && (
                                <AttributesContainer>
                                    <InfoLabel style={{ marginBottom: '8px' }}>Attributes ({traceData.scope.attributes.length}):</InfoLabel>
                                    {traceData.scope.attributes.map((attr, index) => (
                                        <AttributeItem key={index}>
                                            <AttributeKey>{attr.key}:</AttributeKey>
                                            <AttributeValue>{attr.value}</AttributeValue>
                                        </AttributeItem>
                                    ))}
                                </AttributesContainer>
                            )}
                        </InfoSectionContent>
                    </InfoSectionContainer>
                </>
            )} */}

            {rootAISpans.length === 0 ? (
                <EmptyState>
                    <EmptyStateIcon>
                        <Codicon name="comment-discussion" />
                    </EmptyStateIcon>
                    <EmptyStateText>
                        No AI agent interactions found in this trace
                    </EmptyStateText>
                    <EmptyStateText style={{ fontSize: '14px', opacity: 0.7 }}>
                        AI spans with span.type='ai' will appear here
                    </EmptyStateText>
                </EmptyState>
            ) : (
                <AgentChatLogsContainer>
                    {viewMode === 'tree' ? (
                        <AISpanTreeContainer
                            height={aiSpanTreeDimensions.height}
                            maxHeight={aiSpanTreeDimensions.maxHeight}
                            minHeight={aiSpanTreeDimensions.minHeight}
                        >
                            {isAdvancedMode
                                ? sortedRootSpans.map(span => renderMixedSpanTreeItem(span, 0))
                                : rootAISpans.map(span => renderAISpanTreeItem(span, 0))
                            }
                        </AISpanTreeContainer>
                    ) : (
                        <WaterfallView
                            spans={isAdvancedMode ? traceData.spans : rootAISpans}
                            selectedSpanId={selectedSpanId}
                            onSpanSelect={selectSpan}
                            isAdvancedMode={isAdvancedMode}
                            getChildSpans={isAdvancedMode ? getChildSpans : getAIChildSpans}
                            traceStartTime={traceData.firstSeen}
                            traceDuration={duration}
                            height={waterfallDimensions.height}
                            maxHeight={waterfallDimensions.maxHeight}
                            minHeight={waterfallDimensions.minHeight}
                        />
                    )}
                    {selectedSpan && (
                        <DetailsPanel>
                            <SpanInputOutput
                                spanData={selectedSpan}
                                spanName={selectedSpan.name}
                            />
                        </DetailsPanel>
                    )}
                </AgentChatLogsContainer>
            )}
        </>
    );

    // Main return - decide which view to show
    return (
        <Container ref={containerRef}>
            {renderAgentChatLogs()}
        </Container>
    );
}
