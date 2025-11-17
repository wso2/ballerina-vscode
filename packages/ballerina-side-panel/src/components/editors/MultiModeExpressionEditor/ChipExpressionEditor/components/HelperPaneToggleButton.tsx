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
import { OpenHelperIcon, CloseHelperIcon } from "./FloatingButtonIcons";
import { ThemeColors } from "@wso2/ui-toolkit";

interface HelperPaneToggleButtonProps {
    isOpen: boolean;
    onClick: () => void;
    sx?: React.CSSProperties;
}

const OutlineButton = styled.button<{ isOpen: boolean }>`
    padding: 6px 12px;
    border-radius: 3px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    background-color: ${props => props.isOpen
        ? ThemeColors.SURFACE
        : ThemeColors.SURFACE_BRIGHT};
    color: ${ThemeColors.ON_SURFACE};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 28px;
    width: 120px;
    cursor: pointer;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    outline: none;
    transition: all 0.15s ease;
    white-space: nowrap;
    min-width: fit-content;
    margin-bottom: 8px;

    &:hover {
        background-color: ${ThemeColors.SURFACE};
    }

    &:active {
        background-color: ${ThemeColors.SURFACE};
    }

    svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        pointer-events: none;
    }
`;

const ButtonText = styled.span`
    font-size: 12px;
    font-weight: 500;
    pointer-events: none;
`;

export const HelperPaneToggleButton = React.forwardRef<HTMLButtonElement, HelperPaneToggleButtonProps>(({
    isOpen,
    onClick,
    sx
}, ref) => {

    return (
        <OutlineButton
            ref={ref}
            onClick={onClick}
            type="button"
            aria-label="Toggle helper panel"
            aria-pressed={isOpen}
            tabIndex={-1}
            isOpen={isOpen}
            style={sx}
        >
            {isOpen ? <CloseHelperIcon /> : <OpenHelperIcon />}
            <ButtonText>Helper Panel</ButtonText>
        </OutlineButton>
    );
});
