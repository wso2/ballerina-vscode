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
import { TextField, TextArea, Dropdown } from "@wso2/ui-toolkit";
import { AddSkillRequest, AvailableProject, SkillScope, SkillTier } from "@wso2/ballerina-core";

const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    background-color: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin-top: 8px;
`;

const FormTitle = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
    margin-bottom: 2px;
`;

const ScopeRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ScopeLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const RadioGroup = styled.div`
    display: flex;
    gap: 16px;
`;

const RadioLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    cursor: pointer;
`;

const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
`;

interface ActionButtonProps {
    primary?: boolean;
}

const ActionButton = styled.button<ActionButtonProps>`
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 2px;
    border: 1px solid var(--vscode-panel-border);
    cursor: pointer;
    background-color: ${({ primary }: ActionButtonProps) =>
        primary ? "var(--vscode-button-background)" : "transparent"};
    color: ${({ primary }: ActionButtonProps) =>
        primary ? "var(--vscode-button-foreground)" : "var(--vscode-editor-foreground)"};

    &:hover {
        background-color: ${({ primary }: ActionButtonProps) =>
            primary ? "var(--vscode-button-hoverBackground)" : "var(--vscode-list-hoverBackground)"};
    }

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

interface AddSkillFormProps {
    tier: SkillTier.CUSTOM | SkillTier.USER;
    availableProjects: AvailableProject[];
    onSubmit: (req: AddSkillRequest) => Promise<void>;
    onCancel: () => void;
    editSkill?: { name: string; trigger: string; body?: string; scope?: SkillScope; packagePath?: string };
}

const AddSkillForm: React.FC<AddSkillFormProps> = ({ tier, availableProjects, onSubmit, onCancel, editSkill }) => {
    const isEditMode = !!editSkill;
    const rawName = editSkill?.name ?? '';
    const plainName = rawName.includes('/') ? rawName.split('/').pop()! : rawName;
    const [name, setName] = useState(plainName);
    const [trigger, setTrigger] = useState(editSkill?.trigger ?? '');
    const [body, setBody] = useState(editSkill?.body ?? '');
    const [scope, setScope] = useState<SkillScope>(editSkill?.scope ?? SkillScope.PROJECT);
    const [packagePath, setPackagePath] = useState(editSkill?.packagePath ?? availableProjects[0]?.packagePath ?? '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isValid = name.trim() !== '' && trigger.trim() !== ''
        && !(tier === SkillTier.CUSTOM && scope === SkillScope.INTEGRATION && !packagePath);

    const handleSubmit = async () => {
        if (!isValid || isSubmitting) { return; }
        setIsSubmitting(true);
        try {
            await onSubmit({
                tier,
                name: name.trim(),
                trigger: trigger.trim(),
                body: body.trim() || undefined,
                scope: tier === SkillTier.CUSTOM ? scope : undefined,
                packagePath: tier === SkillTier.CUSTOM && scope === SkillScope.INTEGRATION ? packagePath : undefined,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = isEditMode
        ? (tier === SkillTier.CUSTOM ? 'Edit Custom Skill' : 'Edit User Skill')
        : (tier === SkillTier.CUSTOM ? 'Add Custom Skill' : 'Add User Skill');

    return (
        <Form>
            <FormTitle>{title}</FormTitle>

            <TextField
                id="skill-name"
                label="Name"
                placeholder="e.g. sql-helper"
                value={name}
                onTextChange={setName}
                readOnly={isEditMode}
                sx={isEditMode ? { opacity: 0.7 } : undefined}
            />

            <TextField
                id="skill-trigger"
                label="Trigger / Description"
                placeholder="Describe when this skill should be used"
                value={trigger}
                onTextChange={setTrigger}
            />

            <TextArea
                id="skill-body"
                label="Body (optional)"
                placeholder="Extended rules and instructions for this skill"
                rows={4}
                value={body}
                onTextChange={setBody}
            />

            {tier === SkillTier.CUSTOM && (
                <ScopeRow>
                    <ScopeLabel>Scope</ScopeLabel>
                    <RadioGroup>
                        <RadioLabel>
                            <input
                                type="radio"
                                value={SkillScope.PROJECT}
                                checked={scope === SkillScope.PROJECT}
                                onChange={() => setScope(SkillScope.PROJECT)}
                            />
                            Project
                        </RadioLabel>
                        <RadioLabel>
                            <input
                                type="radio"
                                value={SkillScope.INTEGRATION}
                                checked={scope === SkillScope.INTEGRATION}
                                onChange={() => setScope(SkillScope.INTEGRATION)}
                            />
                            Integration
                        </RadioLabel>
                    </RadioGroup>

                    {scope === SkillScope.INTEGRATION && availableProjects.length > 0 && (
                        <Dropdown
                            id="skill-integration"
                            label="Integration"
                            value={packagePath}
                            items={availableProjects.map(p => ({ value: p.packagePath, content: p.name }))}
                            onValueChange={setPackagePath}
                        />
                    )}
                    {scope === SkillScope.INTEGRATION && availableProjects.length === 0 && (
                        <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
                            No integrations found in the current project.
                        </span>
                    )}
                </ScopeRow>
            )}

            <FormActions>
                <ActionButton onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </ActionButton>
                <ActionButton primary onClick={handleSubmit} disabled={!isValid || isSubmitting}>
                    {isSubmitting ? (isEditMode ? 'Saving…' : 'Adding…') : (isEditMode ? 'Save Changes' : 'Add Skill')}
                </ActionButton>
            </FormActions>
        </Form>
    );
};

export default AddSkillForm;
