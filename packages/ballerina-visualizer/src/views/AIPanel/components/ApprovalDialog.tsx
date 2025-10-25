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

const DialogOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const DialogContainer = styled.div`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 20px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const DialogHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const DialogTitle = styled.h3`
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
`;

const DialogMessage = styled.div`
    margin-bottom: 16px;
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
`;

const TaskList = styled.div`
    margin-bottom: 16px;
    max-height: 300px;
    overflow-y: auto;
`;

const TaskItem = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    margin-bottom: 8px;
    background-color: var(--vscode-textCodeBlock-background);
    border-radius: 4px;
    font-size: 13px;
`;

const TaskNumber = styled.span`
    color: var(--vscode-descriptionForeground);
    font-weight: 600;
    flex-shrink: 0;
`;

const TaskDescription = styled.span`
    flex: 1;
    color: var(--vscode-editor-foreground);
    line-height: 1.4;
`;

const CommentSection = styled.div`
    margin-bottom: 16px;
`;

const CommentLabel = styled.label`
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--vscode-editor-foreground);
    font-weight: 500;
`;

const CommentTextarea = styled.textarea`
    width: 100%;
    min-height: 80px;
    padding: 8px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
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

const ButtonGroup = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
`;

const Button = styled.button<{ variant?: "primary" | "secondary" }>`
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--vscode-editor-font-family);

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

export interface Task {
    id: string;
    description: string;
    status: "pending" | "in_progress" | "review" | "done" | "rejected";
}

interface ApprovalDialogProps {
    approvalType: "plan" | "completion";
    tasks: Task[];
    taskId?: string;
    message?: string;
    onApprove: (comment?: string) => void;
    onReject: (comment?: string) => void;
    onAddToWorkspace?: () => void;
}

type DialogState = "initial" | "rejecting";

const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
    approvalType,
    tasks,
    taskId,
    message,
    onApprove,
    onReject,
    onAddToWorkspace,
}) => {
    const [dialogState, setDialogState] = useState<DialogState>("initial");
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddingToWorkspace, setIsAddingToWorkspace] = useState(false);
    const [hasAddedToWorkspace, setHasAddedToWorkspace] = useState(false);
    const taskListRef = useRef<HTMLDivElement>(null);
    const highlightedTaskRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<number | null>(null);

    console.log("[ApprovalDialog] Props:", {
        approvalType,
        hasAddToWorkspace: !!onAddToWorkspace,
        taskCount: tasks.length,
    });

    const handleApprove = () => {
        setIsSubmitting(true);
        onApprove(undefined); // No comment when approving
    };

    const handleRejectClick = () => {
        // Switch to reject state to show comment field
        setDialogState("rejecting");
    };

    const handleRejectSubmit = () => {
        const trimmedComment = comment.trim();
        if (!trimmedComment) {
            // Comment is required for rejection
            return;
        }
        setIsSubmitting(true);
        onReject(trimmedComment);
    };

    const handleBack = () => {
        // Go back to initial state from rejecting state
        setDialogState("initial");
        setComment("");
    };

    const handleAddToWorkspace = async () => {
        if (onAddToWorkspace && !hasAddedToWorkspace) {
            setIsAddingToWorkspace(true);
            try {
                await onAddToWorkspace();
                setHasAddedToWorkspace(true); // Disable button after successful addition
            } catch (error) {
                console.error("[ApprovalDialog] Error adding to workspace:", error);
                // Don't set hasAddedToWorkspace on error, so user can retry
            } finally {
                setIsAddingToWorkspace(false);
            }
        }
    };

    // Function to scroll to highlighted task
    const scrollToHighlightedTask = () => {
        if (highlightedTaskRef.current) {
            highlightedTaskRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    };

    // Auto-scroll to highlighted task on mount
    useEffect(() => {
        if (taskId && highlightedTaskRef.current) {
            scrollToHighlightedTask();
        }
    }, [taskId]);

    // Handle user scroll - refocus after delay
    useEffect(() => {
        const taskList = taskListRef.current;
        if (!taskList || !taskId) return;

        const handleScroll = () => {
            // Clear existing timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Set new timeout to refocus after 3 seconds
            scrollTimeoutRef.current = setTimeout(() => {
                scrollToHighlightedTask();
            }, 3000);
        };

        taskList.addEventListener("scroll", handleScroll);

        return () => {
            taskList.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [taskId]);

    const getDialogTitle = () => {
        if (approvalType === "plan") {
            return "Review Implementation Plan";
        } else {
            const task = tasks.find((t) => t.id === taskId);
            return `Review Completed Task: ${task?.description || "Unknown Task"}`;
        }
    };

    const getDialogMessage = () => {
        if (message) {
            return message;
        }
        if (approvalType === "plan") {
            return "Please review the proposed implementation plan below. You can approve to proceed or reject with feedback for revisions.";
        } else {
            return "Please review the completed work. You can approve to continue or reject with feedback for corrections.";
        }
    };

    return (
        <DialogOverlay>
            <DialogContainer>
                <DialogHeader>
                    <span
                        className={`codicon ${
                            approvalType === "plan" ? "codicon-checklist" : "codicon-check-all"
                        }`}
                        style={{ fontSize: "18px" }}
                    ></span>
                    <DialogTitle>{getDialogTitle()}</DialogTitle>
                </DialogHeader>

                <DialogMessage>{getDialogMessage()}</DialogMessage>

                <TaskList ref={taskListRef}>
                    {tasks.map((task, index) => {
                        const isHighlighted = task.id === taskId;
                        return (
                            <TaskItem
                                key={task.id}
                                ref={isHighlighted ? highlightedTaskRef : null}
                                style={{
                                    backgroundColor: isHighlighted
                                        ? "var(--vscode-list-focusBackground)"
                                        : "var(--vscode-textCodeBlock-background)",
                                    border: isHighlighted
                                        ? "1px solid var(--vscode-focusBorder)"
                                        : "none",
                                }}
                            >
                                <TaskNumber>{index + 1}.</TaskNumber>
                                <TaskDescription>
                                    {task.description}
                                    {task.status === "done" && (
                                        <span
                                            style={{
                                                marginLeft: "8px",
                                                color: "var(--vscode-testing-iconPassed)",
                                            }}
                                        >
                                            <span className="codicon codicon-check"></span>
                                        </span>
                                    )}
                                    {task.status === "review" && (
                                        <span
                                            style={{
                                                marginLeft: "8px",
                                                color: "var(--vscode-descriptionForeground)",
                                            }}
                                        >
                                            <span className="codicon codicon-eye"></span>
                                        </span>
                                    )}
                                    {task.status === "in_progress" && (
                                        <span
                                            style={{
                                                marginLeft: "8px",
                                                color: "var(--vscode-progressBar-background)",
                                            }}
                                        >
                                            <span className="codicon codicon-sync codicon-modifier-spin"></span>
                                        </span>
                                    )}
                                </TaskDescription>
                            </TaskItem>
                        );
                    })}
                </TaskList>

                {dialogState === "rejecting" && (
                    <CommentSection>
                        <CommentLabel>
                            Please provide feedback for rejection (required):
                        </CommentLabel>
                        <CommentTextarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Enter the reason for rejection and what needs to be changed..."
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </CommentSection>
                )}

                <ButtonGroup>
                    {dialogState === "initial" ? (
                        <>
                            {approvalType === "completion" && onAddToWorkspace && (
                                <Button
                                    variant="secondary"
                                    onClick={handleAddToWorkspace}
                                    disabled={isSubmitting || isAddingToWorkspace || hasAddedToWorkspace}
                                    style={{ marginRight: "auto" }}
                                >
                                    <span
                                        className={`codicon ${hasAddedToWorkspace ? "codicon-check" : "codicon-cloud-download"}`}
                                        style={{ marginRight: "6px" }}
                                    ></span>
                                    {isAddingToWorkspace ? "Adding..." : hasAddedToWorkspace ? "Added" : "Add to Workspace"}
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                onClick={handleRejectClick}
                                disabled={isSubmitting || isAddingToWorkspace}
                            >
                                <span className="codicon codicon-error" style={{ marginRight: "6px" }}></span>
                                Reject
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleApprove}
                                disabled={isSubmitting || isAddingToWorkspace}
                            >
                                <span className="codicon codicon-check" style={{ marginRight: "6px" }}></span>
                                Approve
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="secondary"
                                onClick={handleBack}
                                disabled={isSubmitting}
                            >
                                <span className="codicon codicon-arrow-left" style={{ marginRight: "6px" }}></span>
                                Back
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleRejectSubmit}
                                disabled={isSubmitting || !comment.trim()}
                            >
                                <span className="codicon codicon-error" style={{ marginRight: "6px" }}></span>
                                Submit Rejection
                            </Button>
                        </>
                    )}
                </ButtonGroup>
            </DialogContainer>
        </DialogOverlay>
    );
};

export default ApprovalDialog;
