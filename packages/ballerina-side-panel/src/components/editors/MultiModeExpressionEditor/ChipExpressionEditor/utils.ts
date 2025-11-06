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

import { CompletionItem } from "@wso2/ui-toolkit";
import { INPUT_MODE_MAP, InputMode, ExpressionModel } from "./types";
import { BACKSPACE_MARKER, DELETE_MARKER, ARROW_RIGHT_MARKER, ARROW_LEFT_MARKER } from "./constants";

const TOKEN_LINE_OFFSET_INDEX = 0;
const TOKEN_START_CHAR_OFFSET_INDEX = 1;
const TOKEN_LENGTH_INDEX = 2;

export const getInputModeFromTypes = (valueTypeConstraint: string | string[]): InputMode => {
    if (!valueTypeConstraint) return;
    let types: string[];
    if (typeof valueTypeConstraint === 'string') {
        if (valueTypeConstraint.includes('|')) {
            types = valueTypeConstraint.split('|').map(t => t.trim());
        } else {
            types = [valueTypeConstraint];
        }
    } else {
        types = valueTypeConstraint;
    }

    for (let i = 0; i < types.length; i++) {
        if (INPUT_MODE_MAP[types[i]]) {
            return INPUT_MODE_MAP[types[i]];
        }
    }
    return;
};

export const getDefaultExpressionMode = (valueTypeConstraint: string | string[]): InputMode => {
    if (!valueTypeConstraint) throw new Error("Value type constraint is undefined");
    return getInputModeFromTypes(valueTypeConstraint);
}

export const getAbsoluteColumnOffset = (value: string, line: number, column: number) => {
    const lines = value.split("\n");
    let cumulativeLength = 0;
    if (line < 0 || line >= lines.length) throw new Error("Invalid line number");
    for (let i = 0; i < lines.length; i++) {
        if (i === line) {
            return cumulativeLength + column;
        }
        cumulativeLength += lines[i].length + 1;
    }
}

export const getLineFromAbsoluteOffset = (value: string, absoluteOffset: number) => {
    const lines = value.split("\n");
    let cumulativeLength = 0;

    for (let i = 0; i < lines.length; i++) {
        cumulativeLength += lines[i].length;
        if (cumulativeLength >= absoluteOffset) {
            return i;
        }
        cumulativeLength += 1;
    }
    return lines.length - 1;
}

export const getTokenChunks = (tokens: number[]) => {
    const chunkSize = 5;
    const tokenChunks = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
        tokenChunks.push(tokens.slice(i, i + chunkSize));
    }
    return tokenChunks;
};

export const calculateCompletionsMenuPosition = (
    fieldContainerRef: React.RefObject<HTMLDivElement>,
    setMenuPosition: React.Dispatch<React.SetStateAction<{ top: number; left: number }>>
) => {
    if (fieldContainerRef.current) {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.hasAttribute('data-element-id')) {
            const rect = activeElement.getBoundingClientRect();
            const containerRect = fieldContainerRef.current.getBoundingClientRect();
            const menuWidth = 300;
            let left = rect.right - containerRect.left - menuWidth;

            left = Math.max(0, left);

            setMenuPosition({
                top: rect.bottom - containerRect.top + 20,
                left: left
            });
        } else {
            const containerRect = fieldContainerRef.current.getBoundingClientRect();
            const menuWidth = 300;
            setMenuPosition({
                top: containerRect.bottom,
                left: Math.max(0, containerRect.width - menuWidth)
            });
        }
    } else {
        setMenuPosition(prev => ({ ...prev }));
    }
};

export const getCompletionsMenuPosition = (
    fieldContainerRef: React.RefObject<HTMLDivElement>
) => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.hasAttribute('data-element-id')) {
        const rect = activeElement.getBoundingClientRect();
        const containerRect = fieldContainerRef.current.getBoundingClientRect();
        const menuWidth = 300;
        let left = rect.right - containerRect.left - menuWidth;

        left = Math.max(0, left);

        return {
            top: rect.bottom - containerRect.top + 5,
            left: left
        }
    } else {
        const containerRect = fieldContainerRef.current.getBoundingClientRect();
        const menuWidth = 300;
        return ({
            top: containerRect.height,
            left: Math.max(0, containerRect.width - menuWidth - 30)
        });
    }
};

