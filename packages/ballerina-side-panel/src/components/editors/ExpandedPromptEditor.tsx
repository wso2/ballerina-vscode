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

const TextArea = styled.textarea`
    width: 100%;
    min-height: 500px;
    padding: 12px;
    fontSize: 13px;
    font-family: var(--vscode-editor-font-family);
    background-color: ${ThemeColors.SURFACE};
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
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
                    <TextArea
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
