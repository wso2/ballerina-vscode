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
    min-height: 500px;
    padding: 12px !important;
    fontSize: 13px;
    font-family: var(--vscode-editor-font-family);
    background: var(--input-background);
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

const TEXTAREA_ID = "prompt-textarea";

/**
 * Prompt mode editor - textarea with markdown toolbar and preview support
 */
export const PromptMode: React.FC<EditorModeWithPreviewProps> = ({
    value,
    onChange,
    isPreviewMode
}) => {
    if (isPreviewMode) {
        return <MarkdownPreview content={value} />;
    }

    return (
        <>
            <MarkdownToolbar textareaId={TEXTAREA_ID} />
            <TextArea
                id={TEXTAREA_ID}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter your text here..."
                autoFocus
            />
        </>
    );
};
