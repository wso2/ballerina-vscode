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

import { INPUT_MODE_MAP, InputMode } from "./types";

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
