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
import { getAbsoluteCaretPosition, mapAbsoluteToModel, filterTokens, createExpressionModelFromTokens, getTextValueFromExpressionModel, updateExpressionModelWithCompletion, handleCompletionNavigation, calculateCompletionsMenuPosition, setFocusInExpressionModel } from "./utils";
import { CompletionItem, HelperPaneHeight } from "@wso2/ui-toolkit";
import { useFormContext } from "../../../../context";

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

    const fetchUpdatedFilteredTokens = useCallback(async (value: string): Promise<number[]> => {
        const response = await expressionEditorRpcManager?.getExpressionTokens(value);
        return filterTokens(response || []);
    }, [expressionEditorRpcManager]);

    useEffect(() => {
        const fetchInitialTokens = async () => {
            const filteredTokens = await fetchUpdatedFilteredTokens(props.value);
            setTokens(filteredTokens);

            //fetch and recreate model on props.value change 
            //only when expressionModel is not set
            //which means this is the initial load of the expression editor
            //never recreate the expression model on props.value 
            //it will recreate the model on every keystroke
            //since we are using onChange to update the props.value on keystrokes
            if (!expressionModel) {
                const exprModel = createExpressionModelFromTokens(props.value, filteredTokens);
                setExpressionModel(exprModel);
            }
        };
        fetchInitialTokens();
    }, [props.value, fetchUpdatedFilteredTokens]);

    const handleExpressionChange = (updatedModel: ExpressionModel[]) => {
        const updatedValue = getTextValueFromExpressionModel(updatedModel);
        props.onChange(updatedValue, updatedValue.length);
        
        setExpressionModel(updatedModel);

        // Mark that user has typed since focus
        // this reset to false each time user focus editable element
        setHasTypedSinceFocus(true);
    }

    const handleTriggerRebuild = (value: string, caretPosition?: number) => {
        const textValue = value;
        let exprModel = createExpressionModelFromTokens(textValue, tokens);

        // Map caretPosition into new model
        if (caretPosition !== undefined) {
            const mapped = mapAbsoluteToModel(exprModel, caretPosition);
            exprModel = setFocusInExpressionModel(exprModel, mapped, true);
        }

        setExpressionModel(exprModel);
    }

    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === '+') {
            const absolutePos = getAbsoluteCaretPosition(expressionModel);

            const textValue = getTextValueFromExpressionModel(expressionModel || []);
            let exprModel = createExpressionModelFromTokens(textValue, tokens);

            // Map absolute position into new model and set focus flags
            const mapped = mapAbsoluteToModel(exprModel, absolutePos);
            exprModel = setFocusInExpressionModel(exprModel, mapped, true);
            setExpressionModel(exprModel);
        }
    }

    const handleCompletionSelect = async (item: CompletionItem) => {
        const absoluteCaretPosition = getAbsoluteCaretPosition(expressionModel);
        const updatedExpressionModelInfo = updateExpressionModelWithCompletion(expressionModel, absoluteCaretPosition, item.value || item.label);

        if (updatedExpressionModelInfo) {
            const { updatedModel, updatedValue, newCursorPosition } = updatedExpressionModelInfo;

            const textValue = getTextValueFromExpressionModel(updatedModel || []);
            const updatedTokens = await fetchUpdatedFilteredTokens(textValue);

            let exprModel = createExpressionModelFromTokens(textValue, updatedTokens);

            // Map absolute position into new model and set focus flags
            const mapped = mapAbsoluteToModel(exprModel, newCursorPosition);
            exprModel = setFocusInExpressionModel(exprModel, mapped, true);
            props.onChange(updatedValue, newCursorPosition);
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

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        handleEditorKeyDown(e);
        if (isCompletionsOpen) {
            handleCompletionKeyDown(e);
        }
    }, [isCompletionsOpen, handleCompletionKeyDown]);

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
                onKeyDown={handleKeyDown}
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