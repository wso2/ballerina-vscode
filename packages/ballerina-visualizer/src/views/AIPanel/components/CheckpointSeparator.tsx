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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";

interface CheckpointSeparatorProps {
    checkpointId?: string;
    isAvailable: boolean;
    isDisabled: boolean;
    isCreating?: boolean;
    isGroupHovered: boolean;
    onRestore: (checkpointId: string) => void;
}

const SeparatorContainer = styled.div`
    position: relative;
    margin: 0 -20px 16px -20px;
    padding: 8px 20px;
`;

const SeparatorLine = styled.div<{ visible: boolean }>`
    display: flex;
    align-items: center;
    opacity: ${(props: { visible: boolean }) => props.visible ? 1 : 0};
    transition: opacity 0.2s ease;
`;

const GradientLine = styled.div<{ direction: 'left' | 'right' }>`
    flex: 1;
    height: 1px;
    background: linear-gradient(
        to ${(props: { direction: 'left' | 'right' }) => props.direction === 'left' ? 'right' : 'left'},
        transparent 0%,
        var(--vscode-editorWidget-border) 30%
    );
`;

const RestoreLabel = styled.button<{ disabled: boolean }>`
    background: none;
    border: none;
    padding: 0 8px;
    display: flex;
    align-items: center;
    cursor: ${(props: { disabled: boolean }) => props.disabled ? 'not-allowed' : 'pointer'};
    white-space: nowrap;
    pointer-events: ${(props: { disabled: boolean }) => props.disabled ? 'none' : 'auto'};
`;

const LabelContent = styled.span<{ labelOpacity: number }>`
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    font-family: var(--vscode-font-family);
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: ${(props: { labelOpacity: number }) => props.labelOpacity};
    transition: opacity 0.2s ease;
`;

const CreatingLabel = styled.div`
    color: var(--vscode-descriptionForeground);
    padding: 0 8px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    white-space: nowrap;
`;

const CheckpointSeparator: React.FC<CheckpointSeparatorProps> = ({
    checkpointId,
    isAvailable,
    isDisabled,
    isCreating = false,
    isGroupHovered,
    onRestore
}) => {
    const [isLabelHovered, setIsLabelHovered] = useState(false);

    const handleClick = () => {
        if (!isDisabled && isAvailable && checkpointId) {
            onRestore(checkpointId);
        }
    };

    const effectiveDisabled = isDisabled || !isAvailable;

    const labelOpacity = isGroupHovered ? (isLabelHovered ? 1 : 0.5) : 0;

    return (
        <SeparatorContainer>
            <SeparatorLine visible={isGroupHovered}>
                <GradientLine direction="left" />
                {isCreating ? (
                    <CreatingLabel>
                        Creating a checkpoint...
                    </CreatingLabel>
                ) : (
                    <RestoreLabel
                        disabled={effectiveDisabled}
                        onMouseEnter={() => setIsLabelHovered(true)}
                        onMouseLeave={() => setIsLabelHovered(false)}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClick();
                        }}
                    >
                        <LabelContent labelOpacity={labelOpacity}>
                            Restore Checkpoint
                            <Icon name="Restore" sx={{ height: "14px", width: "14px", display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ fontSize: "14px", lineHeight: "1", display: "block" }} />
                        </LabelContent>
                    </RestoreLabel>
                )}
                <GradientLine direction="right" />
            </SeparatorLine>
        </SeparatorContainer>
    );
};

export default CheckpointSeparator;
