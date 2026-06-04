/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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
import { FooterContainer } from "./index";
import { FooterBox, FooterDivider } from "./styles";

// ── Styled components ─────────────────────────────────────────────────────────

const SectionLabel = styled.div`
    font-size: 11px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
`;

const SkillPreview = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
`;

const SkillName = styled.div`
    font-size: 13px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    color: var(--vscode-editor-foreground);
`;

const SkillTrigger = styled.div`
    font-size: 12px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    line-height: 1.4;
`;

const TierRow = styled.div`
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
    flex-wrap: wrap;
`;

const TierButton = styled.button<{ selected: boolean }>`
    background: ${({ selected }: { selected: boolean }) =>
        selected
            ? "var(--vscode-list-inactiveSelectionBackground, var(--vscode-list-hoverBackground))"
            : "transparent"};
    border: 1px solid ${({ selected }: { selected: boolean }) =>
        selected ? "var(--vscode-focusBorder, var(--vscode-input-border))" : "var(--vscode-input-border)"};
    border-radius: 4px;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
    font-size: 12px;
    padding: 5px 12px;
    cursor: pointer;
    font-weight: ${({ selected }: { selected: boolean }) => selected ? 600 : 400};

    &:hover:not(:disabled) {
        background: var(--vscode-list-hoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ActionRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const SaveButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    font-family: var(--vscode-font-family);
    font-size: 12px;
    font-weight: 500;
    padding: 5px 12px;
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) {
        background: var(--vscode-button-hoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const CancelButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family);
    font-size: 12px;
    padding: 5px 8px;
    cursor: pointer;
    border-radius: 3px;

    &:hover:not(:disabled) {
        color: var(--vscode-editor-foreground);
        background: var(--vscode-list-hoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface SkillSaveFooterProps {
    requestId: string;
    name: string;
    trigger: string;
    body?: string;
    rpcClient: any;
}

// ── Component ─────────────────────────────────────────────────────────────────

const SkillSaveFooter: React.FC<SkillSaveFooterProps> = ({ requestId, name, trigger, rpcClient }) => {
    const [tier, setTier] = useState<"user" | "project">("user");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await rpcClient?.getAiPanelRpcClient().saveSkillFromChat({
                requestId,
                tier: tier === "user" ? "user" : "project",
            });
        } catch (e) {
            console.error("[SkillSaveFooter] save error:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = async () => {
        try {
            await rpcClient?.getAiPanelRpcClient().cancelSkillSave({ requestId });
        } catch (e) {
            console.error("[SkillSaveFooter] cancel error:", e);
        }
    };

    return (
        <FooterContainer>
            <FooterBox>
                <SectionLabel>Save skill</SectionLabel>

                <SkillPreview>
                    <SkillName>{name}</SkillName>
                    <SkillTrigger>{trigger}</SkillTrigger>
                </SkillPreview>

                <SectionLabel>Save as</SectionLabel>
                <TierRow>
                    <TierButton selected={tier === "user"} onClick={() => setTier("user")} disabled={isSaving}>
                        User
                    </TierButton>
                    <TierButton selected={tier === "project"} onClick={() => setTier("project")} disabled={isSaving}>
                        Project
                    </TierButton>
                </TierRow>

                <FooterDivider />

                <ActionRow>
                    <SaveButton
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving
                            ? <><span className="codicon codicon-loading codicon-modifier-spin" style={{ fontSize: "11px" }} /> Saving...</>
                            : <><span className="codicon codicon-save" style={{ fontSize: "11px" }} /> Save skill</>
                        }
                    </SaveButton>
                    <CancelButton onClick={handleCancel} disabled={isSaving}>
                        Cancel
                    </CancelButton>
                </ActionRow>
            </FooterBox>
        </FooterContainer>
    );
};

export default SkillSaveFooter;
