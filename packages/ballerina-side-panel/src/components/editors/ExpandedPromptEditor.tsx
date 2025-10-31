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

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { ThemeColors, Codicon, Divider, Typography, Button } from "@wso2/ui-toolkit";

interface ExpandedPromptEditorProps {
    isOpen: boolean;
    value: string;
    onClose: () => void;
    onSave: (value: string) => void;
}

const ModalContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 30000;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: color-mix(in srgb, ${ThemeColors.SECONDARY_CONTAINER} 70%, transparent);
    font-family: GilmerRegular;
`;

const ModalBox = styled.div`
    width: 800px;
    max-height: 90vh;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px 8px;
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    box-shadow: 0 3px 8px rgb(0 0 0 / 0.2);
    z-index: 30001;
`;

const ModalHeaderSection = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 16px;
    margin-bottom: 8px;
`;

const ModalContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 500px;
    padding: 12px;
    fontSize: 13px;
    font-family: var(--vscode-editor-font-family);
    background-color: ${ThemeColors.SURFACE};
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
    resize: vertical;
    outline: none;
    box-sizing: border-box;

    &:focus {
        border-color: ${ThemeColors.OUTLINE};
        box-shadow: 0 0 0 1px ${ThemeColors.OUTLINE};
    }
`;

const ButtonContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 16px 8px 16px;
`;

export const ExpandedPromptEditor: React.FC<ExpandedPromptEditorProps> = ({
    isOpen,
    value,
    onClose,
    onSave,
}) => {
    const [editedValue, setEditedValue] = useState(value);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setEditedValue(value);
    }, [value, isOpen]);

    const handleSave = () => {
        onSave(editedValue);
        onClose();
    };

    const handleCancel = () => {
        setEditedValue(value);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <ModalContainer>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalHeaderSection>
                    <Typography sx={{ margin: "10px 0" }}>
                        Edit Prompt
                    </Typography>
                    <div onClick={handleCancel} style={{ cursor: 'pointer' }}>
                        <Codicon name="close" />
                    </div>
                </ModalHeaderSection>
                <Divider sx={{ margin: 0 }} />
                <ModalContent>
                    <TextArea
                        ref={textareaRef}
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        placeholder="Enter your prompt here..."
                        autoFocus
                    />
                </ModalContent>
                <ButtonContainer>
                    <Button appearance="secondary" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button appearance="primary" onClick={handleSave}>
                        Save
                    </Button>
                </ButtonContainer>
            </ModalBox>
        </ModalContainer>,
        document.body
    );
};