export const getTokenAtCursorPosition = (
    expressionModel: ExpressionModel[],
    cursorPosition: number
) => {
    let currentAbsolutePosition = 0;

    for (const item of expressionModel) {
        const itemStart = currentAbsolutePosition;
        const itemEnd = currentAbsolutePosition + item.length;

        if (cursorPosition >= itemStart && cursorPosition <= itemEnd) {
            const offset = cursorPosition - itemStart;
            return {
                element: item,
                offset: offset
            };
        }

        currentAbsolutePosition += item.length;
    }

    return null;
};

export const getTextValueFromExpressionModel = (expressionModel: ExpressionModel[] = []): string => {
    if (!Array.isArray(expressionModel) || expressionModel.length === 0) return "";

    return expressionModel
        .map((item: ExpressionModel) => {
            return item.value;
        })
        .join("");
};

export const expressionModelInitValue: ExpressionModel = {
    id: '1',
    value: '',
    isToken: false,
    startColumn: 0,
    startLine: 0,
    length: 0,
    type: 'literal',
    isFocused: false,
    focusOffsetStart: undefined
}

export const createExpressionModelFromTokens = (
    value: string,
    tokens: number[]
): ExpressionModel[] => {
    if (!value) return [];
    if (!tokens || tokens.length === 0) {
        return [{
           ...expressionModelInitValue, value: value, length: value.length, 
        }];
    }

    const expressionModel: ExpressionModel[] = [];
    const tokenChunks = getTokenChunks(tokens);

    let currentLine = 0;
    let currentChar = 0;
    let previousTokenEndOffset = 0;
    let idCounter = 1;

    for (let i = 0; i < tokenChunks.length; i++) {
        const chunk = tokenChunks[i];
        const deltaLine = chunk[TOKEN_LINE_OFFSET_INDEX];
        const deltaStartChar = chunk[TOKEN_START_CHAR_OFFSET_INDEX];
        const tokenLength = chunk[TOKEN_LENGTH_INDEX];
        const tokenTypeIndex = chunk[3];
        const tokenModifiers = chunk[4];

        currentLine += deltaLine;
        if (deltaLine === 0) {
            currentChar += deltaStartChar;
        } else {
            currentChar = deltaStartChar;
        }

        const tokenAbsoluteOffset = getAbsoluteColumnOffset(value, currentLine, currentChar);

        if (tokenAbsoluteOffset > previousTokenEndOffset) {
            const literalValue = value.slice(previousTokenEndOffset, tokenAbsoluteOffset);
            const literalStartLine = getLineFromAbsoluteOffset(value, previousTokenEndOffset);
            const literalStartColumn = previousTokenEndOffset - getAbsoluteColumnOffset(value, literalStartLine, 0);

            expressionModel.push({
                id: String(idCounter++),
                value: literalValue,
                isToken: false,
                startColumn: literalStartColumn,
                startLine: literalStartLine,
                length: literalValue.length,
                type: 'literal'
            });
        }

        const tokenValue = value.slice(tokenAbsoluteOffset, tokenAbsoluteOffset + tokenLength);
        const tokenType = getTokenTypeFromIndex(tokenTypeIndex);

        expressionModel.push({
            id: String(idCounter++),
            value: tokenValue,
            isToken: true,
            startColumn: currentChar,
            startLine: currentLine,
            length: tokenLength,
            type: tokenType as 'variable' | 'function' | 'literal'
        });

        previousTokenEndOffset = tokenAbsoluteOffset + tokenLength;
    }

    if (previousTokenEndOffset < value.length) {
        const literalValue = value.slice(previousTokenEndOffset);
        const literalStartLine = getLineFromAbsoluteOffset(value, previousTokenEndOffset);
        const literalStartColumn = previousTokenEndOffset - getAbsoluteColumnOffset(value, literalStartLine, 0);

        expressionModel.push({
            id: String(idCounter++),
            value: literalValue,
            isToken: false,
            startColumn: literalStartColumn,
            startLine: literalStartLine,
            length: literalValue.length,
            type: 'literal'
        });
    }

    if (expressionModel.length > 0 && expressionModel[0].isToken) {
        expressionModel.unshift({
            id: '0',
            value: '',
            isToken: false,
            startColumn: 0,
            startLine: 0,
            length: 0,
            type: 'literal'
        });
    }

    if (expressionModel.length > 0 && expressionModel[expressionModel.length - 1].isToken) {
        const endLine = getLineFromAbsoluteOffset(value, value.length);
        const endColumnBase = getAbsoluteColumnOffset(value, endLine, 0);
        const endColumn = (typeof endColumnBase === 'number') ? (value.length - endColumnBase) : 0;
        expressionModel.push({
            id: '0',
            value: '',
            isToken: false,
            startColumn: endColumn,
            startLine: endLine,
            length: 0,
            type: 'literal'
        });
    }

    // Renumber all ids to match their final positions (1-indexed)
    expressionModel.forEach((el, index) => {
        el.id = String(index + 1);
    });

    return expressionModel;
};

