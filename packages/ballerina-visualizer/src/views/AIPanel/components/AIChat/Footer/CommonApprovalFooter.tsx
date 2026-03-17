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

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { FooterContainer } from "./index";
import { InlineButton } from "../../AgentStreamView/styles";

// ── Shared layout ─────────────────────────────────────────────────────────────

const ApprovalContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const PromptText = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
    margin-bottom: 4px;
    padding-left: 2px;
`;

// ── Plan / completion styles ───────────────────────────────────────────────────

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

// ── Web tool styles ────────────────────────────────────────────────────────────

const WebToolHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
`;

const WebToolContent = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family);
    word-break: break-all;
    padding-left: 2px;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 4px;
`;

// ── Types ──────────────────────────────────────────────────────────────────────

type PlanCompletionProps = {
    type: "plan" | "completion";
    onApprove: (enableAutoApprove: boolean) => void;
    onReject: (comment: string) => void;
    isSubmitting?: boolean;
};

type WebToolProps = {
    type: "web_tool";
    toolName: "web_search" | "web_fetch";
    content: string;
    onAllow: () => void;
    onDeny: () => void;
};

type CommonApprovalFooterProps = PlanCompletionProps | WebToolProps;

// ── Component ─────────────────────────────────────────────────────────────────

const CommonApprovalFooter: React.FC<CommonApprovalFooterProps> = (props) => {
    const [comment, setComment] = useState("");

    useEffect(() => {
        setComment("");
    }, [props.type]);

    if (props.type === "web_tool") {
        const { toolName, content, onAllow, onDeny } = props;
        const label = toolName === "web_search" ? "Web Search" : "Web Fetch";
        return (
            <FooterContainer>
                <ApprovalContainer>
                    <WebToolHeader>
                        <span className="codicon codicon-globe" />
                        {label}
                    </WebToolHeader>
                    <WebToolContent>{content}</WebToolContent>
                    <ButtonRow>
                        <InlineButton variant="primary" style={{ flex: 1, height: "28px" }} onClick={onAllow}>
                            Allow
                        </InlineButton>
                        <InlineButton variant="secondary" style={{ flex: 1, height: "28px" }} onClick={onDeny}>
                            Deny
                        </InlineButton>
                    </ButtonRow>
                </ApprovalContainer>
            </FooterContainer>
        );
    }

    // plan / completion
    const { type, onApprove, onReject, isSubmitting = false } = props;

    const promptText = type === "plan" ? "Does this plan look right?" : "Ready to continue?";
    const approveButtonText = type === "plan" ? "Start building" : "Approve";

    const handleRejectSubmit = () => {
        const trimmed = comment.trim();
        if (trimmed) {
            onReject(trimmed);
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

    return (
        <FooterContainer>
            <ApprovalContainer>
                <PromptText>{promptText}</PromptText>
                <ApproveButton onClick={() => onApprove(false)} disabled={isSubmitting}>
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
                        <span className="codicon codicon-send" />
                    </SendButton>
                </InputContainer>
            </ApprovalContainer>
        </FooterContainer>
    );
};

export default CommonApprovalFooter;
