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

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { FooterContainer } from "./index";

const ApprovalContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const PromptText = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-editor-foreground);
    margin-bottom: 4px;
`;

const ButtonsColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Button = styled.button<{ variant?: "primary" | "secondary" }>`
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 500;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--vscode-editor-font-family);
    white-space: nowrap;
    width: 100%;
    text-align: left;

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

const InputContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    padding: 8px 14px;
    transition: border-color 0.2s ease;
    height: 36px;
    box-sizing: border-box;

    &:focus-within {
        border-color: var(--vscode-focusBorder);
    }
`;

const Input = styled.input`
    flex: 1;
    background: transparent;
    border: none;
    color: var(--vscode-input-foreground);
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    outline: none;
    padding: 0;

    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
`;

const SendButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-icon-foreground);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: background-color 0.2s ease;

    &:hover:not(:disabled) {
        background-color: var(--vscode-toolbar-hoverBackground);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

type ApprovalType = "plan" | "completion";

interface ApprovalFooterProps {
    approvalType: ApprovalType;
    onApprove: (enableAutoApprove: boolean) => void;
    onReject: (comment: string) => void;
    isSubmitting?: boolean;
}

const ApprovalFooter: React.FC<ApprovalFooterProps> = ({
    approvalType,
    onApprove,
    onReject,
    isSubmitting = false,
}) => {
    const [comment, setComment] = useState("");

    useEffect(() => {
        // Reset comment when approval type changes
        setComment("");
    }, [approvalType]);

    const handleApproveWithAutoApprove = () => {
        onApprove(true);
    };

    const handleApproveManually = () => {
        onApprove(false);
    };

    const handleRejectSubmit = () => {
        const trimmedComment = comment.trim();
        if (trimmedComment) {
            onReject(trimmedComment);
            setComment("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (comment.trim()) {
                handleRejectSubmit();
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setComment(e.target.value);
    };

    const promptText = approvalType === "plan"
        ? "Accept this plan?"
        : "Approve this task?";

    const primaryButtonText = approvalType === "plan"
        ? "Yes and auto-approve tasks"
        : "Yes and don't ask again";

    const secondaryButtonText = "Yes";

    const placeholderText = "Or describe what needs to change...";

    return (
        <FooterContainer>
            <ApprovalContainer>
                <PromptText>{promptText}</PromptText>
                <ButtonsColumn>
                    <Button
                        variant="primary"
                        onClick={handleApproveWithAutoApprove}
                        disabled={isSubmitting}
                    >
                        {primaryButtonText}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleApproveManually}
                        disabled={isSubmitting}
                    >
                        {secondaryButtonText}
                    </Button>
                    <InputContainer>
                        <Input
                            type="text"
                            value={comment}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholderText}
                            disabled={isSubmitting}
                        />
                        <SendButton
                            onClick={handleRejectSubmit}
                            disabled={!comment.trim() || isSubmitting}
                            title="Request Revision"
                        >
                            <span className="codicon codicon-send"></span>
                        </SendButton>
                    </InputContainer>
                </ButtonsColumn>
            </ApprovalContainer>
        </FooterContainer>
    );
};

export default ApprovalFooter;
