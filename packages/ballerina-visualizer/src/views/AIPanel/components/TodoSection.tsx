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

import { keyframes } from "@emotion/css";
import styled from "@emotion/styled";
import React, { useState, useEffect, useRef } from "react";
import { Task } from "@wso2/ballerina-core";

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const TodoContainer = styled.div`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 8px 10px;
    margin: 6px 0;
    font-family: var(--vscode-font-family);
    font-size: 12px;
    color: var(--vscode-editor-foreground);
`;

const TodoHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    padding: 2px 2px 6px 2px;
    border-bottom: 1px solid var(--vscode-widget-border);
    transition: opacity 0.15s ease;

    &:hover {
        opacity: 0.8;
    }
`;

const ChevronIcon = styled.span<{ expanded: boolean }>`
    transition: transform 0.2s ease;
    transform: ${(props: { expanded: boolean }) => props.expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
    display: flex;
    align-items: center;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
`;

const HeaderTitle = styled.span`
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.3px;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    flex: 1;
`;

const StatusBadge = styled.span<{ status: "building" | "done" | "ready" }>`
    font-size: 10px;
    font-weight: 500;
    padding: 1px 7px;
    border-radius: 10px;
    background-color: ${(props: { status: "building" | "done" | "ready" }) =>
        props.status === "done"
            ? "rgba(35, 134, 54, 0.15)"
            : props.status === "building"
            ? "rgba(75, 110, 175, 0.15)"
            : "rgba(128, 128, 128, 0.12)"};
    color: ${(props: { status: "building" | "done" | "ready" }) =>
        props.status === "done"
            ? "var(--vscode-testing-iconPassed)"
            : props.status === "building"
            ? "var(--vscode-charts-blue)"
            : "var(--vscode-descriptionForeground)"};
`;

const CollapsedActiveTask = styled.span`
    color: var(--vscode-charts-blue);
    font-size: 11px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 220px;
`;

const TodoList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
    max-height: 250px;
    padding-top: 4px;
`;

const TodoItem = styled.div<{ status: string }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 6px;
    border-radius: 4px;
    background-color: ${(props: { status: string }) =>
        props.status === "in_progress"
            ? "rgba(75, 110, 175, 0.1)"
            : "transparent"};
    opacity: ${(props: { status: string }) => props.status === "completed" ? 0.5 : 1};
    transition: background-color 0.2s ease, opacity 0.2s ease;
    border-left: 2px solid ${(props: { status: string }) =>
        props.status === "in_progress"
            ? "var(--vscode-charts-blue)"
            : props.status === "completed"
            ? "var(--vscode-testing-iconPassed)"
            : "transparent"};
`;

const TodoIcon = styled.span<{ status: string }>`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;

    &.pending .codicon {
        color: var(--vscode-descriptionForeground);
        opacity: 0.5;
    }

    &.in_progress .codicon {
        color: #4d9cf8;
        animation: ${spin} 0.8s linear infinite;
        font-size: 13px;
    }

    &.in_progress_static .codicon {
        color: #4d9cf8;
        font-size: 13px;
    }

    &.completed .codicon {
        color: var(--vscode-testing-iconPassed);
    }

    &.review .codicon {
        color: var(--vscode-charts-orange);
    }
`;

const TodoText = styled.span<{ status: string }>`
    flex: 1;
    font-size: 12px;
    line-height: 16px;
    text-decoration: ${(props: { status: string }) =>
        props.status === "completed" ? "line-through" : "none"};
    color: ${(props: { status: string }) =>
        props.status === "in_progress"
            ? "var(--vscode-editor-foreground)"
            : "var(--vscode-descriptionForeground)"};
`;

const MessageHint = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    padding: 5px 4px 2px 4px;
`;


interface TodoSectionProps {
    tasks: Task[];
    message?: string;
    isLoading?: boolean;
}

const getStatusIcon = (status: string, isLoading: boolean): { className: string; icon: string } => {
    switch (status) {
        case "in_progress":
            return { className: isLoading ? "in_progress" : "in_progress_static", icon: "codicon-loading" };
        case "review":
            return { className: "review", icon: "codicon-eye" };
        case "completed":
            return { className: "completed", icon: "codicon-check" };
        case "pending":
        default:
            return { className: "pending", icon: "codicon-circle-outline" };
    }
};

const TodoSection: React.FC<TodoSectionProps> = ({ tasks, message, isLoading = false }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const inProgressRef = useRef<HTMLDivElement>(null);
    const todoListRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<number | null>(null);
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const inProgressTask = tasks.find((t) => t.status === "in_progress");
    const allCompleted = completedCount === tasks.length;
    const hasInProgress = !!inProgressTask;

    const toggleExpanded = () => setIsExpanded(!isExpanded);

    const scrollToInProgress = () => {
        if (inProgressRef.current) {
            inProgressRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    };

    useEffect(() => {
        if (isExpanded && hasInProgress) {
            scrollToInProgress();
        }
    }, [isExpanded, inProgressTask?.description]);

    useEffect(() => {
        const todoList = todoListRef.current;
        if (!todoList || !hasInProgress) return;

        const handleScroll = () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => scrollToInProgress(), 3000);
        };

        todoList.addEventListener("scroll", handleScroll);
        return () => {
            todoList.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, [hasInProgress, inProgressTask?.description]);

    const badgeStatus: "building" | "done" | "ready" =
        allCompleted ? "done" : (hasInProgress || isLoading) ? "building" : "ready";

    const badgeLabel =
        allCompleted ? `Done` : hasInProgress ? `${completedCount}/${tasks.length}` : `${completedCount}/${tasks.length}`;

    return (
        <TodoContainer>
            <TodoHeader onClick={toggleExpanded}>
                <ChevronIcon expanded={isExpanded}>
                    <span className="codicon codicon-chevron-right"></span>
                </ChevronIcon>
                <HeaderTitle>Plan</HeaderTitle>
                {!isExpanded && inProgressTask && (
                    <CollapsedActiveTask>{inProgressTask.description}</CollapsedActiveTask>
                )}
                <StatusBadge status={badgeStatus}>{badgeLabel}</StatusBadge>
            </TodoHeader>
            {isExpanded && (
                <>
                    {message && <MessageHint>{message}</MessageHint>}
                    <TodoList ref={todoListRef}>
                        {tasks.map((task) => {
                            const statusInfo = getStatusIcon(task.status, isLoading);
                            const isInProgress = task.status === "in_progress";
                            const isReview = task.status === "review";
                            return (
                                <TodoItem
                                    key={task.description}
                                    status={task.status}
                                    ref={isInProgress ? inProgressRef : null}
                                    style={isReview ? {
                                        backgroundColor: "rgba(128, 128, 128, 0.15)",
                                        borderLeft: "2px solid var(--vscode-charts-orange)",
                                    } : undefined}
                                >
                                    <TodoIcon status={task.status} className={statusInfo.className}>
                                        <span className={`codicon ${statusInfo.icon}`}></span>
                                    </TodoIcon>
                                    <TodoText status={task.status}>
                                        {task.description}
                                    </TodoText>
                                </TodoItem>
                            );
                        })}
                    </TodoList>
                </>
            )}
        </TodoContainer>
    );
};

export default TodoSection;
