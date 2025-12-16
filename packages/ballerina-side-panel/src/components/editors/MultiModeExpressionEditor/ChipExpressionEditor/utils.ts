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
import { INPUT_MODE_MAP, InputMode, TokenType, CompoundTokenSequence, TokenMetadata, DocumentType, TokenPattern } from "./types";
import { getPrimaryInputType, InputType } from "@wso2/ballerina-core";

export const TOKEN_LINE_OFFSET_INDEX = 0;
export const TOKEN_START_CHAR_OFFSET_INDEX = 1;
export const TOKEN_LENGTH_INDEX = 2;
export const TOKEN_TYPE_INDEX = 3;
export const TOKEN_MODIFIERS_INDEX = 4;

export const TOKEN_TYPE_INDEX_MAP: { [key: number]: TokenType } = {
    0: TokenType.VARIABLE,
    1: TokenType.FUNCTION,
    2: TokenType.PARAMETER,
    3: TokenType.TYPE_CAST,
    4: TokenType.VALUE,
    5: TokenType.START_EVENT,
    6: TokenType.END_EVENT
};

const getTokenTypeFromIndex = (index: number): TokenType => {
    return TOKEN_TYPE_INDEX_MAP[index] || TokenType.VARIABLE;
};

export const getInputModeFromTypes = (inputType: InputType): InputMode => {
    if (!inputType || !inputType) return;

    if (inputType.fieldType === "SINGLE_SELECT") {
        return InputMode.ENUM;
    }
    if (inputType.fieldType === "EXPRESSION_SET") {
        return InputMode.ARRAY;
    }

    //default behaviour
    return getInputModeFromBallerinaType(inputType.ballerinaType);
};

export const getInputModeFromBallerinaType = (ballerinaType: string): InputMode => {
    return INPUT_MODE_MAP[ballerinaType];
}

export const getDefaultExpressionMode = (inputTypes: InputType[]): InputMode => {
    const primaryInputType = getPrimaryInputType(inputTypes);
    return getInputModeFromTypes(primaryInputType);
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

// Parsed token with absolute positions
export type ParsedToken = {
    id: number;
    start: number;
    end: number;
    type: TokenType;
}

export const getParsedExpressionTokens = (tokens: number[], value: string): ParsedToken[] => {
    const chunks = getTokenChunks(tokens);
    let currentLine = 0;
    let currentChar = 0;
    const tokenObjects: ParsedToken[] = [];

    let tokenId = 0;
    for (let chunk of chunks) {
        const deltaLine = chunk[TOKEN_LINE_OFFSET_INDEX];
        const deltaStartChar = chunk[TOKEN_START_CHAR_OFFSET_INDEX];
        const length = chunk[TOKEN_LENGTH_INDEX];
        const type = chunk[TOKEN_TYPE_INDEX];

        currentLine += deltaLine;
        if (deltaLine === 0) {
            currentChar += deltaStartChar;
        } else {
            currentChar = deltaStartChar;
        }

        const absoluteStart = getAbsoluteColumnOffset(value, currentLine, currentChar);
        const absoluteEnd = absoluteStart + length;

        tokenObjects.push({ id: tokenId++, start: absoluteStart, end: absoluteEnd, type: getTokenTypeFromIndex(type) });
    }
    return tokenObjects;
}

export const getWordBeforeCursorPosition = (textBeforeCursor: string): string => {
    const match = textBeforeCursor.match(/\b\w+$/);
    const lastMatch = match ? match[match.length - 1] : "";
    return textBeforeCursor.endsWith(lastMatch) ? lastMatch : '';
};

export const filterCompletionsByPrefixAndType = (completions: CompletionItem[], prefix: string): CompletionItem[] => {
    if (!prefix) {
        return completions.filter(completion =>
            completion.kind === 'field'
        );
    }

    return completions.filter(completion =>
        (completion.kind === 'function' || completion.kind === 'variable' || completion.kind === 'field' || completion.kind === 'enum-member') &&
        completion.label.toLowerCase().startsWith(prefix.toLowerCase())
    );
};

// Maps a position from raw expression space to sanitized expression space
export const mapRawToSanitized = (
    rawPosition: number,
    rawExpression: string,
    sanitizedExpression: string
): number => {
    if (rawExpression === sanitizedExpression) {
        return rawPosition;
    }

    const sanitizedIndex = rawExpression.indexOf(sanitizedExpression);
    if (sanitizedIndex === -1) {
        return rawPosition;
    }

    const prefixLength = sanitizedIndex;
    if (rawPosition <= prefixLength) {
        return 0;
    }

    const mappedPosition = rawPosition - prefixLength;
    return Math.min(mappedPosition, sanitizedExpression.length);
};

// Maps a position from sanitized expression space to raw expression space
export const mapSanitizedToRaw = (
    sanitizedPosition: number,
    rawExpression: string,
    sanitizedExpression: string
): number => {
    if (rawExpression === sanitizedExpression) {
        return sanitizedPosition;
    }

    const sanitizedIndex = rawExpression.indexOf(sanitizedExpression);
    if (sanitizedIndex === -1) {
        return sanitizedPosition;
    }

    const prefixLength = sanitizedIndex;
    return sanitizedPosition + prefixLength;
};

/**
 * Extracts metadata for document tokens
 * Pattern: ${<ai:DocumentType>{content: value}}
 */
export const extractDocumentMetadata = (
    tokens: ParsedToken[],
    startIndex: number,
    endIndex: number,
    docText: string
): TokenMetadata | null => {
    const startToken = tokens[startIndex];
    const endToken = tokens[endIndex];
    const fullValue = docText.substring(startToken.start, endToken.end);
    const documentRegex = /\$\{<ai:(\w+)>\{content:\s*([^}]+)\}\}/;
    const match = fullValue.match(documentRegex);

    if (!match) {
        return null;
    }

    const documentType = match[1] as DocumentType;
    const content = match[2].trim();

    return {
        content,
        fullValue,
        documentType
    };
};

