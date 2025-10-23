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
import { INPUT_MODE_MAP, InputMode, ExpressionModel, CursorPosition } from "./types";
import { DATA_ELEMENT_ID_ATTRIBUTE } from "./constants";

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

export const getInvalidTokensRange = (value: string, tokens: number[], absoluteOffset: number) => {
    const tokenChunks = getTokenChunks(tokens);
    console.log("token chunks", tokenChunks);
    let currentLine = 0;
    let currentChar = 0;
    let affectedRange = { start: 0, end: 0 };
    const cursorLine = getLineFromAbsoluteOffset(value, absoluteOffset);
    for (let i = 0; i < tokenChunks.length; i++) {
        const chunk = tokenChunks[i];
        const deltaLine = chunk[TOKEN_LINE_OFFSET_INDEX];
        const deltaStartChar = chunk[TOKEN_START_CHAR_OFFSET_INDEX];
        const tokenLength = chunk[TOKEN_LENGTH_INDEX];

        currentLine += deltaLine;
        if (deltaLine === 0) {
            currentChar += deltaStartChar;
        } else {
            currentChar = deltaStartChar;
        }

        const currentTokenAbsoluteOffset = getAbsoluteColumnOffset(value, currentLine, currentChar);
        console.log("Chunk:", chunk);
        console.log("currentTokenAbsoluteOffset", currentTokenAbsoluteOffset + tokenLength);
        console.log("checking against absoluteOffset", absoluteOffset);
        if ((currentTokenAbsoluteOffset + tokenLength) <= absoluteOffset) continue;
        const affectedTokensStartIndex = i * 5;
        let affectedTokensEndIndex = affectedTokensStartIndex;
        for (let j = affectedTokensStartIndex; j < tokens.length; j += 5) {
            // stop if line delta is not 0
            // which means tokens in the same line is 
            //already filtered and we can safely ignore the rest
            //of the tkens
            if (tokens[j] !== 0 && (currentLine !== cursorLine)) break;
            affectedTokensEndIndex = j + 5;
        }
        affectedRange = {
            start: affectedTokensStartIndex,
            end: affectedTokensEndIndex
        }
        break;
    }
    console.log("affectedRange", affectedRange);
    return affectedRange;
}

export const handleErrorCorrection = (range: { start: number; end: number }, tokens: number[], correction: number) => {
    const validTokensBeforeErrorRange = tokens.slice(0, range.start);
    const validTokensAfterErrorRange = tokens.slice(range.end);
    const correctionRequiredTokens = tokens.slice(range.start, range.end);
    console.log("correctionRequiredTokens", correctionRequiredTokens);


    // Adjust the first token's column offset in the affected range
    // The rest remain relative to each other
    if (correctionRequiredTokens.length >= 5) {
        // Adjust the first token's delta start char (index 1)
        console.log("correction applied:", correction);
        correctionRequiredTokens[1] += correction;
    }
    console.log("correction required tokens after adjustment", correctionRequiredTokens);

    return [...validTokensBeforeErrorRange, ...correctionRequiredTokens, ...validTokensAfterErrorRange];
}

export const insertingStringAt = (text: string, position: number, insert: string) => {
    return text.slice(0, position) + insert + text.slice(position)
}

export const getTokenChunks = (tokens: number[]) => {
    const chunkSize = 5;
    const tokenChunks = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
        tokenChunks.push(tokens.slice(i, i + chunkSize));
    }
    return tokenChunks;
}

//for menus

export const calculateMenuPosition = (targetElement: HTMLElement, container: HTMLDivElement) => {
    const rect = targetElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (!containerRect) return null;

    const menuWidth = 120;
    let top = rect.bottom - containerRect.top + 4;
    let left = rect.left - containerRect.left;
    if (left + menuWidth > containerRect.width) {
        left = containerRect.width - menuWidth;
    }

    return { top, left };
};

export const calculateCompletionsMenuPosition = (
    fieldContainerRef: React.RefObject<HTMLDivElement>,
    setMenuPosition: React.Dispatch<React.SetStateAction<{ top: number; left: number }>>
) => {
    if (fieldContainerRef.current) {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.hasAttribute('contenteditable')) {
            const rect = activeElement.getBoundingClientRect();
            const containerRect = fieldContainerRef.current.getBoundingClientRect();
            // Align the right edge of the menu with the right edge of the editable span
            const menuWidth = 300; // Use the same width as defined in styles
            let left = rect.right - containerRect.left - menuWidth;

            // Ensure the menu doesn't go beyond the left edge of the container
            left = Math.max(0, left);

            setMenuPosition({
                top: rect.bottom - containerRect.top + 20,
                left: left
            });
        } else {
            // Fallback: position below the expression field, aligned to the right
            const containerRect = fieldContainerRef.current.getBoundingClientRect();
            const menuWidth = 300;
            setMenuPosition({
                top: containerRect.top + containerRect.height,
                left: Math.max(0, containerRect.width - menuWidth)
            });
        }
    } else {
        setMenuPosition(prev => ({ ...prev, top: 500 }));
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

        // Check if cursor position falls within this item's range
        if (cursorPosition >= itemStart && cursorPosition <= itemEnd) {
            // Only return tokens, not literals
            const offset = cursorPosition - itemStart;
            return {
                element: item,
                offset: offset
            };
        }

        // Move to next item's position
        currentAbsolutePosition += item.length;
    }

    return null;
};

