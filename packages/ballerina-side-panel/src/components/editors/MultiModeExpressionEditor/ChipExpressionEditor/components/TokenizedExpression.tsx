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

import React, { useEffect, useLayoutEffect, useRef } from "react";
import { ReactNode } from "react";
import { ChipComponent } from "./ChipComponent";
import { getAbsoluteColumnOffset, getTokenChunks } from "../utils";
import { ExpressionModel } from "../types";
import { InvisibleSpan } from "../styles";

export const createHtmlRichText = (
    value: string,
    tokens: number[],
    onChipClick?: (element: HTMLElement, value: string, type: string) => void,
    onChipBlur?: () => void
) => {
    const tokenChunks = getTokenChunks(tokens);
    const richHtmlText: ReactNode[] = [];
    let currentLine = 0;
    let currentChar = 0;
    let previousTokenEndOffset = 0;

    if (tokenChunks.length === 1 && tokenChunks[0].every(val => val === 0)) {
        return [<span>{value}</span>];
    }

    for (let i = 0; i < tokenChunks.length; i++) {
        const chunk = tokenChunks[i];
        const deltaLine = chunk[0];
        const deltaStartChar = chunk[1];
        const tokenLength = chunk[2];
        const tokenTypeIndex = chunk[3];

        currentLine += deltaLine;
        if (deltaLine === 0) {
            currentChar += deltaStartChar;
        } else {
            currentChar = deltaStartChar;
        }

        const absoluteOffset = getAbsoluteColumnOffset(value, currentLine, currentChar);
        const valueOfSpanBeforeToken = value.slice(previousTokenEndOffset, absoluteOffset);
        richHtmlText.push(
            <span>{valueOfSpanBeforeToken}</span>
        );
        const currentTokenValue = value.slice(absoluteOffset, absoluteOffset + tokenLength);
        const tokenType = getTokenTypeFromIndex(tokenTypeIndex);
        const currentTokenChip = getTokenChip(currentTokenValue, tokenType, absoluteOffset, onChipClick, onChipBlur);
        richHtmlText.push(currentTokenChip);

        previousTokenEndOffset = absoluteOffset + tokenLength;
    }

    richHtmlText.push(
        <span>{value.slice(previousTokenEndOffset)}</span>
    );

    return richHtmlText;
};

export const getTokenTypeFromIndex = (index: number): string => {
    const tokenTypes: { [key: number]: string } = {
        0: 'variable',
        1: 'property',
        2: 'parameter'
    };
    return tokenTypes[index] || 'property';
};

export const getTokenChip = (
    value: string,
    type: string,
    absoluteOffset?: number,
    onChipClick?: (element: HTMLElement, value: string, type: string, absoluteOffset?: number) => void,
    onChipBlur?: () => void
): ReactNode => {
    const handleClick = (element: HTMLElement) => {
        console.log(`Clicked on ${type}: ${value}`);
        if (onChipClick) {
            onChipClick(element, value, type, absoluteOffset);
        }
    };

    const handleBlur = () => {
        console.log(`Blurred from ${type}: ${value}`);
        if (onChipBlur) {
            onChipBlur();
        }
    };

    switch (type) {
        case "variable":
            return <ChipComponent type="variable" text={value} onClick={handleClick} onBlur={handleBlur} />;
        case "parameter":
            return <ChipComponent type="parameter" text={value} onClick={handleClick} onBlur={handleBlur} />;
        case "property":
            return <ChipComponent type="property" text={value} onClick={handleClick} onBlur={handleBlur} />;
        default:
            return <ChipComponent type="property" text={value} onClick={handleClick} onBlur={handleBlur} />;
    }
}

export type TokenizedExpressionProps = {
    expressionModel: ExpressionModel[];
    onChipClick?: (element: HTMLElement, value: string, type: string, absoluteOffset?: number) => void;
    onChipBlur?: () => void;
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorDelta: number) => void;
    onTriggerRebuild?: (value: string, caretPosition?: number) => void;
}

export const TokenizedExpression = (props: TokenizedExpressionProps) => {
    const { expressionModel, onExpressionChange, onTriggerRebuild } = props;

    return (
        expressionModel.length === 0 ? (
            <TextElement
                key="empty"
                element={{ id: "empty", value: "", isToken: false, length: 0 } as ExpressionModel}
                expressionModel={[]}
                index={0}
                onExpressionChange={onExpressionChange}
            />
        ) : (
            <>
                {expressionModel.map((element, index) => {
                    if (element.isToken) {
                        // Use stable key to prevent React from remounting and losing focus
                        return (
                            <React.Fragment key={element.id}>
                                {getTokenChip(
                                    element.value,
                                    'variable',
                                    undefined,
                                    props.onChipClick,
                                    props.onChipBlur
                                )}
                            </React.Fragment>
                        );
                    } else {
                        return <TextElement
                            key={element.id}
                            element={element}
                            expressionModel={expressionModel}
                            index={index}
                            onExpressionChange={onExpressionChange}
                            onTriggerRebuild={onTriggerRebuild}
                        />;
                    }
                })}
            </>
        )
    )
}

