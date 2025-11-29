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

import React, { useCallback, useRef, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { debounce } from "lodash";
import styled from "@emotion/styled";
import {
    ChipExpressionEditorComponent,
    Context as FormContext,
    FormExpressionEditorProps,
    HelperpaneOnChangeOptions,
    InputMode,
    ExpandedEditor
} from "@wso2/ballerina-side-panel";
import {
    CompletionItem,
    FormExpressionEditorRef,
    HelperPaneHeight,
    FnSignatureDocumentation,
    ErrorBanner
} from "@wso2/ui-toolkit";
import {
    ExpressionProperty,
    FlowNode,
    LineRange,
    NodeKind,
    TextEdit
} from "@wso2/ballerina-core";
import { GetHelperPaneFunction } from "../DiagramContext";

export interface NPPromptEditorProps {
    node: FlowNode;
    fileName: string;
    targetLineRange: LineRange;
    value: string;
    onChange: (value: string, cursorPosition: number) => void;
    placeholder?: string;
    completions: CompletionItem[];
    triggerCharacters: readonly string[];
    retrieveCompletions: (
        value: string,
        property: ExpressionProperty,
        offset: number,
        triggerCharacter?: string
    ) => Promise<void>;
    onCompletionItemSelect?: (value: string, additionalTextEdits?: TextEdit[]) => Promise<void>;
    onFocus?: () => void | Promise<void>;
    onBlur?: () => void | Promise<void>;
    onCancel?: () => void;
    extractArgsFromFunction?: (
        value: string,
        property: ExpressionProperty,
        cursorPosition: number
    ) => Promise<{
        label: string;
        args: string[];
        currentArgIndex: number;
        documentation?: FnSignatureDocumentation;
    }>;
    getHelperPane?: GetHelperPaneFunction;
    getExpressionTokens?: (
        expression: string,
        filePath: string,
        position: { line: number; offset: number }
    ) => Promise<number[]>;
    sx?: React.CSSProperties;
    inputMode?: InputMode;
    // Diagnostics support
    enableDiagnostics?: boolean;
    getExpressionFormDiagnostics?: (
        showDiagnostics: boolean,
        expression: string,
        key: string,
        property: ExpressionProperty,
        setDiagnosticsInfo: (diagnostics: { key: string; diagnostics: any[] }) => void,
        shouldUpdateNode?: boolean,
        variableType?: string
    ) => Promise<void>;
    disabled?: boolean;
}

const EditorContainer = styled.div<{ disabled: boolean }>`
    width: 100%;
    height: ${props => props.disabled ? '15rem' : '13rem'};
    margin-top: 0.5rem;
    cursor: ${props => props.disabled ? 'not-allowed' : 'text'};

    .cm-editor {
        background-color: ${props => props.disabled ? 'var(--vscode-editor-background)' : 'var(--vscode-input-background)'};
        transition: background-color 0.2s ease-in-out;
    }
`;

export const NPPromptEditor: React.FC<NPPromptEditorProps> = (props) => {
    const {
        fileName,
        targetLineRange,
        value,
        onChange,
        placeholder,
        completions,
        triggerCharacters,
        retrieveCompletions,
        onCompletionItemSelect,
        onFocus,
        onBlur,
        onCancel,
        extractArgsFromFunction,
        getHelperPane,
        getExpressionTokens,
        sx,
        inputMode = InputMode.EXP,
        enableDiagnostics = false,
        getExpressionFormDiagnostics,
        disabled = false
    } = props;

    // Form state for ChipExpressionEditor
    const { control, watch, setValue, getValues, register, unregister, setError, clearErrors, formState } = useForm();

    // Diagnostics state
    const [formDiagnostics, setFormDiagnostics] = useState<any[]>([]);

    // Expanded mode state
    const [isExpandedModalOpen, setIsExpandedModalOpen] = useState(false);

    // Refs
    const exprRef = useRef<FormExpressionEditorRef>(null);
    const anchorRef = useRef<HTMLDivElement>(null);

    // Backtick handling functions
    const getSanitizedExp = (rawValue: string): string => {
        if (!rawValue) return rawValue;
        if (rawValue.startsWith("`") && rawValue.endsWith("`")) {
            return rawValue.slice(1, -1);
        }
        return rawValue;
    };

    const getRawExp = (sanitizedValue: string): string => {
        if (!sanitizedValue) return sanitizedValue;
        if (!sanitizedValue.startsWith("`") && !sanitizedValue.endsWith("`")) {
            return `\`${sanitizedValue}\``;
        }
        return sanitizedValue;
    };

    // Helper to create ExpressionProperty
    const createProperty = (expressionValue: string): ExpressionProperty => {
        const promptProperty = props.node.properties['prompt'];
        return {
            ...promptProperty,
            value: getSanitizedExp(expressionValue),
        }
    };

    // Debounced diagnostics fetching
    const fetchDiagnostics = useCallback(
        debounce(async (expression: string) => {
            if (!enableDiagnostics || !getExpressionFormDiagnostics) {
                return;
            }

            const property = createProperty(expression);

            const handleSetDiagnosticsInfo = (diagnosticsInfo: { key: string; diagnostics: any[] }) => {
                const diagnostics = diagnosticsInfo?.diagnostics || [];
                setFormDiagnostics(diagnostics);
            };

            try {
                await getExpressionFormDiagnostics(
                    expression !== '',
                    expression,
                    "expression",
                    property,
                    handleSetDiagnosticsInfo,
                    false,
                    undefined
                );
            } catch (error) {
                console.error('Failed to fetch diagnostics:', error);
                setFormDiagnostics([]);
            }
        }, 300),
        [enableDiagnostics, getExpressionFormDiagnostics]
    );

    // Handle change with diagnostics
    const handleChange = (updatedValue: string, updatedCursorPosition: number) => {
        const sanitized = getSanitizedExp(updatedValue);
        onChange(sanitized, updatedCursorPosition);

        if (enableDiagnostics) {
            fetchDiagnostics(sanitized);
        }
    };

    // Expanded mode handlers
    const handleOpenExpandedMode = () => {
        setIsExpandedModalOpen(true);
    };

    const handleCloseExpandedMode = () => {
        setIsExpandedModalOpen(false);
    };

    const handleSaveExpandedMode = (newValue: string) => {
        const sanitized = getSanitizedExp(newValue);
        onChange(sanitized, 0);
        setIsExpandedModalOpen(false);
    };

    const handleChangeFromExpandedEditor = async (updatedValue: string, cursorPosition: number) => {
        const sanitized = getSanitizedExp(updatedValue);
        onChange(sanitized, cursorPosition);

        // Trigger completions with raw value
        const property = createProperty(updatedValue);
        const triggerCharacter = cursorPosition > 0
            ? triggerCharacters.find(char => updatedValue[cursorPosition - 1] === char)
            : undefined;

        try {
            await retrieveCompletions(
                updatedValue,
                property,
                cursorPosition + 1,
                triggerCharacter
            );
        } catch (error) {
            console.error('Failed to retrieve completions:', error);
        }
    };

    // Adapter: ChipExpressionEditor expects (value, onChange, height) but GetHelperPaneFunction has 12 params
    const wrappedGetHelperPane = useMemo(() => {
        if (!getHelperPane) return undefined;

        return (
            value: string,
            onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
            helperPaneHeight: HelperPaneHeight
        ) => getHelperPane(
            "prompt",
            exprRef,
            anchorRef,
            "",
            getSanitizedExp(value),
            onChange,
            () => { }, // Helper pane state managed by ChipExpressionEditor
            helperPaneHeight,
            undefined,
            undefined,
            undefined,
            inputMode
        );
    }, [getHelperPane, inputMode]);

    // Adapter: provides ExpressionProperty context to extractArgsFromFunction
    const chipExtractArgsFromFunction = useMemo(() => {
        if (!extractArgsFromFunction) return undefined;

        return async (value: string, cursorPosition: number) => {
            const sanitizedValue = getSanitizedExp(value);
            const property = createProperty(sanitizedValue);
            return await extractArgsFromFunction(sanitizedValue, property, cursorPosition);
        };
    }, [extractArgsFromFunction]);

    // Create FormContext value
    const expressionEditor: FormExpressionEditorProps = {
        completions: completions,
        triggerCharacters: triggerCharacters,
        retrieveCompletions: async (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => {
            await retrieveCompletions(getSanitizedExp(value), property, offset, triggerCharacter);
        },
        extractArgsFromFunction: extractArgsFromFunction,
        ...(getHelperPane ? {
            getHelperPane: getHelperPane,
            helperPaneOrigin: "vertical" as const,
            helperPaneHeight: "default" as const,
        } : {}),
        onCompletionItemSelect: async (value: string, fieldKey: string, additionalTextEdits?: TextEdit[]) => {
            if (onCompletionItemSelect) {
                await onCompletionItemSelect(getSanitizedExp(value), additionalTextEdits);
            }
        },
        onBlur: onBlur,
        onCancel: onCancel,
        getExpressionFormDiagnostics: getExpressionFormDiagnostics,
        rpcManager: {
            getExpressionTokens: getExpressionTokens || (async () => [])
        }
    } as FormExpressionEditorProps;

    const formContextValue = useMemo(() => ({
        form: {
            control,
            watch,
            setValue,
            getValues,
            register,
            unregister,
            setError,
            clearErrors,
            formState
        },
        expressionEditor: expressionEditor,
        targetLineRange: targetLineRange,
        fileName: fileName,
        popupManager: {
            addPopup: () => { },
            removeLastPopup: () => { },
            closePopup: () => { }
        },
        nodeInfo: {
            kind: "NP_FUNCTION" as NodeKind
        }
    }), [
        control, watch, setValue, getValues, register, unregister,
        setError, clearErrors, formState, expressionEditor,
        targetLineRange, fileName
    ]);

    // Prevent scroll and mouse events from propagating to parent diagram
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation();
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <FormContext.Provider value={formContextValue}>
            <div onWheel={handleWheel} onMouseDown={handleMouseDown}>
                <EditorContainer ref={anchorRef} disabled={disabled}>
                    <ChipExpressionEditorComponent
                        completions={completions}
                        onChange={handleChange}
                        value={getRawExp(value)}
                        fileName={fileName}
                        targetLineRange={targetLineRange}
                        extractArgsFromFunction={chipExtractArgsFromFunction}
                        getHelperPane={wrappedGetHelperPane}
                        sx={sx}
                        isExpandedVersion={false}
                        isInExpandedMode={isExpandedModalOpen}
                        inputMode={inputMode}
                        onOpenExpandedMode={handleOpenExpandedMode}
                        sanitizedExpression={getSanitizedExp}
                        rawExpression={getRawExp}
                        hideFxButton={true}
                        disabled={disabled}
                        placeholder={placeholder}
                    />
                    {enableDiagnostics && formDiagnostics && formDiagnostics.length > 0 && (
                        <ErrorBanner errorMsg={formDiagnostics.map((d: any) => d.message).join(', ')} />
                    )}
                </EditorContainer>

                {/* Expanded Editor Modal */}
                {isExpandedModalOpen && (
                    <ExpandedEditor
                        isOpen={isExpandedModalOpen}
                        field={{
                            key: "expression",
                            label: "Prompt",
                            type: null,
                            optional: false,
                            editable: true,
                            documentation: "",
                            value: value,
                            valueTypeConstraint: undefined,
                            enabled: true,
                            placeholder: placeholder
                        }}
                        value={getRawExp(value)}
                        onChange={handleChangeFromExpandedEditor}
                        onClose={handleCloseExpandedMode}
                        onSave={handleSaveExpandedMode}
                        mode="template"
                        completions={completions}
                        fileName={fileName}
                        targetLineRange={targetLineRange}
                        sanitizedExpression={getSanitizedExp}
                        rawExpression={getRawExp}
                        extractArgsFromFunction={chipExtractArgsFromFunction}
                        getHelperPane={wrappedGetHelperPane}
                        inputMode={inputMode}
                    />
                )}
            </div>
        </FormContext.Provider>
    );
};