const getTokenTypeFromIndex = (index: number): string => {
    const tokenTypes: { [key: number]: string } = {
        0: 'variable',
        1: 'function',
        2: 'parameter',
        3: 'property',
    };
    return tokenTypes[index] || 'variable';
};

export const getCaretOffsetWithin = (el: HTMLElement): number => {
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
            offset += (current.textContent || '').length;
        }
        current = walker.nextNode();
    }
    return offset;
};

export const hasTextSelection = (el: HTMLElement): boolean => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.startContainer)) return false;
    return !range.collapsed;
};

export const getSelectionOffsets = (el: HTMLElement): { start: number; end: number } => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        const offset = getCaretOffsetWithin(el);
        return { start: offset, end: offset };
    }
    
    const range = selection.getRangeAt(0);
    
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) {
        const offset = getCaretOffsetWithin(el);
        return { start: offset, end: offset };
    }
    if (range.collapsed) {
        const offset = getCaretOffsetWithin(el);
        return { start: offset, end: offset };
    }

    let startOffset = 0;
    let endOffset = 0;
    
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let current: Node | null = walker.nextNode();
    
    while (current) {
        const textLength = (current.textContent || '').length;
        
        // Calculate start offset
        if (current === range.startContainer) {
            startOffset += range.startOffset;
        } else if (current.compareDocumentPosition(range.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) {
            // startContainer comes after current node
            startOffset += textLength;
        }
        
        // Calculate end offset
        if (current === range.endContainer) {
            endOffset += range.endOffset;
            break;
        } else {
            endOffset += textLength;
        }
        
        current = walker.nextNode();
    }

    return { start: startOffset, end: endOffset };
};

export const getAbsoluteCaretPosition = (model: ExpressionModel[] | undefined): number => {
    if (!model || model.length === 0) return 0;
    const active = document.activeElement as HTMLElement | null;
    if (!active) return 0;
    const elementId = active.getAttribute('data-element-id');
    if (!elementId) return 0;
    const idx = model.findIndex(m => m.id === elementId);
    if (idx < 0) return 0;

    const carrotOffsetInSelectedSpan = getCaretOffsetWithin(active);

    let sumOfChars = 0;
    for (let i = 0; i < idx; i++) {
        sumOfChars += model[i].length;
    }

    return sumOfChars + carrotOffsetInSelectedSpan;
};

export const getAbsoluteCaretPositionFromModel = (expressionModel: ExpressionModel[]): number => {
    if (!expressionModel || expressionModel.length === 0) return 0;

    let absolutePosition = 0;

    for (const element of expressionModel) {
        if (element.isFocused) {
            absolutePosition += element.focusOffsetStart ?? 0;
            break;
        }
        absolutePosition += element.length;
    }

    return absolutePosition;
};

export const mapAbsoluteToModel = (model: ExpressionModel[], absolutePos: number): { index: number; offset: number } | null => {
    if (!model || model.length === 0) return null;
    let sum = 0;
    for (let i = 0; i < model.length; i++) {
        const len = model[i].length;
        if (absolutePos <= sum + len) {
            const local = Math.max(0, Math.min(len, absolutePos - sum));
            return { index: i, offset: local };
        }
        sum += len;
    }
    return { index: model.length - 1, offset: model[model.length - 1].length };
};

export const findNearestEditableIndex = (model: ExpressionModel[], startIndex: number, preferNext: boolean): number | null => {
    if (!model || model.length === 0) return null;
    if (!model[startIndex].isToken) return startIndex;
    if (preferNext) {
        for (let i = startIndex + 1; i < model.length; i++) {
            if (!model[i].isToken) return i;
        }
        for (let i = startIndex - 1; i >= 0; i--) {
            if (!model[i].isToken) return i;
        }
    } else {
        for (let i = startIndex - 1; i >= 0; i--) {
            if (!model[i].isToken) return i;
        }
        for (let i = startIndex + 1; i < model.length; i++) {
            if (!model[i].isToken) return i;
        }
    }
    return null;
};