export const getExpressionModelElementById = (
    expressionModel: ExpressionModel[],
    id: string
) => {
    return expressionModel.find(item => item.id === id);
};

export const getTextValueFromExpressionModel = (expressionModel: ExpressionModel[] = []): string => {
    if (!Array.isArray(expressionModel) || expressionModel.length === 0) return "";

    return expressionModel
        .map((item: any) => {
            return item.value;
        })
        .join("");
};

/**
 * Converts LSP semantic tokens and string value into an ExpressionModel array.
 * LSP semantic tokens are encoded as a flat array where each token uses 5 consecutive numbers:
 * [deltaLine, deltaStartChar, length, tokenType, tokenModifiers]
 * 
 * @param value - The full text string
 * @param tokens - Flat array of numbers representing semantic tokens (5 numbers per token)
 * @returns Array of ExpressionModel elements representing tokens and literal text between them
 */
export const createExpressionModelFromTokens = (
    value: string,
    tokens: number[]
): ExpressionModel[] => {
    if (!value) return [];
    if (!tokens || tokens.length === 0) {
        // No tokens, return entire value as a single literal
        return [{
            id: '1',
            value: value,
            isToken: false,
            startColumn: 0,
            startLine: 0,
            length: value.length,
            type: 'literal',
            isFocused: false,
            focusOffset: undefined
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
        const tokenTypeIndex = chunk[3]; // tokenType
        const tokenModifiers = chunk[4]; // tokenModifiers (optional)

        // Skip zero-width tokens (tokens with length 0)
        if (tokenLength === 0) {
            // Still update position for subsequent tokens
            currentLine += deltaLine;
            if (deltaLine === 0) {
                currentChar += deltaStartChar;
            } else {
                currentChar = deltaStartChar;
            }
            continue;
        }

        // Update current position based on delta values
        currentLine += deltaLine;
        if (deltaLine === 0) {
            currentChar += deltaStartChar;
        } else {
            currentChar = deltaStartChar;
        }

        // Calculate absolute offset for this token
        const tokenAbsoluteOffset = getAbsoluteColumnOffset(value, currentLine, currentChar);

        // Add literal text before this token (if any)
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

        // Add the token itself
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

    // Add any remaining literal text after the last token
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

    // Ensure the model always starts with a literal (text) element
    if (expressionModel.length > 0 && expressionModel[0].isToken) {
        expressionModel.unshift({
            id: String(idCounter++),
            value: '',
            isToken: false,
            startColumn: 0,
            startLine: 0,
            length: 0,
            type: 'literal'
        });
    }

    // Ensure the model always ends with a literal (text) element
    if (expressionModel.length > 0 && expressionModel[expressionModel.length - 1].isToken) {
        // Place an empty literal at the end; position at end of string
        const endLine = getLineFromAbsoluteOffset(value, value.length);
        const endColumnBase = getAbsoluteColumnOffset(value, endLine, 0);
        const endColumn = (typeof endColumnBase === 'number') ? (value.length - endColumnBase) : 0;
        expressionModel.push({
            id: String(idCounter++),
            value: '',
            isToken: false,
            startColumn: endColumn,
            startLine: endLine,
            length: 0,
            type: 'literal'
        });
    }

    return expressionModel;
};

/**
 * Helper function to convert token type index to type string
 * Extend this mapping based on your LSP token types
 */
const getTokenTypeFromIndex = (index: number): string => {
    const tokenTypes: { [key: number]: string } = {
        0: 'variable',
        1: 'function',
        2: 'parameter',
        3: 'property',
        // Add more token types as needed based on your LSP implementation
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

export const getAbsoluteCaretPosition = (model: ExpressionModel[] | undefined): number => {
    if (!model || model.length === 0) return 0;
    const active = document.activeElement as HTMLElement | null;
    console.log("active element", active);
    if (!active) return 0;
    const elementId = active.getAttribute('data-element-id');
    console.log("active element id", elementId);
    if (!elementId) return 0;
    const idx = model.findIndex(m => m.id === elementId);
    if (idx < 0) return 0;

    const carrotOffsetInSelectedSpan = getCaretOffsetWithin(active);

    let sumOfChars = 0;
    // Sum lengths of all elements before the selected one
    for (let i = 0; i < idx; i++) {
        sumOfChars += model[i].length;
    }

    return sumOfChars + carrotOffsetInSelectedSpan;
};

export const mapAbsoluteToModel = (model: ExpressionModel[], absolutePos: number): { index: number; offset: number } | null => {
    console.log("MODEL", model)
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
    // If beyond end, place at end of last element
    return { index: model.length - 1, offset: model[model.length - 1].length };
};

export const findNearestEditableIndex = (model: ExpressionModel[], startIndex: number, preferNext: boolean): number | null => {
    if (!model || model.length === 0) return null;
    // If current is editable (not a token), use it
    if (!model[startIndex].isToken) return startIndex;
    // Try next
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

/**
 * Filters the LSP response tokens to remove zero-length tokens.
 * Zero-length tokens can cause issues in rendering and interaction,
 * so this utility function ensures only valid tokens are processed.
 * 
 * @param response - The flat array of LSP response tokens
 * @returns Filtered array with zero-length tokens removed
 */
export const filterTokens = (response: number[]): number[] => {
    const filteredTokens: number[] = [];
    for (let i = 0; i < response.length; i += 5) {
        const length = response[i + 2];
        if (length > 0) {
            filteredTokens.push(
                response[i],
                response[i + 1],
                response[i + 2],
                response[i + 3],
                response[i + 4]
            );
        }
    }
    return filteredTokens;
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

    // Find the last word before the caret
    const lastWordMatch = textBeforeCaret.match(/\b\w+$/);
    const lastWordStart = lastWordMatch ? textBeforeCaret.lastIndexOf(lastWordMatch[0]) : offset;

    const updatedText =
        textBeforeCaret.substring(0, lastWordStart) +
        completionValue +
        textAfterCaret;

    // Calculate new cursor position: sum of lengths before this element + position after completion
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

    // Calculate new cursor position: sum of lengths before this element + position after completion
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
    helperValue: string
): { updatedModel: ExpressionModel[]; updatedValue: string; newCursorPosition: number } | null => {
    console.log("#QWE")
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
            focusOffset: 0
        }]
    }
    else {
        initializedModel = expressionModel
    }

    const mapped = mapAbsoluteToModel(initializedModel, absoluteCaretPosition);
    console.log("BEFOREMAP", mapped)

    if (!mapped) return null;

    const { index, offset } = mapped;
    const elementAboutToModify = initializedModel[index];

    console.log("mapped", elementAboutToModify);

    if (!elementAboutToModify || typeof elementAboutToModify.value !== 'string') return null;

    const updatedText = helperValue;

    // Calculate new cursor position: sum of lengths before this element + position after completion
    let sumOfCharsBefore = 0;
    for (let i = 0; i < index; i++) {
        sumOfCharsBefore += initializedModel[i].length;
    }

    const updatedModel = initializedModel.map((el, i) =>
        i === index ? { ...el, value: updatedText, length: updatedText.length } : el
    );

    const updatedValue = getTextValueFromExpressionModel(updatedModel);
    return { updatedModel, updatedValue, newCursorPosition: 0 };
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
            // If selectedCompletionItem is -1, don't prevent default, allow normal Enter behavior
            // otherwise users wont be able to add new lines when no completion is selected
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

/**
 * Sets focus flags in an expression model based on a mapped position.
 * Finds the nearest editable element and sets isFocused=true with appropriate focusOffset.
 * All other elements get isFocused=false.
 * 
 * @param exprModel - The expression model to update
 * @param mapped - The mapped position result from mapAbsoluteToModel
 * @param preferNext - Whether to prefer the next editable element when current is not editable
 * @returns Updated expression model with focus flags set
 */
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
                ? { ...m, isFocused: true, focusOffset: boundedOffset }
                : { ...m, isFocused: false }
        ));
    }

    return exprModel;
};

