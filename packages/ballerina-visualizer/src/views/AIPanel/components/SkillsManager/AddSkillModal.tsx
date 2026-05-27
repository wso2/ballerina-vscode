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

import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { AddSkillRequest, AvailableProject, SkillEntry, SkillScope, SkillTier } from "@wso2/ballerina-core";

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1999;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Dialog = styled.div`
    z-index: 2000;
    width: 480px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    font-family: var(--vscode-font-family);
    font-size: 13px;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const Title = styled.h2`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-icon-foreground);
    cursor: pointer;
    width: 22px;
    height: 22px;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
    }
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
`;

const TabRow = styled.div`
    display: flex;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const Tab = styled.button<{ active: boolean }>`
    background: transparent;
    border: none;
    color: ${(p: { active: boolean }) => p.active ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)"};
    font-weight: ${(p: { active: boolean }) => p.active ? 600 : 400};
    font-size: 12px;
    font-family: var(--vscode-font-family);
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 2px solid ${(p: { active: boolean }) => p.active ? "var(--vscode-focusBorder, var(--vscode-button-background))" : "transparent"};
    margin-bottom: -1px;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const Input = styled.input<{ readOnly?: boolean }>`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, var(--vscode-panel-border)));
    border-radius: 3px;
    padding: 6px 8px;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    width: 100%;
    box-sizing: border-box;
    opacity: ${(p: { readOnly?: boolean }) => p.readOnly ? 0.7 : 1};

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder, var(--vscode-button-background));
    }

    &::placeholder {
        color: var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground));
    }
`;

const Textarea = styled.textarea`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, var(--vscode-panel-border)));
    border-radius: 3px;
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    width: 100%;
    box-sizing: border-box;
    min-height: 64px;
    resize: vertical;

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder, var(--vscode-button-background));
    }

    &::placeholder {
        color: var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground));
    }
`;

const Select = styled.select`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, var(--vscode-panel-border)));
    border-radius: 3px;
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    width: 100%;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder, var(--vscode-button-background));
    }
`;

const Hint = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const Banner = styled.div`
    background: var(--vscode-inputValidation-errorBackground, rgba(255, 0, 0, 0.1));
    color: var(--vscode-errorForeground);
    border: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
    border-radius: 3px;
    padding: 6px 8px;
    font-size: 11px;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const BaseButton = styled.button`
    border-radius: 3px;
    padding: 4px 12px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    min-width: 64px;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const PrimaryButton = styled(BaseButton)`
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: 1px solid var(--vscode-button-background);

    &:hover:not(:disabled) {
        background: var(--vscode-button-hoverBackground, var(--vscode-button-background));
    }
`;

const SecondaryButton = styled(BaseButton)`
    background: var(--vscode-button-secondaryBackground, transparent);
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border: 1px solid var(--vscode-button-border, var(--vscode-widget-border, var(--vscode-panel-border)));

    &:hover:not(:disabled) {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground));
    }
