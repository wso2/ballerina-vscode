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

import React, { useCallback, useEffect, useRef, useState } from "react";
import FXButton from "./components/FxButton";
import {  ChipEditorContainer,ContextMenuContainer, Completions } from "./styles";
import { ExpressionModel } from "./types";
import { AutoExpandingEditableDiv } from "./components/AutoExpandingEditableDiv";
import { TokenizedExpression } from "./components/TokenizedExpression";
import { CompletionsItem } from "./components/CompletionsItem";
import { CompletionItem, HelperPaneHeight } from "@wso2/ui-toolkit";
import { useFormContext } from "../../../../context";
import { createExpressionModelFromTokens, getTextValueFromExpressionModel } from "./utils";

export type ChipExpressionBaseComponentProps = {
    // tokens: Token[];
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

export const ChipExpressionBaseComponent = (props: ChipExpressionBaseComponentProps) => {
    console.log("#VALUE#", props.value);
    const [expressionModel, setExpressionModel] = useState<ExpressionModel[]>([])
    const [tokens, setTokens] = useState<number[]>([]);
    const [cursorPosition, setCursorPosition] = useState<{ start: number, end: number }>();
    const [currentExpressionModelElement, setCurrentExpressionModelElement] = useState<ExpressionModel | null>(null);
    const [isRebuilding, setIsRebuilding] = useState<boolean>(false);
    const pendingCaretRestoreRef = useRef<number | null>(null);

    const fieldContainerRef = useRef<HTMLDivElement>(null);
    const [isAnyElementFocused, setIsAnyElementFocused] = useState(false);
    const [isExpressionActive, setIsExpressionActive] = useState(false);
    const [isDebugActive, setIsDebugActive] = useState(false);

    // Completions state
    const [selectedCompletionItem, setSelectedCompletionItem] = useState<number>(0);
    const [isCompletionsOpen, setIsCompletionsOpen] = useState<boolean>(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [hasTypedSinceFocus, setHasTypedSinceFocus] = useState<boolean>(false);

    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    // Helper function to get the last word before cursor
    const getLastWordBeforeCursor = (text: string, cursorPos: number): { word: string; startPos: number } => {
        let startPos = cursorPos;
        while (startPos > 0 && /\w/.test(text[startPos - 1])) {
            startPos--;
        }
        return {
            word: text.substring(startPos, cursorPos),
            startPos
        };
    };

    // Handle completion selection
    const handleCompletionSelect = (item: CompletionItem) => {
        if (!cursorPosition || !fieldContainerRef.current) return;

        const textValue = getTextValueFromExpressionModel(expressionModel);
        const { word, startPos } = getLastWordBeforeCursor(textValue, cursorPosition.start);
        
        // Replace the last word with the completion's insertText
        const insertText = item.value || item.label;
        const beforeText = textValue.substring(0, startPos);
        const afterText = textValue.substring(cursorPosition.start);
        const newValue = beforeText + insertText + afterText;

        console.log('Completion selected:', {
            item: item.label,
            insertText,
            beforeText,
            afterText,
            newValue
        });

        // Rebuild expression model with new value
        createExpressionModel(newValue);
        
        // Update cursor position to after the inserted text
        const newCursorPosition = startPos + insertText.length;
        setCursorPosition({
            start: newCursorPosition,
            end: newCursorPosition
        });

        // Close completions
        setIsCompletionsOpen(false);
        setHasTypedSinceFocus(false);
        
        // Trigger onChange
        props.onChange(newValue, newCursorPosition);
    };

    // Handle keyboard navigation in completions
    const handleCompletionKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isCompletionsOpen || props.completions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedCompletionItem(prev => 
                    prev < props.completions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedCompletionItem(prev => 
                    prev > 0 ? prev - 1 : prev
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedCompletionItem < props.completions.length) {
                    handleCompletionSelect(props.completions[selectedCompletionItem]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsCompletionsOpen(false);
                break;
            default:
                break;
        }
    }, [isCompletionsOpen, selectedCompletionItem, props.completions]);


    const handleExpressionChange = (updatedExpressionModel: ExpressionModel[], cursorDelta: number) => {
        setExpressionModel(updatedExpressionModel);
        const updatedValue = getTextValueFromExpressionModel(updatedExpressionModel);
        props.onChange(updatedValue, cursorPosition?.start);
        setCursorPosition(prev => {
            if (!prev) return prev;
            const newPosition = {
                start: prev.start + cursorDelta,
                end: prev.end + cursorDelta
            };
            
            // Call onChange with the updated text value and cursor position
            const updatedValue = getTextValueFromExpressionModel(updatedExpressionModel);
            props.onChange(updatedValue, newPosition.start);
            
            return newPosition;
        });
        
        // Mark that user has typed
        setHasTypedSinceFocus(true);
        
        // Update completions position if typing
        if (fieldContainerRef.current && isAnyElementFocused) {
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && activeElement.hasAttribute('contenteditable')) {
                const rect = activeElement.getBoundingClientRect();
                const containerRect = fieldContainerRef.current.getBoundingClientRect();
                setMenuPosition({
                    top: rect.bottom - containerRect.top + 4,
                    left: rect.left - containerRect.left
                });
            } else {
                // Fallback: position below the expression field
                const containerRect = fieldContainerRef.current.getBoundingClientRect();
                setMenuPosition({
                    top: containerRect.height + 4,
                    left: 0
                });
            }
        }
    }

    useEffect(() => {
        // When tokens change, rebuild the expression model (preserving caret if available).
        if (!tokens || tokens.length === 0) return;
        void handleTriggerRebuild(props.value, cursorPosition?.start);
    }, [tokens]);

    const createExpressionModel = async (val: string) => {
        if (tokens) {
            const newExpressionModel = createExpressionModelFromTokens(val, tokens);
            setExpressionModel(newExpressionModel);
            
            // Call onChange when expression model is created/updated
            const currentPosition = cursorPosition?.start ?? 0;
            props.onChange(val, currentPosition);
        }
    };

    const handleTriggerRebuild = async (value: string, currentCaretPosition?: number) => {
        // Rebuild the expression model when triggered (e.g., when "+" is typed)
        // Preserve cursor position across the rebuild
        const savedCursorPosition = currentCaretPosition ?? cursorPosition?.start ?? 0;
        pendingCaretRestoreRef.current = savedCursorPosition;
        setIsRebuilding(true);
        
        await createExpressionModel(value);
        
        setIsRebuilding(false);
    };

    // Use useLayoutEffect to restore caret immediately after DOM update, before paint
    useEffect(() => {
        if (!isRebuilding && pendingCaretRestoreRef.current !== null) {
            const container = fieldContainerRef.current;
            const savedPosition = pendingCaretRestoreRef.current;
            
            // Use requestAnimationFrame to ensure DOM is ready but execute before visible paint
            requestAnimationFrame(() => {
                if (container && savedPosition !== undefined) {
                    restoreCaretPositionInContainer(container, savedPosition);
                    pendingCaretRestoreRef.current = null;
                }
            });
        }
    }, [expressionModel, isRebuilding]);

    useEffect(() => {
        const fetchTokens = async () => {
            const fetchedTokens = await expressionEditorRpcManager?.getExpressionTokens(props.value);
            if (fetchedTokens) {
                setTokens(fetchedTokens);
            }
        };
        fetchTokens();
    }, []);

    const restoreCaretPositionInContainer = (container: HTMLElement, absolutePosition: number) => {
        let remaining = absolutePosition;
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let textNode: Text | null = null;
        let offset = 0;
        let node = walker.nextNode() as Text | null;
        
        while (node) {
            const nodeLength = node.textContent?.length || 0;
            if (remaining <= nodeLength) {
                textNode = node;
                offset = remaining;
                break;
            }
            remaining -= nodeLength;
            node = walker.nextNode() as Text | null;
        }
        
        if (textNode) {
            const range = document.createRange();
            range.setStart(textNode, Math.min(offset, textNode.textContent?.length || 0));
            range.collapse(true);
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // Focus the element containing the text node
            let focusElement = textNode.parentElement;
            while (focusElement && !focusElement.hasAttribute('contenteditable')) {
                focusElement = focusElement.parentElement;
            }
            if (focusElement) {
                focusElement.focus();
            }
        }
    };

    useEffect(() => {
        createExpressionModel(props.value);
    }, [props.value]);

    // Show/hide completions based on completions array and typing state
    useEffect(() => {
        if (props.completions.length === 0) {
            setIsCompletionsOpen(false);
            return;
        }
        // Only show completions if user has typed after focusing
        if (isAnyElementFocused && hasTypedSinceFocus) {
            // Set position when completions are about to show
            if (fieldContainerRef.current) {
                const activeElement = document.activeElement as HTMLElement;
                if (activeElement && activeElement.hasAttribute('contenteditable')) {
                    const rect = activeElement.getBoundingClientRect();
                    const containerRect = fieldContainerRef.current.getBoundingClientRect();
                    setMenuPosition({
                        top: rect.bottom - containerRect.top + 4,
                        left: rect.left - containerRect.left
                    });
                } else {
                    // Fallback: position below the expression field
                    const containerRect = fieldContainerRef.current.getBoundingClientRect();
                    setMenuPosition({
                        top: containerRect.height + 4,
                        left: 0
                    });
                }
            }
            setIsCompletionsOpen(true);
            setSelectedCompletionItem(0);
        } else {
            setIsCompletionsOpen(false);
        }
    }, [props.completions, isAnyElementFocused, hasTypedSinceFocus]);

    // Reset hasTypedSinceFocus when focus changes
    useEffect(() => {
        if (!isAnyElementFocused) {
            setHasTypedSinceFocus(false);
            setIsCompletionsOpen(false);
        }
    }, [isAnyElementFocused]);


    return (
        <>
            <ChipEditorContainer style={{ position: 'relative' }}>
                <FXButton />
                <AutoExpandingEditableDiv
                    fieldContainerRef={fieldContainerRef}
                    style={isRebuilding ? { caretColor: 'transparent' } : undefined}
                    onFocusChange={(focused) => setIsAnyElementFocused(focused)}
                    onKeyDown={handleCompletionKeyDown}
                >
                    <TokenizedExpression
                        expressionModel={expressionModel}
                        onExpressionChange={handleExpressionChange}
                        onTriggerRebuild={handleTriggerRebuild}
                    />
                </AutoExpandingEditableDiv>
                 {isCompletionsOpen && (
                    <ContextMenuContainer
                        top={menuPosition.top}
                        left={menuPosition.left}
                        data-menu="chip-menu"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <Completions>
                            {props.completions.map((item, index) => (
                                <CompletionsItem
                                    key={`${item.label}-${index}`}
                                    item={item}
                                    isSelected={index === selectedCompletionItem}
                                    onClick={() => handleCompletionSelect(item)}
                                    onMouseEnter={() => setSelectedCompletionItem(index)}
                                />
                            ))}
                        </Completions>
                    </ContextMenuContainer>
                )}
            </ChipEditorContainer >
        </>
    )
}
