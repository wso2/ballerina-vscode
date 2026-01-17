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

import { useState, useMemo, ReactNode, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import { Codicon, Icon } from "@wso2/ui-toolkit";
import { SearchInput } from "./SearchInput";
import { CollapsibleSection } from "./CollapsibleSection";
import { JsonViewer } from "./JsonViewer";
import { CopyButton } from "./CopyButton";
import { SpanData } from "../index";

interface SpanInputOutputProps {
    spanData: SpanData;
    spanName?: string;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SpanHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    position: relative;
`;

const SpanIcon = styled.span<{ type: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props: { type: string }) => {
        switch (props.type) {
            case 'invoke': return 'var(--vscode-terminal-ansiCyan)';
            case 'chat': return 'var(--vscode-terminalSymbolIcon-optionForeground)';
            case 'tool': return 'var(--vscode-terminal-ansiBrightMagenta)';
            default: return 'var(--vscode-badge-foreground)';
        }
    }};
`;

const SpanTitle = styled.h2`
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-foreground);
    flex: 1;
`;

const IdButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    color: var(--vscode-foreground);
    transition: all 0.15s ease;
    gap: 4px;
    font-size: 12px;
    margin-left: auto;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }

    &:active {
        transform: scale(0.98);
    }
`;

const IdPopup = styled.div`
    position: absolute;
    top: calc(100% - 8px);
    right: 0;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 4px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    min-width: 300px;
    max-width: 400px;
    animation: popupFadeIn 0.1s ease-out;
    transform-origin: top right;

    @keyframes popupFadeIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
`;

const IdPopupTitle = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const IdRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
    
    &:last-child {
        margin-bottom: 0;
    }
`;

const IdLabel = styled.div`
    font-size: 11px;
    font-weight: 500;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const IdValueContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px 10px;
`;

const IdValue = styled.div`
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-foreground);
    word-break: break-all;
    flex: 1;
`;

const MetricsPills = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const MetricPill = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    background-color: var(--vscode-list-hoverBackground);
    color: var(--vscode-badge-foreground);
    border-radius: 4px;
`;

const SectionContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const InputOutputGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    
    @media (min-width: 800px) {
        grid-template-columns: 1fr 1fr;
    }
`;

const SubSection = styled.div``;

const SubSectionTitle = styled.h4`
    margin: 0 0 8px 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const TextContent = styled.div`
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 12px;
    font-family: var(--vscode-font-family);
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--vscode-editor-foreground);
`;

const ErrorContent = styled.div`
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-errorForeground);
    border-radius: 4px;
    padding: 12px;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--vscode-editor-foreground);
`;

const ErrorHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    color: var(--vscode-errorForeground);
`;

const Highlight = styled.mark`
    background-color: var(--vscode-editor-findMatchHighlightBackground, #ffcc00);
    color: inherit;
    padding: 0 1px;
    border-radius: 2px;
`;

const NoMatchMessage = styled.div`
    text-align: center;
    padding: 24px;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

// Advanced Details styles
const AdvancedDetailsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const TechnicalIdsGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const TechnicalRow = styled.div`
    display: flex;
    gap: 8px;
    font-size: 13px;
    line-height: 1.4;

    &:hover {
        & > span:last-child {
            opacity: 1;
        }
    }
`;

const TechnicalLabel = styled.span`
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
    flex-shrink: 0;
    width: 120px;
`;

const TechnicalValue = styled.span`
    color: var(--vscode-foreground);
    word-break: break-all;
`;

const AttributesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const AttributeRow = styled.div`
    display: flex;
    gap: 8px;
    font-size: 13px;
    line-height: 1.4;

    &:hover {
        & > span:last-child {
            opacity: 1;
        }
    }
`;

const AttributeKey = styled.span`
    color: var(--vscode-textLink-foreground);
    white-space: nowrap;
    flex-shrink: 0;
`;

const AttributeValue = styled.span`
    color: var(--vscode-foreground);
    word-break: break-all;
`;

const CopyWrapper = styled.span`
    opacity: 0;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
