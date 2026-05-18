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

import React, {
    forwardRef,
    useRef,
    useState,
    useCallback,
    useImperativeHandle,
    useLayoutEffect,
    useEffect,
} from "react";
import styled from "@emotion/styled";
import ReactDOMServer from "react-dom/server";
import ChatBadge, { ChatBadgeType } from "../ChatBadge";
import { decodeHTML } from "./utils/utils";
import { useCursor } from "./hooks/useCursor";

// Import only *non-React* utilities here
import {
    getSelectionRange,
    isCursorNextToDiv,
    isPrevElementBadge,
    selectText,
    insertTextAtCursor,
    replaceTextWith,
    insertHTMLWithSuffixAtCursor,
    getContentAsInputList,
    handleKeyDownWithBadgeSupport,
} from "./utils/contentEditableUtils";
import { Input } from "./utils/inputUtils";

const StyledInput = styled.div`
    flex: 1;
    border: none;
    background: transparent;
    color: var(--vscode-inputForeground);
    font-size: 1em;
    line-height: calc(1em + 8px);
    padding: 4px;
    outline: none;
    white-space: pre-wrap;
    overflow-y: auto;
    max-height: calc(1em * 8);
    overflow-wrap: break-word;
    word-break: break-word;
    hyphens: auto;

    &:focus {
        outline: none;
        box-shadow: none;
        border: none;
        background: transparent;
    }

    &:empty:before {
        content: attr(data-placeholder);
        color: var(--vscode-input-placeholderForeground);
        pointer-events: none;
        display: block;
    }

    ::selection {
        background: var(--vscode-editor-selectionBackground);
        color: var(--vscode-editor-selectionForeground);
    }
`;

export interface StyledInputRef {
    focus: () => void;
    getCursorPosition: () => number;
    setCursorToPosition: (element: HTMLDivElement, position: number) => void;
    isCursorNextToDiv: () => boolean;
    selectText: (text: string) => void;
    insertTextAtCursor: (params: { text: string; [key: string]: any }) => void;
    replaceTextWithText: (targetText: string, replacementText: string) => void;
    replaceTextWithBadge: (
        targetText: string,
        replacementBadge: {
            displayText: string;
            rawValue?: string;
            badgeType?: ChatBadgeType;
            suffixText?: string;
            [key: string]: any;
        }
    ) => void;
    insertBadgeAtCursor: (params: {
        displayText: string;
        rawValue?: string;
        badgeType?: ChatBadgeType;
        suffixText?: string;
        [key: string]: any;
    }) => void;
    isPrevElementBadge: (type: ChatBadgeType) => boolean;
    getContentAsInputList: () => Input[];
    ref: React.RefObject<HTMLDivElement>;
}

interface StyledInputProps {
    value: {
        text: string;
        [key: string]: any;
    };
    onChange: (value: { text: string; [key: string]: any }) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, removedBadgeTypes?: string[]) => void;
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
    placeholder: string;
    onPostDOMUpdate?: () => void;
    disabled?: boolean;
}

