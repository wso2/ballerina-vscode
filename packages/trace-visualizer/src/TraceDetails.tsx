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
import { Codicon } from "@wso2/ui-toolkit";

interface TraceDetailsProps {
    traceData: TraceData;
}

const Container = styled.div`
    margin: 0;
    padding: 20px;
    font-family: var(--vscode-font-family);
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-size: 13px;
    line-height: 1.5;
    height: 100vh;
    overflow-y: auto;
`;

const Header = styled.div`
    border-bottom: 2px solid var(--vscode-panel-border);
    padding-bottom: 10px;
    margin-bottom: 20px;
`;

const Title = styled.h1`
    margin: 0 0 10px 0;
    font-size: 18px;
    color: var(--vscode-textLink-foreground);
`;

const Section = styled.div`
    margin-bottom: 30px;
`;

const SectionTitle = styled.div`
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 10px;
    color: var(--vscode-textLink-foreground);
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-bottom: 5px;
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 8px 12px;
    margin-bottom: 15px;
`;

const InfoLabel = styled.div`
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
`;

const InfoValue = styled.div`
    font-family: 'Consolas', 'Monaco', monospace;
    word-break: break-all;
    color: var(--vscode-editor-foreground);
`;

const AttributesContainer = styled.div`
    margin-top: 10px;
`;

const AttributeItem = styled.div`
    padding: 4px 0;
    margin-bottom: 5px;
`;

const AttributeKey = styled.span`
    font-weight: 600;
    color: var(--vscode-textLink-foreground);
`;

const AttributeValue = styled.span`
    font-family: 'Consolas', 'Monaco', monospace;
    margin-left: 10px;
    color: var(--vscode-editor-foreground);
`;

const CollapsibleSection = styled.div`
    cursor: pointer;
    user-select: none;

    &:hover {
        opacity: 0.8;
    }
`;

const CollapsibleContent = styled.div<{ isOpen: boolean }>`
    display: ${(props: { isOpen: boolean }) => props.isOpen ? 'block' : 'none'};
`;

// Span Tree Styles
const SpanTreeContainer = styled.div`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 20px;
    max-height: 400px;
    overflow-y: auto;
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
`;

const DetailsPanelHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const DetailsPanelTitle = styled.h3`
    margin: 0;
    font-size: 16px;
    color: var(--vscode-textLink-foreground);
`;

const DetailsPanelKind = styled.span`
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 3px;
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
`;

const DetailsGrid = styled.div`
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 8px 12px;
    margin-bottom: 20px;
`;

const AttributesSection = styled.div`
    margin-top: 20px;
`;

const AttributesSectionTitle = styled.div`
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 12px;
    color: var(--vscode-descriptionForeground);
`;

