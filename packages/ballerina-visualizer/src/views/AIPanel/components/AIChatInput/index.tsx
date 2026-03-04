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

import { useState, useRef, KeyboardEvent, useEffect, useLayoutEffect, useImperativeHandle, forwardRef } from "react";
import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";
import { AIPanelPrompt, Attachment, AttachmentStatus, Command, ExtendedDataMapperMetadata, TemplateId } from "@wso2/ballerina-core";
import AttachmentBox, { AttachmentsContainer } from "../AttachmentBox";
import { StyledInputComponent, StyledInputRef } from "./StyledInput";
import { AttachmentOptions, useAttachments } from "./hooks/useAttachments";
import { Suggestion, SuggestionType, useCommands } from "./hooks/useCommands";
import { ChatBadgeType } from "../ChatBadge";
import { Input } from "./utils/inputUtils";
import SuggestionsList from "./SuggestionsList";
import ModeToggle, { AgentMode } from "./ModeToggle";
import AutoApproveChip from "./AutoApproveChip";
import { CommandTemplates } from "../../commandTemplates/data/commandTemplates.const";
import { Tag } from "../../commandTemplates/models/tag.model";
import { getFirstOccurringPlaceholder, matchCommandTemplate } from "./utils/utils";
import { getAllCommands, getTags, getTemplateDefinitionsByCommand } from "../../commandTemplates/utils/utils";
import { PlaceholderTagMap } from "../../commandTemplates/data/placeholderTags.const";

// Styled Components
const Container = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
`;

const FlexRow = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: stretch; /* Ensures both children stretch to the same height */
`;

const ActionRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const InputArea = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    cursor: text;
    flex: 1;

    &:focus-within {
        border-color: var(--vscode-button-background);
    }
`;

const ActionButton = styled.button`
    width: 24px;
    height: 24px;
    background-color: transparent;
    color: var(--vscode-icon-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 4px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    box-sizing: border-box;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }

    &:active {
        background-color: var(--vscode-toolbar-activeBackground);
    }

    &:disabled {
        color: var(--vscode-disabledForeground);
        background-color: transparent;
        cursor: default;
    }

    &:disabled:hover {
        background-color: transparent;
    }
