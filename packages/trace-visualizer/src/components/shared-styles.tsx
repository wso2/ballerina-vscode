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

/**
 * Shared styled component for highlighting search matches
 */
export const Highlight = styled.mark`
    background-color: var(--vscode-editor-findMatchHighlightBackground, #ffcc00);
    color: inherit;
    padding: 0 1px;
    border-radius: 2px;
`;

/**
 * Shared wrapper for copy buttons that appear on hover
 */
export const CopyWrapper = styled.span`
    opacity: 0;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
`;

/**
 * Shared toggle group container for toggle buttons
 */
export const ToggleGroup = styled.div`
    display: flex;
    gap: 2px;
`;

/**
 * Props for ToggleButton
 */
export interface ToggleButtonProps {
    active: boolean;
}

/**
 * Shared toggle button component
 */
export const ToggleButton = styled.button<ToggleButtonProps>`
    padding: 4px 10px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
    cursor: pointer;
    transition: all 0.15s ease;

    background-color: ${(props: ToggleButtonProps) =>
        props.active
            ? 'var(--vscode-badge-background)'
            : 'var(--vscode-input-background)'};
    color: ${(props: ToggleButtonProps) =>
        props.active
            ? 'var(--vscode-badge-foreground)'
            : 'var(--vscode-foreground)'};

    &:first-of-type {
        border-radius: 3px 0 0 3px;
    }

    &:last-of-type {
        border-radius: 0 3px 3px 0;
    }

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

/**
 * Shared "no results" container
 */
export const NoResultsContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    gap: 12px;
`;

/**
 * Shared "no results" title
 */
export const NoResultsTitle = styled.div`
    font-size: 18px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

/**
 * Shared clear search button
 */
export const ClearSearchButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: transparent;
    border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
    border-radius: 4px;
    color: var(--vscode-foreground);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }

    &:active {
        transform: scale(0.98);
    }
`;
