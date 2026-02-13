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

import React from "react";
import { createRoot } from "react-dom/client";
import { TraceDetails } from "./TraceDetails";

export interface TraceData {
    traceId: string;
    spans: SpanData[];
    resource: ResourceData;
    scope: ScopeData;
    firstSeen: string;
    lastSeen: string;
}

export interface SpanData {
    status: any;
    spanId: string;
    traceId: string;
    parentSpanId: string;
    name: string;
    kind: string | number;
    startTime?: string;
    endTime?: string;
    attributes?: AttributeData[];
}

export interface ResourceData {
    name: string;
    attributes: AttributeData[];
}

export interface ScopeData {
    name: string;
    version?: string;
    attributes?: AttributeData[];
}

export interface AttributeData {
    key: string;
    value: string;
}

declare global {
    interface Window {
        traceVisualizer: {
            renderWebview: (traceData: TraceData, isAgentChat: boolean, target: HTMLElement, focusSpanId?: string, openWithSidebarCollapsed?: boolean) => void;
        };
    }
}

export function renderWebview(traceData: TraceData, isAgentChat: boolean, target: HTMLElement, focusSpanId?: string, openWithSidebarCollapsed?: boolean) {
    const root = createRoot(target);
    root.render(
        <React.StrictMode>
            <TraceDetails traceData={traceData} isAgentChat={isAgentChat} focusSpanId={focusSpanId} openWithSidebarCollapsed={openWithSidebarCollapsed} />
        </React.StrictMode>
    );
}

// Make renderWebview available globally
if (typeof window !== 'undefined') {
    window.traceVisualizer = {
        renderWebview
    };
}