export const updateExpressionModelWithCompletion = (
    expressionModel: ExpressionModel[] | undefined,
    absoluteCaretPosition: number,
    completionValue: string
): { updatedModel: ExpressionModel[]; updatedValue: string; newCursorPosition: number } | null => {
    if (!expressionModel) return null;

    const mapped = mapAbsoluteToModel(expressionModel, absoluteCaretPosition);

    if (!mapped) return null;

    const { index, offset } = mapped;
    const elementAboutToModify = expressionModel[index];

    if (!elementAboutToModify || typeof elementAboutToModify.value !== 'string') return null;

    const textBeforeCaret = elementAboutToModify.value.substring(0, offset);
    const textAfterCaret = elementAboutToModify.value.substring(offset);

    const lastWordMatch = textBeforeCaret.match(/\b\w+$/);
    const lastWordStart = lastWordMatch ? textBeforeCaret.lastIndexOf(lastWordMatch[0]) : offset;

    const updatedText =
        textBeforeCaret.substring(0, lastWordStart) +
        completionValue +
        textAfterCaret;

    let sumOfCharsBefore = 0;
    for (let i = 0; i < index; i++) {
        sumOfCharsBefore += expressionModel[i].length;
    }
    const newCursorPosition = sumOfCharsBefore + lastWordStart + completionValue.length;

    const updatedModel = expressionModel.map((el, i) =>
        i === index ? { ...el, value: updatedText, length: updatedText.length } : el
    );

    const updatedValue = getTextValueFromExpressionModel(updatedModel);
    return { updatedModel, updatedValue, newCursorPosition };
};

export const updateExpressionModelWithHelper = (
    expressionModel: ExpressionModel[] | undefined,
    absoluteCaretPosition: number,
    helperValue: string
): { updatedModel: ExpressionModel[]; updatedValue: string; newCursorPosition: number } | null => {
    if (!expressionModel) return null;

    const mapped = mapAbsoluteToModel(expressionModel, absoluteCaretPosition);

    if (!mapped) return null;

    const { index, offset } = mapped;
    const elementAboutToModify = expressionModel[index];

    if (!elementAboutToModify || typeof elementAboutToModify.value !== 'string') return null;

    const textBeforeCaret = elementAboutToModify.value.substring(0, offset);
    const textAfterCaret = elementAboutToModify.value.substring(offset);

    const updatedText =
        textBeforeCaret +
        helperValue +
        textAfterCaret;

    let sumOfCharsBefore = 0;
    for (let i = 0; i < index; i++) {
        sumOfCharsBefore += expressionModel[i].length;
    }
    const newCursorPosition = sumOfCharsBefore + helperValue.length;

    const updatedModel = expressionModel.map((el, i) =>
        i === index ? { ...el, value: updatedText, length: updatedText.length } : el
    );

    const updatedValue = getTextValueFromExpressionModel(updatedModel);
    return { updatedModel, updatedValue, newCursorPosition };
};

export const updateExpressionModelWithHelperValue = (
    expressionModel: ExpressionModel[] | undefined,
    absoluteCaretPosition: number,
    helperValue: string,
    replaceEntireToken: boolean = false
): { updatedModel: ExpressionModel[]; updatedValue: string; newCursorPosition: number } | null => {
    if (!expressionModel) return null;
    let initializedModel = []
    if (expressionModel.length === 0) {
        initializedModel = [{
            id: "1",
            value: "",
            isToken: false,
            startColumn: 0,
            startLine: 0,
            length: 0,
            type: 'literal',
            isFocused: false,
            focusOffsetStart: 0,
            focusOffsetEnd: 0
        }]
    }
    else {
        initializedModel = expressionModel
    }

    const mapped = mapAbsoluteToModel(initializedModel, absoluteCaretPosition);

    if (!mapped) return null;

    const { index, offset } = mapped;
    const elementAboutToModify = initializedModel[index];

    if (!elementAboutToModify || typeof elementAboutToModify.value !== 'string') return null;

    let updatedText = '';
    if (replaceEntireToken) {
        updatedText = helperValue;
    }
    else {
        const textBeforeCaret = elementAboutToModify.value.substring(0, offset);
        const textAfterCaret = elementAboutToModify.value.substring(offset);
        updatedText = textBeforeCaret + helperValue + textAfterCaret;
    }

    let sumOfCharsBefore = 0;
    for (let i = 0; i < index; i++) {
        sumOfCharsBefore += initializedModel[i].length;
    }

    let newCursorPosition: number;
    if (replaceEntireToken) {
        newCursorPosition = sumOfCharsBefore + helperValue.length;
    } else {
        newCursorPosition = sumOfCharsBefore + offset + helperValue.length;
    }

    const updatedModel = initializedModel.map((el, i) =>
        i === index ? { ...el, value: updatedText, length: updatedText.length } : el
    );

    const updatedValue = getTextValueFromExpressionModel(updatedModel);
    return { updatedModel, updatedValue, newCursorPosition };
};

