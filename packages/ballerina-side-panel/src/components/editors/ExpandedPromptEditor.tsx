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
import { ExpressionEditor } from "./ExpressionEditor";
import { useFormContext } from '../../context';
import { FormField } from "../Form/types";
import { EXPANDED_EDITOR_HEIGHT } from "./MultiModeExpressionEditor/ChipExpressionEditor/constants";

interface ExpandedPromptEditorProps {
    isOpen: boolean;
    field: FormField;
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

const EditorContainer = styled.div`
    width: 100%;
    min-height: ${EXPANDED_EDITOR_HEIGHT}px;
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: ${ThemeColors.SURFACE};
    border-radius: 4px;
    box-sizing: border-box;

    &:focus-within {
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
    field,
    onClose,
    onSave,
}) => {
    const { form, expressionEditor, targetLineRange, fileName } = useFormContext();

    const handleSave = (value: string) => {
        onSave(value);
        onClose();
    };

    const handleCancel = () => {
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
                    <EditorContainer>
                        <ExpressionEditor
                            fileName={fileName}
                            targetLineRange={targetLineRange}
                            field={field}
                            {...form}
                            {...expressionEditor}
                            showHeader={false}
                            isInExpandedMode={true}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                    </EditorContainer>
                </ModalContent>
                <ButtonContainer>
                    <Button appearance="secondary" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button appearance="primary" onClick={() => handleSave(form.watch(field.key))}>
                        Save
                    </Button>
                </ButtonContainer>
            </ModalBox>
        </ModalContainer>,
        document.body
    );
};
