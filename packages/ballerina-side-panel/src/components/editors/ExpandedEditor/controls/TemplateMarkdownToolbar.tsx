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
import { ThemeColors, Icon, Switch } from "@wso2/ui-toolkit";
import { EditorView } from "@codemirror/view";
import {
    insertMarkdownFormatting,
    insertMarkdownHeader,
    insertMarkdownLink,
    insertMarkdownBlockquote,
    insertMarkdownUnorderedList,
    insertMarkdownOrderedList,
    insertMarkdownTaskList
} from "../utils/templateUtils";
import { HelperPaneToggleButton } from "../../MultiModeExpressionEditor/ChipExpressionEditor/components/HelperPaneToggleButton";

const ToolbarContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 8px 12px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px 4px 0 0;
    flex-wrap: wrap;
    font-family: GilmerMedium;
`;

const ToolbarButtonGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
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

interface TemplateMarkdownToolbarProps {
    editorView: EditorView | null;
    isPreviewMode?: boolean;
    onTogglePreview?: () => void;
    helperPaneToggle?: {
        ref: React.RefObject<HTMLButtonElement>;
        isOpen: boolean;
        onClick: () => void;
    };
}

export const TemplateMarkdownToolbar = React.forwardRef<HTMLDivElement, TemplateMarkdownToolbarProps>(({
    editorView,
    isPreviewMode = false,
    onTogglePreview,
    helperPaneToggle
}, ref) => {
    // Prevent buttons from taking focus away from the editor
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    const handleBold = () => insertMarkdownFormatting(editorView, '**');
    const handleItalic = () => insertMarkdownFormatting(editorView, '_');
    const handleCode = () => insertMarkdownFormatting(editorView, '`');
    const handleLink = () => insertMarkdownLink(editorView);
    const handleHeader = () => insertMarkdownHeader(editorView, 3);
    const handleQuote = () => insertMarkdownBlockquote(editorView);
    const handleUnorderedList = () => insertMarkdownUnorderedList(editorView);
    const handleOrderedList = () => insertMarkdownOrderedList(editorView);
    const handleTaskList = () => insertMarkdownTaskList(editorView);

    return (
        <ToolbarContainer ref={ref}>
            <ToolbarButtonGroup>
                {helperPaneToggle && (
                    <HelperPaneToggleButton
                        ref={helperPaneToggle.ref}
                        disabled={isPreviewMode}
                        isOpen={helperPaneToggle.isOpen}
                        onClick={helperPaneToggle.onClick}
                        sx={{ marginBottom: 0 }}
                    />
                )}

                <ToolbarDivider />

                <ToolbarButton title="Bold" disabled={isPreviewMode} onClick={handleBold} onMouseDown={handleMouseDown}>
                    <Icon name="bi-bold" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarButton title="Italic" disabled={isPreviewMode} onClick={handleItalic} onMouseDown={handleMouseDown}>
                    <Icon name="bi-italic" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarButton title="Inline Code" disabled={isPreviewMode} onClick={handleCode} onMouseDown={handleMouseDown}>
                    <Icon name="bi-code" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarButton title="Insert Link" disabled={isPreviewMode} onClick={handleLink} onMouseDown={handleMouseDown}>
                    <Icon name="bi-link" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarDivider />

                <ToolbarButton title="Heading" disabled={isPreviewMode} onClick={handleHeader} onMouseDown={handleMouseDown}>
                    <Icon name="bi-heading" sx={{ width: "24px", height: "24px", fontSize: "24px" }} />
                </ToolbarButton>

                <ToolbarButton title="Blockquote" disabled={isPreviewMode} onClick={handleQuote} onMouseDown={handleMouseDown}>
                    <Icon name="bi-quote" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarDivider />

                <ToolbarButton title="Bulleted List" disabled={isPreviewMode} onClick={handleUnorderedList} onMouseDown={handleMouseDown}>
                    <Icon name="bi-bulleted" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarButton title="Numbered List" disabled={isPreviewMode} onClick={handleOrderedList} onMouseDown={handleMouseDown}>
                    <Icon name="bi-numbered" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarButton title="Task List" disabled={isPreviewMode} onClick={handleTaskList} onMouseDown={handleMouseDown}>
                    <Icon name="bi-checklist" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>
            </ToolbarButtonGroup>

            {onTogglePreview && (
                <Switch
                    checked={isPreviewMode}
                    leftLabel="Edit"
                    rightLabel="Preview"
                    onChange={onTogglePreview}
                    checkedColor="var(--vscode-button-background)"
                    checkedBorder="1px solid color-mix(in srgb, var(--vscode-dropdown-border) 75%, transparent)"
                    enableTransition={false}
                    sx={{
                        borderColor: ThemeColors.OUTLINE_VARIANT
                    }}
                />
            )}
        </ToolbarContainer>
    );
});

TemplateMarkdownToolbar.displayName = 'TemplateMarkdownToolbar';
