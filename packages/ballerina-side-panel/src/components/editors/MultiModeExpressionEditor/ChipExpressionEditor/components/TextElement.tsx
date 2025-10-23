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

import React, { useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { debounce } from "lodash";
import { getCaretOffsetWithin, getAbsoluteCaretPosition, setCaretPosition, handleKeyDownInTextElement } from "../utils";
import { ExpressionModel } from "../types";
import { InvisibleSpan } from "../styles";

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
    const lastValueRef = useRef<string>(props.element.value);

    const debouncedTriggerRebuild = useMemo(() => {
        if (!onTriggerRebuild) return null;

        return debounce((fullValue: string, absoluteCaretPosition: number) => {
            onTriggerRebuild(fullValue, absoluteCaretPosition);
        }, 300);
    }, [onTriggerRebuild]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
        handleKeyDownInTextElement(e, props.expressionModel, props.index, onExpressionChange, spanRef.current);
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

        const host = spanRef.current;
        if (host) {
            pendingCaretOffsetRef.current = getCaretOffsetWithin(host);
        }
        const newValue = e.currentTarget.textContent || '';
        const oldValue = lastValueRef.current;

        // Check if a trigger character (+, space, comma) was just typed by comparing character counts
        const triggerChars = /[\s+,]/g;
        const oldTriggerCount = (oldValue.match(triggerChars) || []).length;
        const newTriggerCount = (newValue.match(triggerChars) || []).length;
        const wasTriggerAdded = newTriggerCount > oldTriggerCount;

        lastValueRef.current = newValue;

        const updatedExpressionModel = [...props.expressionModel];
        updatedExpressionModel[props.index] = {
            ...props.element,
            value: newValue,
            length: newValue.length
        };
        const cursorDelta = newValue.length - props.element.length;
        onExpressionChange(updatedExpressionModel, cursorDelta);

        if (wasTriggerAdded && debouncedTriggerRebuild) {
            const fullValue = updatedExpressionModel.map(el => el.value).join('');
            const absoluteCaretPosition = getAbsoluteCaretPosition(props.expressionModel);

            debouncedTriggerRebuild(fullValue, absoluteCaretPosition);
        }
    };

    const handleFocus = (e: React.FocusEvent<HTMLSpanElement>) => {
        if (!onExpressionChange || !props.expressionModel) return;
        const updatedModel = props.expressionModel.map((element, index)=>{
            if (index === props.index) {
                return { ...element, isFocused: true, focusOffset: getCaretOffsetWithin(e.currentTarget) };
            } else {
                return { ...element, isFocused: false, focusOffset: undefined };
            }
        })
        onExpressionChange(updatedModel, 0);
    }

    useLayoutEffect(() => {
        const host = spanRef.current;
        const pending = pendingCaretOffsetRef.current;

        // Only restore caret if we have a pending position and the element is focused
        if (host && pending !== null && document.activeElement === host) {
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

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            if (debouncedTriggerRebuild) {
                debouncedTriggerRebuild.cancel();
            }
        };
    }, [debouncedTriggerRebuild]);

    return (
        <InvisibleSpan
            ref={spanRef}
            data-element-id={props.element.id}
            onInput={handleInput}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            contentEditable
            suppressContentEditableWarning>{props.element.value}
        </InvisibleSpan>
    );
};