export function TraceDetails({ traceData }: TraceDetailsProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(['trace', 'resource', 'scope', 'spans'])
    );
    const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
    const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

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
    rootSpans.sort((a, b) => {
        const aStart = a.startTime ? new Date(a.startTime).getTime() : 0;
        const aEnd = a.endTime ? new Date(a.endTime).getTime() : 0;
        const bStart = b.startTime ? new Date(b.startTime).getTime() : 0;
        const bEnd = b.endTime ? new Date(b.endTime).getTime() : 0;

        // Check if 'a' contains 'b' (a is umbrella over b)
        const aContainsB = aStart <= bStart && aEnd >= bEnd && (aStart < bStart || aEnd > bEnd);
        // Check if 'b' contains 'a' (b is umbrella over a)
        const bContainsA = bStart <= aStart && bEnd >= aEnd && (bStart < aStart || bEnd > aEnd);

        if (aContainsB) return -1; // a comes before b (a is umbrella)
        if (bContainsA) return 1;  // b comes before a (b is umbrella)

        // Neither contains the other, sort by start time
        return aStart - bStart;
    });

    // Select first span on load
    useEffect(() => {
        if (!selectedSpanId && rootSpans.length > 0) {
            setSelectedSpanId(rootSpans[0].spanId);
        }
    }, [rootSpans.length]);

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    const getChildSpans = (spanId: string): SpanData[] => {
        const children = traceData.spans.filter(s => s.parentSpanId === spanId);

        // Sort children: umbrella spans first, then by start time
        return children.sort((a, b) => {
            const aStart = a.startTime ? new Date(a.startTime).getTime() : 0;
            const aEnd = a.endTime ? new Date(a.endTime).getTime() : 0;
            const bStart = b.startTime ? new Date(b.startTime).getTime() : 0;
            const bEnd = b.endTime ? new Date(b.endTime).getTime() : 0;

            // Check if 'a' contains 'b' (a is umbrella over b)
            const aContainsB = aStart <= bStart && aEnd >= bEnd && (aStart < bStart || aEnd > bEnd);
            // Check if 'b' contains 'a' (b is umbrella over a)
            const bContainsA = bStart <= aStart && bEnd >= aEnd && (bStart < aStart || bEnd > aEnd);

            if (aContainsB) return -1; // a comes before b (a is umbrella)
            if (bContainsA) return 1;  // b comes before a (b is umbrella)

            // Neither contains the other, sort by start time
            return aStart - bStart;
        });
    };

    const renderTreeItem = (span: SpanData, level: number = 0): React.ReactNode => {
        const childSpans = getChildSpans(span.spanId);
        const hasChildren = childSpans.length > 0;
        const isExpanded = expandedSpans.has(span.spanId);
        const isSelected = selectedSpanId === span.spanId;
        const spanKind = getSpanKindLabel(span.kind);

        return (
            <React.Fragment key={span.spanId}>
                <TreeItem level={level} isSelected={isSelected} onClick={() => selectSpan(span.spanId)}>
                    <TreeChevron onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) {
                            toggleSpanExpansion(span.spanId);
                        }
                    }}>
                        {hasChildren ? (
                            <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
                        ) : (
                            <span style={{ width: '16px', display: 'inline-block' }} />
                        )}
                    </TreeChevron>
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
    const selectedSpanKind = selectedSpan ? getSpanKindLabel(selectedSpan.kind) : '';
    const selectedSpanDuration = selectedSpan && selectedSpan.startTime && selectedSpan.endTime
        ? new Date(selectedSpan.endTime).getTime() - new Date(selectedSpan.startTime).getTime()
        : null;

    return (
        <Container>
            <Header>
                <Title>Trace : {traceData.traceId}</Title>
            </Header>

            <Section>
                <CollapsibleSection onClick={() => toggleSection('trace')}>
                    <SectionTitle>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Codicon name={expandedSections.has('trace') ? 'chevron-down' : 'chevron-right'} />
                            Trace Information
                        </span>
                    </SectionTitle>
                </CollapsibleSection>
                <CollapsibleContent isOpen={expandedSections.has('trace')}>
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
                </CollapsibleContent>
            </Section>

            <Section>
                <CollapsibleSection onClick={() => toggleSection('resource')}>
                    <SectionTitle>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Codicon name={expandedSections.has('resource') ? 'chevron-down' : 'chevron-right'} />
                            Resource
                        </span>
                    </SectionTitle>
                </CollapsibleSection>
                <CollapsibleContent isOpen={expandedSections.has('resource')}>
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
                </CollapsibleContent>
            </Section>

            <Section>
                <CollapsibleSection onClick={() => toggleSection('scope')}>
                    <SectionTitle>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Codicon name={expandedSections.has('scope') ? 'chevron-down' : 'chevron-right'} />
                            Instrumentation Scope
                        </span>
                    </SectionTitle>
                </CollapsibleSection>
                <CollapsibleContent isOpen={expandedSections.has('scope')}>
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
                </CollapsibleContent>
            </Section>

            <Section>
                <CollapsibleSection onClick={() => toggleSection('spans')}>
                    <SectionTitle>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Codicon name={expandedSections.has('spans') ? 'chevron-down' : 'chevron-right'} />
                            Spans ({traceData.spans.length} total)
                        </span>
                    </SectionTitle>
                </CollapsibleSection>
                <CollapsibleContent isOpen={expandedSections.has('spans')}>
                    <SpanTreeContainer>
                        {rootSpans.map(span => renderTreeItem(span, 0))}
                    </SpanTreeContainer>

                    {selectedSpan && (
                        <DetailsPanel>
                            <DetailsPanelHeader>
                                <DetailsPanelTitle>{selectedSpan.name}</DetailsPanelTitle>
                                <DetailsPanelKind>{selectedSpanKind}</DetailsPanelKind>
                            </DetailsPanelHeader>

                            <DetailsGrid>
                                <InfoLabel>Span ID:</InfoLabel>
                                <InfoValue>{selectedSpan.spanId}</InfoValue>
                                <InfoLabel>Trace ID:</InfoLabel>
                                <InfoValue>{selectedSpan.traceId}</InfoValue>
                                {selectedSpan.parentSpanId && selectedSpan.parentSpanId !== '0000000000000000' ? (
                                    <>
                                        <InfoLabel>Parent Span ID:</InfoLabel>
                                        <InfoValue>{selectedSpan.parentSpanId}</InfoValue>
                                    </>
                                ) : (
                                    <>
                                        <InfoLabel>Parent:</InfoLabel>
                                        <InfoValue>Root Span</InfoValue>
                                    </>
                                )}
                                {selectedSpan.startTime && (
                                    <>
                                        <InfoLabel>Start Time:</InfoLabel>
                                        <InfoValue>{formatDate(selectedSpan.startTime)}</InfoValue>
                                    </>
                                )}
                                {selectedSpan.endTime && (
                                    <>
                                        <InfoLabel>End Time:</InfoLabel>
                                        <InfoValue>{formatDate(selectedSpan.endTime)}</InfoValue>
                                    </>
                                )}
                                {selectedSpanDuration !== null && (
                                    <>
                                        <InfoLabel>Duration:</InfoLabel>
                                        <InfoValue>{selectedSpanDuration}ms</InfoValue>
                                    </>
                                )}
                            </DetailsGrid>

                            {selectedSpan.attributes && selectedSpan.attributes.length > 0 && (
                                <AttributesSection>
                                    <AttributesSectionTitle>
                                        Attributes ({selectedSpan.attributes.length})
                                    </AttributesSectionTitle>
                                    {selectedSpan.attributes.map((attr, index) => (
                                        <AttributeItem key={index}>
                                            <AttributeKey>{attr.key}:</AttributeKey>
                                            <AttributeValue>{attr.value}</AttributeValue>
                                        </AttributeItem>
                                    ))}
                                </AttributesSection>
                            )}
                        </DetailsPanel>
                    )}
                </CollapsibleContent>
            </Section>
        </Container>
    );
}
