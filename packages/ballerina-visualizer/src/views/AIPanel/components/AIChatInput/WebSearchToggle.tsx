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

import React from "react";
import styled from "@emotion/styled";

const ToggleButton = styled.button<{ isActive: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 4px;
    border: none;
    background-color: ${({ isActive }: { isActive: boolean }) =>
        isActive ? "var(--vscode-editor-inactiveSelectionBackground)" : "transparent"};
    color: ${({ isActive }: { isActive: boolean }) =>
        isActive ? "var(--vscode-editor-foreground)" : "var(--vscode-descriptionForeground)"};
    cursor: pointer;
    opacity: ${({ isActive }: { isActive: boolean }) => (isActive ? 1 : 0.5)};
    transition: background-color 0.1s, color 0.1s, opacity 0.1s;

    &:hover {
        opacity: 1;
        background-color: ${({ isActive }: { isActive: boolean }) =>
            isActive
                ? "var(--vscode-editor-inactiveSelectionBackground)"
                : "var(--vscode-toolbar-hoverBackground)"};
        color: ${({ isActive }: { isActive: boolean }) =>
            isActive ? "var(--vscode-editor-foreground)" : "var(--vscode-foreground)"};
    }
`;

export interface WebSearchToggleProps {
    isActive: boolean;
    onToggle: () => void;
}

const WebSearchToggle: React.FC<WebSearchToggleProps> = ({ isActive, onToggle }) => (
    <ToggleButton
        isActive={isActive}
        onClick={onToggle}
        title={isActive ? "Web access allowed — click to revoke" : "Allow web access"}
    >
        <span className="codicon codicon-globe" style={{ fontSize: 14 }} />
    </ToggleButton>
);

export default WebSearchToggle;