/**
 * Finds the previous element in an expression model relative to the given index.
 * 
 * @param expressionModel - The expression model array
 * @param currentIndex - The current element index
 * @returns The previous element and its index, or null if none exists
 */
export const findPreviousElement = (
    expressionModel: ExpressionModel[],
    currentIndex: number
): { element: ExpressionModel; index: number } | null => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
        return {
            element: expressionModel[prevIndex],
            index: prevIndex
        };
    }
    return null;
};

/**
 * Finds the next element in an expression model relative to the given index.
 * 
 * @param expressionModel - The expression model array
 * @param currentIndex - The current element index
 * @returns The next element and its index, or null if none exists
 */
export const findNextElement = (
    expressionModel: ExpressionModel[],
    currentIndex: number
): { element: ExpressionModel; index: number } | null => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < expressionModel.length) {
        return {
            element: expressionModel[nextIndex],
            index: nextIndex
        };
    }
    return null;
};

/**
 * Finds the DOM element for the next editable span in the expression model.
 * 
 * @param expressionModel - The expression model array
 * @param currentIndex - The current element index
 * @param currentSpan - The current span element to exclude from results
 * @returns The next editable span DOM element, or null if none exists
 */
export const findNextEditableSpan = (
    expressionModel: ExpressionModel[],
    currentIndex: number,
    currentSpan: HTMLSpanElement | null
): HTMLSpanElement | null => {
    // Find the next editable span in the expression model (skip tokens and whitespace-only spans)
    for (let i = currentIndex + 1; i < expressionModel.length; i++) {
        const element = expressionModel[i];
        if (!element.isToken) {
            // Find the corresponding DOM element by data-element-id
            const targetId = element.id;
            const span = document.querySelector(`[${DATA_ELEMENT_ID_ATTRIBUTE}="${targetId}"]`) as HTMLSpanElement;
            if (span && span !== currentSpan) {
                return span;
            }
        }
    }
    return null;
};

