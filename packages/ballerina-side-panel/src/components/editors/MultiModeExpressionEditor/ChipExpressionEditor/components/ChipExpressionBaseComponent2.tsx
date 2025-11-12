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
import { EditorView } from "@codemirror/view";
import React, { useEffect, useRef, useState } from "react";
import { ChipExpressionBaseComponentProps } from "../ChipExpressionBaseComponent";
import { useFormContext } from "../../../../../context";
import { buildNeedTokenRefetchListner, buildOnChangeListner, chipPlugin, chipTheme, tokenField, tokensChangeEffect, expressionEditorKeymap, shouldOpenHelperPaneState, shouldOpenCompletionsListner } from "../CodeUtils";
import { history } from "@codemirror/commands";
import { ContextMenuContainer } from "../styles";

type ContextMenuType = "HELPER_PANE" | "COMPLETIONS";

type HelperPaneState = {
    isOpen: boolean;
    top: number;
    left: number;
    type: ContextMenuType;
}

export const ChipExpressionBaseComponent2 = (props: ChipExpressionBaseComponentProps) => {
    const [contextMenuState, setContextMenuState] = useState<HelperPaneState>({ isOpen: false, top: 0, left: 0, type: "HELPER_PANE" as ContextMenuType });

    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef(null);
    const isTokenUpdateScheduled = useRef(true);

    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    const needTokenRefetchListner = buildNeedTokenRefetchListner(() => {
        isTokenUpdateScheduled.current = true;
    });

    const handleChangeListner = buildOnChangeListner((newValue, cursorPosition) => {
        props.onChange(newValue, cursorPosition);
    });

    const handleHelperOpenListner = shouldOpenHelperPaneState((state, top, left) => {
        setContextMenuState({ isOpen: state, top, left, type: "HELPER_PANE" });
    });

    const handleCompletionsOpenListner = shouldOpenCompletionsListner((state, top, left) => {
        setContextMenuState({ isOpen: state, top, left, type: "COMPLETIONS" });
    },
        props.completions
    );

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
                expressionEditorKeymap,
                chipPlugin,
                tokenField,
                chipTheme,
                EditorView.lineWrapping,
                needTokenRefetchListner,
                handleChangeListner,
                handleHelperOpenListner,
                handleCompletionsOpenListner
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
            contextMenuState.type === "HELPER_PANE" &&
            (
                <ContextMenuContainer
                    top={contextMenuState.top}
                    left={contextMenuState.left}
                >
                    {props.getHelperPane(
                        props.value,
                        () => { },
                        "3/4"
                    )}
                </ContextMenuContainer>
            )}
        </div>
    );
}
