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

import styled from "@emotion/styled";
import React, { useState, useEffect, useRef } from "react";
import { Task } from "@wso2/ballerina-core";

// ── Animations ────────────────────────────────────────────────────────────────

// ── Container ─────────────────────────────────────────────────────────────────

const Container = styled.div`
    display: flex;
    flex-direction: column;
    margin: 10px 0 12px 0;
    font-family: var(--vscode-font-family);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 5px 8px;
`;

// ── Header row ────────────────────────────────────────────────────────────────

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
    cursor: pointer;
    user-select: none;
    padding: 0 2px;

    &:hover {
        opacity: 0.8;
    }
`;

const ChevronIcon = styled.span<{ expanded: boolean }>`
    transition: transform 0.2s ease;
    transform: ${(props: { expanded: boolean }) => props.expanded ? "rotate(90deg)" : "rotate(0deg)"};
    display: flex;
    align-items: center;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    flex-shrink: 0;
`;

const HeaderLabel = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-editor-foreground);
    flex: 1;
`;

const CollapsedActiveTask = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 220px;
    flex: 1;
`;

const ApprovalLabel = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-descriptionForeground);
    opacity: 0.75;
    flex-shrink: 0;
`;

const ApprovalComment = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
`;

// ── Task list (two-column: rail + content) ────────────────────────────────────

const TaskList = styled.div`
    display: flex;
    flex-direction: column;
    margin-left: 8px;
    overflow-y: auto;
    max-height: 200px;
    padding-bottom: 4px;
`;

const TaskBlock = styled.div`
    display: flex;
    flex-direction: row;
`;

const TaskRail = styled.div<{ isLast: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 16px;
    flex-shrink: 0;

    &::before {
        content: '';
        position: absolute;
        top: 10px;
        bottom: ${(props: { isLast: boolean }) => props.isLast ? "4px" : "0"};
        left: 50%;
        transform: translateX(-50%);
        width: 1px;
        background-color: var(--vscode-panel-border);
        opacity: 0.8;
    }
`;

const DotWrapper = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 20px;
    flex-shrink: 0;
    background-color: var(--vscode-editor-background);
`;

const TaskContent = styled.div`
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    padding-left: 5px;
    min-height: 20px;
`;

const TaskLabel = styled.span<{ status: string }>`
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    opacity: ${(props: { status: string }) =>
        props.status === "completed" ? 0.5 : 1};
`;

// ── Node indicator ────────────────────────────────────────────────────────────

const Bullet = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background-color: var(--vscode-descriptionForeground);
    opacity: 0.85;
`;

// ── Component ─────────────────────────────────────────────────────────────────

interface TodoSectionProps {
    tasks: Task[];
    message?: string;
    initialExpanded?: boolean;
    approvalStatus?: "approved" | "revised";
    approvalComment?: string;
}

const TodoSection: React.FC<TodoSectionProps> = ({
    tasks,
    initialExpanded = true,
    approvalStatus,
    approvalComment,
}) => {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const inProgressRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<number | null>(null);

    const inProgressTask = tasks.find(t => t.status === "in_progress");
    const hasInProgress = !!inProgressTask;

    // Collapse once when approval status arrives
    useEffect(() => {
        if (approvalStatus) {
            setIsExpanded(false);
        }
    }, [approvalStatus]);

    // Scroll to in-progress task when expanded
    useEffect(() => {
        if (isExpanded && hasInProgress && inProgressRef.current) {
            inProgressRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [isExpanded, inProgressTask?.description]);

    useEffect(() => {
        const list = listRef.current;
        if (!list || !hasInProgress) return;
        const handleScroll = () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
                if (inProgressRef.current) {
                    inProgressRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
            }, 3000);
        };
        list.addEventListener("scroll", handleScroll);
        return () => {
            list.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, [hasInProgress, inProgressTask?.description]);

    const renderDot = (_status: string) => <Bullet />;

    return (
        <Container>
            {/* Header row */}
            <HeaderRow onClick={() => setIsExpanded(prev => !prev)}>
                <ChevronIcon expanded={isExpanded}>
                    <span className="codicon codicon-chevron-right" />
                </ChevronIcon>
                {approvalStatus ? (
                    <>
                        <ApprovalLabel>
                            {approvalStatus === "approved" ? "Plan approved" : "Plan revised"}
                        </ApprovalLabel>
                        {approvalStatus === "revised" && approvalComment && (
                            <ApprovalComment title={approvalComment}>— {approvalComment}</ApprovalComment>
                        )}
                    </>
                ) : (
                    <>
                        <HeaderLabel>Tasks</HeaderLabel>
                        {!isExpanded && inProgressTask && (
                            <CollapsedActiveTask>{inProgressTask.description}</CollapsedActiveTask>
                        )}
                    </>
                )}
            </HeaderRow>

            {/* Task list */}
            {isExpanded && (
                <TaskList ref={listRef}>
                    {tasks.map((task, idx) => {
                        const isLast = idx === tasks.length - 1;
                        const isInProgress = task.status === "in_progress";
                        return (
                            <TaskBlock
                                key={task.description}
                                ref={isInProgress ? inProgressRef : null}
                            >
                                <TaskRail isLast={isLast}>
                                    <DotWrapper>
                                        {renderDot(task.status)}
                                    </DotWrapper>
                                </TaskRail>
                                <TaskContent>
                                    <TaskLabel status={task.status}>
                                        {task.description}
                                    </TaskLabel>
                                </TaskContent>
                            </TaskBlock>
                        );
                    })}
                </TaskList>
            )}
        </Container>
    );
};

export default TodoSection;