export const handleCompletionNavigation = (
    e: React.KeyboardEvent,
    completionsLength: number,
    selectedCompletionItem: number,
    setSelectedCompletionItem: React.Dispatch<React.SetStateAction<number>>,
    handleCompletionSelect: (completion: CompletionItem) => void,
    setIsCompletionsOpen: React.Dispatch<React.SetStateAction<boolean>>,
    completions: CompletionItem[]
) => {
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            setSelectedCompletionItem(prev =>
                prev < completionsLength - 1 ? prev + 1 : prev
            );
            break;
        case 'ArrowUp':
            e.preventDefault();
            setSelectedCompletionItem(prev =>
                prev > 0 ? prev - 1 : -1
            );
            break;
        case 'Enter':
            if (selectedCompletionItem >= 0 && selectedCompletionItem < completionsLength) {
                e.preventDefault();
                handleCompletionSelect(completions[selectedCompletionItem]);
            }
            break;
        case 'Escape':
            e.preventDefault();
            setIsCompletionsOpen(false);
            break;
        default:
            break;
    }
};

export const setFocusInExpressionModel = (
    exprModel: ExpressionModel[],
    mapped: { index: number; offset: number } | null,
    preferNext: boolean = true
): ExpressionModel[] => {
    if (!mapped) return exprModel;

    const editableIndex = findNearestEditableIndex(exprModel, mapped.index, preferNext);
    if (editableIndex !== null) {
        const boundedOffset = Math.max(0, Math.min(exprModel[editableIndex].length, mapped.offset));
        return exprModel.map((m, i) => (
            i === editableIndex
                ? { ...m, isFocused: true, focusOffsetStart: boundedOffset, focusOffsetEnd: boundedOffset }
                : { ...m, isFocused: false }
        ));
    }

    return exprModel;
};

export const setCaretPosition = (el: HTMLElement, position: number) => {
    if (!el.firstChild) {
        el.appendChild(document.createTextNode(""));
    }

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

export const setSelectionRange = (el: HTMLElement, start: number, end: number) => {
    if (!el.firstChild) {
        el.appendChild(document.createTextNode(""));
    }

    // Helper function to find text node and position
    const findPosition = (position: number) => {
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
            const last = el.lastChild;
            if (last && last.nodeType === Node.TEXT_NODE) {
                textNode = last as Text;
                posInNode = (textNode.textContent || "").length;
            } else {
                textNode = el.firstChild as Text;
                posInNode = 0;
            }
        }

        return { textNode, posInNode };
    };

    const startPos = findPosition(start);
    const endPos = findPosition(end);

    const range = document.createRange();
    range.setStart(startPos.textNode, Math.max(0, Math.min(startPos.posInNode, (startPos.textNode.textContent || "").length)));
    range.setEnd(endPos.textNode, Math.max(0, Math.min(endPos.posInNode, (endPos.textNode.textContent || "").length)));

    const sel = window.getSelection();
    if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
    }
};

export const handleKeyDownInTextElement = (
    e: React.KeyboardEvent<HTMLSpanElement>,
    expressionModel: ExpressionModel[],
    index: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void,
    host?: HTMLSpanElement | null
) => {
    if (!host) return;

    const caretOffset = getCaretOffsetWithin(host);
    const textLength = host.textContent?.length || 0;

    switch (e.key) {
        case 'Backspace':
            handleBackspace(e, expressionModel, index, caretOffset, onExpressionChange);
            break;
        case 'Delete':
            handleDelete(e, expressionModel, index, caretOffset, textLength, onExpressionChange);
            break;
        case 'ArrowRight':
            handleArrowRight(e, expressionModel, index, caretOffset, textLength, onExpressionChange);
            break;
        case 'ArrowLeft':
            handleArrowLeft(e, expressionModel, index, caretOffset, onExpressionChange);
            break;
    }
};

