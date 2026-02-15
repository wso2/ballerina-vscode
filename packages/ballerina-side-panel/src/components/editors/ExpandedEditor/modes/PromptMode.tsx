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
import { EditorView as CodeMirrorView } from "@codemirror/view";
import { EditorView as ProseMirrorView } from "prosemirror-view";
import { EditorState as ProseMirrorState } from "prosemirror-state";
import { EditorModeExpressionProps } from "./types";
import { ChipExpressionEditorComponent } from "../../MultiModeExpressionEditor/ChipExpressionEditor/components/ChipExpressionEditor";
import { RichTextTemplateEditor, customMarkdownParser, customMarkdownSerializer } from "../../MultiModeExpressionEditor/RichTextTemplateEditor/RichTextTemplateEditor";
import { RichTemplateMarkdownToolbar } from "../controls/RichTemplateMarkdownToolbar";
import { RawTemplateMarkdownToolbar } from "../controls/RawTemplateMarkdownToolbar";
import { ErrorBanner } from "@wso2/ui-toolkit";
import { RawTemplateEditorConfig, StringTemplateEditorConfig } from "../../MultiModeExpressionEditor/Configurations";
import { getPrimaryInputType, PromptMode as PromptModeEnum } from "@wso2/ballerina-core";
import { ConditionalEditorContainer } from "./styles";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import type { PromptEnhancementRequest } from "@wso2/ballerina-core";
import { EnhanceModeDialog } from "../controls/EnhanceModeDialog";
import { RefinementBar } from "../controls/RefinementBar";
import { EnhancingOverlay } from "../controls/EnhancingOverlay";

const SIMPLE_PROMPT_FIELDS = ["query", "instructions", "role"];

function getPromptModeForField(fieldKey: string): PromptModeEnum {
    switch (fieldKey) {
        case "role": return PromptModeEnum.ROLE;
        case "instructions": return PromptModeEnum.INSTRUCTIONS;
        case "query": return PromptModeEnum.QUERY;
        default: return PromptModeEnum.DEFAULT;
    }
}

