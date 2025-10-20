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
import { Chip, ChipEditorContainer, ChipEditorField, ChipMenu, ChipMenuItem } from "./styles";
import { Token } from "./types";
import { CHIP_EXPRESSION_EDITOR_HEIGHT } from "./constants";
import { AutoExpandingEditableDiv } from "./components/AutoExpandingEditableDiv";
import { TokenizedExpression } from "./components/TokenizedExpression";
import { calculateMenuPosition, getAbsoluteColumnOffset, getInvalidTokensRange, handleErrorCorrection } from "./utils";
import { CompletionItem, getIcon, HelperPaneHeight, ThemeColors } from "@wso2/ui-toolkit";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

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
}

export const ChipExpressionBaseComponent = (props: ChipExpressionBaseComponentProps) => {
    const { onTokenRemove, onTokenClick, getHelperPane, completions, onChange } = props;
    const editorRef = React.useRef<HTMLDivElement>(null);
    const cursorBeforeChangeRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });
    const [selectedCompletionItem, setSelectedCompletionItem] = useState<number>(0);
    const [isHelperpaneOpen, setIsHelperpaneOpen] = useState<boolean>(false);
    const [isCompletionsOpen, setIsCompletionsOpen] = useState<boolean>(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({
        top: 0,
        left: 0
    });
    const [value, setValue] = React.useState<string>("val + 12 + foo(val, 14);\n" +
        "bar( x, y + 5 ) + z.prop + 7\n" +
        "compute( a, b, c ) * d / (e + 2)\n");
    const [tokens, setTokens] = React.useState<number[]>([
        0, 0, 3, 0, 0,
        0, 15, 3, 2, 0,
        0, 5, 2, 2, 0,

        1, 5, 1, 2, 0,
        0, 3, 5, 2, 0,
        0, 10, 6, 1, 0,

        1, 9, 1, 2, 0,
        0, 3, 1, 2, 0,
        0, 3, 1, 2, 0,
        0, 6, 1, 0, 0,
        0, 5, 1, 0, 0,
    ])

    const currentCursorPositionRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });

    const handleSelectionChange = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        // Get the container element (ChipEditorField)
        const container = range.commonAncestorContainer;
        const root = container.nodeType === Node.TEXT_NODE
            ? container.parentNode
            : container;

        // Calculate absolute position by traversing all text nodes
        let absoluteStart = 0;
        let absoluteEnd = 0;

        const calculatePosition = (node: Node, targetNode: Node, targetOffset: number): number => {
            let position = 0;

            const traverse = (current: Node): boolean => {
                if (current === targetNode) {
                    position += targetOffset;
                    return true;
                }

                if (current.nodeType === Node.TEXT_NODE) {
                    position += current.textContent?.length || 0;
                } else if (current.nodeType === Node.ELEMENT_NODE) {
                    const element = current as Element;
                    // Skip contentEditable="false" elements but count them as their text length
                    if (element.getAttribute('contenteditable') === 'false') {
                        position += current.textContent?.length || 0;
                        return false;
                    }

                    for (let i = 0; i < current.childNodes.length; i++) {
                        if (traverse(current.childNodes[i])) {
                            return true;
                        }
                    }
                }
                return false;
            };

            // Find the root editable container
            let rootElement = node;
            while (rootElement.parentNode && rootElement.parentNode.nodeType === Node.ELEMENT_NODE) {
                const parent = rootElement.parentNode as Element;
                if (parent.getAttribute('contenteditable') === 'true') {
                    rootElement = parent;
                } else {
                    break;
                }
            }

            traverse(rootElement);
            return position;
        };

        absoluteStart = calculatePosition(root, range.startContainer, range.startOffset);
        absoluteEnd = calculatePosition(root, range.endContainer, range.endOffset);

        currentCursorPositionRef.current = { start: absoluteStart, end: absoluteEnd };
        console.log('Cursor position:', { start: absoluteStart, end: absoluteEnd });
    };

    const handleCompletionSelect = async (item: CompletionItem) => {
        console.log("completions select")
        const insertText = item.label || item.label;
        const { start, end } = currentCursorPositionRef.current;

        const newValue = value.substring(0, start) + insertText + value.substring(end);

        const newCursorPosition = start + insertText.length;

        setValue(newValue);
        currentCursorPositionRef.current = {
            start: newCursorPosition,
            end: newCursorPosition
        };
        setIsCompletionsOpen(false);
        setValue(newValue);
        onChange(newValue, newCursorPosition);
    };

    const handleHelperValueChange = async (value: string) => {
        console.log("completions select")
        const insertText = value;
        const { start, end } = currentCursorPositionRef.current;

        const newValue = value.substring(0, start) + insertText + value.substring(end);

        const newCursorPosition = start + insertText.length;

        setValue(newValue);
        currentCursorPositionRef.current = {
            start: newCursorPosition,
            end: newCursorPosition
        };
        setIsCompletionsOpen(false);
        setValue(newValue);
        setTokens([]);
        //refetch tokens
        onChange(newValue, newCursorPosition);
    };

    const handleKeyDown = useCallback(async (event: React.KeyboardEvent) => {
        switch (event.key) {
            case "Enter":
                if (completions?.length - 1 < selectedCompletionItem) return;
                event.preventDefault();
                await handleCompletionSelect(completions[selectedCompletionItem])
                break;
            case "ArrowUp":
                event.preventDefault();
                if (selectedCompletionItem <= 0) return;
                setSelectedCompletionItem(selectedCompletionItem - 1)
                break;
            case "ArrowDown":
                event.preventDefault();
                if (completions.length - 1 <= selectedCompletionItem) return;
                setSelectedCompletionItem(selectedCompletionItem + 1)
                break;
            default:
                break;
        }
    }, [selectedCompletionItem, completions]);

    function setCaretPosition(container: HTMLElement, charIndex: number) {
        const selection = window.getSelection();
        if (!selection) return;
        let remaining = charIndex;

        // Use TreeWalker to find the text node at charIndex
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const nodeLength = node.textContent?.length ?? 0;

            if (remaining <= nodeLength) {
                // Found the node containing the target position
                const range = document.createRange();
                range.setStart(node, remaining);
                range.collapse(true); // true = caret (not a selection)
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            } else {
                remaining -= nodeLength;
            }
        }
    }

    useEffect(() => {
        setCaretPosition(editorRef.current, cursorBeforeChangeRef.current.start);
    }, [value]);

    useEffect(() => {
        setCaretPosition(editorRef.current, currentCursorPositionRef.current.start);
    }, [currentCursorPositionRef.current]);

    useEffect(() => {
        if (completions.length === 0) return;
        setIsCompletionsOpen(true);
        setIsHelperpaneOpen(false);
    }, [completions]);

    useEffect(() => {
        if (!isHelperpaneOpen && !isCompletionsOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const isMenuClick = target.closest('[data-menu="chip-menu"]');
            const isEditorClick = editorRef.current?.contains(target);

            if (!isMenuClick && !isEditorClick) {
                setIsHelperpaneOpen(false);
                setIsCompletionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isHelperpaneOpen]);

    const handleChipClick = (element: HTMLElement, value: string, type: string, absoluteOffset?: number) => {
        const position = calculateMenuPosition(element, editorRef.current);
        currentCursorPositionRef.current = {
            start: absoluteOffset || 0,
            end: absoluteOffset + value.length
        };

        if (position) {
            setIsHelperpaneOpen(true);
            setIsCompletionsOpen(false);
            setMenuPosition(position);
        }
    };

    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const containerRect = editorRef.current?.getBoundingClientRect();

            if (containerRect && rect.width > 0 && rect.height > 0) {
                // Valid text selection/cursor position
                const menuWidth = 120;
                let top = rect.bottom - containerRect.top + 4;
                let left = rect.left - containerRect.left;

                // Ensure menu doesn't go beyond the right edge
                if (left + menuWidth > containerRect.width) {
                    left = containerRect.width - menuWidth;
                }
                setIsHelperpaneOpen(true);
                setIsCompletionsOpen(false);
                setMenuPosition({ top, left });
            } else if (editorRef.current) {
                // Fallback to editor position if no valid range
                const position = calculateMenuPosition(editorRef.current, editorRef.current);
                if (position) {
                    setIsHelperpaneOpen(true);
                    setIsCompletionsOpen(false);
                    setMenuPosition(position);
                }
            }
        }
    };

    return (
        <>
            <ChipEditorContainer style={{ position: 'relative' }}>
                <FXButton />
                <AutoExpandingEditableDiv
                    fieldRef={editorRef}
                    value={value}
                    tokens={tokens}
                    onChange={(newValue) => {
                        handleSelectionChange();
                        cursorBeforeChangeRef.current = { ...currentCursorPositionRef.current }; // Save cursor before change
                        console.log("cursor correction", (newValue.length - value.length))
                        const invalidTokensRange = getInvalidTokensRange(value, tokens, cursorBeforeChangeRef.current.start - (newValue.length - value.length));
                        const correctedTokens = handleErrorCorrection(invalidTokensRange, tokens, newValue.length - value.length);
                        console.log("Corrected Tokens: ", correctedTokens);
                        setTokens(correctedTokens);
                        setValue(newValue);
                        onChange(newValue, currentCursorPositionRef.current.start);
                    }}
                    onSelect={handleSelectionChange}
                    onClick={(e) => {
                        handleSelectionChange();
                        handleEditorClick(e);
                    }}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleSelectionChange}
                >
                    <TokenizedExpression
                        value={value}
                        tokens={tokens}
                        onChipClick={handleChipClick}

                    />
                </AutoExpandingEditableDiv>
                {isHelperpaneOpen && (
                    <ChipMenu
                        top={menuPosition.top}
                        left={menuPosition.left}
                        data-menu="chip-menu"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {getHelperPane && getHelperPane(
                            value,
                            handleHelperValueChange,
                            '3/4'
                        )}
                    </ChipMenu>
                )}
                {isCompletionsOpen && (
                    <ChipMenu
                        top={menuPosition.top}
                        left={menuPosition.left}
                        data-menu="chip-menu"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <Completions>
                            {completions.map((item, index) => (
                                <CompletionsItem
                                    item={item}
                                    isSelected={index === selectedCompletionItem}
                                />
                            ))}</Completions>
                    </ChipMenu>
                )}
            </ChipEditorContainer>
            {/* 
            {JSON.stringify(value)}
            <div style={{ maxWidth: '300px' }}> {JSON.stringify(tokens)}</div> */}
            {/* {JSON.stringify(completions)} */}
            <pre>
                {JSON.stringify(currentCursorPositionRef.current)}
            </pre>
        </>
    )
}

const CompletionsadeInUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0px);
    }
`;
export const COMPLETIONS_WIDTH = 300;
const Completions = styled.div`
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    border: 1px solid ${ThemeColors.OUTLINE};
    width: ${COMPLETIONS_WIDTH}px;
    max-height: 300px;
    overflow-y: auto;
    position: absolute;
    padding: 2px 0px;
    border-radius: 3px;
    top: 0;
    left: 0;
    z-index: 2001;
    animation: ${CompletionsadeInUp} 0.3s ease forwards;
`

const DescriptionWrapper = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2001;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    color: white;
    width: fit-content;
    height: fit-content;
    padding: 4px 8px; 
    border-radius: 2px;
    border: 1px solid ${ThemeColors.OUTLINE};
    font-size: 14px;
    pointer-events: none; 
    transform: translateX(-100%);
`;

interface CompletionsProps extends React.HTMLAttributes<HTMLDivElement> {
    item: CompletionItem;
    isSelected: boolean;
}


const CompletionsItem = (props: CompletionsProps) => {
    const { item, ...divProps } = props;

    const completionItemRef = useRef<HTMLDivElement>();

    const getDescriptionOrigin = () => {
        if (!completionItemRef.current) return {
            top: 0, left: 0
        }
        const rect = completionItemRef.current.getBoundingClientRect();
        return ({
            left: rect.left,
            top: rect.top
        })
    }
    return (
        <>
            <CompletionsItemEl
                ref={completionItemRef}
                {...divProps}
            >
                <div style={{
                    display: "flex",
                    gap: "5px"
                }}>
                    {getIcon(item.kind)}
                    {item.label}
                </div>
                <CompletionsTag> {item.tag} </CompletionsTag>
            </CompletionsItemEl>
            {props.isSelected && createPortal(
                <DescriptionWrapper style={{ top: getDescriptionOrigin().top, left: getDescriptionOrigin().left }}>{item.description}</DescriptionWrapper>,
                document.body
            )}
        </>
    )
}

interface CompletionsItemElProps {
    isSelected?: boolean;
}
const CompletionsItemEl = styled.div<CompletionsItemElProps>`
    height: 25px;
    display: flex;
    justify-content: space-between;
    padding: 0px 5px;
    align-items: center;
    background-color: ${(props: CompletionsItemElProps) =>
        props.isSelected
            ? 'var(--vscode-list-activeSelectionBackground)'
            : ThemeColors.SURFACE_BRIGHT};
    &:hover {
        background-color: ${ThemeColors.OUTLINE_VARIANT};
        cursor: pointer;
    }
`;

const CompletionsTag = styled.div`
    color: ${ThemeColors.ON_SURFACE_VARIANT}
`
