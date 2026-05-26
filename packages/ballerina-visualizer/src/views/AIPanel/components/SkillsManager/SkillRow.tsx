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
    onEdit?: (skill: SkillEntry) => void;
    onDelete?: (skill: SkillEntry) => void;
}

const SkillRow: React.FC<SkillRowProps> = ({ skill, onEdit, onDelete }) => {
    const isEditable = skill.tier === 'custom' || skill.tier === 'user';

    return (
        <Row>
            <Info>
                <SkillName title={skill.name}>{skill.name}</SkillName>
                <SkillTrigger title={skill.trigger}>{skill.trigger}</SkillTrigger>
            </Info>
            <Actions>
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
