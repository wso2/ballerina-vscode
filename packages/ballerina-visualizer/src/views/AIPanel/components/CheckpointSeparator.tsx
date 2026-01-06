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

import React from "react";
import styled from "@emotion/styled";

interface CheckpointSeparatorProps {
    checkpointId?: string;
    isAvailable: boolean;
    isDisabled: boolean;
    isCreating?: boolean;
    onRestore: (checkpointId: string) => void;
}

const SeparatorContainer = styled.div<{ disabled: boolean }>`
    position: relative;
    margin: 0 -20px 16px -20px;
    padding: 0 20px;
    cursor: ${(props: { disabled: boolean }) => props.disabled ? 'not-allowed' : 'pointer'};
    opacity: ${(props: { disabled: boolean }) => props.disabled ? 0.5 : 1};

    &:hover .separator-button {
        opacity: 1;
    }

    @media (hover: none) {
        .separator-button {
            opacity: 1;
        }
    }
`;

const SeparatorLine = styled.div`
    border-top: 2px dashed var(--vscode-editorWidget-border);
    position: relative;
`;

const RestoreButton = styled.button<{ disabled: boolean }>`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 3px;
    cursor: ${(props: { disabled: boolean }) => props.disabled ? 'not-allowed' : 'pointer'};
    opacity: 0;
    transition: opacity 0.2s ease;
    white-space: nowrap;
    pointer-events: ${(props: { disabled: boolean }) => props.disabled ? 'none' : 'auto'};

    &:hover:not(:disabled) {
        background: var(--vscode-button-secondaryHoverBackground);
    }
`;

const CreatingText = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 3px;
    white-space: nowrap;
    opacity: 1;
`;

const CheckpointSeparator: React.FC<CheckpointSeparatorProps> = ({
    checkpointId,
    isAvailable,
    isDisabled,
    isCreating = false,
    onRestore
}) => {
    const handleClick = () => {
        if (!isDisabled && isAvailable && checkpointId) {
            onRestore(checkpointId);
        }
    };

    const effectiveDisabled = isDisabled || !isAvailable;

    return (
        <SeparatorContainer disabled={effectiveDisabled} onClick={handleClick}>
            <SeparatorLine>
                {isCreating ? (
                    <CreatingText>
                        Creating a checkpoint ...
                    </CreatingText>
                ) : (
                    <RestoreButton
                        className="separator-button"
                        disabled={effectiveDisabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClick();
                        }}
                    >
                        ↺ Restore to checkpoint
                    </RestoreButton>
                )}
            </SeparatorLine>
        </SeparatorContainer>
    );
};

export default CheckpointSeparator;
