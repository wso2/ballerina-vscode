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

import React, { useEffect, useState, useCallback, useRef } from "react";
import FXButton from "./components/FxButton";
import { ChipEditorContainer } from "./styles";
import { ExpressionModel } from "./types";
import { AutoExpandingEditableDiv } from "./components/AutoExpandingEditableDiv";
import { TokenizedExpression } from "./components/TokenizedExpression";
import { getAbsoluteCaretPosition, mapAbsoluteToModel, findNearestEditableIndex, filterTokens, createExpressionModelFromTokens, getTextValueFromExpressionModel, updateExpressionModelWithCompletion, handleCompletionNavigation, calculateCompletionsMenuPosition } from "./utils";
import { CompletionItem, HelperPaneHeight } from "@wso2/ui-toolkit";
import { useFormContext } from "../../../../context";
import { ContextMenuContainer, Completions } from "./styles";
import { CompletionsItem } from "./components/CompletionsItem";

export type ChipExpressionBaseComponentProps = {
    onTokenRemove?: (token: string) => void;
    onTokenClick?: (token: string) => void;
    getHelperPane?: (
        value: string,
        onChange: (value: string, updatedCursorPosition: number) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
    completions: CompletionItem[];
    onChange: (updatedValue: string, updatedCursorPosition: number) => void;
    value: string;
}

export const ChipExpressionBaseComponent2 = (props: ChipExpressionBaseComponentProps) => {
    const [tokens, setTokens] = useState<number[]>([]);
    const [expressionModel, setExpressionModel] = useState<ExpressionModel[]>();
    const [selectedCompletionItem, setSelectedCompletionItem] = useState<number>(0);
    const [isCompletionsOpen, setIsCompletionsOpen] = useState<boolean>(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [hasTypedSinceFocus, setHasTypedSinceFocus] = useState<boolean>(false);
    const [isAnyElementFocused, setIsAnyElementFocused] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const fieldContainerRef = useRef<HTMLDivElement>(null);

    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    useEffect(() => {
        const fetchTokens = async () => {
            expressionEditorRpcManager?.getExpressionTokens(props.value)
                .then((response) => {
                    const filteredTokens = filterTokens(response);
                    setTokens(filteredTokens);
                    if (!expressionModel) {
                        const exprModel = createExpressionModelFromTokens(props.value, filteredTokens);
                        setExpressionModel(exprModel);
                    }
                })
        }
        fetchTokens();
    }, [props.value]);

    const handleExpressionChange = (updatedModel: ExpressionModel[]) => {
        const updatedValue = getTextValueFromExpressionModel(updatedModel);
        props.onChange(updatedValue, updatedValue.length);
        setExpressionModel(updatedModel);
        setHasTypedSinceFocus(true);
    }

    const handleTriggerRebuild = (value: string, caretPosition?: number) => {
        const textValue = value;
        let exprModel = createExpressionModelFromTokens(textValue, tokens);

        // Map caretPosition into new model
        if (caretPosition !== undefined) {
            const mapped = mapAbsoluteToModel(exprModel, caretPosition);
            if (mapped) {
                const preferNext = true;
                const editableIndex = findNearestEditableIndex(exprModel, mapped.index, preferNext);
                if (editableIndex !== null) {
                    const boundedOffset = Math.max(0, Math.min(exprModel[editableIndex].length, mapped.offset));
                    exprModel = exprModel.map((m, i) => (
                        i === editableIndex
                            ? { ...m, isFocused: true, focusOffset: boundedOffset }
                            : { ...m, isFocused: false }
                    ));
                }
            }
        }

        setExpressionModel(exprModel);
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === '+') {
            // Capture absolute caret before rebuilding
            const absolutePos = getAbsoluteCaretPosition(expressionModel);

            const textValue = getTextValueFromExpressionModel(expressionModel || []);
            let exprModel = createExpressionModelFromTokens(textValue, tokens);

            // Map absolute position into new model and set focus flags
            const mapped = mapAbsoluteToModel(exprModel, absolutePos);
            if (mapped) {
                const preferNext = true;
                const editableIndex = findNearestEditableIndex(exprModel, mapped.index, preferNext);
                if (editableIndex !== null) {
                    const boundedOffset = Math.max(0, Math.min(exprModel[editableIndex].length, mapped.offset));
                    exprModel = exprModel.map((m, i) => (
                        i === editableIndex
                            ? { ...m, isFocused: true, focusOffset: boundedOffset }
                            : { ...m, isFocused: false }
                    ));
                }
            }

            setExpressionModel(exprModel);
        }
    }

    const handleCompletionSelect = (item: CompletionItem) => {
        const absoluteCaretPosition = getAbsoluteCaretPosition(expressionModel);
        const result = updateExpressionModelWithCompletion(expressionModel, absoluteCaretPosition, item.value || item.label);

        if (result) {
            const { updatedModel, updatedValue } = result;
            props.onChange(updatedValue, updatedValue.length);
            const absolutePos = getAbsoluteCaretPosition(updatedModel) + (item.value || item.label).length;

            const textValue = getTextValueFromExpressionModel(updatedModel || []);
            let exprModel = createExpressionModelFromTokens(textValue, tokens);

            // Map absolute position into new model and set focus flags
            const mapped = mapAbsoluteToModel(exprModel, absolutePos);
            if (mapped) {
                const preferNext = true;
                const editableIndex = findNearestEditableIndex(exprModel, mapped.index, preferNext);
                if (editableIndex !== null) {
                    const boundedOffset = Math.max(0, Math.min(exprModel[editableIndex].length, mapped.offset));
                    exprModel = exprModel.map((m, i) => (
                        i === editableIndex
                            ? { ...m, isFocused: true, focusOffset: boundedOffset }
                            : { ...m, isFocused: false }
                    ));
                }
            }

            setExpressionModel(exprModel);
        }

        setIsCompletionsOpen(false);
    };

    const handleCompletionKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isCompletionsOpen || props.completions.length === 0) return;

        handleCompletionNavigation(
            e,
            props.completions.length,
            selectedCompletionItem,
            setSelectedCompletionItem,
            handleCompletionSelect,
            setIsCompletionsOpen,
            props.completions
        );
    }, [isCompletionsOpen, selectedCompletionItem, props.completions]);

    useEffect(() => {
        if (props.completions.length === 0) {
            setIsCompletionsOpen(false);
            return;
        }
        if (isAnyElementFocused && hasTypedSinceFocus) {
            calculateCompletionsMenuPosition(fieldContainerRef, setMenuPosition);
            setIsCompletionsOpen(true);
            setSelectedCompletionItem(-1);
        } else {
            setIsCompletionsOpen(false);
        }
    }, [props.completions, isAnyElementFocused, hasTypedSinceFocus]);

    useEffect(() => {
        if (!isAnyElementFocused) {
            setHasTypedSinceFocus(false);
            setIsCompletionsOpen(false);
        }
    }, [isAnyElementFocused]);

    return (
        <> <ChipEditorContainer ref={fieldContainerRef} style={{ position: 'relative' }}>
            <FXButton />
            <AutoExpandingEditableDiv
                fieldContainerRef={fieldContainerRef}
                onFocusChange={(focused) => setIsAnyElementFocused(focused)}
                onKeyDown={(e) => {
                    handleKeyDown(e);
                    handleCompletionKeyDown(e);
                }}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
                isCompletionsOpen={isCompletionsOpen}
                completions={props.completions}
                selectedCompletionItem={selectedCompletionItem}
                menuPosition={menuPosition}
                onCompletionSelect={handleCompletionSelect}
                onCompletionHover={setSelectedCompletionItem}
                onCloseCompletions={() => setIsCompletionsOpen(false)}
            >
                <TokenizedExpression
                    expressionModel={expressionModel || []}
                    onExpressionChange={handleExpressionChange}
                    onTriggerRebuild={handleTriggerRebuild}
                />
            </AutoExpandingEditableDiv>
        </ChipEditorContainer >
            {/* <pre>{JSON.stringify(tokens)}</pre>
            <pre>{JSON.stringify(expressionModel)}</pre>
            <pre>{JSON.stringify(props.completions)}</pre> */}
        </>
    )
}