const handleBackspace = (
    e: React.KeyboardEvent<HTMLSpanElement>,
    expressionModel: ExpressionModel[],
    index: number,
    caretOffset: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    if (caretOffset === 0) {
        handleBackspaceAtStart(e, expressionModel, index, onExpressionChange);
    }
};

const handleBackspaceAtStart = (
    e: React.KeyboardEvent<HTMLSpanElement>,
    expressionModel: ExpressionModel[],
    index: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    e.preventDefault();
    e.stopPropagation();

    if (index === 0 || index >= expressionModel.length) return;

    let newExpressionModel = [...expressionModel];
    const tokensToRemove: number[] = [];

    // Scan backwards to find first non-token or collect all tokens
    for (let i = index - 1; i >= 0; i--) {
        if (newExpressionModel[i].isToken) {
            tokensToRemove.push(i);
        } else {
            mergeWithPreviousElement(
                expressionModel,
                index,
                i,
                tokensToRemove,
                onExpressionChange
            );
            return;
        }
    }

    // If we only found tokens, remove them
    if (tokensToRemove.length > 0) {
        newExpressionModel = newExpressionModel.filter(
            (_, idx) => !tokensToRemove.includes(idx)
        );
        const newCursorPosition = getAbsoluteCaretPositionFromModel(newExpressionModel);
        onExpressionChange?.(newExpressionModel, newCursorPosition, BACKSPACE_MARKER);
    }
};

const mergeWithPreviousElement = (
    expressionModel: ExpressionModel[],
    currentIndex: number,
    previousIndex: number,
    tokensToRemove: number[],
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    const currentElement = expressionModel[currentIndex];
    const shouldRemoveCurrent = currentElement.length === 0;

    const newExpressionModel = expressionModel
        .map((el, idx) => {
            if (idx === previousIndex) {
                return { ...el, isFocused: true, focusOffsetStart: el.length };
            }
            return el;
        })
        .filter((_, idx) => {
            if (idx === currentIndex) return !shouldRemoveCurrent;
            return !tokensToRemove.includes(idx);
        });

    const newCursorPosition = getAbsoluteCaretPositionFromModel(newExpressionModel);
    onExpressionChange?.(newExpressionModel, newCursorPosition, BACKSPACE_MARKER);
};

const handleDelete = (
    e: React.KeyboardEvent<HTMLSpanElement>,
    expressionModel: ExpressionModel[],
    index: number,
    caretOffset: number,
    textLength: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    if (caretOffset !== textLength) return;

    e.preventDefault();
    e.stopPropagation();

    const currentElement = expressionModel[index];
    if (!currentElement || index === expressionModel.length - 1) return;

    let newExpressionModel = [...expressionModel];
    const tokensToRemove: number[] = [];

    // Scan forward to find first non-token or collect all tokens
    for (let i = index + 1; i < expressionModel.length; i++) {
        if (expressionModel[i].isToken) {
            tokensToRemove.push(i);
        } else {
            deleteFirstCharFromNextElement(
                expressionModel,
                index,
                i,
                tokensToRemove,
                onExpressionChange
            );
            return;
        }
    }

    // If we only found tokens, remove them
    if (tokensToRemove.length > 0) {
        newExpressionModel = newExpressionModel.filter(
            (_, idx) => !tokensToRemove.includes(idx)
        );
        const newCursorPosition = getAbsoluteCaretPositionFromModel(newExpressionModel);
        onExpressionChange?.(newExpressionModel, newCursorPosition, DELETE_MARKER);
    }
};

const deleteFirstCharFromNextElement = (
    expressionModel: ExpressionModel[],
    currentIndex: number,
    nextIndex: number,
    tokensToRemove: number[],
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    const currentElement = expressionModel[currentIndex];
    const nextElement = expressionModel[nextIndex];
    const updatedNextValue = nextElement.value.slice(1);
    const shouldRemoveNext = updatedNextValue.length === 0;

    const newExpressionModel = expressionModel
        .map((el, idx) => {
            if (idx === currentIndex) {
                return { ...el, isFocused: true, focusOffsetStart: el.length, focusOffsetEnd: el.length };
            } else if (idx === nextIndex && !shouldRemoveNext) {
                return { ...el, value: updatedNextValue, length: updatedNextValue.length, isFocused: false, focusOffsetStart: 0, focusOffsetEnd: 0 };
            }
            return el;
        })
        .filter((_, idx) => {
            if (idx === nextIndex) return !shouldRemoveNext;
            return !tokensToRemove.includes(idx);
        });

    const newCursorPosition = getAbsoluteCaretPositionFromModel(newExpressionModel);
    onExpressionChange?.(newExpressionModel, newCursorPosition, DELETE_MARKER);
};

