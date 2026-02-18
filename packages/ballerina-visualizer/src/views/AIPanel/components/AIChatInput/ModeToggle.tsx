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

const ToggleGroup = styled.div`
    display: flex;
    align-items: center;
    height: 24px;
    padding: 2px;
    gap: 1px;
    border-radius: 6px;
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    margin-right: 4px;
`;

const ToggleOption = styled.button<{ active?: boolean }>`
    display: flex;
    align-items: center;
    gap: 4px;
    height: 100%;
    padding: 0 5px;
    border: none;
    border-radius: 4px;
    background-color: ${(props: { active?: boolean }) =>
        props.active ? "var(--vscode-button-background)" : "transparent"};
    color: ${(props: { active?: boolean }) =>
        props.active ? "var(--vscode-button-foreground)" : "var(--vscode-descriptionForeground)"};
    cursor: pointer;
    font-size: 11px;
    white-space: nowrap;
    transition: background-color 0.1s, color 0.1s;

    &:hover {
        background-color: ${(props: { active?: boolean }) =>
            props.active
                ? "var(--vscode-button-background)"
                : "var(--vscode-toolbar-hoverBackground)"};
        color: ${(props: { active?: boolean }) =>
            props.active
                ? "var(--vscode-button-foreground)"
                : "var(--vscode-foreground)"};
    }
`;

export enum AgentMode {
    Edit = "edit",
    Plan = "plan",
}

export interface ModeToggleProps {
    mode: AgentMode;
    onChange: (mode: AgentMode) => void;
    disabled?: boolean;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange, disabled }) => (
    <ToggleGroup style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
        <ToggleOption
            active={mode === AgentMode.Edit}
            title="Direct file edits"
            onClick={() => onChange(AgentMode.Edit)}
        >
            <span className="codicon codicon-edit" style={{ fontSize: 11 }} />
            Edit
        </ToggleOption>
        <ToggleOption
            active={mode === AgentMode.Plan}
            title="Design first, then build"
            onClick={() => onChange(AgentMode.Plan)}
        >
            <span className="codicon codicon-list-tree" style={{ fontSize: 11 }} />
            Plan
        </ToggleOption>
    </ToggleGroup>
);

export default ModeToggle;
