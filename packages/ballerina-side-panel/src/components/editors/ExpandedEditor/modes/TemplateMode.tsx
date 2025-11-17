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

import React, { useEffect, useState, useRef } from "react";
import styled from "@emotion/styled";
import { EditorView } from "@codemirror/view";
import { EditorModeExpressionProps } from "./types";
import { ChipExpressionEditorComponent } from "../../MultiModeExpressionEditor/ChipExpressionEditor/components/ChipExpressionEditor";
import { CodeMirrorMarkdownToolbar } from "../controls/CodeMirrorMarkdownToolbar";
import { MarkdownPreview } from "../controls/MarkdownPreview";
import { transformExpressionToMarkdown } from "../utils/transformToMarkdown";
import { useFormContext } from "../../../../context/form";

const ExpressionContainer = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
`;

export const TemplateMode: React.FC<EditorModeExpressionProps> = ({
    value,
    onChange,
    completions = [],
    fileName,
    targetLineRange,
    sanitizedExpression,
    extractArgsFromFunction,
    getHelperPane,
    rawExpression,
    isPreviewMode = false,
    onTogglePreview
}) => {
    const [transformedContent, setTransformedContent] = useState<string>("");
    const [editorView, setEditorView] = useState<EditorView | null>(null);
    const [helperPaneToggle, setHelperPaneToggle] = useState<{
        ref: React.RefObject<HTMLButtonElement>;
        isOpen: boolean;
        onClick: () => void;
    } | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    // Convert onChange signature from (value: string) => void to (value: string, cursorPosition: number) => void
    const handleChange = (updatedValue: string, updatedCursorPosition: number) => {
        onChange(updatedValue, updatedCursorPosition);
    };

    // Transform expression to markdown when entering preview mode
    useEffect(() => {
        const transformContent = async () => {
            if (isPreviewMode && value && expressionEditorRpcManager) {
                try {
                    // Fetch token stream from language server
                    const tokenStream = await expressionEditorRpcManager.getExpressionTokens(
                        value,
                        fileName,
                        targetLineRange?.startLine
                    );

                    // Get sanitized value for display
                    const displayValue = sanitizedExpression ? sanitizedExpression(value) : value;

                    if (tokenStream && tokenStream.length > 0) {
                        // Transform expression with tokens to markdown with chip tags
                        const markdown = transformExpressionToMarkdown(displayValue, tokenStream);
                        setTransformedContent(markdown);
                    } else {
                        // No tokens, use sanitized value as-is
                        setTransformedContent(displayValue);
                    }
                } catch (error) {
                    console.error('Error transforming expression to markdown:', error);
                    // Fallback to sanitized value on error
                    const displayValue = sanitizedExpression ? sanitizedExpression(value) : value;
                    setTransformedContent(displayValue);
                }
            }
        };

        transformContent();
    }, [isPreviewMode, value, fileName, targetLineRange?.startLine, expressionEditorRpcManager, sanitizedExpression]);

    // Only show toolbar and preview if preview props are provided
    const hasPreviewSupport = onTogglePreview !== undefined;

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

    return (
        <>
            {hasPreviewSupport && (
                <CodeMirrorMarkdownToolbar
                    ref={toolbarRef}
                    editorView={editorView}
                    isPreviewMode={isPreviewMode}
                    onTogglePreview={() => onTogglePreview(!isPreviewMode)}
                    helperPaneToggle={helperPaneToggle || undefined}
                />
            )}
            {isPreviewMode ? (
                <MarkdownPreview content={transformedContent} />
            ) : (
                <ExpressionContainer>
                    <ChipExpressionEditorComponent
                        value={value}
                        onChange={handleChange}
                        completions={completions}
                        sanitizedExpression={sanitizedExpression}
                        fileName={fileName}
                        targetLineRange={targetLineRange}
                        extractArgsFromFunction={extractArgsFromFunction}
                        getHelperPane={getHelperPane}
                        rawExpression={rawExpression}
                        isInExpandedMode={true}
                        isExpandedVersion={true}
                        showHelperPaneToggle={false}
                        onHelperPaneStateChange={handleHelperPaneStateChange}
                        onEditorViewReady={setEditorView}
                        toolbarRef={toolbarRef}
                        enableListContinuation={true}
                    />
                </ExpressionContainer>
            )}
        </>
    );
};