`;


export interface TagOptions {
    placeholderTags: PlaceholderTagMap;
    loadGeneralTags: () => Promise<Tag[]>;
    injectPlaceholderTags: () => Promise<void>;
}

export type AIChatInputRef = {
    setInputContent: (input: AIPanelPrompt) => void;
};

interface AIChatInputProps {
    initialCommandTemplate: CommandTemplates;
    tagOptions: TagOptions;
    attachmentOptions: AttachmentOptions;
    placeholder: string;
    onSend: (content: { input: Input[]; attachments: Attachment[]; metadata?: Record<string, any> }) => Promise<void>;
    onStop: () => void;
    isLoading: boolean;
    agentMode?: AgentMode;
    onChangeAgentMode?: (mode: AgentMode) => void;
    isAutoApproveEnabled?: boolean;
    onDisableAutoApprove?: () => void;
    disabled?: boolean;
}

const AIChatInput = forwardRef<AIChatInputRef, AIChatInputProps>(
    ({ initialCommandTemplate, tagOptions, attachmentOptions, placeholder, onSend, onStop, isLoading,
       agentMode = AgentMode.Edit, onChangeAgentMode, isAutoApproveEnabled = false, onDisableAutoApprove, disabled }, ref) => {
        const [inputValue, setInputValue] = useState<{
            text: string;
            [key: string]: any;
        }>({
            text: "",
        });
        const [generalTags, setGeneralTags] = useState<Tag[]>([]);
        const [isTagInitDone, setIsTagInitDone] = useState(false);
        const [currentMetadata, setCurrentMetadata] = useState<Record<string, any>>({});

        // refs
        const inputRef = useRef<StyledInputRef>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const activeSuggestionRef = useRef<HTMLLIElement | null>(null);
        const pendingInputContentRef = useRef<AIPanelPrompt | null>(null);

        useImperativeHandle(ref, () => ({
            setInputContent,
        }));

        // custom hooks: commands + attachments
        const {
            filteredSuggestions,
            activeSuggestionIndex,
            activeCommand,
            setActiveCommand,
            handleSuggestionOnTextChange,
            setActiveSuggestion,
            completeSuggestionSelection,
        } = useCommands({
            commandTemplate: initialCommandTemplate,
        });

        const {
            attachments,
            fileInputRef,
            handleAttachClick,
            onAttachmentSelection,
            removeAttachment,
            removeAllAttachments,
        } = useAttachments({
            attachmentOptions: attachmentOptions,
            activeCommand,
        });

        /**
         * Effect: Initialize general tags and placeholder tags on mount
         */
        useEffect(() => {
            const initTags = async () => {
                await tagOptions.loadGeneralTags().then(setGeneralTags);
                await tagOptions.injectPlaceholderTags();
                setIsTagInitDone(true);
            };

            initTags();
        }, []);

        /**
         * Effect: Auto-clean up input if it only has "<br>" or no text.
         */
        useEffect(
            function removeInputValueOnBRTag() {
                if (!inputValue.text || inputValue.text === "<br>") {
                    setInputValue((prev) => ({ ...prev, text: "" }));
                    setActiveCommand(null);
                }
            },
            [inputValue.text]
        );

        /**
         * Effect: Handles text changes in the input field and updates suggestions or placeholders accordingly.
         * This effect is triggered whenever the input value changes.
         */
        useLayoutEffect(() => {
            const id = requestAnimationFrame(async () => {
                const text = inputRef.current.ref.current.innerText;
                const templateInserted = inputValue.templateInserted || false;
                const tagInserted = inputValue.tagInserted || false;
                const tagParams = inputValue.tagParams || null;
                // updatedContent, updatedCommand and updatedTemplate is set when a text/command_template is inserted
                const updatedContent = (inputValue.updatedContent as AIPanelPrompt) || null;
                const isUpdatedCommand = inputValue.updatedCommand || false;
                const updatedTemplate = inputValue.updatedTemplate || null;
                const currentCursorPosition = inputRef.current.getCursorPosition();
                const isCursorNextToDiv = inputRef.current.isCursorNextToDiv();
                handleSuggestionOnTextChange({
                    commandTemplate: initialCommandTemplate,
                    isCursorNextToDiv,
                    text,
                    calledOnSuggestionInsertion: templateInserted || isUpdatedCommand,
                    currentCursorPosition,
                    generalTags,
                });

                if (activeCommand && (templateInserted || tagInserted)) {
                    const templateQuery = text.substring(activeCommand.length + 1);
                    const matchResult = matchCommandTemplate(
                        templateQuery,
                        getTemplateDefinitionsByCommand(initialCommandTemplate, activeCommand)
                    );
                    if (matchResult) {
                        const { template } = matchResult;
                        const placeholderDefs = template.placeholders;
                        const firstPlaceholderDef = getFirstOccurringPlaceholder(templateQuery, placeholderDefs);
                        if (firstPlaceholderDef) {
                            const tags = getTags(activeCommand, template.id, firstPlaceholderDef.id);
                            if (tags?.length) {
                                const tagValue = tagParams?.[firstPlaceholderDef.id];
                                const matchedTag = tagValue && tags.find((tag) => tag.value === tagValue);
                                if (matchedTag) {
                                    inputRef.current.replaceTextWithBadge(firstPlaceholderDef.text, {
                                        displayText: matchedTag.display,
                                        rawValue: matchedTag.value,
                                        badgeType: ChatBadgeType.Tag,
                                        suffixText: "",
                                        tagInserted: true,
                                    });
                                } else {
                                    inputRef.current.replaceTextWithText(firstPlaceholderDef.text, "@");
                                }
                            } else {
                                inputRef.current.selectText(firstPlaceholderDef.text);
                            }
                        }
                    }
                }

                if (updatedContent) {
                    switch (updatedContent.type) {
                        case "command-template":
                            inputRef.current.setCursorToPosition(inputRef.current.ref.current, 0);
                            insertCommand(updatedContent.command, " ", {
                                updatedCommand: true,
                                updatedTemplate: {
                                    templateId: updatedContent.templateId,
                                    text: updatedContent.text,
                                    params: updatedContent.params,
                                },
                            });
                            break;
                        case "text":
                            inputRef.current?.insertTextAtCursor({ text: updatedContent.text });
                            break;
                        default:
                            break;
                    }
                    inputRef.current.focus();
                }

                if (isUpdatedCommand && updatedTemplate) {
                    function isTemplateObj(
                        obj: any
                    ): obj is { templateId: string; text?: string; params?: Record<string, string> } {
                        return typeof obj === "object" && obj !== null && typeof obj.templateId === "string";
                    }
                    if (isTemplateObj(updatedTemplate)) {
                        const { templateId, text, params } = updatedTemplate;
                        const template = getTemplateDefinitionsByCommand(initialCommandTemplate, activeCommand).find(
                            (template) => template.id === templateId
                        );

                        if (template) {
                            if (template.id === TemplateId.Wildcard) {
                                inputRef.current?.insertTextAtCursor({ text: text || "" });
                            } else {
                                if (params) {
                                    inputRef.current?.insertTextAtCursor({
                                        text: template.text,
                                        templateInserted: true,
                                        tagParams: params,
                                    });
                                } else {
                                    inputRef.current?.insertTextAtCursor({
                                        text: template.text,
                                        templateInserted: true,
                                    });
                                }
                            }
                        }
                    }
                }
            });

            return () => cancelAnimationFrame(id);
        }, [inputValue]);

        /**
         * Effect: If the user navigates suggestions with keyboard, keep the active suggestion visible.
         */
        useLayoutEffect(
            function autoScrollForActiveSuggestionOnList() {
                if (activeSuggestionRef.current) {
                    activeSuggestionRef.current.scrollIntoView({
                        block: "nearest",
                        inline: "nearest",
                    });
                }
            },
            [activeSuggestionIndex]
        );

        /**
         * Effect: Focus the input field when the component mounts.
         */
        useEffect(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, []);

        /**
         * Effect: Insert pending input content if available.
         */
        useEffect(() => {
            if (isTagInitDone && pendingInputContentRef.current) {
                requestAnimationFrame(() => {
                    updateChatInputWithContent(pendingInputContentRef.current!);
                    pendingInputContentRef.current = null;
                });
            }
        }, [isTagInitDone]);

        const setInputContent = (input: AIPanelPrompt) => {
            if (!isTagInitDone) {
                pendingInputContentRef.current = input;
                return;
            }

            requestAnimationFrame(() => {
                updateChatInputWithContent(input);
            });
        };

        /**
         * Inserts a command badge at the current cursor position in the input field.
         */
        const insertCommand = async (command: Command, suffix: string, additionalProps?: { [key: string]: any }) => {
            inputRef.current?.insertBadgeAtCursor({
                displayText: command,
                badgeType: ChatBadgeType.Command,
                suffixText: " ",
                ...additionalProps,
            });
            setActiveCommand(command);
            fileInputRef.current.accept = attachmentOptions.acceptResolver(command);
            await tagOptions.injectPlaceholderTags();
        };

        /**
         * Inserts a tag badge at the current cursor position in the input field.
         */
        const insertTag = (displayText: string, rawValue: string, additionalProps?: { [key: string]: any }) => {
            inputRef.current?.insertBadgeAtCursor({
                displayText: displayText,
                rawValue: rawValue,
                badgeType: ChatBadgeType.Tag,
                suffixText: "",
                ...additionalProps,
            });
        };

        /**
         * Called after we select a suggestion from the list (click or keyboard).
         */
        const selectSuggestion = async (suggestion: Suggestion) => {
            // complete suggestion selection
            completeSuggestionSelection();

            if (suggestion.type === SuggestionType.Command) {
                insertCommand(suggestion.command, " ");
            }

            // insert the selected suggestion (Template)
            if (suggestion.type === SuggestionType.Template) {
                inputRef.current?.insertTextAtCursor({ text: suggestion.text, templateInserted: true });
            }

            // insert the selected suggestion (Tag)
            if (suggestion.type === SuggestionType.Tag) {
                insertTag(suggestion.text, suggestion.rawValue, {
                    tagInserted: true,
                });
            }
        };

        /**
         * Handler for key down events in the contentEditable.
         * - Navigates or selects suggestions
         * - Sends message on Enter
         * - Stops on Escape
         */
        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, removedBadgeTypes?: string[]) => {
            if (removedBadgeTypes?.includes(ChatBadgeType.Command)) {
                setActiveCommand(null);
            }
            if (filteredSuggestions.length > 0) {
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    const newIndex =
                        activeSuggestionIndex + 1 < filteredSuggestions.length ? activeSuggestionIndex + 1 : 0;
                    setActiveSuggestion(newIndex, filteredSuggestions);
                } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    const newIndex =
                        activeSuggestionIndex - 1 >= 0 ? activeSuggestionIndex - 1 : filteredSuggestions.length - 1;
                    setActiveSuggestion(newIndex, filteredSuggestions);
                } else if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    if (filteredSuggestions.length > 0) {
                        selectSuggestion(filteredSuggestions[activeSuggestionIndex]);
                    }
                } else if (event.key === "Escape") {
                    completeSuggestionSelection();
                } else if (event.key === " ") {
                    const trimmedText = inputValue.text.trim();
                    if (trimmedText && getAllCommands(initialCommandTemplate).includes(trimmedText as Command)) {
                        event.preventDefault();
                        if (filteredSuggestions.length > 0) {
                            selectSuggestion(filteredSuggestions[activeSuggestionIndex]);
                        }
                    }
                }
            } else if (event.key === "Enter" && !event.shiftKey && !isLoading) {
                event.preventDefault();
                if (inputValue.text.trim() !== "") {
                    handleSend();
                }
            } else if (event.key === "Escape" && isLoading) {
                event.preventDefault();
                handleStop();
            }
        };

        /**
         * Clears the chat input, attachments and update with new content
         */
        const updateChatInputWithContent = (content: AIPanelPrompt) => {
            setInputValue({ text: "", updatedContent: content });
            removeAllAttachments();

            // Extract and store metadata safely
            if (content?.type === 'command-template') {
                setCurrentMetadata(content.metadata as ExtendedDataMapperMetadata);
            } else {
                setCurrentMetadata(null);
            }
        };

        /**
         * Clears the chat input and attachments after sending
         */
        const cleanChatInput = () => {
            setInputValue({ text: "" });
            removeAllAttachments();
            setCurrentMetadata(null);
        };

        /**
         * Reusable logic for sending the user's current text+attachments.
         */
        const handleSend = () => {
            const input = inputRef.current?.getContentAsInputList();
            const filteredAttachments = attachments.filter(
                (attachment) => attachment.status === AttachmentStatus.Success
            );
            const metadata = currentMetadata;
            onSend({ input: input, attachments: filteredAttachments, metadata: metadata });
            cleanChatInput();
        };

        /**
         * Reusable logic for stopping the ongoing process.
         */
        const handleStop = () => {
            onStop();
        };

        /**
         * Called after DOM updates in the StyledInput
         */
        const executeOnPostDOMUpdate = () => {
            // Any post-render logic you need, e.g. measuring DOM, etc.
        };

        /**
         * Called when user clicks on a suggestion item in the list.
         */
        const handleSuggestionClick = (suggestion: Suggestion) => {
            selectSuggestion(suggestion);
        };

        return (
            <Container ref={containerRef}>
                <FlexRow>
                    <InputArea>
                        <StyledInputComponent
                            ref={inputRef}
                            value={inputValue}
                            onChange={setInputValue}
                            onKeyDown={handleKeyDown}
                            onBlur={() => completeSuggestionSelection()}
                            placeholder={disabled ? "Usage limit exceeded" : placeholder}
                            onPostDOMUpdate={executeOnPostDOMUpdate}
                            disabled={disabled}
                        />
                        {/* Attachments Display */}
                        {attachments.length > 0 && (
                            <AttachmentsContainer>
                                {attachments.map((file, index) => (
                                    <AttachmentBox
                                        key={index}
                                        status={file.status}
                                        fileName={file.name}
                                        index={index}
                                        removeAttachment={removeAttachment}
                                    />
                                ))}
                            </AttachmentsContainer>
                        )}

                        <ActionRow>
                            <div style={{ display: "flex", alignItems: "center" }}>
                                {onChangeAgentMode && (
                                    <ModeToggle
                                        mode={agentMode}
                                        onChange={onChangeAgentMode}
                                        disabled={isLoading}
                                    />
                                )}
                                {isAutoApproveEnabled && onDisableAutoApprove && (
                                    <AutoApproveChip onToggle={onDisableAutoApprove} />
                                )}
                                <ActionButton
                                    title="Chat with Command"
                                    disabled={inputValue.text !== ""}
                                    onClick={() => {
                                        inputRef.current?.insertTextAtCursor({ text: "/" });
                                    }}
                                >
                                    /
                                </ActionButton>
                                <input
                                    type="file"
                                    multiple={attachmentOptions.multiple}
                                    accept={attachmentOptions.acceptResolver(activeCommand)}
                                    style={{ display: "none" }}
                                    ref={fileInputRef}
                                    onChange={onAttachmentSelection}
                                />
                                <ActionButton title="Attach Context" onClick={handleAttachClick}>
                                    <Codicon name="new-file" />
                                </ActionButton>
                            </div>
                            <div>
                                <ActionButton
                                    title={isLoading ? "Stop (Escape)" : "Send (Enter)"}
                                    disabled={(inputValue.text.trim() === "" && !isLoading) || disabled}
                                    onClick={isLoading ? handleStop : handleSend}
                                >
                                    <span
                                        className={`codicon ${isLoading ? "codicon-stop-circle" : "codicon-send"}`}
                                    ></span>
                                </ActionButton>
                            </div>
                        </ActionRow>
                    </InputArea>
                </FlexRow>
                {filteredSuggestions.length > 0 && (
                    <SuggestionsList
                        suggestions={filteredSuggestions}
                        activeSuggestionIndex={activeSuggestionIndex}
                        activeSuggestionRef={activeSuggestionRef}
                        onSuggestionClick={handleSuggestionClick}
                        onSuggestionMouseDown={(e) => e.preventDefault()}
                    />
                )}
            </Container>
        );
    }
);

export default AIChatInput;
