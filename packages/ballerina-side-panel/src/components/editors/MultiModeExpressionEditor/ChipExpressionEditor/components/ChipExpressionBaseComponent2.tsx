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
import { ChipExpressionBaseComponentProps } from "../ChipExpressionBaseComponent";
import { useFormContext } from "../../../../../context";
import { buildNeedTokenRefetchListner, buildOnChangeListner, chipPlugin, chipTheme, tokenField, tokensChangeEffect, expressionEditorKeymap, shouldOpenHelperPaneState, onWordType, CursorInfo } from "../CodeUtils";
import { history } from "@codemirror/commands";
import { Completions, ContextMenuContainer } from "../styles";
import { HelperpaneOnChangeOptions } from "../../../../Form/types";
import { CompletionItem, HelperPaneHeight } from "@wso2/ui-toolkit";
import { CompletionsItem } from "./CompletionsItem";
import { filterCompletionsByPrefixAndType, getWordBeforeCursorPosition } from "../utils";

type ContextMenuType = "HELPER_PANE" | "COMPLETIONS";

type HelperPaneState = {
    isOpen: boolean;
    top: number;
    left: number;
    type: ContextMenuType;
}

export const ChipExpressionBaseComponent2 = (props: ChipExpressionBaseComponentProps) => {
    const [contextMenuState, setContextMenuState] = useState<HelperPaneState>({ isOpen: false, top: 0, left: 0, type: "HELPER_PANE" as ContextMenuType });
    const [completionPrefix, setCompletionPrefix] = useState<string>("");
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>([]);
    const [selectedCompletionItem, setSelectedCompletionItem] = useState<number>(0);

    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef(null);
    const isTokenUpdateScheduled = useRef(true);

    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    const needTokenRefetchListner = buildNeedTokenRefetchListner(() => {
        isTokenUpdateScheduled.current = true;
    });

    const handleChangeListner = buildOnChangeListner((newValue, cursor) => {
        props.onChange(newValue, cursor.position);
        const textBeforeCursor = newValue.slice(0, cursor.position);
        const lastNonSpaceChar = textBeforeCursor.trimEnd().slice(-1);
        const isTrigger = lastNonSpaceChar === '+' || lastNonSpaceChar === ':';
        const wordBeforeCursor = getWordBeforeCursorPosition(textBeforeCursor);
        setCompletionPrefix(wordBeforeCursor);

        if (isTrigger) {
            setContextMenuState({ isOpen: true, top: cursor.top, left: cursor.left, type: "HELPER_PANE" });
            return;
        }

        // Only show completions if we have a word to complete
        if (wordBeforeCursor.length > 0) {
            setContextMenuState({ isOpen: true, top: cursor.top, left: cursor.left, type: "COMPLETIONS" });
        } else {
            setContextMenuState({ isOpen: false, top: 0, left: 0, type: "COMPLETIONS" });
        }
    });

    const handleCompletionHover = (index: number) => {
        setSelectedCompletionItem(index);
    };

    const handleCompletionSelect = (item: CompletionItem) => {
        if (!viewRef.current) return;
        const view = viewRef.current as EditorView;
        const wordBeforeCursor = getWordBeforeCursorPosition(view.state.doc.toString().slice(0, view.state.selection.main.head));
        const from = view.state.selection.main.head - wordBeforeCursor.length;
        const to = view.state.selection.main.head;

        view.dispatch({
            changes: { from, to, insert: item.label },
            selection: { anchor: from + item.label.length }
        });
        setContextMenuState(prev => ({ ...prev, isOpen: false }));
    };

    const completionKeymap = [
        {
            key: "ArrowDown",
            run: (_view) => {
                if (contextMenuState.type !== "COMPLETIONS" || !contextMenuState.isOpen) return false;
                setSelectedCompletionItem(prev =>
                    prev < filteredCompletions.length - 1 ? prev + 1 : prev
                );
                return true;
            }
        },
        {
            key: "ArrowUp",
            run: (_view) => {
                if (contextMenuState.type !== "COMPLETIONS" || !contextMenuState.isOpen) return false;
                setSelectedCompletionItem(prev =>
                    prev > 0 ? prev - 1 : -1
                );
                return true;
            }
        },
        {
            key: "Enter",
            run: (_view) => {
                if (contextMenuState.type !== "COMPLETIONS" || !contextMenuState.isOpen) return false;
                if (selectedCompletionItem >= 0 && selectedCompletionItem < filteredCompletions.length) {
                    handleCompletionSelect(filteredCompletions[selectedCompletionItem]);
                    return true;
                }
                return false;
            }
        },
        {
            key: "Escape",
            run: (_view) => {
                if (!contextMenuState.isOpen) return false;
                setContextMenuState(prev => ({ ...prev, isOpen: false }));
                return true;
            }
        },
        ...expressionEditorKeymap
    ];

    useEffect(() => {
        const filteredCompletions = filterCompletionsByPrefixAndType(props.completions, completionPrefix);
        setFilteredCompletions(filteredCompletions);

        if (contextMenuState.type === "COMPLETIONS") {
            if (filteredCompletions.length === 0 || completionPrefix.length === 0) {
                setContextMenuState(prev => ({ ...prev, isOpen: false }));
            } else {
                setContextMenuState(prev => ({ ...prev, isOpen: true }));
            }
        }
    }, [props.completions, completionPrefix]);

    useEffect(() => {
        if (!props.value || !viewRef.current) return;
        const updateEditorState = async () => {
            const currentDoc = viewRef.current!.state.doc.toString();
            if (currentDoc !== props.value) {
                viewRef.current!.dispatch({
                    changes: { from: 0, to: currentDoc.length, insert: props.value }
                });
            }

            if (!isTokenUpdateScheduled.current) return;
            const tokenStream = await expressionEditorRpcManager?.getExpressionTokens(
                props.value,
                props.fileName,
                props.targetLineRange.startLine
            );
            isTokenUpdateScheduled.current = false;
            if (tokenStream) {
                viewRef.current!.dispatch({
                    effects: tokensChangeEffect.of(tokenStream)
                });
            }
        };
        updateEditorState();
    }, [props.value, props.fileName, props.targetLineRange.startLine]);

    useEffect(() => {
        if (!editorRef.current) return;
        const startState = EditorState.create({
            doc: props.value ?? "",
            extensions: [
                history(),
                keymap.of(completionKeymap),
                chipPlugin,
                tokenField,
                chipTheme,
                EditorView.lineWrapping,
                needTokenRefetchListner,
                handleChangeListner,
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

    return (
        <div style={{ position: 'relative' }}>
            <div ref={editorRef}>

            </div>
            {contextMenuState.isOpen &&
                <ContextMenu
                    top={contextMenuState.top}
                    left={contextMenuState.left}
                    getHelperPane={props.getHelperPane}
                    value={props.value}
                    type={contextMenuState.type}
                    completions={filteredCompletions}
                    selectedCompletionItem={selectedCompletionItem}
                    onCompletionSelect={handleCompletionSelect}
                    onCompletionHover={handleCompletionHover}
                />
            }
        </div>
    );
}

type ContextMenuProps = {
    top: number;
    left: number;
    getHelperPane: (
        value: string,
        onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
    value: string;
    type: ContextMenuType;
    completions: CompletionItem[];
    selectedCompletionItem: number;
    onCompletionSelect: (item: CompletionItem) => void;
    onCompletionHover: (index: number) => void;
}

export const ContextMenu = (props: ContextMenuProps) => {
    if (props.type === "COMPLETIONS") {
        if (props.completions.length === 0) {
            return null;
        }
        return (
            <ContextMenuContainer
                top={props.top}
                left={props.left}
            >
                <Completions>
                    {props.completions.map((item, index) => (
                        <CompletionsItem
                            key={`${item.label}-${index}`}
                            item={item}
                            isSelected={index === props.selectedCompletionItem}
                            onClick={() => props.onCompletionSelect?.(item)}
                            onMouseEnter={() => props.onCompletionHover?.(index)}
                        />
                    ))}
                </Completions>
            </ContextMenuContainer>
        );
    }
    else if (props.type === "HELPER_PANE") {
        return (
            <ContextMenuContainer
                top={props.top}
                left={props.left}
            >
                {props.getHelperPane(
                    props.value,
                    () => { },
                    "3/4"
                )}
            </ContextMenuContainer>
        );
    }
    return null;
}
