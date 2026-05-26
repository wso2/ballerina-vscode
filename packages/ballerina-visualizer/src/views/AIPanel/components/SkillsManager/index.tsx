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
import { Button, Codicon } from "@wso2/ui-toolkit";
import { AddSkillRequest, AvailableProject, DeleteSkillRequest, SkillEntry } from "@wso2/ballerina-core";
import { AIChatView } from "../../styles";
import SkillRow from "./SkillRow";
import AddSkillForm from "./AddSkillForm";

// ─── Styled components ───────────────────────────────────────────────────────

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
`;

const PanelTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
`;

const PanelContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
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
    onClose: () => void;
}

const SkillsManager: React.FC<SkillsManagerProps> = ({ onClose }) => {
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
        setFormState(null);
        setConfirmDeleteSkill(null);
        loadSkills();
    }, [loadSkills]);

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

    const builtinSkills = skills.filter(s => s.tier === 'builtin');
    const customSkills = skills.filter(s => s.tier === 'custom');
    const userSkills = skills.filter(s => s.tier === 'user');

    return (
        <AIChatView>
            <PanelHeader>
                <Button appearance="icon" onClick={onClose} tooltip="Back">
                    <Codicon name="arrow-left" />
                </Button>
                <PanelTitle>Skills</PanelTitle>
            </PanelHeader>

            <PanelContent>
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
                                Skills built into the assistant.
                            </TierDescription>
                            <Divider />
                            {builtinSkills.length === 0 ? (
                                <EmptyMessage>No built-in skills.</EmptyMessage>
                            ) : (
                                builtinSkills.map(skill => (
                                    <SkillRow key={skill.id} skill={skill} />
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
            </PanelContent>
        </AIChatView>
    );
};

export default SkillsManager;
