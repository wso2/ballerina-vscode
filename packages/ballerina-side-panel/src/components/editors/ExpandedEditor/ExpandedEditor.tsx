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
import { ThemeColors, Codicon, Divider, Button } from "@wso2/ui-toolkit";
import { FormField } from "../../Form/types";
import { S } from "../ExpressionEditor";
import ReactMarkdown from "react-markdown";
import { EditorMode } from "./modes/types";
import { TextMode } from "./modes/TextMode";
import { PromptMode } from "./modes/PromptMode";

interface ExpandedPromptEditorProps {
    isOpen: boolean;
    field: FormField;
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

const ButtonContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 16px 8px 16px;
`;

/**
 * Map of mode components - add new modes here
 */
const MODE_COMPONENTS: Record<EditorMode, React.ComponentType<any>> = {
    text: TextMode,
    prompt: PromptMode
};

export const ExpandedEditor: React.FC<ExpandedPromptEditorProps> = ({
    isOpen,
    field,
    value,
    onClose,
    onSave,
}) => {
    const [editedValue, setEditedValue] = useState(value);
    const promptFields = ["query", "instructions", "role"];
    const defaultMode: EditorMode = promptFields.includes(field.key) ? "prompt" : "text";
    const [mode] = useState<EditorMode>(defaultMode);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        setEditedValue(value);
    }, [value, isOpen]);

    useEffect(() => {
        if (mode === "text") {
            setShowPreview(false);
        }
    }, [mode]);

    const handleSave = () => {
        onSave(editedValue);
        onClose();
    };

    const handleCancel = () => {
        setEditedValue(value);
        onClose();
    };

    if (!isOpen) return null;

    const documentation = field.documentation
        ? field.documentation.endsWith('.')
            ? field.documentation
            : `${field.documentation}.`
        : '';

    const defaultValueText = field.defaultValue ?
        <S.DefaultValue>Defaults to {field.defaultValue}</S.DefaultValue> : null;

    // Get the current mode component
    const ModeComponent = MODE_COMPONENTS[mode];

    // Prepare props for the mode component
    const modeProps = {
        value: editedValue,
        onChange: setEditedValue,
        field,
        // Props for modes with preview support
        ...(mode === "prompt" && {
            isPreviewMode: showPreview,
            onTogglePreview: () => setShowPreview(!showPreview)
        })
    };

    return createPortal(
        <ModalContainer>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalHeaderSection>
                    <div style={{ margin: "10px 0" }}>
                        <S.HeaderContainer>
                            <S.LabelContainer>
                                <S.Label>{field.label}</S.Label>
                            </S.LabelContainer>
                        </S.HeaderContainer>
                        <S.EditorMdContainer>
                            {documentation && <ReactMarkdown>{documentation}</ReactMarkdown>}
                            {defaultValueText}
                        </S.EditorMdContainer>
                    </div>
                    <div onClick={handleCancel} style={{ cursor: 'pointer' }}>
                        <Codicon name="close" />
                    </div>
                </ModalHeaderSection>
                <Divider sx={{ margin: 0 }} />
                <ModalContent>
                    <ModeComponent {...modeProps} />
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
