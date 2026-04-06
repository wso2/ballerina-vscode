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
import { commandTemplates, suggestedCommandTemplates as defaultSuggestedCommandTemplates } from "../../../commandTemplates/data/commandTemplates.const";
import { AttachmentOptions } from "../../AIChatInput/hooks/useAttachments";
import { getTemplateTextById } from "../../../commandTemplates/utils/utils";
import CodeContextCard from "../../CodeContextCard";
import { AgentMode } from "../../AIChatInput/ModeToggle";

export const FooterContainer = styled.footer({
    padding: "20px 20px 12px",
});

const SuggestedCommandsWrapper = styled.div`
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 12px;
`;

const SuggestionChip = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    background: var(--vscode-editor-background);
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 8px;
    cursor: pointer !important;
    transition: all 0.15s ease;
    text-align: left;

    &:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder, var(--vscode-widget-border));
        color: var(--vscode-foreground);
    }
`;

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
        <SuggestionChip key={index} onClick={() => aiChatInputRef.current?.setInputContent(item)}>
            <span className="codicon codicon-arrow-right" style={{ fontSize: "11px", opacity: 0.6 }} />
            {text}
        </SuggestionChip>
    );
};

const DisclaimerText = styled.p<{ visible: boolean }>`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    text-align: center;
    margin: 6px 0 0;
    opacity: ${(props: { visible: boolean }) => props.visible ? 0.7 : 0};
    max-height: ${(props: { visible: boolean }) => props.visible ? '20px' : '0'};
    overflow: hidden;
    transition: opacity 0.2s ease, max-height 0.2s ease;
`;

type FooterProps = {
    aiChatInputRef: React.RefObject<AIChatInputRef>;
    tagOptions: TagOptions;
    attachmentOptions: AttachmentOptions;
    suggestedCommandTemplates?: AIPanelPrompt[];
    inputPlaceholder: string;
    onSend: (content: { input: Input[]; attachments: Attachment[]; metadata?: Record<string, any> }) => Promise<void>;
    onStop: () => void;
    isLoading: boolean;
    loadingLabel?: string;
    showSuggestedCommands: boolean;
    codeContext?: CodeContext;
    onRemoveCodeContext?: () => void;
    agentMode?: AgentMode;
    onChangeAgentMode?: (mode: AgentMode) => void;
    isAutoApproveEnabled?: boolean;
    onDisableAutoApprove?: () => void;
    isWebToolsEnabled?: boolean;
    onToggleWebSearch?: () => void;
    disabled?: boolean;
    contextUsage?: { inputTokens: number; percentage: number; breakdown?: { systemInstructions: number; toolDefinitions: number; reservedOutput: number; messages: number; toolResults: number } } | null;
};

const Footer: React.FC<FooterProps> = ({
    aiChatInputRef,
    tagOptions,
    attachmentOptions,
    suggestedCommandTemplates,
    inputPlaceholder,
    onSend,
    onStop,
    isLoading,
    loadingLabel,
    showSuggestedCommands,
    codeContext,
    onRemoveCodeContext,
    agentMode,
    onChangeAgentMode,
    isAutoApproveEnabled,
    onDisableAutoApprove,
    isWebToolsEnabled,
    onToggleWebSearch,
    disabled,
    contextUsage,
}) => {
    const footerSuggestedCommandTemplates = suggestedCommandTemplates ?? defaultSuggestedCommandTemplates;
    const [animatedText, setAnimatedText] = useState("Generating.");

    useEffect(() => {
        if (isLoading) {
            const baseText = loadingLabel || "Generating";
            setAnimatedText(baseText + ".");

            const interval = setInterval(() => {
                setAnimatedText((prev) => {
                    // Extract the base text without dots
                    const dots = prev.match(/\.+$/)?.[0] || "";
                    const base = prev.slice(0, prev.length - dots.length);

                    // Cycle through 1, 2, 3 dots
                    if (dots.length >= 3) return base + ".";
                    return prev + ".";
                });
            }, 500);

            return () => clearInterval(interval);
        }
    }, [isLoading, loadingLabel]);

    return (
        <FooterContainer>
            {showSuggestedCommands && (
                <SuggestedCommandsWrapper>
                    {footerSuggestedCommandTemplates.map((item, index) => renderPrompt(item, index, aiChatInputRef))}
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
                    <span>{animatedText}</span>
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
                isWebToolsEnabled={isWebToolsEnabled}
                onToggleWebSearch={onToggleWebSearch}
                disabled={disabled}
                contextUsage={contextUsage}
            />
            <DisclaimerText visible={!showSuggestedCommands}>
                AI-generated content may contain mistakes. Always review changes.
            </DisclaimerText>
        </FooterContainer>
    );
};

export default Footer;
