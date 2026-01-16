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

import React, { useState, useMemo } from 'react';
import styled from '@emotion/styled';
import { SpanData } from '../index';
import { Codicon, Icon } from '@wso2/ui-toolkit';

interface WaterfallViewProps {
    spans: SpanData[];
    selectedSpanId: string | null;
    onSpanSelect: (spanId: string) => void;
    isAdvancedMode: boolean;
    getChildSpans: (spanId: string) => SpanData[];
    traceStartTime: string;
    traceDuration: number;
}

interface FlatSpan extends SpanData {
    level: number;
    startOffsetMs: number;
    durationMs: number;
}

// Styled Components
const WaterfallContainer = styled.div`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
`;

const ZoomControlsBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background-color: var(--vscode-editorWidget-background);
`;

const ZoomControlsLabel = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const ZoomControlsGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ZoomButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--vscode-button-secondaryBackground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    cursor: pointer;
    color: var(--vscode-foreground);

    &:hover {
        background: var(--vscode-button-secondaryHoverBackground);
    }
`;

const ZoomSlider = styled.input`
    width: 100px;
    height: 4px;
    appearance: none;
    background: var(--vscode-scrollbarSlider-background);
    border-radius: 2px;
    cursor: pointer;
    outline: none;

    &::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--vscode-button-background);
        cursor: pointer;
    }
`;

const ZoomLabel = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    min-width: 35px;
`;

const TimelineContent = styled.div`
    overflow-x: auto;
    overflow-y: auto;
    max-height: 400px;
`;

const TimelineInner = styled.div<{ width: number }>`
    min-width: ${(props: { width: number }) => props.width}%;
`;

const TimeAxis = styled.div`
    position: relative;
    height: 28px;
    width: 100%;
    border-bottom: 1px solid var(--vscode-panel-border);
    background-color: var(--vscode-editorWidget-background);
`;

const TimeMarker = styled.div<{ position: number }>`
    position: absolute;
    left: ${(props: { position: number }) => props.position}%;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const TimeMarkerTick = styled.div`
    width: 1px;
    height: 8px;
    background-color: var(--vscode-panel-border);
`;

const TimeMarkerLabel = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
`;

const SpansContainer = styled.div`
    position: relative;
    width: 100%;
`;

const SpanRow = styled.div<{ isSelected: boolean; level: number }>`
    position: relative;
    height: 36px;
    width: 100%;
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-left: ${(props: { isSelected: boolean; level: number }) => props.level * 20}px;
    background-color: ${(props: { isSelected: boolean; level: number }) => props.isSelected
        ? 'var(--vscode-list-inactiveSelectionBackground)'
        : 'transparent'};

    &:hover {
        background-color: ${(props: { isSelected: boolean; level: number }) => props.isSelected
        ? 'var(--vscode-list-inactiveSelectionBackground)'
        : 'var(--vscode-list-hoverBackground)'};
    }
`;

const GridLine = styled.div<{ position: number }>`
    position: absolute;
    left: ${(props: { position: number }) => props.position}%;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: var(--vscode-panel-border);
    opacity: 0.3;
    pointer-events: none;
`;

interface SpanBarProps {
    type: string;
    left: number;
    width: number;
    isSelected: boolean;
}

interface SpanBarIconProps {
    type: string;
}

const SpanBar = styled.div<SpanBarProps>`
    position: absolute;
    top: 6px;
    height: 24px;
    left: ${(props: SpanBarProps) => props.left}%;
    width: ${(props: SpanBarProps) => props.width}%;
    min-width: 2px;
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0 8px;
    gap: 6px;
    overflow: hidden;
    transition: box-shadow 0.15s ease;

    background-color: ${(props: SpanBarProps) => {
        switch (props.type) {
            case 'invoke': return 'var(--vscode-terminal-ansiCyan)';
            case 'chat': return 'var(--vscode-charts-yellow)';
            case 'tool': return 'var(--vscode-terminal-ansiBrightMagenta)';
            default: return 'var(--vscode-badge-background)';
        }
    }};

    &:before {
        content: "";
        position: absolute;
        inset: 0;
        background-color: ${(props: SpanBarIconProps) => {
        switch (props.type) {
            case 'invoke': return 'var(--vscode-terminal-ansiCyan)';
            case 'chat': return 'var(--vscode-terminalSymbolIcon-optionForeground)';
            case 'tool': return 'var(--vscode-terminal-ansiBrightMagenta)';
            default: return 'var(--vscode-badge-background)';
        }
    }};
        opacity: 0.1;
        border-radius: inherit;
        z-index: -1;
    }
`;

const SpanBarIcon = styled.span`
    display: flex;
    align-items: center;
    flex-shrink: 0;
    opacity: 0.9;
