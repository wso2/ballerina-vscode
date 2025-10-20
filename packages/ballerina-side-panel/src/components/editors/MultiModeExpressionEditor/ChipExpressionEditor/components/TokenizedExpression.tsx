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

import React from "react";
import { ReactNode } from "react";
import { ChipComponent } from "./ChipComponent";
import { getAbsoluteColumnOffset, getTokenChunks } from "../utils";

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
    value: string;
    tokens: number[];
    onChipClick?: (element: HTMLElement, value: string, type: string, absoluteOffset?: number) => void;
    onChipBlur?: () => void;
}

export const TokenizedExpression = (props: TokenizedExpressionProps) => {
    const { value, tokens, onChipClick, onChipBlur } = props;
    const htmlRichText = createHtmlRichText(value, tokens, onChipClick, onChipBlur);

    return (
        <React.Fragment>{htmlRichText}</React.Fragment>
    )
}
