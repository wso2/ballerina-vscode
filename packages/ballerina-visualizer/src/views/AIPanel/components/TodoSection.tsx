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

const TodoContainer = styled.div<{ isNew?: boolean }>`
    background-color: ${(props: { isNew?: boolean }) =>
        props.isNew ? 'rgba(128, 128, 128, 0.3)' : 'transparent'};
    border: none;
    border-radius: 0;
    padding: 0;
    margin: 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    min-height: 24px;
    transition: background-color 0.3s ease-out;
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

const ApprovalSection = styled.div`
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--vscode-panel-border);
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
`;

const Button = styled.button<{ variant?: "primary" | "secondary" }>`
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--vscode-editor-font-family);
    display: flex;
    align-items: center;
    gap: 4px;

    ${(props: { variant?: "primary" | "secondary" }) =>
        props.variant === "primary"
            ? `
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);

        &:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    `
            : `
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);

        &:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    `}

    &:active {
        opacity: 0.8;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const CommentTextarea = styled.textarea`
    width: 100%;
    min-height: 60px;
    padding: 6px;
    margin-bottom: 8px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    resize: vertical;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }

    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
`;

const CommentLabel = styled.label`
    display: block;
    margin-bottom: 6px;
    font-size: 11px;
    color: var(--vscode-editor-foreground);
    font-weight: 500;
`;

interface TodoSectionProps {
    tasks: Task[];
    message?: string;
    onApprove?: (comment?: string) => void;
    onReject?: (comment?: string) => void;
    approvalType?: "plan" | "completion";
}

const getStatusIcon = (status: string): { className: string; icon: string } => {
    switch (status) {
        case "in_progress":
            return { className: "in_progress", icon: "codicon-sync" };
        case "review":
            return { className: "review", icon: "codicon-eye" };
        case "completed":
            return { className: "completed", icon: "codicon-check" };
        case "pending":
        default:
            return { className: "pending", icon: "codicon-circle-outline" };
    }
};

const TodoSection: React.FC<TodoSectionProps> = ({ tasks, message, onApprove, onReject, approvalType }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isNew, setIsNew] = useState(false);
    const [showRejectComment, setShowRejectComment] = useState(false);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inProgressRef = useRef<HTMLDivElement>(null);
    const todoListRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<number | null>(null);
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const inProgressTask = tasks.find((t) => t.status === "in_progress");
    const allCompleted = completedCount === tasks.length;
    const hasInProgress = !!inProgressTask;
    const needsApproval = !!approvalType;

    // Highlight container only for plan approval, not task completion approval
    useEffect(() => {
        if (approvalType === "plan") {
            // Highlight entire container for plan approval
            setIsNew(true);
        } else {
            // No container highlight for task approval (task itself has blue border)
            setIsNew(false);
        }

        // Reset submission state when approval type changes
        setIsSubmitting(false);
        setShowRejectComment(false);
        setRejectComment("");
    }, [approvalType]);

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
    }, [isExpanded, inProgressTask?.description]);

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
    }, [hasInProgress, inProgressTask?.description]);

    // Determine status text
    const getStatusText = () => {
        if (allCompleted) return "completed";
        if (needsApproval) return "awaiting approval";
        if (hasInProgress) return "in progress";
        return "ongoing";
    };

    const handleApprove = () => {
        if (onApprove) {
            setIsSubmitting(true);
            onApprove(undefined);
        }
    };

    const handleRejectClick = () => {
        setShowRejectComment(true);
    };

    const handleRejectSubmit = () => {
        const trimmedComment = rejectComment.trim();
        if (!trimmedComment || !onReject) {
            return;
        }
        setIsSubmitting(true);
        onReject(trimmedComment);
    };

    const handleRejectCancel = () => {
        setShowRejectComment(false);
        setRejectComment("");
    };

    return (
        <TodoContainer isNew={isNew}>
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
                            const isReview = task.status === "review";
                            return (
                                <TodoItem
                                    key={task.description}
                                    status={task.status}
                                    ref={isInProgress ? inProgressRef : null}
                                    style={{
                                        backgroundColor: isReview
                                            ? "rgba(128, 128, 128, 0.3)"
                                            : undefined,
                                        border: isReview
                                            ? "var(--vscode-list-focusBackground)"
                                            : undefined,
                                    }}
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
            {needsApproval && (
                <ApprovalSection>
                    {showRejectComment ? (
                        <>
                            <CommentLabel>
                                Provide feedback for revision (required):
                            </CommentLabel>
                            <CommentTextarea
                                value={rejectComment}
                                onChange={(e) => setRejectComment(e.target.value)}
                                placeholder="Enter what needs to be changed..."
                                disabled={isSubmitting}
                                autoFocus
                            />
                            <ButtonGroup>
                                <Button
                                    variant="secondary"
                                    onClick={handleRejectCancel}
                                    disabled={isSubmitting}
                                >
                                    <span className="codicon codicon-arrow-left"></span>
                                    Back
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleRejectSubmit}
                                    disabled={isSubmitting || !rejectComment.trim()}
                                >
                                    <span className="codicon codicon-edit"></span>
                                    Submit Revision
                                </Button>
                            </ButtonGroup>
                        </>
                    ) : (
                        <ButtonGroup>
                            <Button
                                variant="secondary"
                                onClick={handleRejectClick}
                                disabled={isSubmitting}
                            >
                                <span className="codicon codicon-edit"></span>
                                Revise
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleApprove}
                                disabled={isSubmitting}
                            >
                                <span className="codicon codicon-check"></span>
                                {approvalType === "completion" ? "Continue" : "Approve"}
                            </Button>
                        </ButtonGroup>
                    )}
                </ApprovalSection>
            )}
        </TodoContainer>
    );
};

export default TodoSection;