`;

const SpanBarLabel = styled.span`
    font-size: 12px;
    color: var(--vscode-editor-background);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    font-weight: 500;
`;

const SpanBarDuration = styled.span`
    font-size: 11px;
    color: var(--vscode-editor-background);
    opacity: 0.85;
    flex-shrink: 0;
    margin-left: auto;
`;

const Tooltip = styled.div<{ x: number; y: number }>`
    position: fixed;
    left: ${(props: { x: number; y: number }) => props.x}px;
    top: ${(props: { x: number; y: number }) => props.y}px;
    background-color: var(--vscode-editorHoverWidget-background);
    border: 1px solid var(--vscode-editorHoverWidget-border);
    border-radius: 4px;
    padding: 8px 12px;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    max-width: 300px;
    pointer-events: none;
`;

const TooltipHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
`;

const TooltipBadge = styled.span<{ type: string }>`
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
    background-color: ${(props: { type: string }) => {
        switch (props.type) {
            case 'invoke': return 'var(--vscode-terminal-ansiCyan)';
            case 'chat': return 'var(--vscode-charts-yellow)';
            case 'tool': return 'var(--vscode-terminal-ansiBrightMagenta)';
            default: return 'var(--vscode-badge-background)';
        }
    }};
    color: var(--vscode-editor-background);
`;

const TooltipName = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const TooltipDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const TooltipRow = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    gap: 4px;

    span.value {
        color: var(--vscode-foreground);
        font-weight: 500;
    }
`;

// Helper functions
const getSpanTimeRange = (span: SpanData): { start: number; end: number } | null => {
    if (!span.startTime || !span.endTime) return null;
    return {
        start: new Date(span.startTime).getTime(),
        end: new Date(span.endTime).getTime()
    };
};

const formatDuration = (durationMs: number): string => {
    return durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(2)}s`;
};

const getSpanType = (span: SpanData): 'invoke' | 'chat' | 'tool' | 'other' => {
    const operationName = span.attributes?.find(attr => attr.key === 'gen_ai.operation.name')?.value || '';
    if (operationName.includes('invoke')) return 'invoke';
    if (operationName.includes('chat') || span.name.toLowerCase().includes('chat')) return 'chat';
    if (operationName.includes('tool') || span.name.toLowerCase().includes('tool')) return 'tool';
    return 'other';
};

const getTypeLabel = (type: string): string => {
    switch (type) {
        case 'invoke': return 'Agent';
        case 'chat': return 'Model';
        case 'tool': return 'Tool';
        default: return 'Operation';
    }
};

const getTypeIcon = (type: string): string => {
    switch (type) {
        case 'invoke': return 'bi-ai-agent';
        case 'chat': return 'bi-chat';
        case 'tool': return 'bi-wrench';
        default: return 'bi-wrench';
    }
};

const stripSpanPrefix = (spanName: string): string => {
    const prefixes = ['invoke_agent ', 'execute_tool ', 'chat '];
    for (const prefix of prefixes) {
        if (spanName.startsWith(prefix)) {
            return spanName.substring(prefix.length);
        }
    }
    return spanName;
};

const getSpanTokens = (span: SpanData): number => {
    const inputTokens = parseInt(span.attributes?.find(attr => attr.key === 'gen_ai.usage.input_tokens')?.value || '0');
    const outputTokens = parseInt(span.attributes?.find(attr => attr.key === 'gen_ai.usage.output_tokens')?.value || '0');
    return inputTokens + outputTokens;
};

