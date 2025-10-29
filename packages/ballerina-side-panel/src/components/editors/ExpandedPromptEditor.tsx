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
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { ThemeColors, Codicon, Divider, Typography, Button } from "@wso2/ui-toolkit";
import { processPastedText } from "../../utils/urlDocumentFormatter";
import "@github/markdown-toolbar-element";

interface ExpandedPromptEditorProps {
    isOpen: boolean;
    value: string;
    onClose: () => void;
    onSave: (value: string) => void;
}

const ModalContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 30000;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: color-mix(in srgb, ${ThemeColors.SECONDARY_CONTAINER} 70%, transparent);
    font-family: GilmerRegular;
`;

const ModalBox = styled.div`
    width: 800px;
    max-height: 90vh;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px 8px;
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    box-shadow: 0 3px 8px rgb(0 0 0 / 0.2);
    z-index: 30001;
`;

const ModalHeaderSection = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 16px;
    margin-bottom: 8px;
`;

const ModalContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
`;

const ToolbarContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background-color: ${ThemeColors.SURFACE};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px 4px 0 0;
    flex-wrap: wrap;

    markdown-toolbar {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
    }
`;

const ToolbarButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background-color: transparent;
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background-color: ${ThemeColors.SECONDARY_CONTAINER};
        border-color: ${ThemeColors.OUTLINE};
    }

    &:active:not(:disabled) {
        background-color: ${ThemeColors.SECONDARY_CONTAINER};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    &:focus-visible {
        outline: 2px solid ${ThemeColors.PRIMARY};
        outline-offset: 2px;
    }
`;

const ToolbarDivider = styled.div`
    width: 1px;
    height: 24px;
    background-color: ${ThemeColors.OUTLINE_VARIANT};
    margin: 0 4px;
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 500px;
    padding: 12px;
    fontSize: 13px;
    font-family: var(--vscode-editor-font-family);
    background-color: ${ThemeColors.SURFACE};
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 0 0 4px 4px;
    border-top: none;
    resize: vertical;
    outline: none;
    box-sizing: border-box;

    &:focus {
        border-color: ${ThemeColors.OUTLINE};
        box-shadow: 0 0 0 1px ${ThemeColors.OUTLINE};
    }
`;

const ButtonContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 16px 8px 16px;
`;

export const ExpandedPromptEditor: React.FC<ExpandedPromptEditorProps> = ({
    isOpen,
    value,
    onClose,
    onSave,
}) => {
    const [editedValue, setEditedValue] = useState(value);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setEditedValue(value);
    }, [value, isOpen]);

    const handleSave = () => {
        onSave(editedValue);
        onClose();
    };

    const handleCancel = () => {
        setEditedValue(value);
        onClose();
    };

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle Enter key for list continuation
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            const textarea = e.currentTarget;
            const { selectionStart, selectionEnd, value } = textarea;

            // Only handle if there's no selection (cursor is at a point)
            if (selectionStart === selectionEnd) {
                // Find the start of the current line
                const textBeforeCursor = value.substring(0, selectionStart);
                const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
                const currentLineStart = lastNewlineIndex + 1;
                const currentLine = value.substring(currentLineStart, selectionStart);

                // Match ordered list pattern (e.g., "1. ", "2. ", etc.)
                const orderedListMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
                if (orderedListMatch) {
                    e.preventDefault();
                    const indent = orderedListMatch[1];
                    const currentNumber = parseInt(orderedListMatch[2], 10);
                    const listItemContent = currentLine.substring(orderedListMatch[0].length);

                    // If the list item is empty, exit the list
                    if (listItemContent.trim() === '') {
                        // Remove the list marker and just add a new line
                        const newValue =
                            value.substring(0, currentLineStart) +
                            '\n' +
                            value.substring(selectionStart);
                        setEditedValue(newValue);

                        setTimeout(() => {
                            textarea.selectionStart = textarea.selectionEnd = currentLineStart + 1;
                            textarea.focus();
                        }, 0);
                    } else {
                        // Continue the list with the next number
                        const nextNumber = currentNumber + 1;
                        const insertText = `\n${indent}${nextNumber}. `;

                        const success = document.execCommand('insertText', false, insertText);
                        if (!success) {
                            const newValue =
                                value.substring(0, selectionStart) +
                                insertText +
                                value.substring(selectionEnd);
                            setEditedValue(newValue);

                            setTimeout(() => {
                                const newPosition = selectionStart + insertText.length;
                                textarea.selectionStart = textarea.selectionEnd = newPosition;
                                textarea.focus();
                            }, 0);
                        }
                    }
                    return;
                }

                // Match unordered list pattern (e.g., "- ", "* ", "+ ")
                const unorderedListMatch = currentLine.match(/^(\s*)([-*+])\s/);
                if (unorderedListMatch) {
                    e.preventDefault();
                    const indent = unorderedListMatch[1];
                    const marker = unorderedListMatch[2];
                    const listItemContent = currentLine.substring(unorderedListMatch[0].length);

                    // If the list item is empty, exit the list
                    if (listItemContent.trim() === '') {
                        // Remove the list marker and just add a new line
                        const newValue =
                            value.substring(0, currentLineStart) +
                            '\n' +
                            value.substring(selectionStart);
                        setEditedValue(newValue);

                        setTimeout(() => {
                            textarea.selectionStart = textarea.selectionEnd = currentLineStart + 1;
                            textarea.focus();
                        }, 0);
                    } else {
                        // Continue the list with the same marker
                        const insertText = `\n${indent}${marker} `;

                        const success = document.execCommand('insertText', false, insertText);
                        if (!success) {
                            const newValue =
                                value.substring(0, selectionStart) +
                                insertText +
                                value.substring(selectionEnd);
                            setEditedValue(newValue);

                            setTimeout(() => {
                                const newPosition = selectionStart + insertText.length;
                                textarea.selectionStart = textarea.selectionEnd = newPosition;
                                textarea.focus();
                            }, 0);
                        }
                    }
                    return;
                }
            }
        }

        // Detect Cmd+Shift+V (Mac) or Ctrl+Shift+V (Windows/Linux) for plain paste
        console.log("Key down event detected in ExpandedPromptEditor");
        if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key === 'v') {
            console.log("Plain paste shortcut detected (Cmd/Ctrl+Shift+V)");
            e.preventDefault(); // Prevent default to stop system paste behavior

            const textarea = e.currentTarget;

            try {
                // Read from clipboard using Clipboard API
                const text = await navigator.clipboard.readText();
                console.log("Clipboard text read:", text.substring(0, 50) + "...");

                // Process as plain paste
                const processedText = processPastedText(text, true);

                // Use document.execCommand to maintain undo/redo stack
                const success = document.execCommand('insertText', false, processedText);

                if (!success) {
                    // Fallback for browsers that don't support execCommand
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newValue =
                        editedValue.substring(0, start) +
                        processedText +
                        editedValue.substring(end);

                    setEditedValue(newValue);

                    setTimeout(() => {
                        const newPosition = start + processedText.length;
                        textarea.selectionStart = textarea.selectionEnd = newPosition;
                        textarea.focus();
                    }, 0);
                }
            } catch (err) {
                console.error("Failed to read from clipboard:", err);
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const textarea = e.currentTarget;
        console.log("Paste event detected in ExpandedPromptEditor");

        // Regular paste (Cmd+V or Ctrl+V) processes URLs
        const isPlainPaste = false;

        // First, check if there's a text/plain item for URL processing
        const textItem = Array.from(items).find(item => item.type === 'text/plain');
        if (textItem) {
            e.preventDefault();

            textItem.getAsString((text) => {
                const processedText = processPastedText(text, isPlainPaste);

                // Use document.execCommand to maintain undo/redo stack
                // This is deprecated but still the most reliable way to maintain undo history
                const success = document.execCommand('insertText', false, processedText);

                if (!success) {
                    // Fallback for browsers that don't support execCommand
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newValue =
                        editedValue.substring(0, start) +
                        processedText +
                        editedValue.substring(end);

                    setEditedValue(newValue);

                    setTimeout(() => {
                        const newPosition = start + processedText.length;
                        textarea.selectionStart = textarea.selectionEnd = newPosition;
                        textarea.focus();
                    }, 0);
                }
            });

            return;
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <ModalContainer>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalHeaderSection>
                    <Typography sx={{ margin: "10px 0" }}>
                        Edit Prompt
                    </Typography>
                    <div onClick={handleCancel} style={{ cursor: 'pointer' }}>
                        <Codicon name="close" />
                    </div>
                </ModalHeaderSection>
                <Divider sx={{ margin: 0 }} />
                <ModalContent>
                    <ToolbarContainer>
                        <markdown-toolbar for="prompt-textarea">
                            <md-bold>
                                <ToolbarButton title="Bold (Ctrl/Cmd+B)">
                                    <Codicon name="bold" />
                                </ToolbarButton>
                            </md-bold>
                            <md-italic>
                                <ToolbarButton title="Italic (Ctrl/Cmd+I)">
                                    <Codicon name="italic" />
                                </ToolbarButton>
                            </md-italic>
                            <md-code>
                                <ToolbarButton title="Inline Code">
                                    <Codicon name="code" />
                                </ToolbarButton>
                            </md-code>
                            <md-link>
                                <ToolbarButton title="Insert Link (Ctrl/Cmd+K)">
                                    <Codicon name="link" />
                                </ToolbarButton>
                            </md-link>

                            <ToolbarDivider />

                            <md-header data-md-header="2">
                                <ToolbarButton title="Heading 2">
                                    <Codicon name="symbol-text" />
                                </ToolbarButton>
                            </md-header>

                            <ToolbarDivider />

                            <md-unordered-list>
                                <ToolbarButton title="Bulleted List">
                                    <Codicon name="list-unordered" />
                                </ToolbarButton>
                            </md-unordered-list>
                            <md-ordered-list>
                                <ToolbarButton title="Numbered List">
                                    <Codicon name="list-ordered" />
                                </ToolbarButton>
                            </md-ordered-list>

                            <ToolbarDivider />

                            <md-code-block>
                                <ToolbarButton title="Code Block">
                                    <Codicon name="file-code" />
                                </ToolbarButton>
                            </md-code-block>
                        </markdown-toolbar>
                    </ToolbarContainer>
                    <TextArea
                        id="prompt-textarea"
                        ref={textareaRef}
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="Enter your prompt here..."
                        autoFocus
                    />
                </ModalContent>
                <ButtonContainer>
                    <Button appearance="secondary" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button appearance="primary" onClick={handleSave}>
                        Save
                    </Button>
                </ButtonContainer>
            </ModalBox>
        </ModalContainer>,
        document.body
    );
};
