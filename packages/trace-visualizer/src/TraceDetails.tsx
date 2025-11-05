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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { TraceData, SpanData, AttributeData } from "./index";
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
    gap: 2px;
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
    border-left: 3px solid var(--vscode-textLink-foreground);
    padding-left: 10px;
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

const SpanItem = styled.div<{ indent: number }>`
    margin-bottom: 15px;
    padding: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background-color: var(--vscode-editor-background);
    margin-left: ${(props: { indent: number }) => props.indent * 20}px;
`;

const SpanHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
`;

const SpanName = styled.span`
    font-weight: 600;
    font-size: 14px;
    color: var(--vscode-textLink-foreground);
`;

const SpanKind = styled.span`
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
`;

const SpanDetails = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-family: 'Consolas', 'Monaco', monospace;
    
    div {
        margin: 4px 0;
    }
`;

const SpanChildren = styled.div`
    margin-left: 30px;
    margin-top: 10px;
    border-left: 2px solid var(--vscode-panel-border);
    padding-left: 15px;
`;

const EmptyState = styled.div`
    text-align: center;
    color: var(--vscode-descriptionForeground);
    padding: 40px;
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

export function TraceDetails({ traceData }: TraceDetailsProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['trace', 'resource', 'scope', 'spans']));

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
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

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    const renderSpan = (span: SpanData, indent: number = 0): React.ReactNode => {
        const childSpans = traceData.spans.filter(s => s.parentSpanId === span.spanId);
        const spanKind = getSpanKindLabel(span.kind);

        return (
            <SpanItem key={span.spanId} indent={indent}>
                <SpanHeader>
                    <SpanName>{span.name}</SpanName>
                    <SpanKind>{spanKind}</SpanKind>
                </SpanHeader>
                <SpanDetails>
                    <div><strong>Span ID:</strong> {span.spanId}</div>
                    <div><strong>Trace ID:</strong> {span.traceId}</div>
                    {span.parentSpanId && span.parentSpanId !== '0000000000000000' ? (
                        <div><strong>Parent Span ID:</strong> {span.parentSpanId}</div>
                    ) : (
                        <div><strong>Parent:</strong> Root Span</div>
                    )}
                    {childSpans.length > 0 && (
                        <div><strong>Child Spans:</strong> {childSpans.length}</div>
                    )}
                </SpanDetails>
                {childSpans.length > 0 && (
                    <SpanChildren>
                        {childSpans.map(child => renderSpan(child, indent + 1))}
                    </SpanChildren>
                )}
            </SpanItem>
        );
    };

    return (
        <Container>
            <Header>
                <Title>Trace : {traceData.traceId}</Title>
            </Header>
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
                    <AttributesContainer>
                        <InfoLabel style={{ marginBottom: '8px' }}>Attributes:</InfoLabel>
                        {traceData.resource.attributes && traceData.resource.attributes.length > 0 ? (
                            traceData.resource.attributes.map((attr, index) => (
                                <AttributeItem key={index}>
                                    <AttributeKey>{attr.key}:</AttributeKey>
                                    <AttributeValue>{attr.value}</AttributeValue>
                                </AttributeItem>
                            ))
                        ) : (
                            <div style={{ color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>
                                No attributes
                            </div>
                        )}
                    </AttributesContainer>
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
                            <InfoLabel style={{ marginBottom: '8px' }}>Attributes:</InfoLabel>
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
                    {traceData.spans.length > 0 ? (
                        rootSpans.map(span => renderSpan(span, 0))
                    ) : (
                        <EmptyState>No spans found in this trace.</EmptyState>
                    )}
                </CollapsibleContent>
            </Section>
        </Container>
    );
}

