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

import React from "react";
import styled from "@emotion/styled";
import { ThemeColors } from "@wso2/ui-toolkit";
import { EditorModeWithPreviewProps } from "./types";
import { MarkdownToolbar } from "../controls/MarkdownToolbar";
import { MarkdownPreview } from "../controls/MarkdownPreview";

const TextArea = styled.textarea`
    width: 100%;
    height: 100%;
    padding: 12px !important;
    fontSize: 13px;
    font-family: var(--vscode-editor-font-family);
    background: var(--input-background);
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 0 0 4px 4px;
    border-top: none;
    resize: none;
    outline: none;
    box-sizing: border-box;
`;

const TEXTAREA_ID = "prompt-textarea";

/**
 * Prompt mode editor - textarea with markdown toolbar and preview support
 */
export const PromptMode: React.FC<EditorModeWithPreviewProps> = ({
    value,
    onChange,
    isPreviewMode,
    onTogglePreview,
    field
}) => {
    /**
     * Handles Enter key to automatically continue lists (similar to GitHub comments)
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        const textarea = e.currentTarget;
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPosition);
        const textAfterCursor = value.substring(cursorPosition);

        // Find the start of the current line
        const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
        const currentLine = textBeforeCursor.substring(lastNewlineIndex + 1);

        // Check for unordered list (- or *)
        const unorderedMatch = currentLine.match(/^(\s*)([-*])\s+(.*)$/);
        if (unorderedMatch) {
            const [, indent, marker, content] = unorderedMatch;

            // If the list item is empty (just the marker), remove it and exit list mode
            if (!content.trim()) {
                e.preventDefault();
                const newValue = textBeforeCursor.substring(0, lastNewlineIndex + 1) + '\n' + textAfterCursor;
                onChange(newValue);
                // Set cursor position after both newlines
                queueMicrotask(() => {
                    textarea.selectionStart = textarea.selectionEnd = lastNewlineIndex + 2;
                });
                return;
            }

            // Continue the list
            e.preventDefault();
            const newValue = textBeforeCursor + '\n' + indent + marker + ' ' + textAfterCursor;
            onChange(newValue);
            // Set cursor position after the list marker
            queueMicrotask(() => {
                const newCursorPos = cursorPosition + indent.length + marker.length + 2;
                textarea.selectionStart = textarea.selectionEnd = newCursorPos;
            });
            return;
        }

        // Check for ordered list (1., 2., etc.)
        const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (orderedMatch) {
            const [, indent, number, content] = orderedMatch;

            // If the list item is empty (just the number), remove it and exit list mode
            if (!content.trim()) {
                e.preventDefault();
                const newValue = textBeforeCursor.substring(0, lastNewlineIndex + 1) + '\n' + textAfterCursor;
                onChange(newValue);
                // Set cursor position after both newlines
                queueMicrotask(() => {
                    textarea.selectionStart = textarea.selectionEnd = lastNewlineIndex + 2;
                });
                return;
            }

            // Continue the list with incremented number
            e.preventDefault();
            const nextNumber = parseInt(number, 10) + 1;
            const newValue = textBeforeCursor + '\n' + indent + nextNumber + '. ' + textAfterCursor;
            onChange(newValue);
            // Set cursor position after the list marker
            queueMicrotask(() => {
                const newCursorPos = cursorPosition + indent.length + nextNumber.toString().length + 3;
                textarea.selectionStart = textarea.selectionEnd = newCursorPos;
            });
            return;
        }

        // Check for task list (- [ ] or - [x])
        const taskMatch = currentLine.match(/^(\s*)([-*])\s+\[([ x])\]\s+(.*)$/);
        if (taskMatch) {
            const [, indent, marker, , content] = taskMatch;

            // If the task item is empty, remove it and exit list mode
            if (!content.trim()) {
                e.preventDefault();
                const newValue = textBeforeCursor.substring(0, lastNewlineIndex + 1) + '\n' + textAfterCursor;
                onChange(newValue);
                // Set cursor position after both newlines
                queueMicrotask(() => {
                    textarea.selectionStart = textarea.selectionEnd = lastNewlineIndex + 2;
                });
                return;
            }

            // Continue the task list with unchecked box
            e.preventDefault();
            const newValue = textBeforeCursor + '\n' + indent + marker + ' [ ] ' + textAfterCursor;
            onChange(newValue);
            // Set cursor position after the task marker
            queueMicrotask(() => {
                const newCursorPos = cursorPosition + indent.length + marker.length + 6;
                textarea.selectionStart = textarea.selectionEnd = newCursorPos;
            });
            return;
        }
    };

    const placeholder = field.placeholder && field.placeholder.trim() !== "" && field.placeholder.trim() !== "\"\""
        ? field.placeholder
        : "Enter your text here...";

    return (
        <>
            <MarkdownToolbar
                textareaId={TEXTAREA_ID}
                isPreviewMode={isPreviewMode}
                onTogglePreview={() => onTogglePreview(!isPreviewMode)}
            />
            {isPreviewMode ? (
                <MarkdownPreview content={value} />
            ) : (
                <TextArea
                    id={TEXTAREA_ID}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus
                />
            )}
        </>
    );
};
