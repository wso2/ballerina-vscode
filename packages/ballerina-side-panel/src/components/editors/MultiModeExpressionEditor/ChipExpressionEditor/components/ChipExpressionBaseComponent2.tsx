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
import { EditorView, keymap } from "@codemirror/view";
import React, { useEffect, useRef, useState } from "react";
import { useFormContext } from "../../../../../context";
import { buildNeedTokenRefetchListner, buildOnChangeListner, chipPlugin, chipTheme, completionTheme, tokenField, tokensChangeEffect, expressionEditorKeymap, buildCompletionSource, buildHelperPaneKeymap, buildOnFocusListner, CursorInfo, buildOnFocusOutListner } from "../CodeUtils";
import { history } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { ContextMenuContainer, FloatingButtonContainer, FloatingToggleButton } from "../styles";
import { HelperpaneOnChangeOptions } from "../../../../Form/types";
import { CompletionItem, FnSignatureDocumentation, HELPER_PANE_EX_BTN_OFFSET, HelperPaneHeight } from "@wso2/ui-toolkit";
import { CloseHelperButton, ExpandButton, OpenHelperButton } from "./FloatingButtonIcons";
import { LineRange } from "@wso2/ballerina-core";

type HelperPaneState = {
    isOpen: boolean;
    top: number;
    left: number;
}
export type ChipExpressionBaseComponentProps = {
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
    targetLineRange?: LineRange;
    onOpenExpandedMode?: () => void;
    onRemove?: () => void;
    isInExpandedMode?: boolean;
}

export const ChipExpressionBaseComponent2 = (props: ChipExpressionBaseComponentProps) => {
    const [helperPaneState, setHelperPaneState] = useState<HelperPaneState>({ isOpen: false, top: 0, left: 0 });

    const editorRef = useRef<HTMLDivElement>(null);
    const helperPaneRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef(null);
    const [isTokenUpdateScheduled, setIsTokenUpdateScheduled] = useState(true);
    const completionsRef = useRef(props.completions);
    const helperPaneToggleButtonRef = useRef<HTMLButtonElement>(null);

    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    const needTokenRefetchListner = buildNeedTokenRefetchListner(() => {
        setIsTokenUpdateScheduled(true);
    });

    const handleChangeListner = buildOnChangeListner((newValue, cursor) => {
        props.onChange(newValue, cursor.position.to);
        const textBeforeCursor = newValue.slice(0, cursor.position.to);
        const lastNonSpaceChar = textBeforeCursor.trimEnd().slice(-1);
        const isTrigger = lastNonSpaceChar === '+' || lastNonSpaceChar === ':';
        const isRangeSelection = cursor.position.to !== cursor.position.from;

        if (newValue === '' || isTrigger || isRangeSelection) {
            setHelperPaneState({ isOpen: true, top: cursor.top, left: cursor.left });
        } else {
            setHelperPaneState({ isOpen: false, top: 0, left: 0 });
        }
    });

    const handleFocusListner = buildOnFocusListner((cursor: CursorInfo) => {
        setHelperPaneState({ isOpen: true, top: cursor.top, left: cursor.left });

    });

    const handleFocusOutListner = buildOnFocusOutListner(() => {
        setIsTokenUpdateScheduled(true);
    });

    const completionSource = buildCompletionSource(() => completionsRef.current);

    const helperPaneKeymap = buildHelperPaneKeymap(helperPaneState.isOpen, () => {
        setHelperPaneState(prev => ({ ...prev, isOpen: false }));
    });

    const onHelperItemSelect = (value: string, options: HelperpaneOnChangeOptions) => {
        if (!viewRef.current) return;
        const view = viewRef.current;
        const { from, to } = view.state.selection.main;

        view.dispatch({
            changes: { from, to, insert: value },
            selection: { anchor: from + value.length }
        });

        setHelperPaneState(prev => ({ ...prev, isOpen: !options.closeHelperPane }));
    }

    const handleHelperPaneManualToggle = () => {
        if (
            !helperPaneToggleButtonRef?.current ||
            !editorRef?.current
        ) return;
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

    useEffect(() => {
        if (!editorRef.current) return;
        const startState = EditorState.create({
            doc: props.value ?? "",
            extensions: [
                history(),
                keymap.of([...helperPaneKeymap, ...expressionEditorKeymap]),
                autocompletion({
                    override: [completionSource],
                    activateOnTyping: true,
                    closeOnBlur: true
                }),
                chipPlugin,
                tokenField,
                chipTheme,
                completionTheme,
                EditorView.lineWrapping,
                needTokenRefetchListner,
                handleChangeListner,
                handleFocusListner,
                handleFocusOutListner
            ]
        });
        const view = new EditorView({
            state: startState,
            parent: editorRef.current
        });
        viewRef.current = view;
        return () => {
            view.destroy();
        };
    }, []);

    useEffect(() => {
        if (!props.value || !viewRef.current) return;
        const updateEditorState = async () => {
            const currentDoc = viewRef.current!.state.doc.toString();
            const isExternalUpdate = props.value !== currentDoc;

            if (!isTokenUpdateScheduled && !isExternalUpdate) return;
            const tokenStream = await expressionEditorRpcManager?.getExpressionTokens(
                props.value,
                props.fileName,
                props.targetLineRange.startLine
            );
            setIsTokenUpdateScheduled(false);
            if (tokenStream) {
                viewRef.current!.dispatch({
                    effects: tokensChangeEffect.of(tokenStream),
                    changes: { from: 0, to: currentDoc.length, insert: props.value }
                });
            }
        };
        updateEditorState();
    }, [props.value, props.fileName, props.targetLineRange.startLine, isTokenUpdateScheduled]);


    // this keeps completions ref updated
    // just don't touch this.
    useEffect(() => {
        completionsRef.current = props.completions;
    }, [props.completions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!helperPaneState.isOpen) return;

            const target = event.target as Element;
            const isClickInsideEditor = editorRef.current?.contains(target);
            const isClickInsideHelperPane = helperPaneRef.current?.contains(target);

            if (!isClickInsideEditor && !isClickInsideHelperPane) {
                setHelperPaneState(prev => ({ ...prev, isOpen: false }));
            }
        };
        if (helperPaneState.isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [helperPaneState.isOpen]);

    return (
        <div style={{ position: 'relative' }}>
            <div ref={editorRef} />
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
                <FloatingToggleButton
                    ref={helperPaneToggleButtonRef}
                    isActive={helperPaneState.isOpen}
                    onClick={handleHelperPaneManualToggle}
                    title={helperPaneState.isOpen ? "Close Helper" : "Open Helper"}
                >
                    {helperPaneState.isOpen ? <CloseHelperButton /> : <OpenHelperButton />}
                </FloatingToggleButton>
                {props.onOpenExpandedMode && !props.isInExpandedMode && (
                    <FloatingToggleButton onClick={props.onOpenExpandedMode} title="Expand Editor" isActive={false}>
                        <ExpandButton />
                    </FloatingToggleButton>
                )}
            </FloatingButtonContainer>
        </div>
    );
}

type HelperPaneProps = {
    top: number;
    left: number;
    getHelperPane: (
        value: string,
        onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
    value: string;
    onChange: (value: string, options?: HelperpaneOnChangeOptions) => void;
}

export const HelperPane = React.forwardRef<HTMLDivElement, HelperPaneProps>((props, ref) => {
    return (
        <ContextMenuContainer
            ref={ref}
            top={props.top}
            left={props.left}
            onMouseDown={e=> {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            {props.getHelperPane(
                props.value,
                props.onChange,
                "3/4"
            )}
        </ContextMenuContainer>
    );
});
