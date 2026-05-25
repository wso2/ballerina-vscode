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

import React, { useEffect, useState, useCallback } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { AddSkillRequest, AvailableProject, DeleteSkillRequest, SkillEntry } from "@wso2/ballerina-core";
import SkillRow from "./SkillRow";
import AddSkillForm from "./AddSkillForm";

// ─── Styled components ───────────────────────────────────────────────────────

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    opacity: 0.4;
    z-index: 2000;
`;

const Panel = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 480px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    box-shadow: var(--vscode-widget-shadow) 0px 4px 10px;
    z-index: 2001;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
`;

const Title = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    color: var(--vscode-icon-foreground);
    cursor: pointer;
    border-radius: 2px;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const Body = styled.div`
    overflow-y: auto;
    padding: 12px 16px;
    flex: 1;
`;

const TierSection = styled.div`
    margin-bottom: 20px;
`;

const TierHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;

const TierLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const TierDescription = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
`;

const Divider = styled.div`
    height: 1px;
    background-color: var(--vscode-panel-border);
    margin-bottom: 8px;
`;

const EmptyMessage = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    padding: 6px 0;
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 2px;
    background: transparent;
    color: var(--vscode-editor-foreground);
    cursor: pointer;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const LoadingMessage = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    padding: 20px 0;
    text-align: center;
`;

const ConfirmDeleteBox = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--vscode-editor-foreground);
`;

const ConfirmDeleteActions = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    margin-left: 12px;
`;

interface ConfirmButtonProps {
    danger?: boolean;
}

const ConfirmButton = styled.button<ConfirmButtonProps>`
    padding: 3px 10px;
    font-size: 12px;
    border-radius: 2px;
    cursor: pointer;
    border: 1px solid ${({ danger }: ConfirmButtonProps) =>
        danger ? "var(--vscode-errorForeground)" : "var(--vscode-panel-border)"};
    background-color: ${({ danger }: ConfirmButtonProps) =>
        danger ? "var(--vscode-errorForeground)" : "transparent"};
    color: ${({ danger }: ConfirmButtonProps) =>
        danger ? "var(--vscode-editor-background)" : "var(--vscode-editor-foreground)"};

    &:hover {
        opacity: 0.85;
    }
`;

// ─── Component ───────────────────────────────────────────────────────────────

