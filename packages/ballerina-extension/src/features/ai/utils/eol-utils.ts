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
 * Utilities for handling line endings (EOL) across platforms.
 *
 * Problem: On Windows, files use CRLF (\r\n) line endings. LLMs produce
 * LF (\n) only. This causes string matching to fail when the agent tries
 * to edit files — the file has \r\n but the LLM sends \n.
 *
 * Solution: Normalize to LF at the read boundary, work with LF internally,
 * and restore the original EOL style at the write boundary.
 */

export type EolSequence = '\n' | '\r\n';

/**
 * Detects the dominant line ending in a string.
 * Returns '\r\n' if any CRLF sequence is found, otherwise '\n'.
 */
export function detectEol(content: string): EolSequence {
    return content.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Normalizes all line endings to LF (\n).
 * Handles CRLF (\r\n) and bare CR (\r).
 */
export function normalizeToLf(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Restores line endings to the target EOL sequence.
 * Only performs conversion when target is CRLF — LF content is unchanged.
 */
export function restoreEol(content: string, eol: EolSequence): string {
    if (eol === '\n') {
        return content;
    }
    return content.replace(/\n/g, '\r\n');
}

/**
 * Reads file content and returns it normalized to LF, along with the
 * detected original EOL. Use with {@link restoreEol} when writing back.
 *
 * @returns [normalizedContent, originalEol]
 */
export function readAndNormalize(rawContent: string): [string, EolSequence] {
    const eol = detectEol(rawContent);
    return [normalizeToLf(rawContent), eol];
}
