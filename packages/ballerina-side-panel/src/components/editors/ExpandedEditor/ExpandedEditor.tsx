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
import { ThemeColors, Divider, Typography } from "@wso2/ui-toolkit";
import { FormField } from "../../Form/types";
import { EditorMode } from "./modes/types";
import { TextMode } from "./modes/TextMode";
import { PromptMode } from "./modes/PromptMode";
import { CompressButton } from "../MultiModeExpressionEditor/ChipExpressionEditor/components/FloatingButtonIcons";

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
    width: 1000px;
    max-width: 95vw;
    min-width: 800px;
    height: 80vh;
    max-height: 90vh;
    min-height: 600px;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: auto;
    padding: 8px 8px;
    border-radius: 3px;
    background-color: ${ThemeColors.SURFACE_DIM};
    box-shadow: 0 3px 8px rgb(0 0 0 / 0.2);
    z-index: 30001;
    resize: both;
`;

const ModalHeaderSection = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 16px;
    margin-bottom: 4px;
`;

const ModalContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 18px 16px;
    display: flex;
    flex-direction: column;
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
    const [mouseDownTarget, setMouseDownTarget] = useState<EventTarget | null>(null);

    useEffect(() => {
        setEditedValue(value);
    }, [value, isOpen]);

    useEffect(() => {
        if (mode === "text") {
            setShowPreview(false);
        }
    }, [mode]);

    const handleMinimize = () => {
        onSave(editedValue);
        onClose();
    };

    const handleBackdropMouseDown = (e: React.MouseEvent) => {
        setMouseDownTarget(e.target);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        // Only close if both mousedown and click happened on the backdrop
        if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
            handleMinimize();
        }
        setMouseDownTarget(null);
    };

    if (!isOpen) return null;

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
        <ModalContainer onMouseDown={handleBackdropMouseDown} onClick={handleBackdropClick}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalHeaderSection>
                    <Typography variant="h3">{field.label}</Typography>
                    <div onClick={handleMinimize} title="Minimize" style={{ cursor: 'pointer' }}>
                        <CompressButton />
                    </div>
                </ModalHeaderSection>
                <div style={{ padding: "0 16px" }}>
                    <Divider sx={{ margin: 0 }} />
                </div>
                <ModalContent>
                    <ModeComponent {...modeProps} />
                </ModalContent>
            </ModalBox>
        </ModalContainer>,
        document.body
    );
};
