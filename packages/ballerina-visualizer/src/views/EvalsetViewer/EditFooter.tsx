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
import { Icon } from "@wso2/ui-toolkit";

const FooterContainer = styled.div`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--vscode-editorWidget-background);
    border-top: 1px solid var(--vscode-widget-border);
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 100;
`;

const UnsavedIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
`;

const Dot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--vscode-notificationsWarningIcon-foreground);
`;

const Actions = styled.div`
    display: flex;
    gap: 12px;
`;

const DiscardButton = styled.button`
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
    }
`;

const SaveButton = styled.button`
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover {
        background-color: var(--vscode-button-hoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

interface EditFooterProps {
    hasUnsavedChanges: boolean;
    isSaving?: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onRequestDiscardConfirmation?: () => void;
}

export const EditFooter: React.FC<EditFooterProps> = ({
    hasUnsavedChanges,
    isSaving = false,
    onSave,
    onDiscard,
    onRequestDiscardConfirmation,
}) => {
    const handleDiscard = () => {
        if (hasUnsavedChanges && onRequestDiscardConfirmation) {
            onRequestDiscardConfirmation();
        } else {
            onDiscard();
        }
    };

    return (
        <FooterContainer>
            <UnsavedIndicator>
                {hasUnsavedChanges && (
                    <>
                        <Dot />
                        <span>Unsaved changes</span>
                    </>
                )}
            </UnsavedIndicator>
            <Actions>
                <DiscardButton onClick={handleDiscard} disabled={isSaving}>
                    <Icon
                        name="bi-close"
                        iconSx={{
                            fontSize: "16px",
                        }}
                    />
                    Discard
                </DiscardButton>
                <SaveButton onClick={onSave} disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Icon
                                name="bi-spinner"
                                iconSx={{
                                    fontSize: "16px",
                                }}
                            />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Icon
                                name="bi-save"
                                iconSx={{
                                    fontSize: "16px",
                                }}
                            />
                            Save Case
                        </>
                    )}
                </SaveButton>
            </Actions>
        </FooterContainer>
    );
};
