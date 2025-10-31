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
import { ThemeColors, Codicon, Switch } from "@wso2/ui-toolkit";
import "@github/markdown-toolbar-element";

// Type declarations for GitHub markdown toolbar custom elements
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'markdown-toolbar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { for?: string }, HTMLElement>;
            'md-bold': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-italic': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-code': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-link': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-header': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { 'data-md-header'?: string }, HTMLElement>;
            'md-unordered-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-ordered-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-code-block': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

const ToolbarContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
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

interface MarkdownToolbarProps {
    /** ID of the textarea this toolbar controls */
    textareaId: string;
    /** Whether preview mode is active */
    isPreviewMode?: boolean;
    /** Callback to toggle preview mode */
    onTogglePreview?: () => void;
}

/**
 * Markdown formatting toolbar using GitHub's markdown-toolbar-element
 * Provides buttons for common markdown formatting operations
 */
export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
    textareaId,
    isPreviewMode = false,
    onTogglePreview
}) => {
    return (
        <ToolbarContainer>
            <markdown-toolbar for={textareaId}>
                <md-bold>
                    <ToolbarButton title="Bold (Ctrl/Cmd+B)" disabled={isPreviewMode}>
                        <Codicon name="bold" />
                    </ToolbarButton>
                </md-bold>
                <md-italic>
                    <ToolbarButton title="Italic (Ctrl/Cmd+I)" disabled={isPreviewMode}>
                        <Codicon name="italic" />
                    </ToolbarButton>
                </md-italic>
                <md-code>
                    <ToolbarButton title="Inline Code" disabled={isPreviewMode}>
                        <Codicon name="code" />
                    </ToolbarButton>
                </md-code>
                <md-link>
                    <ToolbarButton title="Insert Link (Ctrl/Cmd+K)" disabled={isPreviewMode}>
                        <Codicon name="link" />
                    </ToolbarButton>
                </md-link>

                <ToolbarDivider />

                <md-header data-md-header="2">
                    <ToolbarButton title="Heading 2" disabled={isPreviewMode}>
                        <Codicon name="symbol-text" />
                    </ToolbarButton>
                </md-header>

                <ToolbarDivider />

                <md-unordered-list>
                    <ToolbarButton title="Bulleted List" disabled={isPreviewMode}>
                        <Codicon name="list-unordered" />
                    </ToolbarButton>
                </md-unordered-list>
                <md-ordered-list>
                    <ToolbarButton title="Numbered List" disabled={isPreviewMode}>
                        <Codicon name="list-ordered" />
                    </ToolbarButton>
                </md-ordered-list>

                <ToolbarDivider />

                <md-code-block>
                    <ToolbarButton title="Code Block" disabled={isPreviewMode}>
                        <Codicon name="file-code" />
                    </ToolbarButton>
                </md-code-block>
            </markdown-toolbar>

            {onTogglePreview && (
                <Switch
                    checked={isPreviewMode}
                    leftLabel="Edit"
                    rightLabel="Preview"
                    onChange={onTogglePreview}
                    checkedColor="var(--vscode-button-background)"
                    enableTransition={true}
                    sx={{
                        borderColor: ThemeColors.SURFACE_DIM
                    }}
                />
            )}
        </ToolbarContainer>
    );
};
