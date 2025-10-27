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
import {
    getAbsoluteCaretPosition,
    mapAbsoluteToModel,
    createExpressionModelFromTokens,
    getTextValueFromExpressionModel,
    updateExpressionModelWithCompletion,
    handleCompletionNavigation,
    setFocusInExpressionModel,
    updateExpressionModelWithHelperValue,
    getAbsoluteCaretPositionFromModel,
    getWordBeforeCursor,
    filterCompletionsByPrefix,
    setCursorPositionToExpressionModel,
    updateTokens,
} from "./utils";
import { CompletionItem, HelperPaneHeight } from "@wso2/ui-toolkit";
import { useFormContext } from "../../../../context";
import { DATA_ELEMENT_ID_ATTRIBUTE } from "./constants";
import { LineRange } from "@wso2/ballerina-core/lib/interfaces/common";

export type ChipExpressionBaseComponentProps = {
    onTokenRemove?: (token: string) => void;
    onTokenClick?: (token: string) => void;
    getHelperPane?: (
        value: string,
        onChange: (value: string, closeHelperPane: boolean) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
    completions: CompletionItem[];
    onChange: (updatedValue: string, updatedCursorPosition: number) => void;
    value: string;
    fileName?: string;
    extractArgsFromFunction?: (value: string, cursorPosition: number) => Promise<any>;
    targetLineRange?: LineRange;
}

export const ChipExpressionBaseComponent2 = (props: ChipExpressionBaseComponentProps) => {
    const [tokens, setTokens] = useState<number[]>([]);
    const [expressionModel, setExpressionModel] = useState<ExpressionModel[]>();
    const [selectedCompletionItem, setSelectedCompletionItem] = useState<number>(0);
    const [isCompletionsOpen, setIsCompletionsOpen] = useState<boolean>(false);
    const [hasTypedSinceFocus, setHasTypedSinceFocus] = useState<boolean>(false);
    const [isAnyElementFocused, setIsAnyElementFocused] = useState(false);
    const [isEditableSpanFocused, setIsEditableSpanFocused] = useState(false);
    const [chipClicked, setChipClicked] = useState<ExpressionModel | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHelperPaneOpen, setIsHelperPaneOpen] = useState(false);
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>(props.completions);

    const fieldContainerRef = useRef<HTMLDivElement>(null);
    const fetchedInitialTokensRef = useRef<boolean>(false);
    const pendingCursorPositionUpdateRef = useRef<number>(0);
    const pendingForceSetTokensRef = useRef<number[] | null>(null);
    const fetchnewTokensRef = useRef<boolean>(true);
    const focusedTextElementRef = useRef<HTMLSpanElement | null>(null);

    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    const fetchUpdatedFilteredTokens = useCallback(async (value: string): Promise<number[]> => {
        const response = await expressionEditorRpcManager?.getExpressionTokens(
            value,
            props.fileName,
            props.targetLineRange.startLine
        );
        return response || [];
    }, [expressionEditorRpcManager]);

    const fetchInitialTokens = async (value: string) => {
        let updatedTokens = tokens;
        if (pendingForceSetTokensRef.current) {
            setTokens(pendingForceSetTokensRef.current);
            updatedTokens = pendingForceSetTokensRef.current;
            pendingForceSetTokensRef.current = null;
        }
        if (fetchnewTokensRef.current) {
            const filteredTokens = await fetchUpdatedFilteredTokens(value);
            setTokens(filteredTokens);
            updatedTokens = filteredTokens;
            fetchnewTokensRef.current = false;
        }

        fetchedInitialTokensRef.current = true;
        let exprModel = createExpressionModelFromTokens(value, updatedTokens);
        if (pendingCursorPositionUpdateRef.current !== null) {
            exprModel = setCursorPositionToExpressionModel(exprModel, pendingCursorPositionUpdateRef.current);
            pendingCursorPositionUpdateRef.current = null;
        }

        setExpressionModel(exprModel);
    };

    useEffect(() => {
    }, [expressionModel])

    useEffect(() => {
        if (!props.value) return;
        fetchInitialTokens(props.value);
    }, [props.value]);

    const handleExpressionChange = async (updatedModel: ExpressionModel[], cursorPosition: number, lastTypedText?: string) => {
        const cursorPositionBeforeUpdate = getAbsoluteCaretPositionFromModel(expressionModel);
        const cursorPositionAfterUpdate = getAbsoluteCaretPositionFromModel(updatedModel);
        const cursorDelta = cursorPositionAfterUpdate - cursorPositionBeforeUpdate;
        const previousFullText = getTextValueFromExpressionModel(expressionModel);
        const updatedTokens = updateTokens(tokens, cursorPositionBeforeUpdate, cursorDelta, previousFullText);
        if ((!lastTypedText.startsWith('#$') || lastTypedText === '#$BACKSPACE') && JSON.stringify(updatedTokens) !== JSON.stringify(tokens)) {
            pendingForceSetTokensRef.current = updatedTokens;
        }
        const updatedValue = getTextValueFromExpressionModel(updatedModel);

        const wordBeforeCursor = getWordBeforeCursor(updatedModel);
        if (lastTypedText === '#$FOCUS') {
            setChipClicked(null);
        }
        const valueBeforeCursor = updatedValue.substring(0, cursorPositionAfterUpdate);
        if (valueBeforeCursor.trim().endsWith('+') || valueBeforeCursor.trim().endsWith(':')) {
            setIsHelperPaneOpen(true);
        }
        else if (updatedValue === '' || !wordBeforeCursor || wordBeforeCursor.trim() === '') {
            setIsHelperPaneOpen(false);
            setIsCompletionsOpen(false);
        }
        else {
            const newFilteredCompletions = filterCompletionsByPrefix(props.completions, wordBeforeCursor);
            setFilteredCompletions(newFilteredCompletions);
            if (newFilteredCompletions.length > 0) {
                setIsHelperPaneOpen(false)
                setIsCompletionsOpen(true)
            }
            else {
                setIsHelperPaneOpen(false)
                setIsCompletionsOpen(false);
            }
        }
        if (
            lastTypedText === '#$ARROWLEFT' ||
            lastTypedText === '#$ARROWRIGHT' ||
            lastTypedText === '#$FOCUS'
        ) {
            pendingCursorPositionUpdateRef.current = cursorPosition;
            fetchInitialTokens(props.value);
            if (lastTypedText === '#$FOCUS') {
                setIsHelperPaneOpen(true)
            }
            return;
        }
        if (
            (
                lastTypedText && lastTypedText.length > 0 &&
                (lastTypedText.endsWith('+') || lastTypedText.endsWith(' ') || lastTypedText.endsWith(','))

            )
            ||
            (lastTypedText === '#$BACKSPACE') ||
            (lastTypedText === '#$COMPLETIONS') ||
            (lastTypedText === '#$HELPER')
        ) {
            fetchnewTokensRef.current = true;
        }
        pendingCursorPositionUpdateRef.current = cursorPosition;
        props.onChange(updatedValue, updatedValue.length);
        setHasTypedSinceFocus(true);
    }

    const handleTriggerRebuild = (value: string, caretPosition?: number) => {
    }

    const handleEditorKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    }

    const handleCompletionSelect = async (item: CompletionItem) => {
        const absoluteCaretPosition = getAbsoluteCaretPosition(expressionModel);
        const updatedExpressionModelInfo = updateExpressionModelWithCompletion(expressionModel, absoluteCaretPosition, item.value || item.label);

        if (updatedExpressionModelInfo) {
            const { updatedModel, newCursorPosition } = updatedExpressionModelInfo;
            handleExpressionChange(updatedModel, newCursorPosition, '#$COMPLETIONS');
        }
        setIsCompletionsOpen(false);
    };

    const handleHelperPaneValueChange = async (value: string, closeHelperpane: boolean) => {
        if (
            chipClicked &&
            (chipClicked.type !== 'parameter' ||
                chipClicked.length > 0)
        ) {
            let absoluteCaretPosition = 0;
            for (let i = 0; i < expressionModel?.length; i++) {
                if (expressionModel && expressionModel[i].isFocused) {
                    absoluteCaretPosition += expressionModel[i]?.focusOffset || 0;
                    break;
                }
                absoluteCaretPosition += expressionModel ? expressionModel[i].value.length : 0;
            }
            const updatedExpressionModelInfo = updateExpressionModelWithHelperValue(expressionModel, absoluteCaretPosition, value, true);

            if (updatedExpressionModelInfo) {
                const { updatedModel, updatedValue, newCursorPosition } = updatedExpressionModelInfo;

                const textValue = getTextValueFromExpressionModel(updatedModel || []);
                const updatedTokens = await fetchUpdatedFilteredTokens(textValue);

                let exprModel = createExpressionModelFromTokens(textValue, updatedTokens);

                // Map absolute position into new model and set focus flags
                const mapped = mapAbsoluteToModel(exprModel, absoluteCaretPosition + value.length);
                exprModel = setFocusInExpressionModel(exprModel, mapped, true);
                setChipClicked(null);
                handleExpressionChange(exprModel, newCursorPosition, '#$HELPER');
            }
        }
        else {
            const absoluteCaretPosition = getAbsoluteCaretPositionFromModel(expressionModel);
            const updatedExpressionModelInfo = updateExpressionModelWithHelperValue(expressionModel, absoluteCaretPosition, value);
            if (updatedExpressionModelInfo) {
                const { updatedModel, updatedValue, newCursorPosition } = updatedExpressionModelInfo;

                const textValue = getTextValueFromExpressionModel(updatedModel || []);
                const updatedTokens = await fetchUpdatedFilteredTokens(textValue);

                let exprModel = createExpressionModelFromTokens(textValue, updatedTokens);

                // Map absolute position into new model and set focus flags
                const mapped = mapAbsoluteToModel(exprModel, absoluteCaretPosition + value.length);
                exprModel = setFocusInExpressionModel(exprModel, mapped, true);
                handleExpressionChange(exprModel, newCursorPosition, '#$HELPER');
            }
        }
        if (closeHelperpane) {
            setIsHelperPaneOpen(false);
        }
        else {
            setIsHelperPaneOpen(true);
        }
    };

    const handleCompletionKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isCompletionsOpen || filteredCompletions.length === 0) return;

        handleCompletionNavigation(
            e,
            filteredCompletions.length,
            selectedCompletionItem,
            setSelectedCompletionItem,
            handleCompletionSelect,
            setIsCompletionsOpen,
            filteredCompletions
        );
    }, [isCompletionsOpen, selectedCompletionItem, filteredCompletions]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        handleEditorKeyDown(e);
        if (isCompletionsOpen) {
            handleCompletionKeyDown(e);
        }
    }, [isCompletionsOpen, handleCompletionKeyDown]);

    useEffect(() => {
        if (filteredCompletions.length === 0) {
            setIsCompletionsOpen(false);
            return;
        }
        if (isAnyElementFocused && hasTypedSinceFocus && !isHelperPaneOpen) {
            setIsCompletionsOpen(true);
            setSelectedCompletionItem(-1);
        } else {
            setIsCompletionsOpen(false);
        }
    }, [filteredCompletions, isAnyElementFocused, hasTypedSinceFocus]);

    const handleChipClick = useCallback((element: HTMLElement, value: string, type: string, id?: string) => {
        const clickedChip = expressionModel?.find(model => model.id === id);
        if (!clickedChip) return;
        setChipClicked(clickedChip);

        const chipId = element.getAttribute(DATA_ELEMENT_ID_ATTRIBUTE);
        if (chipId && expressionModel) {
            const updatedExpressionModel = expressionModel.map(model => {
                if (model.id === chipId) {
                    return { ...model, isFocused: true, focusOffset: Math.max(model.length - 1, 0) };
                }
                return { ...model, isFocused: false };
            });

            setExpressionModel(updatedExpressionModel);
        }

        setIsHelperPaneOpen(true);
    }, [expressionModel]);

    const handleChipFocus = useCallback((element: HTMLElement, value: string, type: string, absoluteOffset?: number) => {
        const chipId = element.getAttribute(DATA_ELEMENT_ID_ATTRIBUTE);
        if (chipId && expressionModel) {
            const updatedExpressionModel = expressionModel.map(model => {
                if (model.id === chipId) {
                    return { ...model, isFocused: true, focusOffset: 0 };
                }
                return { ...model, isFocused: false, focusOffset: undefined };
            });
            setExpressionModel(updatedExpressionModel);
        }
    }, [expressionModel]);

    const handleChipBlur = useCallback(() => {
    }, []);

    const toggleHelperPane = useCallback(() => {
        setIsHelperPaneOpen(prev => !prev);
    }, []);

    useEffect(() => {
    }, [pendingCursorPositionUpdateRef.current, expressionModel]);

    const handleTextFocus = (e: React.FocusEvent<HTMLSpanElement>) => {
        focusedTextElementRef.current = e.currentTarget;
    }

    return (
        <> <ChipEditorContainer ref={fieldContainerRef} style={{ position: 'relative' }}>
            <FXButton />
            <AutoExpandingEditableDiv
                fieldContainerRef={fieldContainerRef}
                onFocusChange={(focused, isEditableSpan) => {
                    setIsAnyElementFocused(focused);
                    setIsEditableSpanFocused(isEditableSpan);
                    if (!focused && expressionModel) {
                        const cleared = expressionModel.map(el => ({ ...el, isFocused: false, focusOffset: undefined }));
                        handleExpressionChange(cleared, getAbsoluteCaretPosition(cleared), '#$FOCUS');
                    }
                }}
                onKeyDown={handleKeyDown}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
                isCompletionsOpen={isCompletionsOpen}
                completions={filteredCompletions}
                selectedCompletionItem={selectedCompletionItem}
                onCompletionSelect={handleCompletionSelect}
                onCompletionHover={setSelectedCompletionItem}
                onCloseCompletions={() => setIsCompletionsOpen(false)}
                getHelperPane={props.getHelperPane}
                isHelperPaneOpen={isHelperPaneOpen}
                handleHelperPaneValueChange={handleHelperPaneValueChange}
                onHelperPaneClose={() => setIsHelperPaneOpen(false)}
                onToggleHelperPane={toggleHelperPane}
            >
                <TokenizedExpression
                    expressionModel={expressionModel || []}
                    onExpressionChange={handleExpressionChange}
                    onTriggerRebuild={handleTriggerRebuild}
                    onChipClick={handleChipClick}
                    onTextFocus={handleTextFocus}
                    onChipFocus={handleChipFocus}
                    onChipBlur={handleChipBlur}
                />
            </AutoExpandingEditableDiv>
        </ChipEditorContainer >
        </>
    )
}