export const StyledInputComponent = forwardRef<StyledInputRef, StyledInputProps>(
    ({ value, onChange, onKeyDown, onBlur, placeholder, onPostDOMUpdate, disabled }, ref) => {
        const [internalContent, setInternalContent] = useState<string>(value.text);
        const divRef = useRef<HTMLDivElement>(null);

        // Cursor logic from our hook
        const { getCursorPosition, setCursorToPosition, removeOverlapAtCursor } = useCursor(divRef);

        const handleFocus = useCallback(() => {
            divRef.current?.focus();
        }, []);

        const handleIsCursorNextToDiv = useCallback(() => {
            if (!divRef.current) return false;
            return isCursorNextToDiv(divRef.current);
        }, []);

        const handleSelectText = useCallback((textToSelect: string) => {
            if (!divRef.current) return;
            selectText(divRef.current, textToSelect);
        }, []);

        const handleInsertTextAtCursor = useCallback(
            (params: { text: string; [key: string]: any }) => {
                if (!divRef.current) return;
                insertTextAtCursor(
                    divRef.current,
                    params.text,
                    removeOverlapAtCursor,
                    (val) => {
                        setInternalContent(val.text);
                        onChange?.(val);
                    },
                    params
                );
            },
            [onChange, removeOverlapAtCursor]
        );

        const handleReplaceTextWithText = useCallback(
            (targetText: string, replacementText: string) => {
                if (!divRef.current) return;
                replaceTextWith(divRef.current, targetText, replacementText, (val) => {
                    setInternalContent(val.text);
                    onChange?.(val);
                });
            },
            [onChange]
        );

        const handleReplaceTextWithBadge = useCallback(
            (
                targetText: string,
                {
                    displayText,
                    rawValue,
                    badgeType,
                    suffixText,
                    ...rest
                }: {
                    displayText: string;
                    rawValue?: string;
                    badgeType?: ChatBadgeType;
                    suffixText?: string;
                    [key: string]: any;
                }
            ) => {
                if (!divRef.current || !displayText) return;

                replaceTextWith(divRef.current, targetText, "", () => {
                    if (!divRef.current) return;

                    const badgeHTML = ReactDOMServer.renderToStaticMarkup(
                        <ChatBadge badgeType={badgeType} rawValue={rawValue ?? displayText}>
                            {displayText}
                        </ChatBadge>
                    );

                    insertHTMLWithSuffixAtCursor(divRef.current, {
                        html: badgeHTML,
                        suffixText,
                        removeOverlapAtCursor,
                        overlapText: displayText,
                        onChange: (val) => {
                            setInternalContent(val.text);
                            onChange?.(val);
                        },
                        extraParams: rest,
                    });
                });
            },
            [onChange, removeOverlapAtCursor]
        );

        const handleInsertBadgeAtCursor = useCallback(
            ({
                displayText,
                rawValue,
                badgeType,
                suffixText,
                ...rest
            }: {
                displayText: string;
                rawValue?: string;
                badgeType?: ChatBadgeType;
                suffixText?: string;
                [key: string]: any;
            }) => {
                if (!divRef.current) return;
                if (!displayText) return;

                // Convert <Badge> into an HTML string using ReactDOMServer
                const badgeHTML = ReactDOMServer.renderToStaticMarkup(
                    <ChatBadge badgeType={badgeType} rawValue={rawValue ?? displayText}>
                        {displayText}
                    </ChatBadge>
                );

                // Now we call the utility to insert that HTML + optional suffix
                insertHTMLWithSuffixAtCursor(divRef.current, {
                    html: badgeHTML,
                    suffixText,
                    removeOverlapAtCursor,
                    overlapText: displayText, // if partial overlap is relevant
                    onChange: (val) => {
                        setInternalContent(val.text);
                        onChange?.(val);
                    },
                    extraParams: rest,
                });
            },
            [onChange, removeOverlapAtCursor]
        );

        const handleIsPrevElementBadge = useCallback((type: ChatBadgeType) => {
            if (!divRef.current) return false;
            // Our utility expects a string for the badge type (since it can’t import BadgeType).
            return isPrevElementBadge(divRef.current, String(type));
        }, []);

        const handleGetContentAsInputList = useCallback(() => {
            return getContentAsInputList(divRef.current);
        }, []);

        // Expose these methods via ref
        useImperativeHandle(
            ref,
            () => ({
                focus: handleFocus,
                getCursorPosition,
                setCursorToPosition,
                isCursorNextToDiv: handleIsCursorNextToDiv,
                selectText: handleSelectText,
                insertTextAtCursor: handleInsertTextAtCursor,
                replaceTextWithText: handleReplaceTextWithText,
                replaceTextWithBadge: handleReplaceTextWithBadge,
                insertBadgeAtCursor: handleInsertBadgeAtCursor,
                isPrevElementBadge: handleIsPrevElementBadge,
                getContentAsInputList: handleGetContentAsInputList,
                ref: divRef,
            }),
            [
                handleFocus,
                getCursorPosition,
                setCursorToPosition,
                handleIsCursorNextToDiv,
                handleSelectText,
                handleInsertTextAtCursor,
                handleReplaceTextWithText,
                handleReplaceTextWithBadge,
                handleInsertBadgeAtCursor,
                handleIsPrevElementBadge,
                getContentAsInputList,
            ]
        );

        // Handle paste
        const handlePaste = useCallback(
            (event: React.ClipboardEvent<HTMLDivElement>) => {
                event.preventDefault();
                if (!divRef.current) return;

                const text = event.clipboardData.getData("text/plain");
                const selectionRange = getSelectionRange();
                if (!selectionRange) return;

                selectionRange.deleteContents();
                const textNode = document.createTextNode(text);
                selectionRange.insertNode(textNode);

                // Move cursor after inserted text
                selectionRange.setStartAfter(textNode);
                selectionRange.collapse(true);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(selectionRange);
                }

                const newValue = divRef.current.innerHTML;
                setInternalContent(newValue);
                onChange?.({ text: newValue });
            },
            [onChange]
        );

        // Handle typing input
        const handleInput = useCallback(() => {
            if (divRef.current) {
                const html = divRef.current.innerHTML;
                setInternalContent(html);
                onChange?.({ text: html });
            }
        }, [onChange]);

        // Keep DOM in sync
        useLayoutEffect(() => {
            const el = divRef.current;
            if (!el) return;

            if (el.innerHTML !== internalContent) {
                const prevCursorPos = getCursorPosition();
                const oldDecoded = decodeHTML(el.innerHTML);
                const newDecoded = decodeHTML(internalContent);

                // Basic approach to preserve cursor
                const diff = newDecoded.length - oldDecoded.length;

                el.innerHTML = internalContent;
                setCursorToPosition(el, prevCursorPos + diff);

                onPostDOMUpdate?.();
            }
        }, [internalContent, onPostDOMUpdate, getCursorPosition, setCursorToPosition]);

        // Keep internal content aligned with external value.text
        useEffect(() => {
            if (value.text !== internalContent) {
                setInternalContent(value.text);
            }
        }, [value.text, internalContent]);

        const handleKeyDown = useCallback(
            (e: React.KeyboardEvent<HTMLDivElement>) => {
                const container = divRef.current;
                const selection = window.getSelection();
                const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

                if (
                    container &&
                    selection &&
                    range &&
                    !range.collapsed &&
                    (e.key === "Backspace" || e.key === "Delete")
                ) {
                    const removedBadgeTypes = handleKeyDownWithBadgeSupport(e, container, (val) => {
                        setInternalContent(val.text);
                        onChange?.(val);
                    });

                    onKeyDown?.(e, removedBadgeTypes);
                    return;
                }

                onKeyDown(e);
            },
            [onChange, onKeyDown]
        );

        return (
            <StyledInput
                ref={divRef}
                contentEditable={!disabled}
                spellCheck="true"
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={onBlur}
                suppressContentEditableWarning={true}
                role="textbox"
                aria-multiline="true"
                data-placeholder={placeholder}
            />
        );
    }
);
