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

import { EditorState } from "@codemirror/state";
import { EditorView, keymap, tooltips } from "@codemirror/view";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "../../../../../context";
import {
    buildNeedTokenRefetchListner,
    buildOnChangeListner,
    chipPlugin,
    chipTheme,
    completionTheme,
    tokenField,
    tokensChangeEffect,
    expressionEditorKeymap,
    buildCompletionSource,
    buildHelperPaneKeymap,
    buildOnFocusListner,
    CursorInfo,
    buildOnFocusOutListner,
    buildOnSelectionChange,
    SyncDocValueWithPropValue,
    isSelectionOnToken
} from "../CodeUtils";
import { mapSanitizedToRaw, TOKEN_START_CHAR_OFFSET_INDEX } from "../utils";
import { history } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { FloatingButtonContainer, FloatingToggleButton, ChipEditorContainer } from "../styles";
import { HelperpaneOnChangeOptions } from "../../../../Form/types";
import { CompletionItem, FnSignatureDocumentation, HelperPaneHeight } from "@wso2/ui-toolkit";
import { CloseHelperIcon, ExpandIcon, MinimizeIcon, OpenHelperIcon } from "./FloatingButtonIcons";
import { LineRange } from "@wso2/ballerina-core";
import FXButton from "./FxButton";
import { HelperPaneToggleButton } from "./HelperPaneToggleButton";
import { HelperPane } from "./HelperPane";
import { listContinuationKeymap } from "../../../ExpandedEditor/utils/templateUtils";
import { ChipExpressionEditorDefaultConfiguration } from "../ChipExpressionDefaultConfig";
import { ChipExpressionEditorConfig } from "../../Configurations";

