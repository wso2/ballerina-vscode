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

import { iterateTokenStream } from "../../MultiModeExpressionEditor/ChipExpressionEditor/CodeUtils";
import { TokenType } from "../../MultiModeExpressionEditor/ChipExpressionEditor/types";
import { getParsedExpressionTokens, detectTokenPatterns } from "../../MultiModeExpressionEditor/ChipExpressionEditor/utils";

// Escapes HTML special characters to prevent XSS
const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Represents a token that should be rendered as a chip
type RenderableToken = {
    start: number;
    end: number;
    chipTag: string;
};

// Creates a chip tag for any token type
const createChipTag = (type: string, content: string, documentType?: string): string => {
    const escapedContent = escapeHtml(content);
    const docTypeAttr = documentType ? ` data-doc-type="${escapeHtml(documentType)}"` : '';
    return `<chip type="${type}"${docTypeAttr} data-content="${escapedContent}">${escapedContent}</chip>`;
};

// Transforms an expression with tokens to markdown with chip tags
export const transformExpressionToMarkdown = (
    expression: string,
    tokenStream: number[]
): string => {
    if (!expression || !tokenStream || tokenStream.length === 0) {
        return expression || '';
    }

    try {
        const parsedTokens = getParsedExpressionTokens(tokenStream, expression);
        const compounds = detectTokenPatterns(parsedTokens, expression);
        const renderableTokens: RenderableToken[] = [];

        // Use the shared iterator from CodeUtils
        iterateTokenStream(parsedTokens, compounds, expression, {
            onCompound: (compound) => {
                let chipTag: string | undefined;
                if (compound.tokenType === TokenType.DOCUMENT && compound.metadata.documentType) {
                    chipTag = createChipTag(TokenType.DOCUMENT, compound.metadata.content, compound.metadata.documentType);
                } else if (compound.tokenType === TokenType.VARIABLE) {
                    chipTag = createChipTag(TokenType.VARIABLE, compound.metadata.content);
                }

                if (chipTag) {
                    renderableTokens.push({
                        start: compound.start,
                        end: compound.end,
                        chipTag
                    });
                }
            },
            onToken: (token, content) => {
                const chipTag = createChipTag(token.type, content);
                if (chipTag) {
                    renderableTokens.push({
                        start: token.start,
                        end: token.end,
                        chipTag
                    });
                }
            }
        });

        // If no tokens to render, return original expression
        if (renderableTokens.length === 0) {
            return expression;
        }

        let transformed = expression;
        for (const token of renderableTokens) {
            transformed =
                transformed.slice(0, token.start) +
                token.chipTag +
                transformed.slice(token.end);
        }
        return transformed;

    } catch (error) {
        console.error('Error transforming expression to markdown:', error);
        return expression;
    }
};

export const hasTokens = (expression: string): boolean => {
    return /\$\{[^}]+\}/.test(expression);
};
