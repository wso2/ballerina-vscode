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

import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import { MessageBubble, preprocessLatex } from "../AgentChatPanel/Components/ChatInterface";
import { Icon } from "@wso2/ui-toolkit";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

const EditableContainer = styled.div<{ isUser: boolean }>`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-direction: ${(props: { isUser: boolean; }) => props.isUser ? 'row-reverse' : 'row'};
`;

const EditIconButton = styled.button`
    background: transparent;
    color: var(--vscode-foreground);
    border: none;
    border-radius: 4px;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    flex-shrink: 0;

    &:hover {
        opacity: 1;
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const EditableContent = styled.div`
    min-height: 20px;
    outline: none;
    font-family: var(--vscode-font-family);
    font-size: inherit;
    line-height: inherit;
    white-space: pre-wrap;
    word-wrap: break-word;

    &:empty:before {
        content: attr(data-placeholder);
        color: var(--vscode-input-placeholderForeground);
    }
`;

const EditActions = styled.div<{ isUser: boolean }>`
    display: flex;
    gap: 8px;
    margin-top: 12px;
    justify-content: flex-end;
`;

const EditingMessageBubble = styled(MessageBubble)`
    display: flex;
    flex-direction: column;
    flex-shrink: 1;
    min-width: 200px;
`;

const SaveButton = styled.button`
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;

    &:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
`;

const CancelButton = styled.button`
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;

    &:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
    }
`;

interface EditableTraceMessageProps {
    traceId: string;
    isUser: boolean;
    content: string | any;
    isEditMode: boolean;
    onSave: (traceId: string, content: string) => void;
}

export const EditableTraceMessage: React.FC<EditableTraceMessageProps> = ({
    traceId,
    isUser,
    content,
    isEditMode,
    onSave,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState("");
    const editableRef = useRef<HTMLDivElement>(null);

    const contentString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    useEffect(() => {
        if (isEditing && editableRef.current) {
            // Set initial content
            editableRef.current.textContent = editValue;
            editableRef.current.focus();
            // Move cursor to end
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(editableRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    }, [isEditing]);

    // Reset editing state when edit mode is exited
    useEffect(() => {
        if (!isEditMode && isEditing) {
            setIsEditing(false);
            setEditValue("");
        }
    }, [isEditMode, isEditing]);

    const handleStartEdit = () => {
        setEditValue(contentString);
        setIsEditing(true);
    };

    const handleSave = () => {
        const content = editableRef.current?.textContent || "";
        onSave(traceId, content);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditValue("");
    };

    const handleInput = () => {
        if (editableRef.current) {
            setEditValue(editableRef.current.textContent || "");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        if (editableRef.current) {
            setEditValue(editableRef.current.textContent || "");
        }
    };

    if (isEditing) {
        return (
            <EditingMessageBubble isUser={isUser}>
                <EditableContent
                    ref={editableRef}
                    contentEditable
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    data-placeholder="Enter message..."
                    suppressContentEditableWarning
                />
                <EditActions isUser={isUser}>
                    <CancelButton onClick={handleCancel}>Cancel</CancelButton>
                    <SaveButton onClick={handleSave}>Save</SaveButton>
                </EditActions>
            </EditingMessageBubble>
        );
    }

    return (
        <EditableContainer isUser={isUser}>
            <MessageBubble isUser={isUser}>
                <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                >
                    {preprocessLatex(contentString)}
                </ReactMarkdown>
            </MessageBubble>
            {isEditMode && (
                <EditIconButton onClick={handleStartEdit} title="Edit message">
                    <Icon
                        name="bi-edit"
                        iconSx={{
                            fontSize: "16px",
                        }}
                    />
                </EditIconButton>
            )}
        </EditableContainer>
    );
};