`;

interface Props {
    isOpen: boolean;
    editSkill?: SkillEntry;
    availableProjects: AvailableProject[];
    onSubmit: (req: AddSkillRequest) => Promise<void>;
    onClose: () => void;
}

export const AddSkillModal: React.FC<Props> = ({ isOpen, editSkill, availableProjects, onSubmit, onClose }) => {
    const isEdit = !!editSkill;

    const [tier, setTier] = useState<SkillTier.CUSTOM | SkillTier.USER>(SkillTier.CUSTOM);
    const [name, setName] = useState('');
    const [trigger, setTrigger] = useState('');
    const [body, setBody] = useState('');
    const [scope, setScope] = useState<SkillScope>(SkillScope.PROJECT);
    const [packagePath, setPackagePath] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setTier(SkillTier.CUSTOM);
            setName('');
            setTrigger('');
            setBody('');
            setScope(SkillScope.PROJECT);
            setPackagePath(availableProjects[0]?.packagePath ?? '');
            setSubmitting(false);
            setSubmitError(null);
            return;
        }
        if (editSkill) {
            const rawName = editSkill.name;
            const plainName = rawName.includes('/') ? rawName.split('/').pop()! : rawName;
            setTier(editSkill.tier as SkillTier.CUSTOM | SkillTier.USER);
            setName(plainName);
            setTrigger(editSkill.trigger);
            setBody(editSkill.body ?? '');
            setScope(editSkill.scope ?? SkillScope.PROJECT);
            setPackagePath(editSkill.packagePath ?? availableProjects[0]?.packagePath ?? '');
            setSubmitError(null);
        } else {
            setPackagePath(availableProjects[0]?.packagePath ?? '');
        }
    }, [isOpen, editSkill, availableProjects]);

    if (!isOpen) return null;

    const canSubmit = !submitting && name.trim() !== '' && trigger.trim() !== ''
        && !(tier === SkillTier.CUSTOM && scope === SkillScope.INTEGRATION && !packagePath);

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            await onSubmit({
                tier,
                name: name.trim(),
                trigger: trigger.trim(),
                body: body.trim() || undefined,
                scope: tier === SkillTier.CUSTOM ? scope : undefined,
                packagePath: tier === SkillTier.CUSTOM && scope === SkillScope.INTEGRATION ? packagePath : undefined,
            });
            onClose();
        } catch (err: any) {
            setSubmitError(err?.message ?? String(err));
            setSubmitting(false);
        }
    };

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <Overlay onClick={onClose}>
            <Dialog role="dialog" aria-modal="true" onClick={stopPropagation}>
                <Header>
                    <Title>{isEdit ? "Edit skill" : "Add skill"}</Title>
                    <CloseButton type="button" aria-label="Close" onClick={onClose}>
                        <span className="codicon codicon-close" style={{ fontSize: 14 }} />
                    </CloseButton>
                </Header>

                <Body>
                    {submitError && <Banner>{submitError}</Banner>}

                    <FieldGroup>
                        <Label>Type</Label>
                        <TabRow>
                            <Tab
                                active={tier === SkillTier.CUSTOM}
                                disabled={isEdit}
                                onClick={() => !isEdit && setTier(SkillTier.CUSTOM)}
                            >
                                Custom
                            </Tab>
                            <Tab
                                active={tier === SkillTier.USER}
                                disabled={isEdit}
                                onClick={() => !isEdit && setTier(SkillTier.USER)}
                            >
                                User
                            </Tab>
                        </TabRow>
                        {isEdit ? (
                            <Hint>Type cannot be changed when editing. Delete and re-add to change.</Hint>
                        ) : tier === SkillTier.CUSTOM ? (
                            <Hint>Saved to your project or integration directory. Shared with your team.</Hint>
                        ) : (
                            <Hint>Saved globally to ~/.ballerina/copilot/skills/. Applies across all projects.</Hint>
                        )}
                    </FieldGroup>

                    <FieldGroup>
                        <Label htmlFor="skill-name">Name</Label>
                        <Input
                            id="skill-name"
                            type="text"
                            value={name}
                            onChange={(e) => !isEdit && setName(e.target.value)}
                            placeholder="e.g. sql-helper"
                            readOnly={isEdit}
                            autoFocus={!isEdit}
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label htmlFor="skill-trigger">Trigger / Description</Label>
                        <Input
                            id="skill-trigger"
                            type="text"
                            value={trigger}
                            onChange={(e) => setTrigger(e.target.value)}
                            placeholder="Describe when this skill should be used"
                        />
                    </FieldGroup>

                    <FieldGroup>
                        <Label htmlFor="skill-body">Body (optional)</Label>
                        <Textarea
                            id="skill-body"
                            value={body}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                            placeholder="Extended rules and instructions for this skill"
                            rows={4}
                        />
                    </FieldGroup>

                    {tier === SkillTier.CUSTOM && (
                        <FieldGroup>
                            <Label>Scope</Label>
                            <TabRow>
                                <Tab
                                    active={scope === SkillScope.PROJECT}
                                    onClick={() => setScope(SkillScope.PROJECT)}
                                >
                                    Project
                                </Tab>
                                <Tab
                                    active={scope === SkillScope.INTEGRATION}
                                    disabled={availableProjects.length === 0}
                                    onClick={() => availableProjects.length > 0 && setScope(SkillScope.INTEGRATION)}
                                >
                                    Integration
                                </Tab>
                            </TabRow>
                            {scope === SkillScope.INTEGRATION && availableProjects.length > 0 && (
                                <FieldGroup>
                                    <Label htmlFor="skill-integration">Integration</Label>
                                    <Select
                                        id="skill-integration"
                                        value={packagePath}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPackagePath(e.target.value)}
                                    >
                                        {availableProjects.map(p => (
                                            <option key={p.packagePath} value={p.packagePath}>{p.name}</option>
                                        ))}
                                    </Select>
                                </FieldGroup>
                            )}
                            {scope === SkillScope.INTEGRATION && availableProjects.length === 0 && (
                                <Hint>No integrations found in the current project.</Hint>
                            )}
                        </FieldGroup>
                    )}
                </Body>

                <Footer>
                    <SecondaryButton type="button" onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
                    <PrimaryButton type="button" onClick={handleSubmit} disabled={!canSubmit}>
                        {submitting ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "Save" : "Add")}
                    </PrimaryButton>
                </Footer>
            </Dialog>
        </Overlay>
    );
};

export default AddSkillModal;
