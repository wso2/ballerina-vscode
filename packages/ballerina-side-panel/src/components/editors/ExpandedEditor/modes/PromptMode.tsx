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

import React, { useState, useRef } from "react";
import styled from "@emotion/styled";
import { EditorView as CodeMirrorView } from "@codemirror/view";
import { EditorView as ProseMirrorView } from "prosemirror-view";
import { EditorModeExpressionProps } from "./types";
import { ChipExpressionEditorComponent } from "../../MultiModeExpressionEditor/ChipExpressionEditor/components/ChipExpressionEditor";
import { RichTextTemplateEditor } from "../../MultiModeExpressionEditor/RichTextTemplateEditor/RichTextTemplateEditor";
import { RichTemplateMarkdownToolbar } from "../controls/RichTemplateMarkdownToolbar";
import { RawTemplateMarkdownToolbar } from "../controls/RawTemplateMarkdownToolbar";
import { ErrorBanner } from "@wso2/ui-toolkit";
import { RawTemplateEditorConfig, StringTemplateEditorConfig } from "../../MultiModeExpressionEditor/Configurations";

const ExpressionContainer = styled.div`
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;
`;

const SIMPLE_PROMPT_FIELDS = ["query", "instructions", "role"];

export const PromptMode: React.FC<EditorModeExpressionProps> = ({
    value,
    onChange,
    field,
    completions = [],
    fileName,
    targetLineRange,
    sanitizedExpression,
    extractArgsFromFunction,
    getHelperPane,
    rawExpression,
    error,
    formDiagnostics,
    inputMode
}) => {
    // Detect if this is a simple prompt field (text-only, no advanced features)
    const isSimpleMode = SIMPLE_PROMPT_FIELDS.includes(field.key) && !getHelperPane;

    const [isSourceView, setIsSourceView] = useState<boolean>(false);
    const [codeMirrorView, setCodeMirrorView] = useState<CodeMirrorView | null>(null);
    const [proseMirrorView, setProseMirrorView] = useState<ProseMirrorView | null>(null);
    const [helperPaneToggle, setHelperPaneToggle] = useState<{
        ref: React.RefObject<HTMLButtonElement>;
        isOpen: boolean;
        onClick: () => void;
    } | null>(null);
    const richToolbarRef = useRef<HTMLDivElement>(null);
    const rawToolbarRef = useRef<HTMLDivElement>(null);

    // Convert onChange signature from (value: string) => void to (value: string, cursorPosition: number) => void
    const handleChange = (updatedValue: string, updatedCursorPosition: number) => {
        onChange(updatedValue, updatedCursorPosition);
    };

    const handleHelperPaneStateChange = (state: {
        isOpen: boolean;
        ref: React.RefObject<HTMLButtonElement>;
        toggle: () => void;
    }) => {
        setHelperPaneToggle({
            ref: state.ref,
            isOpen: state.isOpen,
            onClick: state.toggle
        });
    };

    const handleToggleView = () => {
        setIsSourceView(!isSourceView);
    };

    return (
        <>
            {isSourceView ? (
                <RawTemplateMarkdownToolbar
                    ref={rawToolbarRef}
                    editorView={codeMirrorView}
                    isSourceView={isSourceView}
                    onToggleView={handleToggleView}
                    hideHelperPaneToggle={isSimpleMode}
                    helperPaneToggle={helperPaneToggle || undefined}
                />
            ) : (
                <RichTemplateMarkdownToolbar
                    ref={richToolbarRef}
                    editorView={proseMirrorView}
                    isSourceView={isSourceView}
                    onToggleView={handleToggleView}
                    hideHelperPaneToggle={isSimpleMode}
                    helperPaneToggle={helperPaneToggle || undefined}
                />
            )}
            {isSourceView ? (
                <ExpressionContainer>
                    <ChipExpressionEditorComponent
                        value={value}
                        onChange={handleChange}
                        completions={isSimpleMode ? [] : completions}
                        sanitizedExpression={sanitizedExpression}
                        fileName={fileName}
                        targetLineRange={targetLineRange}
                        extractArgsFromFunction={isSimpleMode ? undefined : extractArgsFromFunction}
                        getHelperPane={isSimpleMode ? undefined : getHelperPane}
                        rawExpression={rawExpression}
                        isInExpandedMode={true}
                        isExpandedVersion={true}
                        showHelperPaneToggle={false}
                        onHelperPaneStateChange={handleHelperPaneStateChange}
                        onEditorViewReady={setCodeMirrorView}
                        toolbarRef={isSimpleMode ? undefined : rawToolbarRef}
                        enableListContinuation={true}
                        inputMode={inputMode}
                        configuration={field.valueTypeConstraint === "string" ? new StringTemplateEditorConfig() : new RawTemplateEditorConfig()}
                    />
                </ExpressionContainer>
            ) : (
                <ExpressionContainer>
                    <RichTextTemplateEditor
                        value={value}
                        onChange={handleChange}
                        completions={isSimpleMode ? [] : completions}
                        fileName={fileName}
                        targetLineRange={targetLineRange}
                        extractArgsFromFunction={isSimpleMode ? undefined : extractArgsFromFunction}
                        getHelperPane={isSimpleMode ? undefined : getHelperPane}
                        onEditorViewReady={setProseMirrorView}
                        onHelperPaneStateChange={handleHelperPaneStateChange}
                        configuration={field.valueTypeConstraint === "string" ? new StringTemplateEditorConfig() : new RawTemplateEditorConfig()}
                    />
                </ExpressionContainer>
            )
            }
            {error ?
                <ErrorBanner sx={{ maxHeight: "50px", overflowY: "auto" }} errorMsg={error.message.toString()} /> :
                formDiagnostics && formDiagnostics.length > 0 &&
                <ErrorBanner sx={{ maxHeight: "50px", overflowY: "auto" }} errorMsg={formDiagnostics.map(d => d.message).join(', ')} />
            }
        </>
    );
};
