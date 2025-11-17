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
import { ThemeColors, Divider, Typography, CompletionItem, FnSignatureDocumentation, HelperPaneHeight } from "@wso2/ui-toolkit";
import { FormField, HelperpaneOnChangeOptions } from "../../Form/types";
import { EditorMode } from "./modes/types";
import { TextMode } from "./modes/TextMode";
import { PromptMode } from "./modes/PromptMode";
import { ExpressionMode } from "./modes/ExpressionMode";
import { TemplateMode } from "./modes/TemplateMode";
import { MinimizeIcon } from "../MultiModeExpressionEditor/ChipExpressionEditor/components/FloatingButtonIcons";
import { LineRange } from "@wso2/ballerina-core/lib/interfaces/common";
import { InputMode } from "../MultiModeExpressionEditor/ChipExpressionEditor/types";

interface ExpandedPromptEditorProps {
    isOpen: boolean;
    field: FormField;
    value: string;
    onClose: () => void;
    onSave: (value: string) => void;
    onChange: (updatedValue: string, updatedCursorPosition: number) => void;
    // Optional mode override (if not provided, will be auto-detected)
    mode?: EditorMode;
    // Expression mode specific props
    completions?: CompletionItem[];
    fileName?: string;
    targetLineRange?: LineRange;
    sanitizedExpression?: (value: string) => string;
    rawExpression?: (value: string) => string;
    extractArgsFromFunction?: (value: string, cursorPosition: number) => Promise<{
        label: string;
        args: string[];
        currentArgIndex: number;
        documentation?: FnSignatureDocumentation;
    }>;
    getHelperPane?: (
        value: string,
        onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
}

const ModalContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2001;
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
    z-index: 2001;
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
    padding: 8px 18px 16px;
    display: flex;
    flex-direction: column;
`;

const MinimizeButton = styled.div`
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: opacity 0.2s ease, background-color 0.2s ease;
    border-radius: 2px;

    &:hover {
        opacity: 1;
        background-color: var(--vscode-editor-inactiveSelectionBackground);
    }

    svg {
        width: 16px;
        height: auto;
    }
`;

const TitleWrapper = styled.div`
    margin: 12px 0;
    
    h3 {
        margin: 0;
    }
`;

/**
 * Map of mode components - add new modes here
 */
const MODE_COMPONENTS: Record<EditorMode, React.ComponentType<any>> = {
    text: TextMode,
    prompt: PromptMode,
    expression: ExpressionMode,
    template: TemplateMode
};

export const ExpandedEditor: React.FC<ExpandedPromptEditorProps> = ({
    isOpen,
    field,
    value,
    onClose,
    onChange,
    onSave,
    mode: propMode,
    completions,
    fileName,
    targetLineRange,
    sanitizedExpression,
    rawExpression,
    extractArgsFromFunction,
    getHelperPane
}) => {
    const promptFields = ["query", "instructions", "role"];

    // Determine mode - use prop if provided, otherwise auto-detect
    const defaultMode: EditorMode = propMode ?? (
        promptFields.includes(field.key) ? "prompt" : "text"
    );

    const [mode, setMode] = useState<EditorMode>(defaultMode);
    const [showPreview, setShowPreview] = useState(false);
    const [mouseDownTarget, setMouseDownTarget] = useState<EventTarget | null>(null);

    useEffect(() => {
        setMode(defaultMode);
    }, [defaultMode]);

    useEffect(() => {
        if (mode === "text") {
            setShowPreview(false);
        }
    }, [mode]);

    const handleMinimize = () => {
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
        value: value,
        onChange: onChange,
        field,
        // Props for modes with preview support
        ...(mode === "prompt" && {
            isPreviewMode: showPreview,
            onTogglePreview: (enabled: boolean) => setShowPreview(enabled)
        }),
        // Props for expression mode
        ...(mode === "expression" && {
            completions,
            fileName,
            targetLineRange,
            sanitizedExpression,
            rawExpression,
            extractArgsFromFunction,
            getHelperPane
        }),
        // Props for expression mode
        ...(mode === "template" && {
            completions,
            fileName,
            targetLineRange,
            sanitizedExpression,
            rawExpression,
            extractArgsFromFunction,
            getHelperPane,
            isPreviewMode: showPreview,
            onTogglePreview: (enabled: boolean) => setShowPreview(enabled)
        })
    };
    // HACK: Must find a proper central way to manager popups
    const targetEl = document.getElementById("visualizer-container");

    return targetEl ? createPortal(
        <ModalContainer onMouseDown={handleBackdropMouseDown} onClick={handleBackdropClick}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalHeaderSection>
                    <TitleWrapper>
                        <Typography variant="h3">{field.label}</Typography>
                    </TitleWrapper>
                    <MinimizeButton onClick={handleMinimize} title="Minimize">
                        <MinimizeIcon />
                    </MinimizeButton>
                </ModalHeaderSection>
                <div style={{ padding: "0 16px" }}>
                    <Divider sx={{ margin: 0 }} />
                </div>
                <ModalContent>
                    <ModeComponent {...modeProps} />
                </ModalContent>
            </ModalBox>
        </ModalContainer>,
        targetEl
    ) : null;
};
