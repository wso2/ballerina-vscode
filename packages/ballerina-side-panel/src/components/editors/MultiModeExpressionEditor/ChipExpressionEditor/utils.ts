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
    if (!active) return 0;
    const elementId = active.getAttribute('data-element-id');
    if (!elementId) return 0;
    const idx = model.findIndex(m => m.id === elementId);
    if (idx < 0) return 0;
    const within = getCaretOffsetWithin(active);
    let sum = 0;
    for (let i = 0; i < idx; i++) {
        sum += model[i].length;
    }
    return sum + within;
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
): { updatedModel: ExpressionModel[]; updatedValue: string } | null => {
    if (!expressionModel) return null;

    const mapped = mapAbsoluteToModel(expressionModel, absoluteCaretPosition);
    if (mapped) {
        const { index, offset } = mapped;
        const targetElement = expressionModel[index];

        if (targetElement && typeof targetElement.value === 'string') {
            const textBeforeCaret = targetElement.value.substring(0, offset);
            const textAfterCaret = targetElement.value.substring(offset);

            // Find the last word before the caret
            const lastWordMatch = textBeforeCaret.match(/\b\w+$/);
            const lastWordStart = lastWordMatch ? textBeforeCaret.lastIndexOf(lastWordMatch[0]) : offset;

            const updatedText =
                textBeforeCaret.substring(0, lastWordStart) +
                completionValue +
                textAfterCaret;

            const updatedModel = expressionModel.map((el, i) =>
                i === index ? { ...el, value: updatedText } : el
            );

            const updatedValue = getTextValueFromExpressionModel(updatedModel);
            return { updatedModel, updatedValue };
        }
    }

    return null;
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
                prev > 0 ? prev - 1 : prev
            );
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedCompletionItem < completionsLength) {
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


