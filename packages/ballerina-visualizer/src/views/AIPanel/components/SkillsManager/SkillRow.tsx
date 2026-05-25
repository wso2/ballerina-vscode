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
import { SkillEntry } from "@wso2/ballerina-core";

const Row = styled.div`
    display: flex;
    align-items: center;
    padding: 6px 0;
    gap: 8px;
`;

const Info = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
`;

const SkillName = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const SkillTrigger = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

const SwitchLabel = styled.label`
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 28px;
    height: 14px;
    cursor: pointer;
    flex-shrink: 0;
`;

const SwitchInput = styled.input`
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    margin: 0;

    &:checked + span {
        background-color: var(--vscode-button-background);
    }

    &:checked + span::after {
        transform: translateX(14px);
    }
`;

const SwitchTrack = styled.span`
    position: absolute;
    inset: 0;
    border-radius: 7px;
    background-color: var(--vscode-titleBar-inactiveForeground);
    opacity: 0.5;
    transition: background-color 0.15s;

    &::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: var(--vscode-editor-background);
        transition: transform 0.15s;
    }
`;

const IconButton = styled.button<{ danger?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: ${({ danger }: { danger?: boolean }) =>
        danger ? "var(--vscode-errorForeground)" : "var(--vscode-descriptionForeground)"};
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.1s, background-color 0.1s;

    &:hover {
        opacity: 1;
        background-color: ${({ danger }: { danger?: boolean }) =>
            danger ? "var(--vscode-inputValidation-errorBackground)" : "var(--vscode-toolbar-hoverBackground)"};
    }
`;

interface SkillRowProps {
    skill: SkillEntry;
    onToggle: (skillId: string, enabled: boolean, tier: SkillEntry['tier']) => void;
    onEdit?: (skill: SkillEntry) => void;
    onDelete?: (skill: SkillEntry) => void;
}

const SkillRow: React.FC<SkillRowProps> = ({ skill, onToggle, onEdit, onDelete }) => {
    const isEditable = skill.tier === 'custom' || skill.tier === 'user';

    return (
        <Row>
            <Info>
                <SkillName title={skill.name}>{skill.name}</SkillName>
                <SkillTrigger title={skill.trigger}>{skill.trigger}</SkillTrigger>
            </Info>
            <Actions>
                <SwitchLabel title={skill.enabled ? "Enabled" : "Disabled"}>
                    <SwitchInput
                        type="checkbox"
                        checked={skill.enabled}
                        onChange={(e) => onToggle(skill.id, e.target.checked, skill.tier)}
                    />
                    <SwitchTrack />
                </SwitchLabel>
                {isEditable && onEdit && (
                    <IconButton
                        title="Edit skill"
                        aria-label="Edit skill"
                        onClick={() => onEdit(skill)}
                    >
                        <span className="codicon codicon-edit" style={{ fontSize: 13 }} />
                    </IconButton>
                )}
                {isEditable && onDelete && (
                    <IconButton
                        danger
                        title="Delete skill"
                        aria-label="Delete skill"
                        onClick={() => onDelete(skill)}
                    >
                        <span className="codicon codicon-trash" style={{ fontSize: 13 }} />
                    </IconButton>
                )}
            </Actions>
        </Row>
    );
};

export default SkillRow;
