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

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const TodoContainer = styled.div`
    background-color: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    margin: 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    min-height: 24px;
`;

const TodoHeader = styled.div<{ clickable?: boolean }>`
    font-weight: 600;
    margin-bottom: ${(props: { clickable?: boolean }) => props.clickable ? '0' : '6px'};
    padding-bottom: ${(props: { clickable?: boolean }) => props.clickable ? '0' : '4px'};
    border-bottom: ${(props: { clickable?: boolean }) =>
        props.clickable ? 'none' : '1px solid var(--vscode-panel-border)'};
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: ${(props: { clickable?: boolean }) => props.clickable ? 'pointer' : 'default'};
    user-select: none;
    padding: 2px;
    border-radius: 3px;

    &:hover {
        background-color: ${(props: { clickable?: boolean }) =>
            props.clickable ? 'var(--vscode-list-hoverBackground)' : 'transparent'};
    }
`;

const ChevronIcon = styled.span<{ expanded: boolean }>`
    transition: transform 0.2s ease;
    transform: ${(props: { expanded: boolean }) => props.expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
    display: flex;
    align-items: center;
`;

const MinimalTaskInfo = styled.span`
    color: var(--vscode-descriptionForeground);
    font-weight: 400;
    font-size: 11px;
    margin-left: 4px;
`;

const TodoList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    max-height: 200px;
`;

const TodoItem = styled.div<{ status: string }>`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: 3px;
    background-color: ${(props: { status: string }) =>
        props.status === "completed"
            ? "var(--vscode-list-hoverBackground)"
            : "transparent"};
    opacity: ${(props: { status: string }) => (props.status === "completed" ? 0.7 : 1)};
    transition: all 0.2s ease;
`;

const TodoIcon = styled.span<{ status: string }>`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;

    &.pending {
        .codicon {
            color: var(--vscode-descriptionForeground);
        }
    }

    &.in_progress {
        .codicon {
            color: var(--vscode-charts-blue);
            animation: ${spin} 1s linear infinite;
        }
    }

    &.completed {
        .codicon {
            color: var(--vscode-testing-iconPassed);
        }
    }
`;

const TodoText = styled.span<{ status: string }>`
    flex: 1;
    text-decoration: ${(props: { status: string }) =>
        props.status === "completed" ? "line-through" : "none"};
    line-height: 16px;
`;

const TodoNumber = styled.span`
    color: var(--vscode-descriptionForeground);
    font-weight: 600;
    margin-right: 2px;
`;

export interface Task {
    id: string;
    description: string;
    status: "pending" | "in_progress" | "completed";
}

interface TodoSectionProps {
    tasks: Task[];
    message?: string;
}

const getStatusIcon = (status: string): { className: string; icon: string } => {
    switch (status) {
        case "in_progress":
            return { className: "in_progress", icon: "codicon-sync" };
        case "completed":
            return { className: "completed", icon: "codicon-check" };
        case "pending":
        default:
            return { className: "pending", icon: "codicon-circle-outline" };
    }
};

const TodoSection: React.FC<TodoSectionProps> = ({ tasks, message }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const inProgressRef = useRef<HTMLDivElement>(null);
    const todoListRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<number | null>(null);
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const inProgressTask = tasks.find((t) => t.status === "in_progress");
    const allCompleted = completedCount === tasks.length;
    const hasInProgress = !!inProgressTask;

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Function to scroll to in-progress task
    const scrollToInProgress = () => {
        if (inProgressRef.current) {
            inProgressRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    };

    // Auto-scroll to in-progress task
    useEffect(() => {
        if (isExpanded && hasInProgress) {
            scrollToInProgress();
        }
    }, [isExpanded, inProgressTask?.id]);

    // Handle user scroll - refocus after delay
    useEffect(() => {
        const todoList = todoListRef.current;
        if (!todoList || !hasInProgress) return;

        const handleScroll = () => {
            // Clear existing timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Set new timeout to refocus after 3 seconds
            scrollTimeoutRef.current = setTimeout(() => {
                scrollToInProgress();
            }, 3000);
        };

        todoList.addEventListener("scroll", handleScroll);

        return () => {
            todoList.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [hasInProgress, inProgressTask?.id]);

    // Determine status text
    const getStatusText = () => {
        if (allCompleted) return "completed";
        if (hasInProgress) return "in progress";
        return "ongoing";
    };

    return (
        <TodoContainer>
            <TodoHeader clickable onClick={toggleExpanded}>
                <ChevronIcon expanded={isExpanded}>
                    <span className="codicon codicon-chevron-right"></span>
                </ChevronIcon>
                <span className="codicon codicon-tasklist"></span>
                <span>
                    Implementation Tasks ({completedCount}/{tasks.length}{" "}
                    {getStatusText()})
                </span>
                {!isExpanded && inProgressTask && (
                    <MinimalTaskInfo>
                        &gt; {inProgressTask.description}
                    </MinimalTaskInfo>
                )}
            </TodoHeader>
            {isExpanded && (
                <>
                    {message && (
                        <div
                            style={{
                                marginTop: "6px",
                                marginBottom: "6px",
                                fontSize: "11px",
                                color: "var(--vscode-descriptionForeground)",
                                fontStyle: "italic",
                            }}
                        >
                            {message}
                        </div>
                    )}
                    <TodoList style={{ marginTop: "6px" }} ref={todoListRef}>
                        {tasks.map((task, index) => {
                            const statusInfo = getStatusIcon(task.status);
                            const isInProgress = task.status === "in_progress";
                            return (
                                <TodoItem
                                    key={task.id}
                                    status={task.status}
                                    ref={isInProgress ? inProgressRef : null}
                                >
                                    <TodoIcon status={task.status} className={statusInfo.className}>
                                        <span className={`codicon ${statusInfo.icon}`}></span>
                                    </TodoIcon>
                                    <TodoText status={task.status}>
                                        <TodoNumber>{index + 1}.</TodoNumber>
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
