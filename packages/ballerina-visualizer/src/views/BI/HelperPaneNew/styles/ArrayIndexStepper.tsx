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

import styled from "@emotion/styled";
import { ThemeColors } from "@wso2/ui-toolkit";

export const ArrayIndexRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0px 8px 4px;
    padding: 4px 12px;
    background-color: ${ThemeColors.SURFACE_DIM_2};
    border-radius: 6px;
`;

export const ArrayIndexLabel = styled.span`
    font-size: 11px;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.7;
`;

export const ArrayIndexControls = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
`;

export const ArrayIndexStepButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    color: ${ThemeColors.HIGHLIGHT};
    font-size: 16px;
    line-height: 1;
    padding: 0 2px;
    user-select: none;

    &:disabled {
        cursor: not-allowed;
        opacity: 0.3;
        color: ${ThemeColors.ON_SURFACE};
    }
`;

export const ArrayIndexBadge = styled.span`
    font-size: 11px;
    min-width: 22px;
    text-align: center;
    padding: 2px 6px;
    border-radius: 4px;
    background-color: var(--vscode-chat-slashCommandBackground);
    color: var(--vscode-chat-slashCommandForeground);
    font-variant-numeric: tabular-nums;
`;