/**
 * Sets the caret position within a DOM element at the specified character offset.
 * Handles complex DOM structures with multiple text nodes by walking through them.
 * 
 * @param expressionModel - The expression model array
 * @param currentIndex - The current element index
 * @param currentSpan - The current span element to exclude from results
 * @returns The previous editable span DOM element, or null if none exists
 */
export const findPreviousEditableSpan = (
    expressionModel: ExpressionModel[],
    currentIndex: number,
    currentSpan: HTMLSpanElement | null
): HTMLSpanElement | null => {
    // Find the previous editable span in the expression model (skip tokens and whitespace-only spans)
    for (let i = currentIndex - 1; i >= 0; i--) {
        const element = expressionModel[i];
        if (!element.isToken) {
            // Find the corresponding DOM element by data-element-id
            const targetId = element.id;
            const span = document.querySelector(`[${DATA_ELEMENT_ID_ATTRIBUTE}="${targetId}"]`) as HTMLSpanElement;
            if (span && span !== currentSpan) {
                return span;
            }
        }
    }
    return null;
};

/**
 * Finds the DOM element for the previous editable span in the expression model.
 * 
 * @param el - The DOM element to set the caret position in
 * @param position - The character offset position to set the caret at
 */
export const setCaretPosition = (el: HTMLElement, position: number) => {
    // If no text child then add one before setting the caret
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

/**
 * Handles keyboard events for text elements in the expression editor.
 * Manages navigation between editable spans, deletion of tokens and characters.
 * 
 * @param e - The keyboard event
 * @param expressionModel - The current expression model
 * @param index - The index of the current element in the expression model
 * @param onExpressionChange - Callback to update the expression model
 * @param host - The current span element (optional, will use spanRef.current if not provided)
 */
export const handleKeyDownInTextElement = (
    e: React.KeyboardEvent<HTMLSpanElement>,
    expressionModel: ExpressionModel[],
    index: number,
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorDelta: number) => void,
    host?: HTMLSpanElement | null
) => {
    if (!host) return;

    const caretOffset = getCaretOffsetWithin(host);
    const textLength = host.textContent?.length || 0;

    // Backspace at the beginning of current span
    if (e.key === 'Backspace' && caretOffset === 0) {
        const prevElement = findPreviousElement(expressionModel, index);
        if (prevElement) {
            e.preventDefault();
            e.stopPropagation();

            if (prevElement.element.isToken) {
                // Delete the entire chip from expression model
                const updatedExpressionModel = expressionModel.filter((_, idx) => idx !== prevElement.index);
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
                const prevSpan = document.querySelector(`[${DATA_ELEMENT_ID_ATTRIBUTE}="${prevElement.element.id}"]`) as HTMLSpanElement;
                if (prevSpan && prevElement.element.value.length > 0) {
                    const newValue = prevElement.element.value.slice(0, -1);
                    const updatedExpressionModel = [...expressionModel];
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
        const nextElement = findNextElement(expressionModel, index);
        if (nextElement) {
            e.preventDefault();
            e.stopPropagation();

            if (nextElement.element.isToken) {
                // Delete the entire chip from expression model
                const updatedExpressionModel = expressionModel.filter((_, idx) => idx !== nextElement.index);
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
                const nextSpan = document.querySelector(`[${DATA_ELEMENT_ID_ATTRIBUTE}="${nextElement.element.id}"]`) as HTMLSpanElement;
                if (nextSpan && nextElement.element.value.length > 0) {
                    const newValue = nextElement.element.value.slice(1);
                    const updatedExpressionModel = [...expressionModel];
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
        const nextSpan = findNextEditableSpan(expressionModel, index, host);
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
        const prevSpan = findPreviousEditableSpan(expressionModel, index, host);
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