`;

// Helper functions
function getAttributeValue(attributes: Array<{ key: string; value: string }> | undefined, key: string): string | undefined {
    return attributes?.find(a => a.key === key)?.value;
}

function highlightText(text: string, searchQuery: string): ReactNode {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? <Highlight key={i}>{part}</Highlight> : part
    );
}

function textContainsSearch(text: string | undefined, searchQuery: string): boolean {
    if (!searchQuery || !text) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
}

function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });
}

// Attributes to exclude from "Other Attributes" (shown elsewhere)
const EXCLUDED_ATTRIBUTE_KEYS = [
    'gen_ai.input.messages',
    'gen_ai.output.messages',
    'gen_ai.tool.arguments',
    'gen_ai.tool.output',
    'gen_ai.system_instructions',
    'gen_ai.input.tools',
    'error.message'
];

// Remove common prefixes from span names
function stripSpanPrefix(spanName: string): string {
    const prefixes = ['invoke_agent ', 'execute_tool ', 'chat '];
    for (const prefix of prefixes) {
        if (spanName.startsWith(prefix)) {
            return spanName.substring(prefix.length);
        }
    }
    return spanName;
}

export function SpanInputOutput({ spanData, spanName }: SpanInputOutputProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isIdPopupOpen, setIsIdPopupOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Extract operation type
    const operationName = getAttributeValue(spanData.attributes, 'gen_ai.operation.name') || '';
    const spanType = useMemo(() => {
        if (operationName.startsWith('invoke_agent')) return 'invoke';
        if (operationName.startsWith('chat') || spanName?.toLowerCase().startsWith('chat')) return 'chat';
        if (operationName.startsWith('execute_tool') || spanName?.toLowerCase().startsWith('execute_tool')) return 'tool';
        return 'other';
    }, [operationName, spanName]);

    // Extract metrics
    const metrics = useMemo(() => {
        const latencyMs = spanData.startTime && spanData.endTime
            ? new Date(spanData.endTime).getTime() - new Date(spanData.startTime).getTime()
            : null;

        const inputTokens = parseInt(getAttributeValue(spanData.attributes, 'gen_ai.usage.input_tokens') || '0');
        const outputTokens = parseInt(getAttributeValue(spanData.attributes, 'gen_ai.usage.output_tokens') || '0');
        const temperature = getAttributeValue(spanData.attributes, 'gen_ai.request.temperature');
        const provider = getAttributeValue(spanData.attributes, 'gen_ai.provider.name');
        const model = getAttributeValue(spanData.attributes, 'gen_ai.request.model');
        const toolDescription = getAttributeValue(spanData.attributes, 'gen_ai.tool.description');

        return {
            latency: latencyMs !== null ? (latencyMs >= 1000 ? `${(latencyMs / 1000).toFixed(2)}s` : `${latencyMs}ms`) : null,
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            temperature,
            provider,
            model,
            toolDescription
        };
    }, [spanData]);

    // Extract input/output data
    const inputData = useMemo(() => {
        const systemInstructions = getAttributeValue(spanData.attributes, 'gen_ai.system_instructions');
        const inputMessages = getAttributeValue(spanData.attributes, 'gen_ai.input.messages');
        const toolArguments = getAttributeValue(spanData.attributes, 'gen_ai.tool.arguments');
        const inputTools = getAttributeValue(spanData.attributes, 'gen_ai.input.tools');

        return {
            systemInstructions,
            messages: inputMessages || toolArguments,
            messagesLabel: toolArguments ? 'Tool Arguments' : (operationName === 'invoke_agent' ? 'User' : 'Messages'),
            tools: inputTools
        };
    }, [spanData.attributes, operationName]);

    const outputData = useMemo(() => {
        const outputMessages = getAttributeValue(spanData.attributes, 'gen_ai.output.messages');
        const toolOutput = getAttributeValue(spanData.attributes, 'gen_ai.tool.output');
        const errorMessage = getAttributeValue(spanData.attributes, 'error.message');

        return {
            messages: outputMessages || toolOutput,
            messagesLabel: toolOutput ? 'Tool Output' : 'Messages',
            error: errorMessage
        };
    }, [spanData.attributes]);

    // Check if sections match search
    const inputMatches = useMemo(() => {
        if (!searchQuery) return true;
        return textContainsSearch(inputData.systemInstructions, searchQuery) ||
            textContainsSearch(inputData.messages, searchQuery) ||
            textContainsSearch(inputData.tools, searchQuery);
    }, [searchQuery, inputData]);

    const outputMatches = useMemo(() => {
        if (!searchQuery) return true;
        return textContainsSearch(outputData.messages, searchQuery) ||
            textContainsSearch(outputData.error, searchQuery);
    }, [searchQuery, outputData]);

    const metricsMatch = useMemo(() => {
        if (!searchQuery) return true;
        return textContainsSearch(metrics.latency, searchQuery) ||
            textContainsSearch(metrics.temperature, searchQuery) ||
            textContainsSearch(metrics.provider, searchQuery) ||
            textContainsSearch(metrics.model, searchQuery) ||
            textContainsSearch(metrics.toolDescription, searchQuery) ||
            textContainsSearch(String(metrics.inputTokens), searchQuery) ||
            textContainsSearch(String(metrics.outputTokens), searchQuery);
    }, [searchQuery, metrics]);

    // Advanced attributes (not shown in input/output)
    const advancedAttributes = useMemo(() => {
        return spanData.attributes?.filter(attr => !EXCLUDED_ATTRIBUTE_KEYS.includes(attr.key)) || [];
    }, [spanData.attributes]);

    // Filter advanced attributes based on search
    const filteredAdvancedAttributes = useMemo(() => {
        if (!searchQuery) return advancedAttributes;
        return advancedAttributes.filter(attr =>
            textContainsSearch(attr.key, searchQuery) ||
            textContainsSearch(attr.value, searchQuery)
        );
    }, [advancedAttributes, searchQuery]);

    // Check if technical IDs match search
    const technicalIdsMatch = useMemo(() => {
        if (!searchQuery) return true;
        return textContainsSearch(spanData.spanId, searchQuery) ||
            textContainsSearch(spanData.traceId, searchQuery) ||
            textContainsSearch(spanData.parentSpanId, searchQuery) ||
            textContainsSearch(spanData.startTime, searchQuery) ||
            textContainsSearch(spanData.endTime, searchQuery);
    }, [searchQuery, spanData]);

    // Check if advanced section has any matches
    const advancedMatches = useMemo(() => {
        if (!searchQuery) return true;
        return technicalIdsMatch || filteredAdvancedAttributes.length > 0;
    }, [searchQuery, technicalIdsMatch, filteredAdvancedAttributes]);

    const hasInput = inputData.systemInstructions || inputData.messages || inputData.tools;
    const hasOutput = outputData.messages || outputData.error;
    const noMatches = searchQuery && !inputMatches && !outputMatches && !metricsMatch && !advancedMatches;

    // Close popup when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isIdPopupOpen &&
                popupRef.current &&
                buttonRef.current &&
                !popupRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)) {
                setIsIdPopupOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isIdPopupOpen]);

    return (
        <Container>
            {/* Span Header */}
            {spanName && (
                <SpanHeader>
                    <SpanIcon type={spanType}>
                        <Icon
                            name={spanType === 'invoke' ? 'bi-ai-agent' : spanType === 'chat' ? 'bi-chat' : spanType === 'tool' ? 'bi-wrench' : 'bi-action'}
                            sx={{
                                fontSize: '24px',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            iconSx={{
                                fontSize: "24px",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        />
                    </SpanIcon>

                    <SpanTitle>
                        <span>
                            {spanType === 'invoke' && 'Invoke Agent - '}
                            {spanType === 'chat' && 'Chat - '}
                            {spanType === 'tool' && 'Execute Tool - '}
                        </span>
                        {stripSpanPrefix(spanName)}
                    </SpanTitle>

                    <IdButton
                        ref={buttonRef}
                        onClick={() => setIsIdPopupOpen(!isIdPopupOpen)}
                        title="View technical IDs"
                    >
                        <Icon
                            name="bi-link"
                            sx={{ fontSize: "16px", width: "16px", height: "16px" }}
                            iconSx={{ display: "flex" }}
                        />
                        ID
                    </IdButton>

                    {isIdPopupOpen && (
                        <IdPopup ref={popupRef}>
                            <IdPopupTitle>
                                <Icon
                                    name="bi-link"
                                    sx={{ fontSize: "16px", width: "16px", height: "16px" }}
                                    iconSx={{ display: "flex" }}
                                />
                                Technical IDs
                            </IdPopupTitle>

                            <IdRow>
                                <IdLabel>Trace ID</IdLabel>
                                <IdValueContainer>
                                    <IdValue>{spanData.traceId}</IdValue>
                                    <CopyButton text={spanData.traceId} size="small" />
                                </IdValueContainer>
                            </IdRow>

                            <IdRow>
                                <IdLabel>Span ID</IdLabel>
                                <IdValueContainer>
                                    <IdValue>{spanData.spanId}</IdValue>
                                    <CopyButton text={spanData.spanId} size="small" />
                                </IdValueContainer>
                            </IdRow>

                            {spanData.parentSpanId && spanData.parentSpanId !== '0000000000000000' && (
                                <IdRow>
                                    <IdLabel>Parent Span ID</IdLabel>
                                    <IdValueContainer>
                                        <IdValue>{spanData.parentSpanId}</IdValue>
                                        <CopyButton text={spanData.parentSpanId} size="small" />
                                    </IdValueContainer>
                                </IdRow>
                            )}
                        </IdPopup>
                    )}
                </SpanHeader>
            )}

            {/* Search Input */}
            <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search all sections..."
            />

            {/* Metrics Pills */}
            {metricsMatch && (
                <MetricsPills>
                    {metrics.latency && (
                        <MetricPill>
                            <Icon name="bi-clock" sx={{ fontSize: "16px", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ display: "flex" }} />
                            {highlightText(`Latency: ${metrics.latency}`, searchQuery)}
                        </MetricPill>
                    )}
                    {metrics.inputTokens > 0 && (
                        <MetricPill>
                            {highlightText(`Input Tokens: ${metrics.inputTokens}`, searchQuery)}
                        </MetricPill>
                    )}
                    {metrics.outputTokens > 0 && (
                        <MetricPill>
                            {highlightText(`Output Tokens: ${metrics.outputTokens}`, searchQuery)}
                        </MetricPill>
                    )}
                    {metrics.temperature && (
                        <MetricPill>
                            <Icon name="bi-thermostat" sx={{ fontSize: "16px", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ display: "flex" }} />
                            {highlightText(`Temperature: ${metrics.temperature}`, searchQuery)}
                        </MetricPill>
                    )}
                    {metrics.provider && (
                        <MetricPill>
                            {highlightText(`Provider: ${metrics.provider}`, searchQuery)}
                        </MetricPill>
                    )}
                    {metrics.model && (
                        <MetricPill>
                            {highlightText(`Model: ${metrics.model}`, searchQuery)}
                        </MetricPill>
                    )}
                    {metrics.toolDescription && (
                        <MetricPill>
                            {highlightText(`Tool Description: ${metrics.toolDescription}`, searchQuery)}
                        </MetricPill>
                    )}
                </MetricsPills>
            )}

            {/* No Matches Message */}
            {noMatches && (
                <NoMatchMessage>
                    No results found for "{searchQuery}"
                </NoMatchMessage>
            )}

            {/* Input and Output Sections in Responsive Grid */}
            {(hasInput && inputMatches) || (hasOutput && outputMatches) ? (
                <InputOutputGrid>
                    {/* Input Section */}
                    {hasInput && inputMatches && (
                        <CollapsibleSection
                            title="Input"
                            icon="bi-input"
                            defaultOpen={true}
                        >
                            <SectionContent>
                                {inputData.systemInstructions && textContainsSearch(inputData.systemInstructions, searchQuery) && (
                                    <SubSection>
                                        <JsonViewer
                                            value={inputData.systemInstructions}
                                            title="System Instructions"
                                            searchQuery={searchQuery}
                                        />
                                    </SubSection>
                                )}
                                {inputData.messages && textContainsSearch(inputData.messages, searchQuery) && (
                                    <SubSection>
                                        <JsonViewer
                                            value={inputData.messages}
                                            title={inputData.messagesLabel}
                                            searchQuery={searchQuery}
                                        />
                                    </SubSection>
                                )}
                                {inputData.tools && textContainsSearch(inputData.tools, searchQuery) && (
                                    <SubSection>
                                        <JsonViewer
                                            value={inputData.tools}
                                            title="Available Tools"
                                            searchQuery={searchQuery}
                                            maxAutoExpandDepth={0}
                                        />
                                    </SubSection>
                                )}
                            </SectionContent>
                        </CollapsibleSection>
                    )}

                    {/* Output Section */}
                    {hasOutput && outputMatches && (
                        <CollapsibleSection
                            title="Output"
                            icon="bi-output"
                            defaultOpen={true}
                        >
                            <SectionContent>
                                {outputData.error && textContainsSearch(outputData.error, searchQuery) && (
                                    <SubSection>
                                        <ErrorHeader>
                                            <Icon name="bi-error" sx={{ fontSize: "16px", width: "16px", height: "16px" }} iconSx={{ display: "flex" }} />
                                            <SubSectionTitle style={{ margin: 0, color: 'var(--vscode-errorForeground)' }}>
                                                Error
                                            </SubSectionTitle>
                                            <CopyButton text={outputData.error} size="small" />
                                        </ErrorHeader>
                                        <ErrorContent>
                                            {highlightText(outputData.error, searchQuery)}
                                        </ErrorContent>
                                    </SubSection>
                                )}
                                {outputData.messages && textContainsSearch(outputData.messages, searchQuery) && (
                                    <SubSection>
                                        <JsonViewer
                                            value={outputData.messages}
                                            title={outputData.messagesLabel}
                                            searchQuery={searchQuery}
                                        />
                                    </SubSection>
                                )}
                            </SectionContent>
                        </CollapsibleSection>
                    )}
                </InputOutputGrid>
            ) : null}

            {/* Advanced Details Section */}
            {advancedMatches && (
                <CollapsibleSection
                    title="Advanced Details"
                    defaultOpen={spanType === 'other' || (!hasInput && !hasOutput)}
                >
                    <AdvancedDetailsContainer>
                        {/* Technical IDs */}
                        {technicalIdsMatch && (
                            <SubSection>
                                <SubSectionTitle>Technical IDs</SubSectionTitle>
                                <TechnicalIdsGrid>
                                    <TechnicalRow>
                                        <TechnicalLabel>Span ID:</TechnicalLabel>
                                        <TechnicalValue>{highlightText(spanData.spanId, searchQuery)}</TechnicalValue>
                                        <CopyWrapper>
                                            <CopyButton text={spanData.spanId} size="small" />
                                        </CopyWrapper>
                                    </TechnicalRow>

                                    <TechnicalRow>
                                        <TechnicalLabel>Trace ID:</TechnicalLabel>
                                        <TechnicalValue>{highlightText(spanData.traceId, searchQuery)}</TechnicalValue>
                                        <CopyWrapper>
                                            <CopyButton text={spanData.traceId} size="small" />
                                        </CopyWrapper>
                                    </TechnicalRow>

                                    <TechnicalRow>
                                        <TechnicalLabel>Parent Span ID:</TechnicalLabel>
                                        <TechnicalValue>
                                            {spanData.parentSpanId && spanData.parentSpanId !== '0000000000000000'
                                                ? highlightText(spanData.parentSpanId, searchQuery)
                                                : 'Root Span'}
                                        </TechnicalValue>
                                        {spanData.parentSpanId && spanData.parentSpanId !== '0000000000000000' && (
                                            <CopyWrapper>
                                                <CopyButton text={spanData.parentSpanId} size="small" />
                                            </CopyWrapper>
                                        )}
                                    </TechnicalRow>

                                    {spanData.startTime && (
                                        <TechnicalRow>
                                            <TechnicalLabel>Start Time:</TechnicalLabel>
                                            <TechnicalValue>{highlightText(formatDate(spanData.startTime), searchQuery)}</TechnicalValue>
                                            <CopyWrapper>
                                                <CopyButton text={formatDate(spanData.startTime)} size="small" />
                                            </CopyWrapper>
                                        </TechnicalRow>
                                    )}

                                    {spanData.endTime && (
                                        <TechnicalRow>
                                            <TechnicalLabel>End Time:</TechnicalLabel>
                                            <TechnicalValue>{highlightText(formatDate(spanData.endTime), searchQuery)}</TechnicalValue>
                                            <CopyWrapper>
                                                <CopyButton text={formatDate(spanData.endTime)} size="small" />
                                            </CopyWrapper>
                                        </TechnicalRow>
                                    )}
                                </TechnicalIdsGrid>
                            </SubSection>
                        )}

                        {/* Other Attributes */}
                        {filteredAdvancedAttributes.length > 0 && (
                            <SubSection>
                                <SubSectionTitle>
                                    Other Attributes ({searchQuery ? `${filteredAdvancedAttributes.length} of ${advancedAttributes.length}` : advancedAttributes.length})
                                </SubSectionTitle>
                                <AttributesList>
                                    {filteredAdvancedAttributes.map((attr, index) => (
                                        <AttributeRow key={index}>
                                            <AttributeKey>{highlightText(attr.key, searchQuery)}:</AttributeKey>
                                            <AttributeValue>{highlightText(attr.value, searchQuery)}</AttributeValue>
                                            <CopyWrapper>
                                                <CopyButton text={`${attr.key}: ${attr.value}`} size="small" />
                                            </CopyWrapper>
                                        </AttributeRow>
                                    ))}
                                </AttributesList>
                            </SubSection>
                        )}

                        {searchQuery && filteredAdvancedAttributes.length === 0 && !technicalIdsMatch && (
                            <NoMatchMessage>
                                No attributes match your search
                            </NoMatchMessage>
                        )}
                    </AdvancedDetailsContainer>
                </CollapsibleSection>
            )}
        </Container>
    );
}
