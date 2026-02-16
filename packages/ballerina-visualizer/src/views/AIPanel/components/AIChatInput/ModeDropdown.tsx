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

import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";

const Trigger = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 6px;
    background-color: transparent;
    color: var(--vscode-icon-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    margin-right: 4px;
    white-space: nowrap;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }

    &:active {
        background-color: var(--vscode-toolbar-activeBackground);
    }
`;

const Panel = styled.div`
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    z-index: 100;
    background-color: var(--vscode-quickInput-background);
    border: none;
    border-radius: 6px;
    padding: 6px;
    min-width: 190px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;


const OptionRow = styled.button<{ active?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: 4px;
    background-color: ${(props: { active?: boolean }) =>
        props.active ? "var(--vscode-list-activeSelectionBackground)" : "transparent"};
    color: ${(props: { active?: boolean }) =>
        props.active ? "var(--vscode-list-activeSelectionForeground)" : "var(--vscode-editor-foreground)"};
    cursor: pointer;
    text-align: left;
    font-size: 12px;

    &:hover {
        background-color: ${(props: { active?: boolean }) =>
            props.active
                ? "var(--vscode-list-activeSelectionBackground)"
                : "var(--vscode-list-hoverBackground)"};
    }
`;

const OptionIcon = styled.span`
    margin-top: 1px;
    flex-shrink: 0;
    font-size: 14px;
`;

const OptionText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const OptionLabel = styled.span`
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
`;

const OptionDesc = styled.span`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.3;
`;

export interface ModeDropdownProps {
    isPlanModeEnabled: boolean;
    onTogglePlanMode: (value: boolean) => void;
}

const ModeDropdown: React.FC<ModeDropdownProps> = ({ isPlanModeEnabled, onTogglePlanMode }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <Trigger title="Agent mode" onClick={() => setOpen((o) => !o)}>
                <span
                    className={`codicon ${isPlanModeEnabled ? "codicon-list-tree" : "codicon-edit"}`}
                    style={{ fontSize: 12 }}
                />
                {isPlanModeEnabled ? "Plan" : "Edit"}
            </Trigger>

            {open && (
                <Panel>
                    <OptionRow
                        active={!isPlanModeEnabled}
                        onClick={() => { onTogglePlanMode(false); setOpen(false); }}
                    >
                        <OptionIcon className="codicon codicon-edit" />
                        <OptionText>
                            <OptionLabel>Edit</OptionLabel>
                            <OptionDesc>Direct file edits</OptionDesc>
                        </OptionText>
                    </OptionRow>
                    <OptionRow
                        active={isPlanModeEnabled}
                        onClick={() => { onTogglePlanMode(true); setOpen(false); }}
                    >
                        <OptionIcon className="codicon codicon-list-tree" />
                        <OptionText>
                            <OptionLabel>Plan</OptionLabel>
                            <OptionDesc>Design first, then build</OptionDesc>
                        </OptionText>
                    </OptionRow>
                </Panel>
            )}
        </div>
    );
};

export default ModeDropdown;
