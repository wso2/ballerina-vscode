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

import React, { useState, useEffect } from "react";
import { TraceData } from "./index";
import { TraceDetails } from "./TraceDetails";
import { SessionOverview } from "./SessionOverview";
import { ErrorBoundary } from "@wso2/ui-toolkit/lib/components/ErrorBoundary/ErrorBoundary";

declare global {
    interface Window {
        vscode?: {
            postMessage(message: any): void;
        };
    }
}

interface TraceVisualizerProps {
    initialTraceData?: TraceData;
    isAgentChat: boolean;
    focusSpanId?: string;
    sessionId?: string;
}

type ViewMode = 'overview' | 'details';

export function TraceVisualizer({
    initialTraceData,
    isAgentChat,
    focusSpanId,
    sessionId
}: TraceVisualizerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>(initialTraceData ? 'details' : 'overview');
    const [currentTraceData, setCurrentTraceData] = useState<TraceData | undefined>(initialTraceData);
    const [sessionTraces, setSessionTraces] = useState<TraceData[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);
    const [currentFocusSpanId, setCurrentFocusSpanId] = useState<string | undefined>(focusSpanId);

    // Update current trace data when initialTraceData changes
    useEffect(() => {
        if (initialTraceData) {
            setCurrentTraceData(initialTraceData);
            setViewMode('details');
        }
    }, [initialTraceData]);

    // Update focus span ID when it changes
    useEffect(() => {
        setCurrentFocusSpanId(focusSpanId);
    }, [focusSpanId]);

    // Request session traces when sessionId is provided without initial trace data
    useEffect(() => {
        if (sessionId && !initialTraceData && window.vscode) {
            window.vscode.postMessage({
                command: 'requestSessionTraces',
                sessionId: sessionId
            });
        }
    }, [sessionId, initialTraceData]);

    // Listen for messages from the extension
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'sessionTraces':
                    setSessionTraces(message.traces);
                    setCurrentSessionId(message.sessionId);
                    if (!message.isUpdate) {
                        setViewMode('overview');
                    }
                    break;
                case 'traceDetails':
                    setCurrentTraceData(message.trace);
                    setViewMode('details');
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleViewSession = () => {
        if (!currentTraceData) return;

        // Extract session ID from the current trace
        let extractedSessionId: string | undefined;
        for (const span of currentTraceData.spans) {
            const conversationId = span.attributes?.find(attr => attr.key === 'gen_ai.conversation.id')?.value;
            if (conversationId) {
                extractedSessionId = conversationId;
                break;
            }
        }

        if (extractedSessionId) {
            // Request session traces from extension
            if (window.vscode) {
                window.vscode.postMessage({
                    command: 'requestSessionTraces',
                    sessionId: extractedSessionId
                });
            }
        }
    };

    const handleSelectTrace = (traceId: string) => {
        // Find the trace in session traces
        const trace = sessionTraces.find(t => t.traceId === traceId);
        if (trace) {
            setCurrentTraceData(trace);
            setCurrentFocusSpanId(undefined);
            setViewMode('details');
        }
    };

    const handleExportSession = () => {
        // Dispatch custom event to communicate with webview script
        window.dispatchEvent(new CustomEvent('exportSession', {
            detail: { sessionTraces, currentSessionId }
        }));
    };

    if (viewMode === 'overview' && sessionTraces.length > 0 && currentSessionId) {
        return (
            <SessionOverview
                sessionTraces={sessionTraces}
                sessionId={currentSessionId}
                onSelectTrace={handleSelectTrace}
                onExportSession={handleExportSession}
            />
        );
    }

    if (viewMode === 'details' && currentTraceData) {
        return (
            <TraceDetails
                key={currentTraceData.traceId}
                traceData={currentTraceData}
                isAgentChat={isAgentChat}
                focusSpanId={currentFocusSpanId}
                onViewSession={handleViewSession}
            />
        );
    }

    // Loading or empty state
    return <div>Loading...</div>;
}