type HelperPaneState = {
    isOpen: boolean;
    top: number;
    left: number;
}
export type ChipExpressionEditorComponentProps = {
    onTokenRemove?: (token: string) => void;
    onTokenClick?: (token: string) => void;
    isExpandedVersion: boolean;
    getHelperPane?: (
        value: string,
        onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
    completions: CompletionItem[];
    onChange: (updatedValue: string, updatedCursorPosition: number) => void;
    value: string;
    fileName?: string;
    extractArgsFromFunction?: (value: string, cursorPosition: number) => Promise<{
        label: string;
        args: string[];
        currentArgIndex: number;
        documentation?: FnSignatureDocumentation;
    }>;
    targetLineRange: LineRange;
    onOpenExpandedMode?: () => void;
    onRemove?: () => void;
    isInExpandedMode?: boolean;
    sx?: React.CSSProperties;
    sanitizedExpression?: (value: string) => string;
    rawExpression?: (value: string) => string;
    showHelperPaneToggle?: boolean;
    onHelperPaneStateChange?: (state: {
        isOpen: boolean;
        ref: React.RefObject<HTMLButtonElement>;
        toggle: () => void
    }) => void;
    onEditorViewReady?: (view: EditorView) => void;
    toolbarRef?: React.RefObject<HTMLDivElement>;
    enableListContinuation?: boolean;
    configuration?: ChipExpressionEditorDefaultConfiguration;
}

export const ChipExpressionEditorComponent = (props: ChipExpressionEditorComponentProps) => {
    const { configuration = new ChipExpressionEditorConfig() } = props;
    const [helperPaneState, setHelperPaneState] = useState<HelperPaneState>({ isOpen: false, top: 0, left: 0 });
    const editorRef = useRef<HTMLDivElement>(null);
    const helperPaneRef = useRef<HTMLDivElement>(null);
    const fieldContainerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const [isTokenUpdateScheduled, setIsTokenUpdateScheduled] = useState(true);
    const completionsRef = useRef<CompletionItem[]>(props.completions);
    const helperPaneToggleButtonRef = useRef<HTMLButtonElement>(null);
    const completionsFetchScheduledRef = useRef<boolean>(false);
    const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    const needTokenRefetchListner = buildNeedTokenRefetchListner(() => {
        setIsTokenUpdateScheduled(true);
    });

    const handleChangeListner = buildOnChangeListner((newValue, cursor) => {
        completionsFetchScheduledRef.current = true;
        props.onChange(configuration.deserializeValue(newValue), cursor.position.to);
        const textBeforeCursor = newValue.slice(0, cursor.position.to);
        const lastNonSpaceChar = textBeforeCursor.trimEnd().slice(-1);
        const isTrigger = lastNonSpaceChar === '+' || lastNonSpaceChar === ':';
        const isRangeSelection = cursor.position.to !== cursor.position.from;

        if (newValue === '' || isTrigger || isRangeSelection) {
            savedSelectionRef.current = { from: cursor.position.from, to: cursor.position.to };
            setHelperPaneState({ isOpen: true, top: cursor.top, left: cursor.left });
        } else {
            setHelperPaneState({ isOpen: false, top: 0, left: 0 });
        }
    });

    const handleFocusListner = buildOnFocusListner((cursor: CursorInfo) => {
        savedSelectionRef.current = { from: cursor.position.from, to: cursor.position.to };
        setHelperPaneState({ isOpen: true, top: cursor.top, left: cursor.left });
    });

    const handleSelectionChange = buildOnSelectionChange((cursor: CursorInfo) => {
        savedSelectionRef.current = { from: cursor.position.from, to: cursor.position.to };
        setHelperPaneState({ isOpen: true, top: cursor.top, left: cursor.left });
    });

    const handleFocusOutListner = buildOnFocusOutListner(() => {
        setIsTokenUpdateScheduled(true);
    });

    const waitForStateChange = (): Promise<CompletionItem[]> => {
        return new Promise((resolve) => {
            const checkState = () => {
                if (!completionsFetchScheduledRef.current) {
                    resolve(completionsRef.current);
                } else {
                    requestAnimationFrame(checkState);
                }
            };
            checkState();
        });
    };

    const completionSource = useMemo(() => {
        return buildCompletionSource(waitForStateChange);
    }, [props.completions]);

    const helperPaneKeymap = buildHelperPaneKeymap(() => helperPaneState.isOpen, () => {
        setHelperPaneState(prev => ({ ...prev, isOpen: false }));
    });

    const onHelperItemSelect = async (value: string, options: HelperpaneOnChangeOptions) => {
        if (!viewRef.current) return;
        const view = viewRef.current;

        // Use saved selection if available, otherwise fall back to current selection
        const currentSelection = savedSelectionRef.current || view.state.selection.main;
        const { from, to } = options?.replaceFullText ? { from: 0, to: view.state.doc.length } : currentSelection;
        
        const selectionIsOnToken = isSelectionOnToken(currentSelection.from, currentSelection.to, view);
        const newValue = selectionIsOnToken ? value : configuration.getHelperValue(value);

        let finalValue = newValue;
        let cursorPosition = from + newValue.length;

        // HACK: this should be handled properly with completion items template
        // current API response sends an incorrect response
        // if API sends $1,$2.. for the arguments in the template
        // then we can directly handled it without explicitly calling the API
        // and extracting args
        if (newValue.endsWith('()') || newValue.endsWith(')}')) {
            if (props.extractArgsFromFunction) {
                try {
                    // Extract the function definition from string templates like "${func()}"
                    let functionDef = newValue;
                    let prefix = '';
                    let suffix = '';

                    // Check if it's within a string template
                    const stringTemplateMatch = newValue.match(/^(.*\$\{)([^}]+)(\}.*)$/);
                    if (stringTemplateMatch) {
                        prefix = stringTemplateMatch[1];
                        functionDef = stringTemplateMatch[2];
                        suffix = stringTemplateMatch[3];
                    }

                    let cursorPositionForExtraction = from + prefix.length + functionDef.length - 1;
                    if (functionDef.endsWith(')}')) {
                        cursorPositionForExtraction -= 1;
                    }

                    const fnSignature = await props.extractArgsFromFunction(functionDef, cursorPositionForExtraction);

                    if (fnSignature && fnSignature.args && fnSignature.args.length > 0) {
                        const placeholderArgs = fnSignature.args.map((arg, index) => `$${index + 1}`);
                        const updatedFunctionDef = functionDef.slice(0, -2) + '(' + placeholderArgs.join(', ') + ')';
                        finalValue = prefix + updatedFunctionDef + suffix;
                        cursorPosition = from + prefix.length + updatedFunctionDef.length - 1;
                    }
                } catch (error) {
                    console.warn('Failed to extract function arguments:', error);
                }
            }
        }

        view.dispatch({
            changes: { from, to, insert: finalValue },
            selection: { anchor: cursorPosition }
        });
        if (options.closeHelperPane) {
            setIsTokenUpdateScheduled(true);
        }
        setHelperPaneState(prev => ({ ...prev, isOpen: !options.closeHelperPane }));

        // Clear saved selection after use
        savedSelectionRef.current = null;
    }

    const handleHelperPaneManualToggle = () => {
        if (
            !helperPaneToggleButtonRef?.current ||
            !editorRef?.current
        ) return;

        // Save current cursor position before toggling
        if (viewRef.current) {
            const selection = viewRef.current.state.selection.main;
            savedSelectionRef.current = { from: selection.from, to: selection.to };
        }

        const buttonRect = helperPaneToggleButtonRef.current.getBoundingClientRect();
        const editorRect = editorRef.current?.getBoundingClientRect();
        let top = buttonRect.bottom - editorRect.top;
        let left = buttonRect.left - editorRect.left;

        // Add overflow correction for window boundaries
        const HELPER_PANE_WIDTH = 300;
        const viewportWidth = window.innerWidth;
        const absoluteLeft = buttonRect.left;
        const overflow = absoluteLeft + HELPER_PANE_WIDTH - viewportWidth;

        if (overflow > 0) {
            left -= overflow;
        }

        setHelperPaneState(prev => ({
            ...prev,
            top,
            left,
            isOpen: !prev.isOpen
        }));
    }

    // Expose helper pane state to parent component
    useEffect(() => {
        if (props.onHelperPaneStateChange) {
            props.onHelperPaneStateChange({
                isOpen: helperPaneState.isOpen,
                ref: helperPaneToggleButtonRef,
                toggle: handleHelperPaneManualToggle
            });
        }
    }, [helperPaneState.isOpen]);

    useEffect(() => {
        if (!editorRef.current) return;
        const startState = EditorState.create({
            doc: props.value ?? "",
            extensions: [
                history(),
                keymap.of([
                    ...helperPaneKeymap,
                    ...(props.enableListContinuation ? listContinuationKeymap : []),
                    ...expressionEditorKeymap
                ]),
                autocompletion({
                    override: [completionSource],
                    activateOnTyping: true,
                    closeOnBlur: true
                }),
                tooltips({ position: "absolute" }),
                chipPlugin,
                tokenField,
                chipTheme,
                completionTheme,
                EditorView.lineWrapping,
                needTokenRefetchListner,
                handleChangeListner,
                handleFocusListner,
                handleFocusOutListner,
                handleSelectionChange,
                ...(props.isInExpandedMode
                    ? [EditorView.theme({
                        "&": { height: "100%" },
                        ".cm-scroller": { overflow: "auto" }
                    })]
                    : props.sx && 'height' in props.sx
                        ? [EditorView.theme({
                            "&": {
                                height: typeof (props.sx as any).height === 'number' ?
                                    `${(props.sx as any).height}px` :
                                    (props.sx as any).height
                            },
                            ".cm-scroller": { overflow: "auto" }
                        })]
                        : [EditorView.theme({
                            "&": { maxHeight: "150px" },
                            ".cm-scroller": { overflow: "auto" }
                        })])
            ]
        });
        const view = new EditorView({
            state: startState,
            parent: editorRef.current
        });
        viewRef.current = view;

        // Notify parent component that the editor view is ready
        if (props.onEditorViewReady) {
            props.onEditorViewReady(view);
        }

        return () => {
            view.destroy();
        };
    }, []);

    useEffect(() => {
        if (props.value == null || !viewRef.current) return;
        const serializedValue = configuration.serializeValue(props.value.trim());
        const deserializeValue = configuration.deserializeValue(props.value.trim());
        if (deserializeValue.trim() !== props.value.trim()) {
            props.onChange(deserializeValue.trim(), deserializeValue.trim().length);
            return
        }
        const updateEditorState = async () => {
            const sanitizedValue = props.sanitizedExpression ? props.sanitizedExpression(serializedValue) : serializedValue;
            const currentDoc = viewRef.current!.state.doc.toString();
            const isExternalUpdate = sanitizedValue !== currentDoc;

            if (!isTokenUpdateScheduled && !isExternalUpdate) return;

            const startLine = props.targetLineRange?.startLine;
            const tokenStream = await expressionEditorRpcManager?.getExpressionTokens(
                deserializeValue,
                props.fileName,
                startLine !== undefined ? startLine : undefined
            );
            const prefixCorrectedTokenStream = tokenStream;
            if (tokenStream && tokenStream.length >= 5) {
                prefixCorrectedTokenStream[TOKEN_START_CHAR_OFFSET_INDEX] -= configuration.getSerializationPrefix().length;
            }
            setIsTokenUpdateScheduled(false);
            const effects = prefixCorrectedTokenStream ? [tokensChangeEffect.of({
                tokens: prefixCorrectedTokenStream
            })] : [];
            const changes = isExternalUpdate
                ? { from: 0, to: viewRef.current!.state.doc.length, insert: sanitizedValue }
                : undefined;
            const annotations = isExternalUpdate ? [SyncDocValueWithPropValue.of(true)] : [];

            viewRef.current!.dispatch({
                ...(effects.length > 0 && { effects }),
                ...(changes && { changes }),
                ...(annotations.length > 0 && { annotations }),
            });

        };
        updateEditorState();
    }, [props.value, props.fileName, props.targetLineRange?.startLine, isTokenUpdateScheduled]);


    // this keeps completions ref updated
    // just don't touch this.
    useEffect(() => {
        completionsRef.current = props.completions;
        completionsFetchScheduledRef.current = false;
    }, [props.completions]);

    // Trigger token update when sanitization mode changes
    useEffect(() => {
        setIsTokenUpdateScheduled(true);
    }, [Boolean(props.sanitizedExpression), Boolean(props.rawExpression)]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!helperPaneState.isOpen) return;

            const target = event.target as Element;
            const isClickInsideEditor = editorRef.current?.contains(target);
            const isClickInsideHelperPane = helperPaneRef.current?.contains(target);
            const isClickOnToggleButton = helperPaneToggleButtonRef.current?.contains(target);
            const isClickInsideToolbar = props.toolbarRef?.current?.contains(target);

            if (!isClickInsideEditor && !isClickInsideHelperPane && !isClickOnToggleButton && !isClickInsideToolbar) {
                setHelperPaneState(prev => ({ ...prev, isOpen: false }));
                viewRef.current?.dom.blur();
            }
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (!helperPaneState.isOpen) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setHelperPaneState(prev => ({ ...prev, isOpen: false }));
            }
        };

        if (helperPaneState.isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [helperPaneState.isOpen, props.toolbarRef]);

    const showToggle = props.showHelperPaneToggle !== false && props.isExpandedVersion;

    return (
        <>
            {showToggle && (
                <HelperPaneToggleButton
                    ref={helperPaneToggleButtonRef}
                    isOpen={helperPaneState.isOpen}
                    onClick={handleHelperPaneManualToggle}
                />
            )}
            <ChipEditorContainer ref={fieldContainerRef} style={{
                position: 'relative',
                ...props.sx,
                ...(props.isInExpandedMode ? { height: '100%' } : { height: 'auto' })
            }}>
                {!props.isInExpandedMode && <FXButton />}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    ...(props.isInExpandedMode || (props.sx && 'height' in props.sx) ? { height: '100%' } : {})
                }}>
                    <div ref={editorRef} style={{
                        border: '1px solid var(--vscode-dropdown-border)',
                        ...props.sx,
                        ...(props.isInExpandedMode ? { height: '100%' } : { height: 'auto', maxHeight: '150px' })
                    }} />
                    {helperPaneState.isOpen &&
                        <HelperPane
                            ref={helperPaneRef}
                            top={helperPaneState.top}
                            left={helperPaneState.left}
                            getHelperPane={props.getHelperPane}
                            value={props.value}
                            onChange={onHelperItemSelect}
                        />
                    }
                    <FloatingButtonContainer>
                        {!props.isExpandedVersion &&
                            <FloatingToggleButton
                                ref={helperPaneToggleButtonRef}
                                onClick={handleHelperPaneManualToggle}
                                title={helperPaneState.isOpen ? "Close Helper Panel" : "Open Helper Panel"}
                            >
                                {helperPaneState.isOpen ? <CloseHelperIcon /> : <OpenHelperIcon />}
                            </FloatingToggleButton>}
                        {props.onOpenExpandedMode && (
                            <FloatingToggleButton onClick={props.onOpenExpandedMode} title={props.isInExpandedMode ? "Minimize Editor" : "Expand Editor"}>
                                {props.isInExpandedMode ? <MinimizeIcon /> : <ExpandIcon />}
                            </FloatingToggleButton>
                        )}
                    </FloatingButtonContainer>
                </div>
            </ChipEditorContainer>
        </>

    );
}
