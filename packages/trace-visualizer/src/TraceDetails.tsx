/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { TraceData, SpanData } from "./index";
import { Codicon, Icon } from "@wso2/ui-toolkit";
import { SpanInputOutput } from "./components/SpanInputOutput";
import { WaterfallView } from "./components/WaterfallView";
import { AIBadge } from "./components/AIBadge";
import { TraceEmptyState } from "./components/TraceEmptyState";
import {
    timeContainsSpan,
    sortSpansByUmbrellaFirst,
    formatDuration,
    getSpanDuration,
    getSpanKindLabel,
    stripSpanPrefix,
    getSpanTypeBadge,
    spanHasError,
    getSpanTokens,
    isAISpan,
    getSpanLabel
} from "./utils";

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_SIDEBAR_WIDTH = 260;
const SNAP_THRESHOLD = 100;
const MIN_DETAILS_PANEL_WIDTH = 250;
const MAX_INITIAL_SIDEBAR_WIDTH = 350;
const MAX_SIDEBAR_PERCENTAGE = 0.6;

interface TraceDetailsProps {
    traceData: TraceData;
    isAgentChat: boolean;
    focusSpanId?: string;
    openWithSidebarCollapsed?: boolean;
}

// ============================================================================
// BASE LAYOUT STYLES
// ============================================================================

const Container = styled.div`
    margin: 0;
    padding: 0;
    font-family: var(--vscode-font-family);
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-size: 13px;
    line-height: 1.5;
    height: 100vh;
    overflow: hidden;
`;

const AgentChatLogsContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: stretch;
    height: 100%;
    overflow: hidden;
`;

const SpanViewContainer = styled.div<{ width: number; isResizing?: boolean }>`
    width: ${(props: { width: number }) => props.width}px;
    display: flex;
    flex-direction: column;
    position: relative;
    height: 100%;
    overflow: hidden;
    flex-shrink: 0;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        right: -4px;
        bottom: 0;
        width: 8px;
        cursor: col-resize;
        z-index: 10;
        background-color: ${(props: { isResizing?: boolean }) =>
        props.isResizing ? 'var(--vscode-focusBorder, var(--vscode-panel-border))' : 'transparent'};
        opacity: ${(props: { isResizing?: boolean }) => props.isResizing ? '0.5' : '0'};
        transition: ${(props: { isResizing?: boolean }) =>
        props.isResizing ? 'none' : 'opacity 0.2s ease, background-color 0.2s ease'};
    }
`;

const DetailsPanelContainer = styled.div`
    flex: 1;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--vscode-panel-border);
    overflow: hidden;
`;


// ============================================================================
// TREE VIEW STYLES
// ============================================================================

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

// ============================================================================
// AI SPAN TREE STYLES
// ============================================================================

const AISpanTreeContainer = styled.div<{ height: number; maxHeight: number; minHeight: number }>`
    background-color: var(--vscode-editor-background);
    flex: 1;
    overflow-y: auto;
    height: 100%;
    overflow-x: hidden;
    padding: 0 0 0 12px;
`;

const TreeNodeContainer = styled.div<{ isLast?: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    
    &::before {
        content: '';
        position: absolute;
        left: -13px;
        width: 1px;
        background-color: var(--vscode-tree-indentGuidesStroke);
        
        top: 0;
        
        height: ${(props: { isLast?: boolean }) => props.isLast ? '16px' : '100%'};
    }
`;

const TreeNodeChildren = styled.div`
    margin-left: 6px; 
    padding-left: 12px;
    position: relative;

    &::before {
        content: '';
        position: absolute;
        top: -16px; 
        left: -1px; 
        width: 1px;
        height: 20px;
        background-color: var(--vscode-tree-indentGuidesStroke);
    }
`;

const ConnectorCurve = styled.div`
    position: absolute;
    left: -13px; 
    top: 0;
    width: 8px;
    height: 16px;
    border-bottom: 1px solid var(--vscode-tree-indentGuidesStroke);
    border-left: 1px solid var(--vscode-tree-indentGuidesStroke);
    pointer-events: none;
`;

