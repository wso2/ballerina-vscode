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

import styled from "@emotion/styled";
import { CHIP_EXPRESSION_EDITOR_HEIGHT } from "./constants";
import { ThemeColors } from "@wso2/ui-toolkit";

export const ChipEditorField = styled.div`
    font-family: monospace;
    font-size: 12px;
    min-height: ${CHIP_EXPRESSION_EDITOR_HEIGHT}px;
    width: 100%;
    padding: 5px 8px;
    background-color: ${ThemeColors.OUTLINE_VARIANT};
    white-space: pre-wrap;
    outline: none;
    border: none;
    word-break: break-all;
`;

export const ChipEditorContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 100%;
`;

export const Chip = styled.div`
    border-radius: 4px;
    background-color: rgba(0, 122, 204, 0.3);
    color: white;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 10px;
    display: inline-block;
    transition: all 0.2s ease;
    outline: none;
    user-select: none;
    -webkit-user-select: none;

    &:hover {
        background-color: rgba(0, 122, 204, 0.5);
    }

    &:active {
        box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.8);
    }
`

export const ChipMenu = styled.div<{ top: number; left: number }>`
    position: absolute;
    top: ${props => props.top}px;
    left: ${props => props.left}px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    border: 1px solid ${ThemeColors.ON_SURFACE};
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    min-width: 120px;
`;

export const ChipMenuItem = styled.div`
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE};
    
    &:hover {
        background-color: ${ThemeColors.SURFACE};
    }
`
