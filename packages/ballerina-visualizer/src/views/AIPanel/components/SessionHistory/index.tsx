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
import styled from "@emotion/styled";
import { ThreadSummary } from "@wso2/ballerina-core";
import { Codicon } from "@wso2/ui-toolkit";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
    const diffMs = Date.now() - ts;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffSec < 60) { return "Just now"; }
    if (diffMin < 60) { return `${diffMin}m`; }
    if (diffHr < 24) { return `${diffHr}h`; }
    if (diffDay < 7) { return `${diffDay}d`; }
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupByDate(threads: ThreadSummary[]): { label: string; items: ThreadSummary[] }[] {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - 6);
    const groups: Record<string, ThreadSummary[]> = { TODAY: [], "PAST WEEK": [], OLDER: [] };
    for (const t of threads) {
        if (t.updatedAt >= startOfToday.getTime()) { groups.TODAY.push(t); }
        else if (t.updatedAt >= startOfWeek.getTime()) { groups["PAST WEEK"].push(t); }
        else { groups.OLDER.push(t); }
    }
    return (["TODAY", "PAST WEEK", "OLDER"] as const)
        .filter(k => groups[k].length > 0)
        .map(label => ({ label, items: groups[label] }));
}

// ── Styled components ─────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 200;
`;

const DropdownContainer = styled.div`
    position: absolute;
    top: 40px;
    right: 0;
    width: 320px;
    max-height: 420px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 201;
    font-family: var(--vscode-font-family);
`;

const SearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
`;

const SearchInput = styled.input`
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--vscode-foreground);
    font-size: 12px;
    font-family: var(--vscode-font-family);
    &::placeholder { color: var(--vscode-descriptionForeground); }
`;

const SessionList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
`;

const GroupLabel = styled.div`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--vscode-descriptionForeground);
    padding: 8px 12px 4px;
`;

const SessionItem = styled.div<{ isActive: boolean }>(({ isActive }: { isActive: boolean }) => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    cursor: "pointer",
    position: "relative" as const,
    background: isActive ? "var(--vscode-list-activeSelectionBackground)" : "transparent",
    color: isActive ? "var(--vscode-list-activeSelectionForeground)" : "var(--vscode-foreground)",
    outline: "none",
    "&:hover": {
        background: isActive ? "var(--vscode-list-activeSelectionBackground)" : "var(--vscode-list-hoverBackground)",
    },
    "&:hover .delete-btn, &:focus-within .delete-btn": { opacity: 1 },
    "&:focus-visible": { outline: "1px solid var(--vscode-focusBorder)" },
}));

const ActiveDot = styled.div<{ isActive: boolean }>(({ isActive }: { isActive: boolean }) => ({
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: isActive ? "var(--vscode-button-background)" : "var(--vscode-descriptionForeground)",
    flexShrink: 0,
    opacity: isActive ? 1 : 0.5,
}));

const SessionName = styled.span`
    flex: 1;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const SessionTime = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
`;

const DeleteBtn = styled.button`
    opacity: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px 4px;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    border-radius: 3px;
    flex-shrink: 0;
    transition: opacity 0.1s;
    &:hover, &:focus-visible { color: var(--vscode-errorForeground); background: var(--vscode-list-hoverBackground); opacity: 1; }
`;

const NewChatRow = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: none;
    border-top: 1px solid var(--vscode-panel-border);
    background: transparent;
    color: var(--vscode-button-foreground, var(--vscode-foreground));
    font-size: 12px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    width: 100%;
    text-align: left;
    flex-shrink: 0;
    &:hover { background: var(--vscode-list-hoverBackground); }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export interface SessionHistoryDropdownProps {
    threads: ThreadSummary[];
    onNewChat: () => void;
    onSwitch: (threadId: string) => void;
    onDelete: (threadId: string) => void;
    onClose: () => void;
}

export function SessionHistoryDropdown({
    threads,
    onNewChat,
    onSwitch,
    onDelete,
    onClose,
}: SessionHistoryDropdownProps): JSX.Element {
    const [search, setSearch] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const filtered = search.trim()
        ? threads.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
        : threads;

    const groups = groupByDate(filtered);

    const handleSwitch = (threadId: string) => {
        onSwitch(threadId);
        onClose();
    };

    const handleDelete = (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation();
        onDelete(threadId);
    };

    const handleNewChat = () => {
        onNewChat();
        onClose();
    };

    return (
        <>
            <Overlay onClick={onClose} />
            <DropdownContainer onClick={e => e.stopPropagation()}>
                <SearchRow>
                    <Codicon name="search" sx={{ fontSize: "13px", color: "var(--vscode-descriptionForeground)", flexShrink: 0 }} />
                    <SearchInput
                        ref={inputRef}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search sessions..."
                    />
                </SearchRow>

                <SessionList>
                    {groups.length === 0 && (
                        <GroupLabel style={{ fontWeight: 400, textTransform: "none" }}>No sessions found</GroupLabel>
                    )}
                    {groups.map(group => (
                        <div key={group.label}>
                            <GroupLabel>{group.label}</GroupLabel>
                            {group.items.map(thread => (
                                <SessionItem
                                    key={thread.id}
                                    isActive={thread.isActive}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleSwitch(thread.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSwitch(thread.id); } }}
                                >
                                    <ActiveDot isActive={thread.isActive} />
                                    <SessionName title={thread.name}>{thread.name}</SessionName>
                                    <SessionTime>{formatRelativeTime(thread.updatedAt)}</SessionTime>
                                    <DeleteBtn
                                        className="delete-btn"
                                        onClick={e => handleDelete(e, thread.id)}
                                        // Keep keyboard activation of delete from also bubbling to
                                        // SessionItem's onKeyDown, which would switch threads. The native
                                        // button still activates (delete) on Enter/Space itself.
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); } }}
                                        title="Delete session"
                                    >
                                        <Codicon name="trash" sx={{ fontSize: "12px" }} />
                                    </DeleteBtn>
                                </SessionItem>
                            ))}
                        </div>
                    ))}
                </SessionList>

                <NewChatRow onClick={handleNewChat}>
                    <Codicon name="add" sx={{ fontSize: "13px" }} />
                    New Chat
                </NewChatRow>
            </DropdownContainer>
        </>
    );
}