export const TextElement = (props: { 
    element: ExpressionModel; 
    expressionModel: ExpressionModel[];
    index: number;
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorDelta: number) => void;
    onTriggerRebuild?: (value: string, caretPosition?: number) => void;
}) => {
    const { onExpressionChange, onTriggerRebuild } = props;
    const spanRef = useRef<HTMLSpanElement | null>(null);
    const pendingCaretOffsetRef = useRef<number | null>(null);
    const isTypingRef = useRef<boolean>(false);
    const lastValueRef = useRef<string>(props.element.value);
    const rebuildTimeoutRef = useRef<number | null>(null);

    const getAbsoluteCaretPosition = (): number => {
        // Calculate the absolute position of the caret in the entire expression
        const host = spanRef.current;
        if (!host) return 0;
        
        const caretOffsetInSpan = getCaretOffsetWithin(host);
        
        // Calculate the absolute offset by summing lengths of all previous elements
        let absoluteOffset = 0;
        for (let i = 0; i < props.index; i++) {
            absoluteOffset += props.expressionModel[i].length;
        }
        
        return absoluteOffset + caretOffsetInSpan;
    };

    const getCaretOffsetWithin = (el: HTMLSpanElement): number => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return 0;
        const range = selection.getRangeAt(0);
        if (!el.contains(range.startContainer)) return 0;
        let offset = 0;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let current: Node | null = walker.nextNode();
        while (current) {
            if (current === range.startContainer) {
                offset += range.startOffset;
                break;
            } else {
                offset += (current.textContent || "").length;
            }
            current = walker.nextNode();
        }
        return offset;
    };

    const isNavigableSpan = (value: string): boolean => {
        // A span is navigable if it contains more than just whitespace/newlines
        // or if it has substantial content for editing
        const trimmed = value.replace(/[\n\r\t\s]/g, '');
        return trimmed.length > 0;
    };

    const findNextEditableSpan = (): HTMLSpanElement | null => {
        // Find the next editable span in the expression model (skip tokens and whitespace-only spans)
        for (let i = props.index + 1; i < props.expressionModel.length; i++) {
            const element = props.expressionModel[i];
            if (!element.isToken && isNavigableSpan(element.value)) {
                // Find the corresponding DOM element by data-element-id
                const targetId = element.id;
                const span = document.querySelector(`[data-element-id="${targetId}"]`) as HTMLSpanElement;
                if (span && span !== spanRef.current) {
                    return span;
                }
            }
        }
        return null;
    };

    const findPreviousEditableSpan = (): HTMLSpanElement | null => {
        // Find the previous editable span in the expression model (skip tokens and whitespace-only spans)
        for (let i = props.index - 1; i >= 0; i--) {
            const element = props.expressionModel[i];
            if (!element.isToken && isNavigableSpan(element.value)) {
                // Find the corresponding DOM element by data-element-id
                const targetId = element.id;
                const span = document.querySelector(`[data-element-id="${targetId}"]`) as HTMLSpanElement;
                if (span && span !== spanRef.current) {
                    return span;
                }
            }
        }
        return null;
    };

    const setCaretPosition = (el: HTMLSpanElement, position: number) => {
        if (!el.firstChild) {
            el.appendChild(document.createTextNode(""));
        }
        
        // Walk through all text nodes to find the right position
        let remaining = Math.max(0, position);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let textNode: Text | null = null;
        let posInNode = 0;
        let node = walker.nextNode() as Text | null;
        
        while (node) {
            const len = node.textContent ? node.textContent.length : 0;
            if (remaining <= len) {
                textNode = node;
                posInNode = remaining;
                break;
            }
            remaining -= len;
            node = walker.nextNode() as Text | null;
        }
        
        if (!textNode) {
            // Fallback to last text node if position is beyond content
            const last = el.lastChild;
            if (last && last.nodeType === Node.TEXT_NODE) {
                textNode = last as Text;
                posInNode = (textNode.textContent || "").length;
            } else {
                textNode = el.firstChild as Text;
                posInNode = 0;
            }
        }
        
        const range = document.createRange();
        range.setStart(textNode, Math.max(0, Math.min(posInNode, (textNode.textContent || "").length)));
        range.collapse(true);
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    const findPreviousElement = (): { element: ExpressionModel; index: number } | null => {
        // Find the previous element (could be token or editable span)
        for (let i = props.index - 1; i >= 0; i--) {
            return {
                element: props.expressionModel[i],
                index: i
            };
        }
        return null;
    };

    const findNextElement = (): { element: ExpressionModel; index: number } | null => {
        // Find the next element (could be token or editable span)
        for (let i = props.index + 1; i < props.expressionModel.length; i++) {
            return {
                element: props.expressionModel[i],
                index: i
            };
        }
        return null;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
        const host = spanRef.current;
        if (!host) return;

        const caretOffset = getCaretOffsetWithin(host);
        const textLength = host.textContent?.length || 0;

        // Backspace at the beginning of current span
        if (e.key === 'Backspace' && caretOffset === 0) {
            const prevElement = findPreviousElement();
            if (prevElement) {
                e.preventDefault();
                e.stopPropagation();
                
                if (prevElement.element.isToken) {
                    // Delete the entire chip from expression model
                    const updatedExpressionModel = props.expressionModel.filter((_, idx) => idx !== prevElement.index);
                    if (onExpressionChange) {
                        onExpressionChange(updatedExpressionModel, 0);
                    }
                    // Keep focus on current span
                    setTimeout(() => {
                        host.focus();
                        setCaretPosition(host, 0);
                    }, 0);
                } else {
                    // Delete the last character from the previous editable span
                    const prevSpan = document.querySelector(`[data-element-id="${prevElement.element.id}"]`) as HTMLSpanElement;
                    if (prevSpan && prevElement.element.value.length > 0) {
                        const newValue = prevElement.element.value.slice(0, -1);
                        const updatedExpressionModel = [...props.expressionModel];
                        updatedExpressionModel[prevElement.index] = {
                            ...prevElement.element,
                            value: newValue,
                            length: newValue.length
                        };
                        if (onExpressionChange) {
                            onExpressionChange(updatedExpressionModel, -1);
                        }
                        // Move focus to previous span at the end
                        setTimeout(() => {
                            prevSpan.focus();
                            setCaretPosition(prevSpan, newValue.length);
                        }, 0);
                    } else if (prevSpan && prevElement.element.value.length === 0) {
                        // If previous span is empty, just move focus there
                        setTimeout(() => {
                            prevSpan.focus();
                            setCaretPosition(prevSpan, 0);
                        }, 0);
                    }
                }
            }
            return;
        }

        // Delete at the end of current span
        if (e.key === 'Delete' && caretOffset === textLength) {
            const nextElement = findNextElement();
            if (nextElement) {
                e.preventDefault();
                e.stopPropagation();
                
                if (nextElement.element.isToken) {
                    // Delete the entire chip from expression model
                    const updatedExpressionModel = props.expressionModel.filter((_, idx) => idx !== nextElement.index);
                    if (onExpressionChange) {
                        onExpressionChange(updatedExpressionModel, 0);
                    }
                    // Keep focus on current span at the end
                    setTimeout(() => {
                        host.focus();
                        setCaretPosition(host, textLength);
                    }, 0);
                } else {
                    // Delete the first character from the next editable span
                    const nextSpan = document.querySelector(`[data-element-id="${nextElement.element.id}"]`) as HTMLSpanElement;
                    if (nextSpan && nextElement.element.value.length > 0) {
                        const newValue = nextElement.element.value.slice(1);
                        const updatedExpressionModel = [...props.expressionModel];
                        updatedExpressionModel[nextElement.index] = {
                            ...nextElement.element,
                            value: newValue,
                            length: newValue.length
                        };
                        if (onExpressionChange) {
                            onExpressionChange(updatedExpressionModel, -1);
                        }
                        // Keep focus on current span at the end
                        setTimeout(() => {
                            host.focus();
                            setCaretPosition(host, textLength);
                        }, 0);
                    }
                }
            }
            return;
        }

        // Right arrow key at the end of current span
        if (e.key === 'ArrowRight' && caretOffset === textLength) {
            const nextSpan = findNextEditableSpan();
            if (nextSpan) {
                e.preventDefault();
                e.stopPropagation();
                // Use setTimeout to ensure the DOM is ready
                setTimeout(() => {
                    nextSpan.focus();
                    setCaretPosition(nextSpan, 0);
                }, 0);
            }
        }

        // Left arrow key at the beginning of current span
        if (e.key === 'ArrowLeft' && caretOffset === 0) {
            const prevSpan = findPreviousEditableSpan();
            if (prevSpan) {
                e.preventDefault();
                e.stopPropagation();
                // Use setTimeout to ensure the DOM is ready
                setTimeout(() => {
                    prevSpan.focus();
                    const prevLength = prevSpan.textContent?.length || 0;
                    setCaretPosition(prevSpan, prevLength);
                }, 0);
            }
        }
    };

    const restoreCaret = (el: HTMLSpanElement, offset: number) => {
        if (!el.firstChild) {
            el.appendChild(document.createTextNode(""));
        }
        let remaining = Math.max(0, offset);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let textNode: Text | null = null;
        let posInNode = 0;
        let node = walker.nextNode() as Text | null;
        while (node) {
            const len = node.textContent ? node.textContent.length : 0;
            if (remaining <= len) {
                textNode = node;
                posInNode = remaining;
                break;
            }
            remaining -= len;
            node = walker.nextNode() as Text | null;
        }
        if (!textNode) {
            const last = el.lastChild as Text | null;
            if (last && last.nodeType === Node.TEXT_NODE) {
                textNode = last;
                posInNode = (last.textContent || "").length;
            } else {
                textNode = el.firstChild as Text;
                posInNode = (textNode.textContent || "").length;
            }
        }
        const range = document.createRange();
        range.setStart(textNode, Math.max(0, Math.min(posInNode, (textNode.textContent || "").length)));
        range.collapse(true);
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    const handleInput = (e: React.FormEvent<HTMLSpanElement>) => {
        if (!onExpressionChange) return;
        
        // Mark that we're actively typing to prevent external updates from resetting cursor
        isTypingRef.current = true;
        
        const host = spanRef.current;
        if (host) {
            pendingCaretOffsetRef.current = getCaretOffsetWithin(host);
        }
        const newValue = e.currentTarget.textContent || '';
        const oldValue = lastValueRef.current;
        
        // Check if a "+" was just typed by comparing character counts
        const oldPlusCount = (oldValue.match(/\+/g) || []).length;
        const newPlusCount = (newValue.match(/\+/g) || []).length;
        const wasPlusAdded = newPlusCount > oldPlusCount;
        
        // Update the last value ref
        lastValueRef.current = newValue;
        
        const updatedExpressionModel = [...props.expressionModel];
        updatedExpressionModel[props.index] = {
            ...props.element,
            value: newValue,
            length: newValue.length
        };
        const cursorDelta = newValue.length - props.element.length;
        onExpressionChange(updatedExpressionModel, cursorDelta);
        
        // If "+" was added, trigger expression model rebuild
        if (wasPlusAdded && onTriggerRebuild) {
            // Clear any existing timeout to prevent duplicate rebuilds
            if (rebuildTimeoutRef.current !== null) {
                clearTimeout(rebuildTimeoutRef.current);
            }
            
            // Get the full text value from the updated expression model
            const fullValue = updatedExpressionModel.map(el => el.value).join('');
            // Get the absolute caret position before rebuild
            const absoluteCaretPosition = getAbsoluteCaretPosition();
            
            // Debounce the rebuild to avoid multiple calls during rapid typing
            rebuildTimeoutRef.current = window.setTimeout(() => {
                onTriggerRebuild(fullValue, absoluteCaretPosition);
                rebuildTimeoutRef.current = null;
            }, 300);
        }
        
        // Reset typing flag after a short delay
        setTimeout(() => {
            isTypingRef.current = false;
        }, 50);
    };

    useLayoutEffect(() => {
        const host = spanRef.current;
        const pending = pendingCaretOffsetRef.current;
        
        // Only restore caret if we have a pending position and the element is focused
        if (host && pending !== null && document.activeElement === host) {
            // Use synchronous restore to prevent any delays
            restoreCaret(host, pending);
            pendingCaretOffsetRef.current = null;
        }
    }, [props.element.value]);

    // If this element is marked as focused, focus it and set the caret to focusOffset
    useEffect(() => {
        if (props.element.isFocused && spanRef.current) {
            const host = spanRef.current;
            host.focus();
            const offset = props.element.focusOffset ?? (host.textContent?.length || 0);
            setCaretPosition(host, offset);
        }
    }, [props.element.isFocused, props.element.focusOffset]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (rebuildTimeoutRef.current !== null) {
                clearTimeout(rebuildTimeoutRef.current);
            }
        };
    }, []);

    return (
        <InvisibleSpan
            ref={spanRef}
            data-element-id={props.element.id}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            contentEditable
            suppressContentEditableWarning>{props.element.value}
        </InvisibleSpan>
    );
}