const handleArrowRight = (
    e: React.KeyboardEvent<HTMLSpanElement>,
    expressionModel: ExpressionModel[],
    index: number,
    caretOffset: number,
    textLength: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    e.preventDefault();
    e.stopPropagation();

    if (caretOffset === textLength) {
        moveToNextElement(expressionModel, index, onExpressionChange);
    } else {
        moveCaretForward(expressionModel, index, caretOffset, onExpressionChange);
    }
};

const moveToNextElement = (
    expressionModel: ExpressionModel[],
    index: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    if (index < 0 || index >= expressionModel.length - 1) return;

    for (let i = index + 1; i < expressionModel.length; i++) {
        if (!expressionModel[i].isToken) {
            const newExpressionModel = expressionModel.map((el, idx) => {
                if (idx === i) {
                    return { ...el, isFocused: true, focusOffsetStart: 0, focusOffsetEnd: 0 };
                } else if (idx === index) {
                    return { ...el, isFocused: false, focusOffsetStart: undefined, focusOffsetEnd: undefined };
                }
                return el;
            });

            const newCursorPosition = getAbsoluteCaretPositionFromModel(newExpressionModel);
            onExpressionChange?.(newExpressionModel, newCursorPosition, ARROW_RIGHT_MARKER);
            return;
        }
    }
};

const moveCaretForward = (
    expressionModel: ExpressionModel[],
    index: number,
    caretOffset: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    const newExpressionModel = expressionModel.map((el, idx) => {
        if (idx === index) {
            return { ...el, isFocused: true, focusOffsetStart: Math.max(0, caretOffset + 1), focusOffsetEnd: Math.max(0, caretOffset + 1) };
        }
        return el;
    });

    const newCursorPosition = getAbsoluteCaretPositionFromModel(newExpressionModel);
    onExpressionChange?.(newExpressionModel, newCursorPosition, ARROW_LEFT_MARKER);
};

const handleArrowLeft = (
    e: React.KeyboardEvent<HTMLSpanElement>,
    expressionModel: ExpressionModel[],
    index: number,
    caretOffset: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    e.preventDefault();
    e.stopPropagation();

    if (caretOffset === 0) {
        moveToPreviousElement(expressionModel, index, onExpressionChange);
    } else {
        moveCaretBackward(expressionModel, index, caretOffset, onExpressionChange);
    }
};

const moveToPreviousElement = (
    expressionModel: ExpressionModel[],
    index: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    if (index <= 0 || index >= expressionModel.length) return;

    // Find previous non-token element
    for (let i = index - 1; i >= 0; i--) {
        if (!expressionModel[i].isToken) {
            const newExpressionModel = expressionModel.map((el, idx) => {
                if (idx === i) {
                    return { ...el, isFocused: true, focusOffsetStart: el.length, focusOffsetEnd: el.length };
                } else if (idx === index) {
                    return { ...el, isFocused: false, focusOffsetStart: undefined, focusOffsetEnd: undefined};
                }
                return el;
            });

            const newCursorPosition = getAbsoluteCaretPositionFromModel(newExpressionModel);
            onExpressionChange?.(newExpressionModel, newCursorPosition, ARROW_LEFT_MARKER);
            return;
        }
    }
};

const moveCaretBackward = (
    expressionModel: ExpressionModel[],
    index: number,
    caretOffset: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void
) => {
    const newExpressionModel = expressionModel.map((el, idx) => {
        if (idx === index) {
            return { ...el, isFocused: true, focusOffsetStart: Math.max(0, caretOffset - 1), focusOffsetEnd: Math.max(0, caretOffset - 1)};
        }
        return el;
    });

    const newCursorPosition = getAbsoluteCaretPositionFromModel(newExpressionModel);
    onExpressionChange?.(newExpressionModel, newCursorPosition, ARROW_LEFT_MARKER);
};

export const getWordBeforeCursor = (expressionModel: ExpressionModel[]): string => {
    const absoluteCaretPosition = getAbsoluteCaretPositionFromModel(expressionModel);
    const fullText = getTextValueFromExpressionModel(expressionModel);
    const fullTextUpToCursor = fullText.slice(0, absoluteCaretPosition);

    const match = fullTextUpToCursor.match(/\b\w+$/);

    const lastMatch = match ? match[match.length - 1] : "";
    return fullTextUpToCursor.endsWith(lastMatch) ? lastMatch : '';
};