const AISpanTreeItem = styled.div<{ isSelected: boolean }>`
    display: flex;
    flex-direction: column;
    padding: 4px 8px 4px 0; 
    margin: 4px 0;
    cursor: pointer;
    border-radius: 0; 
    gap: 6px;
    z-index: 0; 
    
    position: relative;
    min-height: 32px;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: -100vw; 
        z-index: -1; 
        
        background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-inactiveSelectionBackground)' : 'transparent'};
        transition: background-color 0.15s ease;
    }

    &:hover::before {
        background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-inactiveSelectionBackground)' : 'var(--vscode-list-hoverBackground)'};
    }
`;

const AISpanLabel = styled.span`
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    flex: 1;
    min-width: 0;

    > span:first-of-type {
        flex-shrink: 0;
    }

    > span:nth-of-type(2) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
    }
`;

const AISpanTopRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
`;

const ChevronToggleWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-left: auto;
    flex-shrink: 0;
    color: var(--vscode-descriptionForeground);

    &:hover {
        color: var(--vscode-foreground);
    }
`;

const AISpanDuration = styled.span`
    font-size: 10px;
    color: inherit;
    display: flex;
    align-items: center;
    gap: 3px;
`;

const AISpanTokenCount = styled.span`
    font-size: 10px;
    color: inherit;
    display: inline;
`;

const AISpanMetadataGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-left: 0;
    margin-top: 2px;
`;

const AISpanMetadataPill = styled.span`
    font-size: 11px;
    padding: 1px 4px;
    border-radius: 4px;
    background-color: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    color: var(--vscode-editor-foreground);
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    font-weight: 300;
`;

const AISpanErrorIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--vscode-errorForeground);
    flex-shrink: 0;
`;

// ============================================================================
// ADVANCED MODE STYLES
// ============================================================================

const AdvancedSpanGroup = styled.div`
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
    flex-direction: column;
    padding: 4px 8px 4px 0; 
    margin: 4px 0;
    cursor: pointer;
    border-radius: 0; 
    gap: 6px;
    z-index: 0;
    
    position: relative;
    min-height: 32px;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: -100vw; 
        z-index: -1;
        
        background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-inactiveSelectionBackground)' : 'transparent'};
        transition: background-color 0.15s ease;
    }

    &:hover::before {
        background-color: ${(props: { isSelected: boolean }) =>
        props.isSelected ? 'var(--vscode-list-inactiveSelectionBackground)' : 'var(--vscode-list-hoverBackground)'};
    }
`;

const NonAISpanTopRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
`;

const NonAISpanLabel = styled.span`
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    flex: 1;
    min-width: 0;

    > span:first-of-type {
        flex-shrink: 0;
    }

    > span:nth-of-type(2) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
    }
`;

const NonAISpanIcon = styled.span<{ spanKind: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 3px;
    flex-shrink: 0;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-dropdown-border);
    color: ${(props: { spanKind: string }) => {
        switch (props.spanKind.toLowerCase()) {
            case 'client': return 'var(--vscode-terminal-ansiBlue)';
            case 'server': return 'var(--vscode-terminal-ansiGreen)';
            default: return 'var(--vscode-foreground)';
        }
    }};
`;

// ============================================================================
// NAVIGATION & CONTROLS
// ============================================================================

const NavigationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    margin-bottom: 8px;
    padding: 0 8px;
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

// ============================================================================
// DETAILS PANEL
// ============================================================================

const DetailsPanel = styled.div`
    background-color: var(--vscode-editor-background);
    height: 100%;
    overflow-y: auto;
    padding: 24px 16px;
`;

// ============================================================================
// COMPONENT DEFINITIONS
// ============================================================================

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