type EnhancementState =
    | { mode: 'normal' }
    | { mode: 'selecting' }
    | { mode: 'enhancing' }
    | { mode: 'preview', originalPrompt: string };


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
    const isSimpleMode = SIMPLE_PROMPT_FIELDS.includes(field.key) && !getHelperPane;
    const detectedMode = getPromptModeForField(field.key);

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

    // Enhancement state
    const [enhancementState, setEnhancementState] = useState<EnhancementState>({ mode: 'normal' });
    const originalPromptRef = useRef<string>("");
    const enhancedPromptRef = useRef<string>("");
    const lastModeRef = useRef<PromptModeEnum>(PromptModeEnum.DEFAULT);
    const lastInstructionsRef = useRef<string | undefined>(undefined);
    const { rpcClient } = useRpcContext();

    // Version history
    const versionHistoryRef = useRef<string[]>([]);
    const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);

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

    // Enhancement handlers
    const getCurrentPrompt = (): string => {
        if (isSourceView && codeMirrorView) {
            return codeMirrorView.state.doc.toString();
        } else if (proseMirrorView) {
            return customMarkdownSerializer.serialize(proseMirrorView.state.doc);
        }
        return "";
    };

    const applyPrompt = (prompt: string): void => {
        if (isSourceView && codeMirrorView) {
            const transaction = codeMirrorView.state.update({
                changes: { from: 0, to: codeMirrorView.state.doc.length, insert: prompt }
            });
            codeMirrorView.dispatch(transaction);
        } else if (proseMirrorView) {
            const doc = customMarkdownParser.parse(prompt);
            if (doc) {
                // Create new editor state with the new document
                const newState = ProseMirrorState.create({
                    doc: doc,
                    schema: proseMirrorView.state.schema,
                    plugins: proseMirrorView.state.plugins
                });
                proseMirrorView.updateState(newState);
            }
        }
    };

    const handleEnhanceClick = async () => {
        const currentPrompt = getCurrentPrompt();
        if (!currentPrompt.trim()) return;

        // Check authentication before opening the dialog
        try {
            const isAuthenticated = await rpcClient.getAiPanelRpcClient().isUserAuthenticated();
            if (!isAuthenticated) {
                rpcClient.getAiPanelRpcClient().promptForLogin();
                return;
            }
        } catch (error) {
            console.error("Error checking authentication:", error);
        }

        originalPromptRef.current = currentPrompt;
        setEnhancementState({ mode: 'selecting' });
    };

    const handleEnhance = async (mode: PromptModeEnum, instructions?: string) => {
        lastModeRef.current = mode;
        lastInstructionsRef.current = instructions;
        setEnhancementState({ mode: 'enhancing' });

        try {
            const request: PromptEnhancementRequest = {
                originalPrompt: originalPromptRef.current,
                additionalInstructions: instructions,
                mode: mode
            };

            const result = await rpcClient.getAiPanelRpcClient().enhancePrompt(request);

            enhancedPromptRef.current = result.enhancedPrompt;

            if (!isSourceView && proseMirrorView) {
                applyPrompt(result.enhancedPrompt);
            }

            // Trigger onChange to update parent state and trigger token fetching
            const cursorPos = isSourceView && codeMirrorView
                ? codeMirrorView.state.selection.main.head
                : proseMirrorView?.state.selection.head || 0;
            onChange(result.enhancedPrompt, cursorPos);

            // Initialize version history: [original, enhanced]
            versionHistoryRef.current = [originalPromptRef.current, result.enhancedPrompt];
            setCurrentVersionIndex(1);

            setEnhancementState({
                mode: 'preview',
                originalPrompt: originalPromptRef.current
            });
        } catch (error: any) {
            console.error("Enhancement error:", error);
            // Error notifications are shown by the extension host
            setEnhancementState({ mode: 'normal' });
        }
    };

    const handleRefine = async (instructions: string) => {
        const currentEnhanced = getCurrentPrompt();
        setEnhancementState({ mode: 'enhancing' });

        try {
            const request: PromptEnhancementRequest = {
                originalPrompt: currentEnhanced,
                additionalInstructions: instructions,
                mode: detectedMode
            };

            const result = await rpcClient.getAiPanelRpcClient().enhancePrompt(request);

            enhancedPromptRef.current = result.enhancedPrompt;

            if (!isSourceView && proseMirrorView) {
                applyPrompt(result.enhancedPrompt);
            }

            const cursorPos = isSourceView && codeMirrorView
                ? codeMirrorView.state.selection.main.head
                : proseMirrorView?.state.selection.head || 0;
            onChange(result.enhancedPrompt, cursorPos);

            // Truncate future versions and append new result
            versionHistoryRef.current = [
                ...versionHistoryRef.current.slice(0, currentVersionIndex + 1),
                result.enhancedPrompt
            ];
            setCurrentVersionIndex(versionHistoryRef.current.length - 1);

            setEnhancementState({
                mode: 'preview',
                originalPrompt: originalPromptRef.current
            });
        } catch (error: any) {
            console.error("Refinement error:", error);
            // Stay in preview so the user keeps their existing enhanced prompt
            setEnhancementState({
                mode: 'preview',
                originalPrompt: originalPromptRef.current
            });
        }
    };

    const handleRetry = () => {
        handleEnhance(lastModeRef.current, lastInstructionsRef.current);
    };

    const handleVersionNavigate = (index: number) => {
        if (index < 0 || index >= versionHistoryRef.current.length) return;
        const prompt = versionHistoryRef.current[index];
        applyPrompt(prompt);
        enhancedPromptRef.current = prompt;
        setCurrentVersionIndex(index);

        const cursorPos = isSourceView && codeMirrorView
            ? codeMirrorView.state.selection.main.head
            : proseMirrorView?.state.selection.head || 0;
        onChange(prompt, cursorPos);
    };

    const handleAccept = () => {
        setEnhancementState({ mode: 'normal' });
        originalPromptRef.current = "";
        enhancedPromptRef.current = "";
        lastInstructionsRef.current = undefined;
        versionHistoryRef.current = [];
        setCurrentVersionIndex(0);

        const finalPrompt = getCurrentPrompt();
        const cursorPosition = isSourceView && codeMirrorView
            ? codeMirrorView.state.selection.main.head
            : proseMirrorView?.state.selection.head || 0;
        onChange(finalPrompt, cursorPosition);
    };

    const handleReject = () => {
        if (!isSourceView && proseMirrorView) {
            applyPrompt(originalPromptRef.current);
        }

        const cursorPos = isSourceView && codeMirrorView
            ? codeMirrorView.state.selection.main.head
            : proseMirrorView?.state.selection.head || 0;
        onChange(originalPromptRef.current, cursorPos);

        setEnhancementState({ mode: 'normal' });
        originalPromptRef.current = "";
        enhancedPromptRef.current = "";
        lastInstructionsRef.current = undefined;
        versionHistoryRef.current = [];
        setCurrentVersionIndex(0);
    };

    const handleCloseDialog = () => {
        setEnhancementState({ mode: 'normal' });
    };

    return (
        <>
            {/* Toolbar */}
            {isSourceView ? (
                <RawTemplateMarkdownToolbar
                    ref={rawToolbarRef}
                    editorView={codeMirrorView}
                    isSourceView={isSourceView}
                    onToggleView={handleToggleView}
                    hideHelperPaneToggle={isSimpleMode}
                    helperPaneToggle={helperPaneToggle || undefined}
                    onEnhanceClick={handleEnhanceClick}
                    isEnhancing={enhancementState.mode === 'enhancing'}
                    isInPreviewMode={enhancementState.mode === 'preview'}
                />
            ) : (
                <RichTemplateMarkdownToolbar
                    ref={richToolbarRef}
                    editorView={proseMirrorView}
                    isSourceView={isSourceView}
                    onToggleView={handleToggleView}
                    hideHelperPaneToggle={isSimpleMode}
                    helperPaneToggle={helperPaneToggle || undefined}
                    onEnhanceClick={handleEnhanceClick}
                    isEnhancing={enhancementState.mode === 'enhancing'}
                    isInPreviewMode={enhancementState.mode === 'preview'}
                />
            )}

            {/* Editor */}
            <ConditionalEditorContainer isEnhanced={enhancementState.mode === 'preview' || enhancementState.mode === 'enhancing'}>
                {isSourceView ? (
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
                        configuration={getPrimaryInputType(field.types)?.ballerinaType === "string" ? new StringTemplateEditorConfig() : new RawTemplateEditorConfig()}
                        placeholder={field.placeholder}
                    />
                ) : (
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
                        configuration={getPrimaryInputType(field.types)?.ballerinaType === "string" ? new StringTemplateEditorConfig() : new RawTemplateEditorConfig()}
                        placeholder={field.placeholder}
                    />
                )}
                {enhancementState.mode === 'enhancing' && <EnhancingOverlay />}
            </ConditionalEditorContainer>

            {/* Error Banner */}
            {error ?
                <ErrorBanner sx={{ maxHeight: "50px", overflowY: "auto" }} errorMsg={error.message.toString()} /> :
                formDiagnostics && formDiagnostics.length > 0 &&
                <ErrorBanner sx={{ maxHeight: "50px", overflowY: "auto" }} errorMsg={formDiagnostics.map(d => d.message).join(', ')} />
            }

            {/* Refinement Bar */}
            {(enhancementState.mode === 'preview' || (enhancementState.mode === 'enhancing' && enhancedPromptRef.current)) && (
                <RefinementBar
                    onRefine={handleRefine}
                    onRetry={handleRetry}
                    onReject={handleReject}
                    onAccept={handleAccept}
                    isEnhancing={enhancementState.mode === 'enhancing'}
                    versionCount={versionHistoryRef.current.length}
                    currentVersionIndex={currentVersionIndex}
                    onVersionNavigate={handleVersionNavigate}
                    promptMode={detectedMode}
                />
            )}

            {/* Mode Selection Dialog */}
            <EnhanceModeDialog
                isOpen={enhancementState.mode === 'selecting'}
                isLoading={enhancementState.mode === 'enhancing'}
                onEnhance={handleEnhance}
                onClose={handleCloseDialog}
                promptMode={detectedMode}
            />
        </>
    );
};
