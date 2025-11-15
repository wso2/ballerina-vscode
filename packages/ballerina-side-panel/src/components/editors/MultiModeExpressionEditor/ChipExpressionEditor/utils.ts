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
import { INPUT_MODE_MAP, InputMode, TokenType } from "./types";

const TOKEN_LINE_OFFSET_INDEX = 0;
const TOKEN_START_CHAR_OFFSET_INDEX = 1;
const TOKEN_LENGTH_INDEX = 2;
const TOKEN_TYPE_INDEX = 3;
const TOKEN_MODIFIERS_INDEX = 4;

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

//new

export type ParsedToken = {
    id:number;
    start: number;
    end: number;
    type: TokenType;
}

export const getParsedExpressionTokens = (tokens: number[], value: string) => {
    const chunks = getTokenChunks(tokens);
    let currentLine = 0;
    let currentChar = 0;
    const tokenObjects: ParsedToken[] = [];
    
    let tokenId = 0;
    for (let chunk of chunks) {
        const deltaLine = chunk[TOKEN_LINE_OFFSET_INDEX];
        const deltaStartChar = chunk[TOKEN_START_CHAR_OFFSET_INDEX];
        const length = chunk[TOKEN_LENGTH_INDEX];
        const type = chunk[3];

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
        (completion.kind === 'function' || completion.kind === 'variable' || completion.kind === 'field') &&
        completion.label.toLowerCase().startsWith(prefix.toLowerCase())
    );
};
