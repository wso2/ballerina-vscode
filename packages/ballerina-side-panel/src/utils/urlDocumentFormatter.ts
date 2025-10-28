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

/**
 * Document types supported by the AI system
 */
export enum DocumentType {
    IMAGE = 'ai:ImageDocument',
    FILE = 'ai:FileDocument',
    AUDIO = 'ai:AudioDocument',
}

/**
 * File extension mappings for different document types
 */
const FILE_EXTENSIONS = {
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
    FILE: ['.pdf', '.md', '.txt', '.doc', '.docx'],
    AUDIO: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
} as const;

/**
 * Checks if the given text is a URL (with or without query parameters/fragments)
 */
function isUrl(text: string): boolean {
    const trimmed = text.trim();

    // URL regex pattern that supports protocols, query params, and fragments
    const urlPattern = /^https?:\/\/[^\s]+$/i;

    return urlPattern.test(trimmed);
}

/**
 * Extracts the file extension from a URL path
 */
function getFileExtension(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const lastDot = pathname.lastIndexOf('.');

        if (lastDot === -1) {
            return '';
        }

        // Get extension without query params or fragments
        return pathname.substring(lastDot).toLowerCase();
    } catch {
        return '';
    }
}

/**
 * Determines the document type based on the URL's file extension
 */
function getDocumentType(url: string): DocumentType | null {
    const extension = getFileExtension(url);

    if (!extension) {
        return null;
    }

    if ((FILE_EXTENSIONS.IMAGE as readonly string[]).includes(extension)) {
        return DocumentType.IMAGE;
    }

    if ((FILE_EXTENSIONS.FILE as readonly string[]).includes(extension)) {
        return DocumentType.FILE;
    }

    if ((FILE_EXTENSIONS.AUDIO as readonly string[]).includes(extension)) {
        return DocumentType.AUDIO;
    }

    return null;
}

/**
 * Wraps a URL in the appropriate AI document format
 */
function wrapUrlWithDocumentType(url: string, documentType: DocumentType): string {
    return `\${<${documentType}>{content: "${url}"}}`;
}

/**
 * Processes pasted text and wraps URLs with appropriate document types if applicable
 *
 * @param text - The pasted text content
 * @param shouldBypassFormatting - If true, returns text as-is without any formatting
 * @returns The processed text (either wrapped URL or original text)
 */
export function processPastedText(text: string, shouldBypassFormatting: boolean = false): string {
    // Bypass formatting if requested (Cmd+Shift+V)
    if (shouldBypassFormatting) {
        return text;
    }

    // Only process if the entire paste is a single URL
    if (!isUrl(text)) {
        return text;
    }

    const trimmedUrl = text.trim();
    const documentType = getDocumentType(trimmedUrl);

    // If we can't determine the document type, return as-is
    if (!documentType) {
        return text;
    }

    return wrapUrlWithDocumentType(trimmedUrl, documentType);
}
