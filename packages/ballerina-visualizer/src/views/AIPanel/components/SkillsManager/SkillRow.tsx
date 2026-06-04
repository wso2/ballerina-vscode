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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { SkillEntry, SkillTier } from "@wso2/ballerina-core";
import { SecondaryActionButton, DangerActionButton } from "../../styles";

// ─── Styled components (matching MCP's ServerCard pattern) ───────────────────

const Card = styled.div`
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 6px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 6px;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CardName = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CardDescription = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const BuiltinRow = styled.div`
    display: flex;
    flex-direction: column;
    padding: 4px 0;
    margin-bottom: 4px;
`;

const ActionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
`;

const Spacer = styled.div`
    flex: 1;
`;

const ConfirmRow = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--vscode-foreground);
`;

const ActionButton = SecondaryActionButton;
const DeleteButton = DangerActionButton;

const ToggleTrack = styled.button<{ enabled: boolean }>`
    width: 36px;
    height: 20px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    position: relative;
    background: ${({ enabled }: { enabled: boolean }) =>
        enabled ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground, #555)'};
    transition: background 0.2s;
    &:hover { opacity: 0.85; }
`;

const ToggleKnob = styled.span<{ enabled: boolean }>`
    position: absolute;
    top: 2px;
    left: ${({ enabled }: { enabled: boolean }) => enabled ? '18px' : '2px'};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--vscode-button-foreground, #fff);
    transition: left 0.2s;
`;

const getShortName = (name: string) =>
    name.includes('/') ? name.split('/').pop()! : name;

// ─── Component ───────────────────────────────────────────────────────────────

interface SkillRowProps {
    skill: SkillEntry;
    onToggle?: (skill: SkillEntry, enabled: boolean) => void;
    onEdit?: (skill: SkillEntry) => void;
    onDelete?: (skill: SkillEntry) => void;
}

const SkillRow: React.FC<SkillRowProps> = ({ skill, onToggle, onEdit, onDelete }) => {
    const isEditable = skill.tier === SkillTier.PROJECT || skill.tier === SkillTier.USER;
    const [confirming, setConfirming] = useState(false);
    const shortName = getShortName(skill.name);
    const enabled = skill.enabled !== false;

    if (skill.tier === SkillTier.BUILTIN) {
        return (
            <BuiltinRow>
                <CardHeader>
                    <CardName title={skill.name}>{shortName}</CardName>
                    {onToggle && (
                        <ToggleTrack
                            type="button"
                            enabled={enabled}
                            title={enabled ? 'Disable skill' : 'Enable skill'}
                            onClick={() => onToggle(skill, !enabled)}
                        >
                            <ToggleKnob enabled={enabled} />
                        </ToggleTrack>
                    )}
                </CardHeader>
                {skill.trigger && <CardDescription title={skill.trigger}>{skill.trigger}</CardDescription>}
            </BuiltinRow>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardName title={skill.name}>{shortName}</CardName>
                {onToggle && (
                    <ToggleTrack
                        type="button"
                        enabled={enabled}
                        title={enabled ? 'Disable skill' : 'Enable skill'}
                        onClick={() => onToggle(skill, !enabled)}
                    >
                        <ToggleKnob enabled={enabled} />
                    </ToggleTrack>
                )}
            </CardHeader>
            {skill.trigger && <CardDescription title={skill.trigger}>{skill.trigger}</CardDescription>}

            {isEditable && (onEdit || onDelete) && (
                <ActionRow>
                    {confirming ? (
                        <ConfirmRow>
                            <span>Delete <strong>{shortName}</strong>?</span>
                            <Spacer />
                            <DeleteButton type="button" onClick={() => { setConfirming(false); onDelete?.(skill); }}>
                                Yes, delete
                            </DeleteButton>
                            <ActionButton type="button" onClick={() => setConfirming(false)}>
                                Cancel
                            </ActionButton>
                        </ConfirmRow>
                    ) : (
                        <>
                            <Spacer />
                            {onEdit && (
                                <ActionButton type="button" onClick={() => onEdit(skill)}>
                                    Edit
                                </ActionButton>
                            )}
                            {onDelete && (
                                <DeleteButton type="button" onClick={() => setConfirming(true)}>
                                    Delete
                                </DeleteButton>
                            )}
                        </>
                    )}
                </ActionRow>
            )}
        </Card>
    );
};

export default SkillRow;