/**
 * Extracts metadata for variable tokens
 * Pattern: ${variableName}
 */
export const extractVariableMetadata = (
    tokens: ParsedToken[],
    startIndex: number,
    endIndex: number,
    docText: string
): TokenMetadata | null => {
    const startToken = tokens[startIndex];
    const endToken = tokens[endIndex];
    const fullValue = docText.substring(startToken.start, endToken.end);
    const variableRegex = /\$\{([^}]+)\}/;
    const match = fullValue.match(variableRegex);

    if (!match) {
        return null;
    }

    const content = match[1].trim();

    return {
        content,
        fullValue
    };
};

// Token patterns for detecting compound token sequences
// Patterns are checked in priority order (higher priority number = higher priority)
export const TOKEN_PATTERNS: readonly TokenPattern[] = [
    {
        name: TokenType.DOCUMENT,
        sequence: [TokenType.START_EVENT, TokenType.TYPE_CAST, TokenType.VALUE, TokenType.END_EVENT],
        extractor: extractDocumentMetadata,
        priority: 2
    },
    {
        name: TokenType.VARIABLE,
        sequence: [TokenType.START_EVENT, TokenType.VARIABLE, TokenType.END_EVENT],
        extractor: extractVariableMetadata,
        priority: 1
    }
];

// Detects compound token sequences based on defined patterns
export const detectTokenPatterns = (
    tokens: ParsedToken[],
    docText: string
): CompoundTokenSequence[] => {
    const compounds: CompoundTokenSequence[] = [];
    const usedIndices = new Set<number>();

    // Sort patterns by priority (higher priority first)
    const sortedPatterns = [...TOKEN_PATTERNS].sort((a, b) => b.priority - a.priority);

    // Try to match each pattern
    for (const pattern of sortedPatterns) {
        const sequenceLength = pattern.sequence.length;

        // Sliding window to find matching sequences
        for (let i = 0; i <= tokens.length - sequenceLength; i++) {
            // Skip if any token in this range is already used
            if (Array.from({ length: sequenceLength }, (_, j) => i + j).some(idx => usedIndices.has(idx))) {
                continue;
            }

            // Check if token sequence matches pattern
            const matches = pattern.sequence.every((expectedType, offset) => {
                return tokens[i + offset]?.type === expectedType;
            });

            if (matches) {
                const startIndex = i;
                const endIndex = i + sequenceLength - 1;

                // Extract metadata using pattern's extractor
                const metadata = pattern.extractor(tokens, startIndex, endIndex, docText);

                if (metadata) {
                    compounds.push({
                        startIndex,
                        endIndex,
                        tokenType: pattern.name,
                        displayText: metadata.content,
                        metadata,
                        start: tokens[startIndex].start,
                        end: tokens[endIndex].end
                    });

                    // Mark tokens as used
                    for (let j = startIndex; j <= endIndex; j++) {
                        usedIndices.add(j);
                    }
                }
            }
        }
    }

    return compounds;
};
