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
import { keyframes } from "@emotion/css";
import AIChatInput, { AIChatInputRef, TagOptions } from "../../AIChatInput";
import { Input } from "../../AIChatInput/utils/inputUtils";
import { AIPanelPrompt, Attachment, TemplateId, CodeContext } from "@wso2/ballerina-core";
import { commandTemplates, suggestedCommandTemplates } from "../../../commandTemplates/data/commandTemplates.const";
import { AttachmentOptions } from "../../AIChatInput/hooks/useAttachments";
import { getTemplateTextById } from "../../../commandTemplates/utils/utils";
import CodeContextCard from "../../CodeContextCard";
import { AgentMode } from "../../AIChatInput/ModeToggle";

export const FooterContainer = styled.footer({
    padding: "20px",
});

const SuggestedCommandsWrapper = styled.div({
    marginTop: "16px",
    marginBottom: "6px",
    marginLeft: "2px",
    color: "var(--vscode-descriptionForeground)",
});

const bubbleAnimation = keyframes`
    0% {
        transform: translateY(3px);
        opacity: 0.7;
    }
    100% {
        transform: translateY(-3px);
        opacity: 1;
    }
`;

const LoadingIndicatorContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 8px;
    background-color: var(--vscode-editor-background);
    border-radius: 4px;
    color: var(--vscode-input-placeholderForeground);
    font-size: 13px;
`;

const Bubbles = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 2px;

    & > span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: var(--vscode-input-placeholderForeground);
        display: inline-block;
        animation: ${bubbleAnimation} 1s infinite alternate;
    }

    & > span:nth-of-type(2) {
        animation-delay: 0.2s;
    }

    & > span:nth-of-type(3) {
        animation-delay: 0.4s;
    }
`;

const renderPrompt = (item: AIPanelPrompt, index: number, aiChatInputRef: React.RefObject<AIChatInputRef>) => {
    if (!item) return null;
    let text = "";

    switch (item.type) {
        case "command-template":
            text = `${item.command} ${
                item.templateId === TemplateId.Wildcard
                    ? item.text
                    : getTemplateTextById(commandTemplates, item.command, item.templateId)
            }`;
            break;
        case "text":
            text = item.text;
            break;
    }

    return (
        <div key={index} style={{ marginBottom: "2px" }}>
            <a
                href="#"
                style={{ textDecoration: "none", cursor: "pointer", outline: "none", boxShadow: "none" }}
                onClick={(e) => {
                    e.preventDefault();
                    aiChatInputRef.current?.setInputContent(item);
                }}
            >
                {text}
            </a>
        </div>
    );
};

type FooterProps = {
    aiChatInputRef: React.RefObject<AIChatInputRef>;
    tagOptions: TagOptions;
    attachmentOptions: AttachmentOptions;
    inputPlaceholder: string;
    onSend: (content: { input: Input[]; attachments: Attachment[]; metadata?: Record<string, any> }) => Promise<void>;
    onStop: () => void;
    isLoading: boolean;
    showSuggestedCommands: boolean;
    codeContext?: CodeContext;
    onRemoveCodeContext?: () => void;
    agentMode?: AgentMode;
    onChangeAgentMode?: (mode: AgentMode) => void;
    isAutoApproveEnabled?: boolean;
    onDisableAutoApprove?: () => void;
    disabled?: boolean;
};

const Footer: React.FC<FooterProps> = ({
    aiChatInputRef,
    tagOptions,
    attachmentOptions,
    inputPlaceholder,
    onSend,
    onStop,
    isLoading,
    showSuggestedCommands,
    codeContext,
    onRemoveCodeContext,
    agentMode,
    onChangeAgentMode,
    isAutoApproveEnabled,
    onDisableAutoApprove,
    disabled,
}) => {
    const [generatingText, setGeneratingText] = useState("Generating.");

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setGeneratingText((prev) => {
                    if (prev === "Generating...") return "Generating.";
                    return prev + ".";
                });
            }, 500);

            return () => clearInterval(interval);
        }
    }, [isLoading]);

    return (
        <FooterContainer>
            {showSuggestedCommands && (
                <SuggestedCommandsWrapper>
                    {suggestedCommandTemplates.map((item, index) => renderPrompt(item, index, aiChatInputRef))}
                </SuggestedCommandsWrapper>
            )}
            {codeContext && onRemoveCodeContext && (
                <CodeContextCard codeContext={codeContext} onRemove={onRemoveCodeContext} />
            )}
            {isLoading && (
                <LoadingIndicatorContainer>
                    <Bubbles>
                        <span />
                        <span />
                        <span />
                    </Bubbles>
                    <span>{generatingText}</span>
                </LoadingIndicatorContainer>
            )}
            <AIChatInput
                ref={aiChatInputRef}
                initialCommandTemplate={commandTemplates}
                tagOptions={tagOptions}
                attachmentOptions={attachmentOptions}
                placeholder={inputPlaceholder}
                onSend={onSend}
                onStop={onStop}
                isLoading={isLoading}
                agentMode={agentMode}
                onChangeAgentMode={onChangeAgentMode}
                isAutoApproveEnabled={isAutoApproveEnabled}
                onDisableAutoApprove={onDisableAutoApprove}
                disabled={disabled}
            />
        </FooterContainer>
    );
};

export default Footer;
