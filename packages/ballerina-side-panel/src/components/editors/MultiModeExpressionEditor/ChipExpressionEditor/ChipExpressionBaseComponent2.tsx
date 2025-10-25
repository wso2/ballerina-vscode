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
import { getAbsoluteCaretPosition, mapAbsoluteToModel, filterTokens, createExpressionModelFromTokens, getTextValueFromExpressionModel, updateExpressionModelWithCompletion, handleCompletionNavigation, calculateCompletionsMenuPosition, setFocusInExpressionModel, updateExpressionModelWithHelperValue, getAbsoluteCaretPositionFromModel, getWordBeforeCursor, filterCompletionsByPrefix, setCursorPositionToExpressionModel, updateTokens } from "./utils";
import { CompletionItem, HelperPaneHeight } from "@wso2/ui-toolkit";
import { useFormContext } from "../../../../context";
import { CHIP_EXPRESSION_EDITOR_HEIGHT, DATA_ELEMENT_ID_ATTRIBUTE } from "./constants"; // Import the constant

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
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: CHIP_EXPRESSION_EDITOR_HEIGHT, left: 0 });
    const [hasTypedSinceFocus, setHasTypedSinceFocus] = useState<boolean>(false);
    const [isAnyElementFocused, setIsAnyElementFocused] = useState(false);
    const [isEditableSpanFocused, setIsEditableSpanFocused] = useState(false);
    const [chipClicked, setChipClicked] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHelperPaneOpen, setIsHelperPaneOpen] = useState(false);
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>(props.completions);

    const fieldContainerRef = useRef<HTMLDivElement>(null);
    const fetchedInitialTokensRef = useRef<boolean>(false);
    const pendingCursorPositionUpdateRef = useRef<number>(0);
    const pendingForceSetTokensRef = useRef<number[] | null>(null);
    const fetchnewTokensRef = useRef<boolean>(true);

    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    const fetchUpdatedFilteredTokens = useCallback(async (value: string): Promise<number[]> => {
        const response = await expressionEditorRpcManager?.getExpressionTokens(
            value,
            '/Users/senith/Desktop/bi-pro/example2/example/main.bal',
            {
                line: 24,
                offset: 13
            }
        );
        return filterTokens(response || []);
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
        console.log("getting here", pendingCursorPositionUpdateRef.current)
        if (pendingCursorPositionUpdateRef.current !== null) {
            exprModel = setCursorPositionToExpressionModel(exprModel, pendingCursorPositionUpdateRef.current);
            pendingCursorPositionUpdateRef.current = null;
        }

        setExpressionModel(exprModel);
    };

    useEffect(()=>{
        console.log("MODEL CHANGED", expressionModel)
    }, [expressionModel])

    useEffect(() => {
        if (!props.value) return;
        fetchInitialTokens(props.value);
    }, [props.value]);

    const handleExpressionChange = async (updatedModel: ExpressionModel[], cursorPosition: number, lastTypedText?: string) => {
        const cursorPositionBeforeUpdate = getAbsoluteCaretPositionFromModel(expressionModel);
        const cursorPositionAfterUpdate = getAbsoluteCaretPositionFromModel(updatedModel);
        console.log("CURSOR POSITION BEFORE UPDATE", cursorPositionBeforeUpdate)
        console.log("CURSOR POSITION AFTER UPDATE", cursorPositionAfterUpdate)
        const cursorDelta = cursorPositionAfterUpdate - cursorPositionBeforeUpdate;
        const updatedTokens = updateTokens(tokens, cursorPositionBeforeUpdate, cursorDelta);
        console.log("token update:",tokens, updatedTokens)
        if ((!lastTypedText.startsWith('#$') || lastTypedText === '#$BACKSPACE') && JSON.stringify(updatedTokens) !== JSON.stringify(tokens)) {
            console.log("token update:",tokens, updatedTokens)
            pendingForceSetTokensRef.current = updatedTokens;
        }
        const updatedValue = getTextValueFromExpressionModel(updatedModel);
        console.log("Updated Value:", lastTypedText);
        console.log("Cursor Position:", cursorPosition);
        if (
            lastTypedText === '#$ARROWLEFT' ||
            lastTypedText === '#$ARROWRIGHT' ||
            lastTypedText === '#$FOCUS'
        ) {
            pendingCursorPositionUpdateRef.current = cursorPosition;
            fetchInitialTokens(props.value);
            return;
        }
        if (
            (
                lastTypedText && lastTypedText.length > 0 &&
                (lastTypedText.endsWith('+') || lastTypedText.endsWith(' '))

            )
            ||
            (lastTypedText === '#$BACKSPACE') ||
            (lastTypedText === '#$COMPLETIONS') ||
            (lastTypedText === '#$HELPER')
        ) {
            fetchnewTokensRef.current = true;
            // setExpressionModel(exprModel);
        }
        pendingCursorPositionUpdateRef.current = cursorPosition;
        props.onChange(updatedValue, updatedValue.length);
        // Mark that user has typed since focus
        // this reset to false each time user focus editable element
        setHasTypedSinceFocus(true);
    }

    const handleTriggerRebuild = (value: string, caretPosition?: number) => {
        // const textValue = value;
        // let exprModel = createExpressionModelFromTokens(textValue, tokens);

        // // Map caretPosition into new model
        // if (caretPosition !== undefined) {
        //     const mapped = mapAbsoluteToModel(exprModel, caretPosition);
        //     exprModel = setFocusInExpressionModel(exprModel, mapped, true);
        // }

        // setExpressionModel(exprModel);
    }

    const handleEditorKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
        // if (e.key === '+') {

        //     const absolutePos = getAbsoluteCaretPosition(expressionModel);
        //     const textValue = getTextValueFromExpressionModel(expressionModel || []);

        //     const updatedValue = textValue.slice(0, absolutePos) + e.key + textValue.slice(absolutePos);

        //     const filteredTokens = await fetchUpdatedFilteredTokens(updatedValue);
        //     let exprModel = createExpressionModelFromTokens(updatedValue, filteredTokens);

        //     // Map absolute position into new model and set focus flags
        //     const mapped = mapAbsoluteToModel(exprModel, absolutePos + 1);
        //     exprModel = setFocusInExpressionModel(exprModel, mapped, true);
        //     setExpressionModel(exprModel);
        // }
    }

    const handleCompletionSelect = async (item: CompletionItem) => {
        const absoluteCaretPosition = getAbsoluteCaretPosition(expressionModel);
        console.log("absoluteCaretPosition", absoluteCaretPosition)
        const updatedExpressionModelInfo = updateExpressionModelWithCompletion(expressionModel, absoluteCaretPosition, item.value || item.label);
        console.log("#HA", updatedExpressionModelInfo)

        if (updatedExpressionModelInfo) {
            const { updatedModel, newCursorPosition } = updatedExpressionModelInfo;
            handleExpressionChange(updatedModel, newCursorPosition, '#$COMPLETIONS');
        }
        setIsCompletionsOpen(false);
    };

    const handleHelperPaneValueChange = async (value: string) => {
        console.log("ChipCLICKED", chipClicked);
        if (chipClicked) {
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
                handleExpressionChange(exprModel, newCursorPosition, '#$HELPER');
            }
        }
        else {
            console.log("#QAS")
            const absoluteCaretPosition = getAbsoluteCaretPositionFromModel(expressionModel);
            console.log("absoluteCaretPosition", absoluteCaretPosition)
            const updatedExpressionModelInfo = updateExpressionModelWithHelperValue(expressionModel, absoluteCaretPosition, value);
            console.log("#HA", updatedExpressionModelInfo)
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
        setIsHelperPaneOpen(false);
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
            calculateCompletionsMenuPosition(fieldContainerRef, setMenuPosition);
            setIsCompletionsOpen(true);
            setSelectedCompletionItem(-1);
        } else {
            setIsCompletionsOpen(false);
        }
    }, [filteredCompletions, isAnyElementFocused, hasTypedSinceFocus]);

    const handleChipClick = useCallback((element: HTMLElement, value: string, type: string, absoluteOffset?: number) => {
        console.log('Chip clicked:', value, type);
        setChipClicked(true);

        // Retrieve the data-element-id attribute
        const chipId = element.getAttribute(DATA_ELEMENT_ID_ATTRIBUTE);
        if (chipId && expressionModel) {
            // Find the corresponding expressionModel element
            const updatedExpressionModel = expressionModel.map(model => {
                if (model.id === chipId) {
                    return { ...model, isFocused: true, focusOffset: model.length - 1 };
                }
                return { ...model, isFocused: false }; // Reset focus for other elements
            });

            setExpressionModel(updatedExpressionModel);
        }

        calculateCompletionsMenuPosition(fieldContainerRef, setMenuPosition);
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
        console.log('Chip blurred');
        // Don't close HelperPane on chip blur - let focus change handle it
    }, []);

    const toggleHelperPane = useCallback(() => {
        setIsHelperPaneOpen(prev => !prev);
    }, []);

    useEffect(() => {
        if (chipClicked) {
            setIsHelperPaneOpen(true);
            setIsCompletionsOpen(false);
            return;
        }
        const fullText = getTextValueFromExpressionModel(expressionModel);
        if (fullText.length === 0) {
            setIsCompletionsOpen(false);
            setIsHelperPaneOpen(true);
            return;
        }
        const focusedElement = expressionModel?.find(el => el.isFocused);
        calculateCompletionsMenuPosition(fieldContainerRef, setMenuPosition);
        if (!focusedElement) {
            setIsCompletionsOpen(false);
            setIsHelperPaneOpen(false);
            return;
        }
        const wordBeforeCursor = getWordBeforeCursor(expressionModel);
        const newFilteredCompletions = filterCompletionsByPrefix(props.completions, wordBeforeCursor);
        setFilteredCompletions(newFilteredCompletions);
        if (!wordBeforeCursor || wordBeforeCursor.trim() === '') {
            setIsCompletionsOpen(false);
            setIsHelperPaneOpen(true);
        }
        else if (filteredCompletions.length > 0) {
            setIsCompletionsOpen(true);
            setIsHelperPaneOpen(false);
        }
        else {
            setIsCompletionsOpen(false);
            setIsHelperPaneOpen(true);
        }

    }, [expressionModel])

    return (
        <> <ChipEditorContainer ref={fieldContainerRef} style={{ position: 'relative' }}>
            <FXButton />
            <AutoExpandingEditableDiv
                fieldContainerRef={fieldContainerRef}
                onFocusChange={(focused, isEditableSpan) => {
                    console.log('Focus change:', focused, 'isEditableSpan:', isEditableSpan, 'hasTypedSinceFocus:', hasTypedSinceFocus);
                    setIsAnyElementFocused(focused);
                    setIsEditableSpanFocused(isEditableSpan);
                    // If focus left the editor, clear model focus flags
                    if (!focused && expressionModel) {
                        const cleared = expressionModel.map(el => ({ ...el, isFocused: false, focusOffset: undefined }));
                        handleExpressionChange(cleared, getAbsoluteCaretPosition(cleared), '#$FOCUS');
                        // setExpressionModel(cleared);
                    }
                }}
                onKeyDown={handleKeyDown}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
                isCompletionsOpen={isCompletionsOpen}
                completions={filteredCompletions}
                selectedCompletionItem={selectedCompletionItem}
                menuPosition={menuPosition}
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
                    onChipFocus={handleChipFocus}
                    onChipBlur={handleChipBlur}
                />
            </AutoExpandingEditableDiv>
        </ChipEditorContainer >
            {/* <pre>{JSON.stringify(tokens)}</pre>
           
            <pre>{JSON.stringify(props.completions)}</pre> */}
            <pre>{JSON.stringify(expressionModel, null, 2)}</pre>
            <pre>IS ANY FOCUSED:{isAnyElementFocused ? "true" : "false"}</pre>
            <pre>HAS TYPED SINCE FOCUS:{hasTypedSinceFocus ? "true" : "false"}</pre>
            <pre>IS EDITABLE SPAN FOCUS:{isEditableSpanFocused ? "true" : "false"}</pre>
            <pre>ABSOLUTE CURSOR:{getAbsoluteCaretPosition(expressionModel)}</pre>
        </>
    )
}