export const filterCompletionsByPrefixAndType = (completions: CompletionItem[], prefix: string): CompletionItem[] => {
    if (!prefix) {
        return completions.filter(completion =>
            completion.kind === 'field'
        );
    }

    return completions.filter(completion =>
        (completion.kind === 'function' || completion.kind === 'variable' || completion.kind === 'field') &&
        completion.label.toLowerCase().startsWith(prefix.toLowerCase())
    );
};

export const setCursorPositionToExpressionModel = (expressionModel: ExpressionModel[], cursorPosition: number): ExpressionModel[] => {
    const newExpressionModel = [];
    let i = 0;
    let foundTarget = false;

    while (i < expressionModel.length) {
        const element = expressionModel[i];
        if (!foundTarget && cursorPosition <= element.length) {
            foundTarget = true;

            if (element.isToken) {
                if (expressionModel.length <= i + 1) {

                    newExpressionModel.push({
                        id: element.id + "1",
                        isFocused: true,
                        focusOffsetStart: 0,
                        focusOffsetEnd: 0,
                        value: ' ',
                        isToken: element.isToken,
                        startColumn: element.startColumn,
                        startLine: element.startLine,
                        length: element.length,
                        type: element.type
                    });
                    return newExpressionModel;
                }
                else {
                    const nextElement = expressionModel[i + 1];
                    newExpressionModel.push({
                        ...element,
                        isFocused: false,
                        focusOffsetStart: undefined,
                        focusOffsetEnd: undefined
                    });
                    newExpressionModel.push({
                        ...nextElement,
                        isFocused: true,
                        focusOffsetStart: 0,
                        focusOffsetEnd: 0
                    });
                    i += 2;
                }
            }
            else {
                newExpressionModel.push({
                    ...element,
                    isFocused: true,
                    focusOffsetStart: cursorPosition,
                    focusOffsetEnd: cursorPosition
                });
                i += 1;
            }
        }
        else {
            newExpressionModel.push({
                ...element,
                isFocused: false,
                focusOffsetStart: undefined,
                focusOffsetEnd: undefined
            });
            i += 1;
            if (!foundTarget) {
                cursorPosition -= element.length;
            }
        }
    }
    return newExpressionModel;
};

export const updateTokens = (tokens: number[], cursorPosition: number, cursorChange: number, previousFullText: string): number[] => {
    const updatedTokens: number[] = [];
    const tokenChunks = getTokenChunks(tokens);

    let currentLine = 0;
    let currentChar = 0;
    let adjustedCurrentLine = false;

    for (let i = 0; i < tokenChunks.length; i++) {
        const chunk = tokenChunks[i];
        const deltaLine = chunk[TOKEN_LINE_OFFSET_INDEX];
        const deltaStartChar = chunk[TOKEN_START_CHAR_OFFSET_INDEX];
        const tokenLength = chunk[TOKEN_LENGTH_INDEX];
        const tokenType = chunk[3];
        const tokenModifiers = chunk[4];

        if (deltaLine > 0) {
            adjustedCurrentLine = false;
        }

        currentLine += deltaLine;
        if (deltaLine === 0) {
            currentChar += deltaStartChar;
        } else {
            currentChar = deltaStartChar;
        }

        const tokenAbsoluteOffset = getAbsoluteColumnOffset(previousFullText, currentLine, currentChar);

        let adjustedDeltaStartChar = deltaStartChar;
        if (!adjustedCurrentLine && tokenAbsoluteOffset >= cursorPosition) {
            adjustedDeltaStartChar += cursorChange;
            adjustedCurrentLine = true;
        }

        updatedTokens.push(deltaLine, adjustedDeltaStartChar, tokenLength, tokenType, tokenModifiers);
    }

    return updatedTokens;
};

export const getModelWithModifiedParamsChip = (expressionModel: ExpressionModel[]): ExpressionModel[] => {
    return expressionModel.map(el => {
        if (el.type === 'parameter' && el.value.length === 0) {
            return {
                ...el,
                value: '$1',
                length: 2
            }
        }
        return el;
    }
    )
}

export const isBetween = (a: number, b: number, target: number): boolean => {
    return target >= Math.min(a, b) && target <= Math.max(a, b);
}