interface SkillsManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const SkillsManager: React.FC<SkillsManagerProps> = ({ isOpen, onClose }) => {
    const { rpcClient } = useRpcContext();
    const [skills, setSkills] = useState<SkillEntry[]>([]);
    const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formState, setFormState] = useState<{
        tier: 'custom' | 'user';
        mode: 'add' | 'edit';
        skill?: SkillEntry;
    } | null>(null);
    const [confirmDeleteSkill, setConfirmDeleteSkill] = useState<SkillEntry | null>(null);

    const loadSkills = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await rpcClient.getAiPanelRpcClient().getSkills();
            setSkills(response.skills);
            setAvailableProjects(response.availableProjects);
        } catch (err) {
            console.error('[SkillsManager] Failed to load skills:', err);
        } finally {
            setIsLoading(false);
        }
    }, [rpcClient]);

    useEffect(() => {
        if (isOpen) {
            setFormState(null);
            setConfirmDeleteSkill(null);
            loadSkills();
        }
    }, [isOpen, loadSkills]);

    const handleToggle = async (skillId: string, enabled: boolean, tier: SkillEntry['tier']) => {
        setSkills(prev => prev.map(s => s.id === skillId ? { ...s, enabled } : s));
        try {
            await rpcClient.getAiPanelRpcClient().toggleSkill({ skillId, enabled, tier });
        } catch (err) {
            console.error('[SkillsManager] toggleSkill failed:', err);
            setSkills(prev => prev.map(s => s.id === skillId ? { ...s, enabled: !enabled } : s));
        }
    };

    const handleFormSubmit = async (req: AddSkillRequest) => {
        await rpcClient.getAiPanelRpcClient().addSkill(req);
        setFormState(null);
        await loadSkills();
    };

    const handleEditClick = (skill: SkillEntry) => {
        setConfirmDeleteSkill(null);
        setFormState({ tier: skill.tier as 'custom' | 'user', mode: 'edit', skill });
    };

    const handleDeleteClick = (skill: SkillEntry) => {
        setFormState(null);
        setConfirmDeleteSkill(skill);
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDeleteSkill) { return; }
        const req: DeleteSkillRequest = {
            skillId: confirmDeleteSkill.id,
            tier: confirmDeleteSkill.tier as 'custom' | 'user',
        };
        try {
            await rpcClient.getAiPanelRpcClient().deleteSkill(req);
        } catch (err) {
            console.error('[SkillsManager] deleteSkill failed:', err);
        }
        setConfirmDeleteSkill(null);
        await loadSkills();
    };

    if (!isOpen) { return null; }

    const builtinSkills = skills.filter(s => s.tier === 'builtin');
    const customSkills = skills.filter(s => s.tier === 'custom');
    const userSkills = skills.filter(s => s.tier === 'user');

    return (
        <>
            <Backdrop onClick={onClose} />
            <Panel>
                <Header>
                    <Title>Skills Manager</Title>
                    <CloseButton onClick={onClose} aria-label="Close" title="Close">
                        <span className="codicon codicon-close" style={{ fontSize: 14 }} />
                    </CloseButton>
                </Header>

                <Body>
                    {isLoading ? (
                        <LoadingMessage>Loading skills…</LoadingMessage>
                    ) : (
                        <>
                            {/* Built-in Skills */}
                            <TierSection>
                                <TierHeader>
                                    <TierLabel>Built-in Skills</TierLabel>
                                </TierHeader>
                                <TierDescription>
                                    Skills built into the assistant. Toggle to enable or disable.
                                </TierDescription>
                                <Divider />
                                {builtinSkills.length === 0 ? (
                                    <EmptyMessage>No built-in skills.</EmptyMessage>
                                ) : (
                                    builtinSkills.map(skill => (
                                        <SkillRow key={skill.id} skill={skill} onToggle={handleToggle} />
                                    ))
                                )}
                            </TierSection>

                            {/* Custom Skills */}
                            <TierSection>
                                <TierHeader>
                                    <TierLabel>Custom Skills</TierLabel>
                                    <AddButton onClick={() => {
                                        setConfirmDeleteSkill(null);
                                        setFormState(formState?.tier === 'custom' && formState.mode === 'add' ? null : { tier: 'custom', mode: 'add' });
                                    }}>
                                        <span className="codicon codicon-add" style={{ fontSize: 12 }} />
                                        Add Custom Skill
                                    </AddButton>
                                </TierHeader>
                                <TierDescription>
                                    Saved to your project or integration directory. Shared with your team.
                                </TierDescription>
                                <Divider />
                                {customSkills.length === 0 && formState?.tier !== 'custom' && (
                                    <EmptyMessage>No custom skills yet.</EmptyMessage>
                                )}
                                {customSkills.map(skill => (
                                    <React.Fragment key={skill.id}>
                                        <SkillRow
                                            skill={skill}
                                            onToggle={handleToggle}
                                            onEdit={handleEditClick}
                                            onDelete={handleDeleteClick}
                                        />
                                        {confirmDeleteSkill?.id === skill.id && (
                                            <ConfirmDeleteBox>
                                                <span>Delete <strong>{skill.name}</strong>? This cannot be undone.</span>
                                                <ConfirmDeleteActions>
                                                    <ConfirmButton onClick={() => setConfirmDeleteSkill(null)}>Cancel</ConfirmButton>
                                                    <ConfirmButton danger onClick={handleDeleteConfirm}>Delete</ConfirmButton>
                                                </ConfirmDeleteActions>
                                            </ConfirmDeleteBox>
                                        )}
                                        {formState?.mode === 'edit' && formState.skill?.id === skill.id && (
                                            <AddSkillForm
                                                tier="custom"
                                                availableProjects={availableProjects}
                                                onSubmit={handleFormSubmit}
                                                onCancel={() => setFormState(null)}
                                                editSkill={formState.skill}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                                {formState?.tier === 'custom' && formState.mode === 'add' && (
                                    <AddSkillForm
                                        tier="custom"
                                        availableProjects={availableProjects}
                                        onSubmit={handleFormSubmit}
                                        onCancel={() => setFormState(null)}
                                    />
                                )}
                            </TierSection>

                            {/* User Skills */}
                            <TierSection>
                                <TierHeader>
                                    <TierLabel>User Skills</TierLabel>
                                    <AddButton onClick={() => {
                                        setConfirmDeleteSkill(null);
                                        setFormState(formState?.tier === 'user' && formState.mode === 'add' ? null : { tier: 'user', mode: 'add' });
                                    }}>
                                        <span className="codicon codicon-add" style={{ fontSize: 12 }} />
                                        Add User Skill
                                    </AddButton>
                                </TierHeader>
                                <TierDescription>
                                    Saved globally to ~/.ballerina/copilot/skills/. Apply across all projects.
                                </TierDescription>
                                <Divider />
                                {userSkills.length === 0 && formState?.tier !== 'user' && (
                                    <EmptyMessage>No user skills yet.</EmptyMessage>
                                )}
                                {userSkills.map(skill => (
                                    <React.Fragment key={skill.id}>
                                        <SkillRow
                                            skill={skill}
                                            onToggle={handleToggle}
                                            onEdit={handleEditClick}
                                            onDelete={handleDeleteClick}
                                        />
                                        {confirmDeleteSkill?.id === skill.id && (
                                            <ConfirmDeleteBox>
                                                <span>Delete <strong>{skill.name}</strong>? This cannot be undone.</span>
                                                <ConfirmDeleteActions>
                                                    <ConfirmButton onClick={() => setConfirmDeleteSkill(null)}>Cancel</ConfirmButton>
                                                    <ConfirmButton danger onClick={handleDeleteConfirm}>Delete</ConfirmButton>
                                                </ConfirmDeleteActions>
                                            </ConfirmDeleteBox>
                                        )}
                                        {formState?.mode === 'edit' && formState.skill?.id === skill.id && (
                                            <AddSkillForm
                                                tier="user"
                                                availableProjects={[]}
                                                onSubmit={handleFormSubmit}
                                                onCancel={() => setFormState(null)}
                                                editSkill={formState.skill}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                                {formState?.tier === 'user' && formState.mode === 'add' && (
                                    <AddSkillForm
                                        tier="user"
                                        availableProjects={[]}
                                        onSubmit={handleFormSubmit}
                                        onCancel={() => setFormState(null)}
                                    />
                                )}
                            </TierSection>
                        </>
                    )}
                </Body>
            </Panel>
        </>
    );
};

export default SkillsManager;
