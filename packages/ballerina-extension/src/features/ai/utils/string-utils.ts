// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * String utilities for handling Unicode characters that may cause issues
 * when LLMs attempt to reproduce text content.
 *
 * Problem: LLMs often cannot correctly reproduce invisible or special Unicode
 * characters (e.g., non-breaking spaces). This causes string matching to fail
 * when the LLM sends a regular space but the file contains U+00A0.
 *
 * Solution: Normalize these characters to their standard ASCII equivalents
 * before performing string operations.
 */

/**
 * Character normalization rules.
 * Each entry maps problematic Unicode characters to their standard replacement.
 */
const CHAR_NORMALIZATION_RULES: ReadonlyArray<{
    readonly pattern: RegExp;
    readonly replacement: string;
    readonly description: string;
}> = [
    {
        // Various Unicode space characters → regular space (U+0020)
        pattern: /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g,
        replacement: ' ',
        description: 'Unicode spaces (NBSP, en/em space, ideographic space, etc.)'
    },
    {
        // Zero-width characters → removed
        pattern: /[\u200B-\u200D\uFEFF]/g,
        replacement: '',
        description: 'Zero-width characters (ZWSP, ZWNJ, ZWJ, BOM)'
    },
    {
        // Soft hyphen → removed
        pattern: /\u00AD/g,
        replacement: '',
        description: 'Soft hyphen'
    }
];

/**
 * Normalizes text by replacing problematic invisible/special Unicode characters
 * with their standard ASCII equivalents.
 *
 * This ensures consistent string matching when LLMs may not correctly reproduce
 * special characters in their output.
 *
 * Characters normalized:
 * - Unicode spaces (U+00A0, U+2000-U+200A, U+202F, U+205F, U+3000) → regular space
 * - Zero-width characters (U+200B-U+200D, U+FEFF) → removed
 * - Soft hyphen (U+00AD) → removed
 * - Line/paragraph separators (U+2028, U+2029) → newline
 *
 * @param text - The text to normalize
 * @returns The normalized text with problematic characters replaced
 */
export function normalizeInvisibleChars(text: string): string {
    let result = text;
    for (const rule of CHAR_NORMALIZATION_RULES) {
        result = result.replace(rule.pattern, rule.replacement);
    }
    return result;
}
