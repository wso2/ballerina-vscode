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
import { keyframes } from "@emotion/react";
import { CHIP_EXPRESSION_EDITOR_HEIGHT } from "./constants";
import { ThemeColors } from "@wso2/ui-toolkit";

export const ChipEditorField = styled.div`
    font-family: monospace;
    font-size: 12px;
    min-height: ${CHIP_EXPRESSION_EDITOR_HEIGHT}px;
    height: 100%;
    width: 100%;
    padding: 1px 25px 1px 8px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground, #000000);
    white-space: pre-wrap;
    outline: none;
    border: 1px solid var(--vscode-dropdown-border);
    word-break: break-all;
    position: relative;
    overflow: auto;

    &:focus {
        outline: 1px solid var(--vscode-focusBorder, #0078d4);
    }
`;

export const ChipEditorContainer = styled.div`
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    width: 100%;
    max-width: 100%;
    margin-top: 4px;
`;

export const Chip = styled.div`
    border-radius: 4px;
    background-color: rgba(0, 122, 204, 0.3);
    color: var(--vscode-input-foreground, white); /* Updated text color */
    cursor: pointer;
    margin: 2px 0px;
    font-size: 12px;
    padding: 2px 10px;
    display: inline-block;
    min-height: 20px;
    min-width: 25px;
    transition: all 0.2s ease;
    outline: none;
    vertical-align: middle;
    user-select: none;
    -webkit-user-select: none;

    &:hover {
        background-color: rgba(0, 122, 204, 0.5);
    }

    &:active {
        box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.8);
        background-color: ${ThemeColors.PRIMARY};
    }
`;

export const COMPLETIONS_WIDTH = 300;

export const ContextMenuContainer = styled.div<{ top: number; left: number }>`
    position: absolute;
    top: ${props => props.top}px;
    left: ${props => props.left}px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    z-index: 1600;
    min-width: 120px;
    width: ${COMPLETIONS_WIDTH}px;
    overflow: hidden;
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

export const InvisibleSpan = styled.span`
    min-height: 20px;
    min-width: 15px;
    border: none;
    outline: none;
    background: transparent;
    box-shadow: none;
    padding: 3px 3px 0 0;
    margin: 0;
    padding-top: 3px;
    border-radius: 0;
    background-color: transparent;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    text-decoration: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;

    &:focus {
        outline: none;
        border: none;
        box-shadow: none;
    }

    &:active {
        outline: none;
        border: none;
        box-shadow: none;
    }

    &:hover {
        outline: none;
        border: none;
        box-shadow: none;
        background-color: transparent;
    }

    &::before,
    &::after {
        border: none;
        outline: none;
        box-shadow: none;
    }
`;

const CompletionsadeInUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0px);
    }
`;

export const Completions = styled.div`
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    border: 1px solid ${ThemeColors.OUTLINE};
    width: 100%;
    max-height: 300px;
    overflow-y: auto;
    position: static;
    padding: 2px 0px;
    border-radius: 3px;
    z-index: 2001;
    animation: ${CompletionsadeInUp} 0.3s ease forwards;
`

export const DescriptionWrapper = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2001;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    color: var(--vscode-input-foreground, white);
    width: fit-content;
    height: fit-content;
    padding: 4px 8px; 
    border-radius: 2px;
    border: 1px solid ${ThemeColors.OUTLINE};
    font-size: 14px;
    pointer-events: none; 
    transform: translateX(-100%);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25); 
`;

export const CompletionsItemEl = styled.div<CompletionsItemElProps>`
    height: 25px;
    display: flex;
    justify-content: space-between;
    padding: 0px 5px;
    align-items: center;
    background-color: ${(props: CompletionsItemElProps) =>
        props.isSelected
            ? 'var(--vscode-list-activeSelectionBackground)'
            : ThemeColors.SURFACE_BRIGHT};
    color: var(--vscode-input-foreground, #000000); /* Updated text color */

    &:hover {
        background-color: ${ThemeColors.OUTLINE_VARIANT};
        cursor: pointer;
    }
`;

export const CompletionsTag = styled.div`
    color: ${ThemeColors.ON_SURFACE_VARIANT}
`

interface CompletionsItemElProps {
    isSelected?: boolean;
}

// Floating toggle button styles - VS Code design philosophy
export const FloatingButtonContainer = styled.div`
    position: absolute;
    bottom: 6px;
    right: 6px; 
    display: flex;
    gap: 6px;
    z-index: 1500;
`;

export const FloatingToggleButton = styled.button<{ isActive: boolean }>`
    width: 16px;
    height: 16px;
    border: 1px solid ${props => props.isActive ? ThemeColors.PRIMARY : ThemeColors.OUTLINE};
    border-radius: 2px;
    background-color: ${props => props.isActive ? ThemeColors.PRIMARY : ThemeColors.SURFACE_CONTAINER};
    color: ${props => props.isActive ? ThemeColors.ON_PRIMARY : ThemeColors.ON_SURFACE_VARIANT};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 600;
    transition: background-color 0.1s ease, border-color 0.1s ease, color 0.1s ease, transform 0.1s ease;
    outline: none;
    padding: 0;
    box-shadow: ${props => props.isActive ? `0 0 0 1px ${ThemeColors.PRIMARY}` : '0 1px 2px rgba(0, 0, 0, 0.15)'};

    &:hover {
        background-color: ${props => props.isActive ? ThemeColors.PRIMARY_CONTAINER : ThemeColors.SURFACE_CONTAINER};
        border-color: ${props => props.isActive ? ThemeColors.PRIMARY : ThemeColors.OUTLINE_VARIANT};
        transform: scale(1.05);
        
        svg {
            color: ${ThemeColors.PRIMARY}cc;
        }
    }

    &:active {
        background-color: ${props => props.isActive ? ThemeColors.PRIMARY : ThemeColors.SURFACE_CONTAINER};
    }

    &:focus-visible {
        outline: 1px solid ${ThemeColors.PRIMARY};
        outline-offset: 2px;
    }
`;

export const ExpandedPopupContainer = styled.div`
    flex: 1;
    position: absolute;
    width: 765px;
    padding: 50px 10px 10px 10px;
    height: 85%;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

export const Spinner = styled.span`
    display: inline-block;
    position: absolute;
    margin: auto;
    font-size: 14px;
    animation: ${spin} 1s linear infinite;
`;

const loading = keyframes`
    0% {
        background: var(--vscode-editor-background);
    }
    100% {
        background: var(--vscode-editor-inactiveSelectionBackground);
    }
`;

export const SkeletonLoader = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--vscode-editor-background);
    z-index: 1000;
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 2px;
    overflow: hidden;
    pointer-events: none;
    animation: ${loading} 1s infinite alternate;
`;
