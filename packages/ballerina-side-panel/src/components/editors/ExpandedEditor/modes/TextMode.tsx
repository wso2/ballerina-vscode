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
import { EditorModeProps } from "./types";

const TextArea = styled.textarea`
    width: 100%;
    height: 100%;
    padding: 12px !important;
    fontSize: 13px;
    font-family: var(--vscode-editor-font-family);
    background: var(--input-background);
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
    resize: none;
    outline: none;
    box-sizing: border-box;

    &:focus {
        border-color: ${ThemeColors.OUTLINE};
        box-shadow: 0 0 0 1px ${ThemeColors.OUTLINE};
    }
`;

/**
 * Text mode editor - simple textarea without any formatting tools
 */
export const TextMode: React.FC<EditorModeProps> = ({ value, onChange, field }) => {
    return (
        <TextArea
            value={value}
            onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
            placeholder={field.placeholder || "Enter your text here..."}
            autoFocus
        />
    );
};