export function TraceDetails({ traceData, isAgentChat, focusSpanId, openWithSidebarCollapsed }: TraceDetailsProps) {
    const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
    const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
    const [showFullTrace] = useState<boolean>(false);
    const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<'tree' | 'timeline'>('tree');
    const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(!openWithSidebarCollapsed);
    const [expandedAdvancedSpanGroups, setExpandedAdvancedSpanGroups] = useState<Set<string>>(new Set());
    const [containerWidth, setContainerWidth] = useState<number>(window.innerWidth);
    const [aiSpanTreeDimensions, setAISpanTreeDimensions] = useState({ height: 180, maxHeight: 600, minHeight: 50 });
    const [waterfallDimensions, setWaterfallDimensions] = useState({ height: 300, maxHeight: 800, minHeight: 150 });
    const [totalSpanCounts, setTotalSpanCounts] = useState({ aiCount: 0, nonAiCount: 0 });
    const [spanViewWidth, setSpanViewWidth] = useState<number>(0);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasAutoExpandedRef = useRef<boolean>(false);
    const hasFocusedRef = useRef<boolean>(false);

    // Initialize span view width intelligently
    useEffect(() => {
        if (containerRef.current && spanViewWidth === 0) {
            const currentContainerWidth = containerRef.current.offsetWidth;
            let targetWidth = currentContainerWidth * 0.3;

            if (targetWidth > MAX_INITIAL_SIDEBAR_WIDTH) {
                targetWidth = MAX_INITIAL_SIDEBAR_WIDTH;
            }

            if (targetWidth < MIN_SIDEBAR_WIDTH) {
                targetWidth = MIN_SIDEBAR_WIDTH;
            }

            const maxAllowedWidth = currentContainerWidth - MIN_DETAILS_PANEL_WIDTH;

            if (targetWidth > maxAllowedWidth) {
                targetWidth = Math.max(150, maxAllowedWidth);
                if (maxAllowedWidth < 100) {
                    setIsSidebarVisible(false);
                }
            }

            setSpanViewWidth(targetWidth);
        }
    }, [containerRef.current]);

    // Track container width for responsive behavior
    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width;
                setContainerWidth(newWidth);

                // If the sidebar is open, ensure it doesn't violate boundaries on window resize
                if (isSidebarVisible && spanViewWidth > 0) {
                    const maxAllowed = newWidth - MIN_DETAILS_PANEL_WIDTH;
                    if (spanViewWidth > maxAllowed) {
                        setSpanViewWidth(Math.max(MIN_SIDEBAR_WIDTH, maxAllowed));
                    }
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [spanViewWidth, isSidebarVisible]);

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

    useEffect(() => {
        // Don't auto-select if we have a focusSpanId or are focusing - let the focus effect handle it
        if (!selectedSpanId && sortedRootSpans.length > 0 && !focusSpanId && !hasFocusedRef.current) {
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
                return;
            }
            hasFocusedRef.current = true;

            // Expand all parent spans to make the focused span visible FIRST
            const span = traceData.spans.find(s => s.spanId === focusSpanId);
            if (!span) {
                return;
            }

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

            // Set expanded state and select span
            setExpandedSpans(newExpanded);
            setSelectedSpanId(focusSpanId);

            // Scroll to the focused span after rendering
            setTimeout(() => {
                const spanElement = document.querySelector(`[data-span-id="${focusSpanId}"]`);
                if (spanElement) {
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

    // Handle resize drag
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const isInResizeArea = e.clientX >= rect.right - 8;

        if (isInResizeArea) {
            e.preventDefault();
            setIsResizing(true);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const rawWidth = e.clientX - containerRect.left;

            if (isSidebarVisible) {
                if (rawWidth < SNAP_THRESHOLD) {
                    setIsSidebarVisible(false);
                } else {
                    const minWidth = MIN_SIDEBAR_WIDTH;

                    // Constraint 1: Must leave space for the details panel
                    const limitByPanel = containerRect.width - MIN_DETAILS_PANEL_WIDTH;

                    // Constraint 2: Max 70% of the screen
                    const limitByPercentage = containerRect.width * MAX_SIDEBAR_PERCENTAGE;

                    // The actual max width is the stricter (smaller) of the two limits
                    const maxWidth = Math.min(limitByPanel, limitByPercentage);

                    const newWidth = Math.max(minWidth, Math.min(rawWidth, maxWidth));
                    setSpanViewWidth(newWidth);
                }
            } else {
                // Wake up logic
                if (rawWidth > SNAP_THRESHOLD) {
                    setIsSidebarVisible(true);
                    setSpanViewWidth(MIN_SIDEBAR_WIDTH);
                }
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, isSidebarVisible]);

    /**
     * Builds a hierarchy of AI spans based on time containment.
     * Uses temporal relationships to determine parent-child structure.
     * For each span, finds the smallest containing span as its parent.
     * @returns Root AI spans (those with no time-based parent) sorted by start time
     */
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

    // Totals across the trace (input/output separately)
    const { totalInputTokens, totalOutputTokens } = React.useMemo(() => {
        let inTotal = 0;
        let outTotal = 0;
        traceData.spans.forEach(span => {
            const inT = parseInt(span.attributes?.find(attr => attr.key === 'gen_ai.usage.input_tokens')?.value || '0');
            const outT = parseInt(span.attributes?.find(attr => attr.key === 'gen_ai.usage.output_tokens')?.value || '0');
            if (!isNaN(inT)) inTotal += inT;
            if (!isNaN(outT)) outTotal += outT;
        });
        return { totalInputTokens: inTotal, totalOutputTokens: outTotal };
    }, [traceData.spans]);

    /**
     * Gets AI child spans contained within a parent span's timeframe.
     * Finds direct children only (not nested through intermediate AI spans).
     * @param spanId - Parent span ID to find children for
     * @returns Array of child AI spans sorted by start time
     */
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

    /**
     * Gets non-AI child spans within an AI span's timeframe.
     * Excludes spans that are nested within child AI spans.
     * @param parentSpanId - Parent AI span ID to find non-AI children for
     * @returns Array of non-AI spans sorted by start time
     */
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

    /**
     * Groups non-AI spans by their type/category.
     * Categorizes spans as HTTP Calls, Database Operations, Client Calls, Server Operations, or Other.
     * @param spans - Array of non-AI spans to group
     * @returns Map of category names to arrays of spans
     */
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

    /**
     * Renders an expand/collapse chevron for tree items.
     */
    const renderExpandChevron = (
        hasChildren: boolean,
        isExpanded: boolean,
        onToggle: (e: React.MouseEvent) => void
    ) => {
        if (!hasChildren) return null;

        return (
            <ChevronToggleWrapper onClick={onToggle} style={{ cursor: 'pointer' }}>
                <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
            </ChevronToggleWrapper>
        );
    };

    /**
     * Renders the content for an AI span (without recursion).
     * Used by both renderAISpanTreeItem and renderMixedSpanTreeItem.
     */
    const renderAISpanContent = (
        span: SpanData,
        isSelected: boolean,
        hasChildren: boolean,
        isExpanded: boolean,
        onToggle: (e: React.MouseEvent) => void,
        showConnector: boolean = false
    ) => {
        const badgeType = getSpanTypeBadge(span);
        const duration = getSpanDuration(span);
        const totalTokens = getSpanTokens(span);
        const isVeryNarrow = containerWidth < 500;

        return (
            <AISpanTreeItem
                isSelected={isSelected}
                onClick={() => setSelectedSpanId(span.spanId)}
                data-span-id={span.spanId}
            >
                {showConnector && <ConnectorCurve />}
                <AISpanTopRow>
                    <AIBadge type={badgeType} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                            <AISpanLabel>
                                <span style={{ fontWeight: 600 }}>{getSpanLabel(badgeType)}</span>
                                <span>{stripSpanPrefix(span.name)}</span>
                            </AISpanLabel>
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
                        </div>
                        <AISpanMetadataGroup>
                            {duration !== null && (
                                <AISpanMetadataPill>
                                    <AISpanDuration>
                                        {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`}
                                    </AISpanDuration>
                                </AISpanMetadataPill>
                            )}
                            {!isVeryNarrow && totalTokens > 0 && (
                                <AISpanMetadataPill>
                                    <AISpanTokenCount>
                                        {totalTokens.toLocaleString()} Tokens
                                    </AISpanTokenCount>
                                </AISpanMetadataPill>
                            )}
                        </AISpanMetadataGroup>
                    </div>
                    {renderExpandChevron(hasChildren, isExpanded, onToggle)}
                </AISpanTopRow>
            </AISpanTreeItem>
        );
    };

    /**
     * Renders the content for a non-AI span (without recursion).
     * Used by both renderNonAISpanTreeItem and renderMixedSpanTreeItem.
     */
    const renderNonAISpanContent = (
        span: SpanData,
        isSelected: boolean,
        hasChildren: boolean,
        isExpanded: boolean,
        onToggle: (e: React.MouseEvent) => void,
        showConnector: boolean = false
    ) => {
        const duration = getSpanDuration(span);
        const spanKind = getSpanKindLabel(span.kind);

        // Only show icons for server and client
        const spanKindIcon = (() => {
            switch (spanKind.toLowerCase()) {
                case 'client': return 'bi-arrow-outward';
                case 'server': return 'bi-server';
                default: return 'bi-action';
            }
        })();

        return (
            <AdvancedSpanItem
                isSelected={isSelected}
                onClick={() => setSelectedSpanId(span.spanId)}
                data-span-id={span.spanId}
            >
                {showConnector && <ConnectorCurve />}
                <NonAISpanTopRow>
                    <NonAISpanIcon spanKind={spanKind}>
                        <Icon
                            name={spanKindIcon}
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
                    </NonAISpanIcon>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                            <NonAISpanLabel>
                                <span style={{ fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', opacity: 0.7 }}>{spanKind}</span>
                                <span>{span.name}</span>
                            </NonAISpanLabel>
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
                        </div>
                        {duration !== null && (
                            <AISpanMetadataGroup>
                                <AISpanMetadataPill>
                                    <AISpanDuration>
                                        {formatDuration(duration)}
                                    </AISpanDuration>
                                </AISpanMetadataPill>
                            </AISpanMetadataGroup>
                        )}
                    </div>
                    {renderExpandChevron(hasChildren, isExpanded, onToggle)}
                </NonAISpanTopRow>
            </AdvancedSpanItem>
        );
    };

    // Render non-AI span tree item hierarchically
    const renderNonAISpanTreeItem = (span: SpanData, spanList: SpanData[], isFirstChild: boolean = false, isLastChild: boolean = false): React.ReactNode => {
        const children = getChildSpansFromList(span.spanId, spanList);
        const hasChildren = children.length > 0;
        const isExpanded = expandedSpans.has(span.spanId);
        const isSelected = selectedSpanId === span.spanId;

        return (
            <TreeNodeContainer key={span.spanId} isLast={isLastChild}>
                {renderNonAISpanContent(
                    span,
                    isSelected,
                    hasChildren,
                    isExpanded,
                    (e) => {
                        e.stopPropagation();
                        if (hasChildren) {
                            toggleSpanExpansion(span.spanId);
                        }
                    },
                    !isFirstChild
                )}
                {hasChildren && isExpanded && (
                    <TreeNodeChildren>
                        {children.map((child, index) => renderNonAISpanTreeItem(child, spanList, index === 0, index === children.length - 1))}
                    </TreeNodeChildren>
                )}
            </TreeNodeContainer>
        );
    };

    // Render mixed AI and non-AI span tree for advanced mode (true hierarchy based on parentSpanId)
    const renderMixedSpanTreeItem = (span: SpanData, isFirstChild: boolean = false, isLastChild: boolean = false, isRoot: boolean = false): React.ReactNode => {
        const isAI = isAISpan(span);
        const children = getChildSpans(span.spanId); // Use regular getChildSpans for true hierarchy
        const hasChildren = children.length > 0;
        const isExpanded = expandedSpans.has(span.spanId);
        const isSelected = selectedSpanId === span.spanId;

        const handleToggle = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (hasChildren) {
                toggleSpanExpansion(span.spanId);
            }
        };

        return (
            <TreeNodeContainer key={span.spanId} isLast={isLastChild}>
                {isAI ? (
                    renderAISpanContent(span, isSelected, hasChildren, isExpanded, handleToggle, !isRoot)
                ) : (
                    renderNonAISpanContent(span, isSelected, hasChildren, isExpanded, handleToggle, !isRoot)
                )}
                {hasChildren && isExpanded && (
                    <TreeNodeChildren>
                        {children.map((child, index) =>
                            renderMixedSpanTreeItem(child, index === 0, index === children.length - 1, false)
                        )}
                    </TreeNodeChildren>
                )}
            </TreeNodeContainer>
        );
    };

    // Render AI span tree item recursively (always expanded)
    const renderAISpanTreeItem = (span: SpanData, isFirstChild: boolean = false, isLastChild: boolean = false, isRoot: boolean = false): React.ReactNode => {
        const children = getAIChildSpans(span.spanId);
        const isSelected = selectedSpanId === span.spanId;

        // Get non-AI spans if in advanced mode
        const nonAISpans = isAdvancedMode ? getNonAIChildSpans(span.spanId) : [];
        const groupedNonAISpans = isAdvancedMode ? groupNonAISpans(nonAISpans) : new Map();
        const groupKey = `${span.spanId}-advanced`;

        // No-op toggle handler for AI spans (they don't have expand/collapse)
        const handleToggle = () => { };

        const hasAnyChildren = children.length > 0 || groupedNonAISpans.size > 0;

        return (
            <TreeNodeContainer key={span.spanId} isLast={isLastChild}>
                {renderAISpanContent(span, isSelected, false, false, handleToggle, !isRoot)}

                {hasAnyChildren && (
                    <TreeNodeChildren>
                        {/* Render advanced mode spans if enabled */}
                        {isAdvancedMode && groupedNonAISpans.size > 0 && (
                            <AdvancedSpanGroup>
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
                                                    {rootSpansInCategory.map((rootSpan: SpanData, index: number) =>
                                                        renderNonAISpanTreeItem(rootSpan, spans, index === 0, index === rootSpansInCategory.length - 1)
                                                    )}
                                                </AdvancedSpanGroupContent>
                                            )}
                                        </div>
                                    );
                                })}
                            </AdvancedSpanGroup>
                        )}

                        {/* Render AI children */}
                        {children.map((child, index) =>
                            renderAISpanTreeItem(child, index === 0 && groupedNonAISpans.size === 0, index === children.length - 1, false)
                        )}
                    </TreeNodeChildren>
                )}
            </TreeNodeContainer>
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
            {rootAISpans.length === 0 ? (
                <TraceEmptyState
                    icon="comment-discussion"
                    title="No AI agent interactions found in this trace"
                    subtitle="AI spans with span.type='ai' will appear here"
                />
            ) : (
                <AgentChatLogsContainer>
                    <SpanViewContainer width={isSidebarVisible ? spanViewWidth : 48} isResizing={isResizing} onMouseDown={isSidebarVisible ? handleMouseDown : undefined}>
                        <NavigationBar>
                            <ModeToggleButton
                                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                                title={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
                            >
                                <Icon
                                    name={isSidebarVisible ? 'bi-left-panel-close' : 'bi-left-panel-open'}
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
                            {isSidebarVisible && (
                                <>
                                    <ButtonGroup>
                                        <ModeToggleButton
                                            onClick={() => setViewMode(viewMode === 'tree' ? 'timeline' : 'tree')}
                                            title={viewMode === 'timeline' ? "Switch to Tree View" : "Switch to Timeline View"}
                                        >
                                            Timeline
                                        </ModeToggleButton>
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
                                        </ModeToggleButton>
                                    </ButtonGroup>
                                </>
                            )}
                        </NavigationBar>
                        {isSidebarVisible && (
                            <>
                                {viewMode === 'tree' && (
                                    <AISpanTreeContainer
                                        height={aiSpanTreeDimensions.height}
                                        maxHeight={aiSpanTreeDimensions.maxHeight}
                                        minHeight={aiSpanTreeDimensions.minHeight}
                                    >
                                        {isAdvancedMode
                                            ? sortedRootSpans.map((span, index) => renderMixedSpanTreeItem(span, index === 0, index === sortedRootSpans.length - 1, true))
                                            : rootAISpans.map((span, index) => renderAISpanTreeItem(span, index === 0, index === rootAISpans.length - 1, true))
                                        }
                                    </AISpanTreeContainer>
                                )}
                                {viewMode === 'timeline' && (
                                    <WaterfallView
                                        spans={isAdvancedMode ? traceData.spans : rootAISpans}
                                        selectedSpanId={selectedSpanId}
                                        onSpanSelect={selectSpan}
                                        isAdvancedMode={isAdvancedMode}
                                        getChildSpans={isAdvancedMode ? getChildSpans : getAIChildSpans}
                                        traceStartTime={traceData.firstSeen}
                                        traceDuration={duration}
                                    />
                                )}
                            </>
                        )}
                    </SpanViewContainer>
                    {selectedSpan && (
                        <>
                            <DetailsPanelContainer>
                                <DetailsPanel>
                                    <SpanInputOutput
                                        spanData={selectedSpan}
                                        spanName={selectedSpan.name}
                                        totalInputTokens={totalInputTokens}
                                        totalOutputTokens={totalOutputTokens}
                                    />
                                </DetailsPanel>
                            </DetailsPanelContainer>
                        </>
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
