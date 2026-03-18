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

// Matches the InputContainer styling — same border, radius, padding, height — so the
// two elements look like a unified stacked group.
const ApproveButton = styled.button`
    display: flex;
    align-items: center;
    width: 100%;
    height: 36px;
    box-sizing: border-box;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 500;
    font-family: var(--vscode-font-family);
    text-align: left;
    border-radius: 4px;
    border: 1px solid var(--vscode-input-border);
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    cursor: pointer;

    &:hover:not(:disabled) {
        background-color: var(--vscode-button-hoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

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
    padding-left: 2px;
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
    font-family: var(--vscode-font-family);
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
        setComment("");
    }, [approvalType]);

    const handleApprove = () => {
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

    const promptText = approvalType === "plan"
        ? "Does this plan look right?"
        : "Ready to continue?";

    const approveButtonText = approvalType === "plan" ? "Start building" : "Approve";

    return (
        <FooterContainer>
            <ApprovalContainer>
                <PromptText>{promptText}</PromptText>
                <ApproveButton
                    onClick={handleApprove}
                    disabled={isSubmitting}
                >
                    {approveButtonText}
                </ApproveButton>
                <InputContainer>
                    <Input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="What should be different?"
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
            </ApprovalContainer>
        </FooterContainer>
    );
};

export default ApprovalFooter;
