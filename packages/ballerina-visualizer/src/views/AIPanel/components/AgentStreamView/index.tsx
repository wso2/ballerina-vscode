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

import React, { useEffect, useRef, useState } from "react";
import { PipelineContainer } from "./styles";
import StreamEntryComponent, { getNodeStatus } from "./StreamEntry";
import { AgentStreamViewProps, StreamEntry } from "./types";

export type { AgentStreamViewProps, StreamEntry };
export type { StreamItem } from "./types";

const COLLAPSE_DELAY_MS = 300;

const AgentStreamView: React.FC<AgentStreamViewProps> = ({ stream, isLoading = false, rpcClient }) => {
    const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
    const collapseTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const itemsInnerRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const autoCollapsedEntries = useRef<Set<string>>(new Set());

    // Auto-expand active entries, auto-collapse completed entries once
    useEffect(() => {
        stream.forEach((entry, entryIdx) => {
            if (!entry.description) return;
            const isLastEntry = !stream.slice(entryIdx + 1).some(e => e.description);
            const nodeStatus = getNodeStatus(entry, isLastEntry, isLoading);
            const key = `${entry.description}::${entryIdx}`;

            if (nodeStatus === "active") {
                if (collapseTimers.current[key]) {
                    clearTimeout(collapseTimers.current[key]);
                    delete collapseTimers.current[key];
                }
                setExpandedEntries(prev => prev[key] === true ? prev : { ...prev, [key]: true });
            } else if (nodeStatus === "done" && !autoCollapsedEntries.current.has(key)) {
                if (!collapseTimers.current[key]) {
                    collapseTimers.current[key] = setTimeout(() => {
                        autoCollapsedEntries.current.add(key);
                        setExpandedEntries(prev => ({ ...prev, [key]: false }));
                        delete collapseTimers.current[key];
                    }, COLLAPSE_DELAY_MS);
                }
            }
        });
    }, [stream, isLoading]);

    // Scroll to bottom of items when expanded and items change
    useEffect(() => {
        stream.forEach((entry, entryIdx) => {
            if (!entry.description) return;
            const key = `${entry.description}::${entryIdx}`;
            const el = itemsInnerRefs.current[key];
            if (!el) return;
            if (expandedEntries[key]) {
                el.scrollTop = el.scrollHeight;
            }
        });
    }, [stream, expandedEntries]);

    // Clean up timers on unmount
    useEffect(() => {
        return () => {
            Object.values(collapseTimers.current).forEach(clearTimeout);
        };
    }, []);

    const toggleEntry = (key: string) => {
        if (collapseTimers.current[key]) {
            clearTimeout(collapseTimers.current[key]);
            delete collapseTimers.current[key];
        }
        setExpandedEntries(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (stream.length === 0) return null;

    return (
        <PipelineContainer>
            {stream.map((entry, idx) => {
                const uniqueKey = `${entry.description}::${idx}`;
                const hasNextNamedEntry = !!(stream[idx + 1]?.description);
                return (
                    <StreamEntryComponent
                        key={uniqueKey}
                        entry={entry}
                        isLast={idx === stream.length - 1}
                        isLoading={isLoading}
                        expanded={expandedEntries[uniqueKey] ?? true}
                        onToggle={() => toggleEntry(uniqueKey)}
                        innerRef={el => { itemsInnerRefs.current[uniqueKey] = el; }}
                        rpcClient={rpcClient}
                        hasNextNamedEntry={hasNextNamedEntry}
                    />
                );
            })}
        </PipelineContainer>
    );
};

export default AgentStreamView;