export function WaterfallView({
    spans,
    selectedSpanId,
    onSpanSelect,
    getChildSpans,
    traceStartTime,
    traceDuration
}: WaterfallViewProps) {
    const [zoom, setZoom] = useState(0.8);
    const [hoveredSpan, setHoveredSpan] = useState<{ span: FlatSpan; x: number; y: number } | null>(null);

    const traceStartMs = useMemo(() => new Date(traceStartTime).getTime(), [traceStartTime]);

    // Calculate the actual earliest start time from all spans
    const actualTraceStartMs = useMemo(() => {
        if (spans.length === 0) return traceStartMs;

        let earliestStart = Infinity;

        const findEarliestStart = (span: SpanData) => {
            const range = getSpanTimeRange(span);
            if (range) {
                earliestStart = Math.min(earliestStart, range.start);
            }
            const children = getChildSpans(span.spanId);
            children.forEach(findEarliestStart);
        };

        // Find root spans
        const spanIds = new Set(spans.map(s => s.spanId));
        const roots = spans.filter(span =>
            !span.parentSpanId ||
            span.parentSpanId === '0000000000000000' ||
            !spanIds.has(span.parentSpanId)
        );

        roots.forEach(findEarliestStart);

        const calculatedStart = earliestStart !== Infinity ? earliestStart : traceStartMs;
        console.log(`[WaterfallView] traceStartTime prop: ${traceStartTime} (${traceStartMs})`);
        console.log(`[WaterfallView] calculated earliest start: ${calculatedStart}, difference: ${traceStartMs - calculatedStart}ms`);
        
        return calculatedStart;
    }, [spans, traceStartMs, traceStartTime, getChildSpans]);

    // Calculate actual duration based on spans to ensure all spans are visible
    const actualTraceDuration = useMemo(() => {
        if (spans.length === 0) return traceDuration;

        let maxEndOffset = 0;

        // Recursively process all spans including children
        const processSpan = (span: SpanData) => {
            const range = getSpanTimeRange(span);
            if (range) {
                const endOffset = range.end - actualTraceStartMs;
                console.log(`[WaterfallView] Span: ${span.name}`);
                console.log(`  - startTime: ${span.startTime} (${range.start})`);
                console.log(`  - endTime: ${span.endTime} (${range.end})`);
                console.log(`  - actualTraceStartMs: ${actualTraceStartMs}`);
                console.log(`  - endOffset: ${endOffset}ms`);
                maxEndOffset = Math.max(maxEndOffset, endOffset);
            }
            const children = getChildSpans(span.spanId);
            children.forEach(processSpan);
        };

        // Find root spans and process their hierarchies
        const spanIds = new Set(spans.map(s => s.spanId));
        const roots = spans.filter(span =>
            !span.parentSpanId ||
            span.parentSpanId === '0000000000000000' ||
            !spanIds.has(span.parentSpanId)
        );
        roots.forEach(processSpan);

        const finalDuration = Math.max(maxEndOffset, traceDuration);
        console.log(`[WaterfallView] maxEndOffset: ${maxEndOffset}ms, traceDuration: ${traceDuration}ms, finalDuration: ${finalDuration}ms`);
        
        // Use the maximum of the calculated duration and the provided traceDuration
        return finalDuration;
    }, [spans, actualTraceStartMs, traceDuration, getChildSpans]);

    // Find root spans (no parent or parent not in our span list)
    const rootSpans = useMemo(() => {
        const spanIds = new Set(spans.map(s => s.spanId));
        return spans.filter(span =>
            !span.parentSpanId ||
            span.parentSpanId === '0000000000000000' ||
            !spanIds.has(span.parentSpanId)
        ).sort((a, b) => {
            const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
            const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
            return aTime - bTime;
        });
    }, [spans]);

    // Flatten span hierarchy for rendering
    const flatSpans = useMemo(() => {
        const result: FlatSpan[] = [];

        const processSpan = (span: SpanData, level: number) => {
            const range = getSpanTimeRange(span);
            const startOffsetMs = range ? Math.max(0, range.start - actualTraceStartMs) : 0;
            const durationMs = range ? range.end - range.start : 0;

            result.push({
                ...span,
                level,
                startOffsetMs,
                durationMs
            });

            const children = getChildSpans(span.spanId);
            children.forEach(child => processSpan(child, level + 1));
        };

        rootSpans.forEach(span => processSpan(span, 0));
        return result;
    }, [rootSpans, getChildSpans, actualTraceStartMs]);

    // Calculate time markers based on total duration
    const timeMarkers = useMemo(() => {
        const markers: number[] = [];
        if (actualTraceDuration <= 0) return markers;

        // Dynamic interval calculation for better scaling
        const intervalMs = actualTraceDuration <= 1000 ? 200 :
            actualTraceDuration <= 2000 ? 500 :
                actualTraceDuration <= 5000 ? 1000 :
                    actualTraceDuration <= 10000 ? 2000 :
                        actualTraceDuration <= 30000 ? 5000 :
                            actualTraceDuration <= 60000 ? 10000 : 15000;

        console.log(`[WaterfallView] actualTraceDuration: ${actualTraceDuration}ms, intervalMs: ${intervalMs}ms`);

        for (let t = 0; t <= actualTraceDuration; t += intervalMs) {
            markers.push(t);
        }

        // Ensure we have a marker at or very close to the end
        const lastMarker = markers[markers.length - 1];
        if (lastMarker < actualTraceDuration && actualTraceDuration - lastMarker > intervalMs * 0.1) {
            markers.push(actualTraceDuration);
        }
        
        console.log(`[WaterfallView] Generated ${markers.length} time markers:`, markers);
        
        return markers;
    }, [actualTraceDuration]);

    const formatTimeMarker = (ms: number): string => {
        return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
    };

    const handleSpanMouseEnter = (span: FlatSpan, event: React.MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setHoveredSpan({
            span,
            x: rect.left + rect.width / 2,
            y: rect.top - 10
        });
    };

    const handleSpanMouseLeave = () => {
        setHoveredSpan(null);
    };

    const timelineWidth = 100 * zoom;

    return (
        <WaterfallContainer>
            {/* Zoom Controls */}
            <ZoomControlsBar>
                <ZoomControlsLabel>Timeline</ZoomControlsLabel>
                <ZoomControlsGroup>
                    <ZoomButton
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                        title="Zoom out"
                    >
                        <Codicon name="zoom-out" />
                    </ZoomButton>
                    <ZoomSlider
                        type="range"
                        min="0.2"
                        max="1"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                    />
                    <ZoomLabel>{Math.round(zoom * 100)}%</ZoomLabel>
                    <ZoomButton
                        onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                        title="Zoom in"
                    >
                        <Codicon name="zoom-in" />
                    </ZoomButton>
                </ZoomControlsGroup>
            </ZoomControlsBar>

            {/* Timeline Content */}
            <TimelineContent>
                <TimelineInner width={timelineWidth}>
                    {/* Time Axis */}
                    <TimeAxis>
                        {timeMarkers.map((ms) => (
                            <TimeMarker key={ms} position={(ms / actualTraceDuration) * 100}>
                                <TimeMarkerTick />
                                <TimeMarkerLabel>{formatTimeMarker(ms)}</TimeMarkerLabel>
                            </TimeMarker>
                        ))}
                    </TimeAxis>

                    {/* Spans */}
                    <SpansContainer>
                        {flatSpans.map((span) => {
                            // Calculate percentages relative to the trace duration
                            const leftPercent = actualTraceDuration > 0
                                ? (span.startOffsetMs / actualTraceDuration) * 100
                                : 0;
                            const widthPercent = actualTraceDuration > 0
                                ? Math.max(0.1, (span.durationMs / actualTraceDuration) * 100)
                                : 0;
                            const spanType = getSpanType(span);
                            const isSelected = selectedSpanId === span.spanId;

                            return (
                                <SpanRow key={span.spanId} isSelected={isSelected} level={span.level}>
                                    {/* Grid lines */}
                                    {timeMarkers.map((ms) => (
                                        <GridLine
                                            key={ms}
                                            position={(ms / actualTraceDuration) * 100}
                                        />
                                    ))}

                                    {/* Span bar */}
                                    <SpanBar
                                        type={spanType}
                                        left={leftPercent}
                                        width={widthPercent}
                                        isSelected={isSelected}
                                        onClick={() => onSpanSelect(span.spanId)}
                                        onMouseEnter={(e) => handleSpanMouseEnter(span, e)}
                                        onMouseLeave={handleSpanMouseLeave}
                                    >
                                        <SpanBarIcon>
                                            <Icon
                                                name={getTypeIcon(spanType)}
                                                sx={{
                                                    fontSize: '14px',
                                                    width: '14px',
                                                    height: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--vscode-editor-background)'
                                                }}
                                                iconSx={{
                                                    fontSize: '14px',
                                                    display: 'flex',
                                                    color: 'var(--vscode-editor-background)'
                                                }}
                                            />
                                        </SpanBarIcon>
                                        <SpanBarLabel>{stripSpanPrefix(span.name)}</SpanBarLabel>
                                        <SpanBarDuration>{formatDuration(span.durationMs)}</SpanBarDuration>
                                    </SpanBar>
                                </SpanRow>
                            );
                        })}
                    </SpansContainer>
                </TimelineInner>
            </TimelineContent>

            {/* Tooltip */}
            {hoveredSpan && (
                <Tooltip x={hoveredSpan.x} y={hoveredSpan.y - 80}>
                    <TooltipHeader>
                        <TooltipBadge type={getSpanType(hoveredSpan.span)}>
                            {getTypeLabel(getSpanType(hoveredSpan.span))}
                        </TooltipBadge>
                        <TooltipName>{stripSpanPrefix(hoveredSpan.span.name)}</TooltipName>
                    </TooltipHeader>
                    <TooltipDetails>
                        <TooltipRow>
                            Duration: <span className="value">{formatDuration(hoveredSpan.span.durationMs)}</span>
                        </TooltipRow>
                        {getSpanTokens(hoveredSpan.span) > 0 && (
                            <TooltipRow>
                                Tokens: <span className="value">{getSpanTokens(hoveredSpan.span).toLocaleString()}</span>
                            </TooltipRow>
                        )}
                        <TooltipRow>
                            Offset: <span className="value">{formatDuration(hoveredSpan.span.startOffsetMs)}</span>
                        </TooltipRow>
                    </TooltipDetails>
                </Tooltip>
            )}
        </WaterfallContainer>
    );
}
