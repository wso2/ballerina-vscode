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

import { TokenType, DocumentType } from "./types";
import styled from "@emotion/styled";

/**
 * Base chip styles shared across all chip types
 */
export const BASE_CHIP_STYLES = {
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    minHeight: "20px",
    outline: "none",
    verticalAlign: "middle",
    userSelect: "none",
    margin: "2px 0px",
    padding: "2px 8px",
} as const;

/**
 * Document chip specific styles
 */
export const DOCUMENT_CHIP_STYLES = {
    ...BASE_CHIP_STYLES,
    background: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.4)",
    gap: "4px",
    maxWidth: "200px"
} as const;

/**
 * Standard chip base styles (for variables, properties, parameters)
 */
export const STANDARD_CHIP_STYLES = {
    ...BASE_CHIP_STYLES,
    minWidth: "25px",
    transition: "all 0.2s ease",
    display: "inline-block"
} as const;

/**
 * Document icon styles
 */
export const DOCUMENT_ICON_STYLES = {
    display: "flex",
    color: "rgba(59, 130, 246, 0.9)",
    fontSize: "14px"
} as const;

/**
 * Chip text styles (with ellipsis for overflow)
 */
export const CHIP_TEXT_STYLES = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
} as const;

/**
 * Color configuration for different token types
 */
export const TOKEN_TYPE_COLORS: Partial<Record<TokenType, { background: string; border: string }>> = {
    [TokenType.VARIABLE]: {
        background: "rgba(59, 130, 246, 0.15)",
        border: "rgba(0, 122, 204, 0.4)"
    },
    [TokenType.PROPERTY]: {
        background: "rgba(59, 130, 246, 0.15)",
        border: "rgba(59, 130, 246, 0.4)"
    },
    [TokenType.PARAMETER]: {
        background: "rgba(0, 204, 109, 0.15)",
        border: "rgba(0, 204, 109, 0.4)"
    }
};

/**
 * Default chip colors
 */
export const DEFAULT_CHIP_COLOR = {
    background: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.4)"
};

/**
 * Icon class mapping for document types
 */
export const DOCUMENT_ICON_CLASS_MAP: Record<DocumentType, string> = {
    'ImageDocument': 'fw-bi-image',
    'FileDocument': 'fw-bi-doc',
    'AudioDocument': 'fw-bi-audio'
};

/**
 * Get icon class for a document type
 */
export const getDocumentIconClass = (documentType: DocumentType): string => {
    return DOCUMENT_ICON_CLASS_MAP[documentType] || '';
};

/**
 * Get color configuration for a token type
 */
export const getTokenTypeColor = (tokenType: TokenType): { background: string; border: string } => {
    return TOKEN_TYPE_COLORS[tokenType] || DEFAULT_CHIP_COLOR;
};

/**
 * Check if content should be rendered as empty space (for parameter placeholders)
 */
export const shouldRenderAsEmptySpace = (tokenType: TokenType, content: string): boolean => {
    return tokenType === TokenType.PARAMETER && /^\$\d+$/.test(content);
};

/**
 * Get display content for a chip
 */
export const getChipDisplayContent = (tokenType: TokenType, content: string): string => {
    return shouldRenderAsEmptySpace(tokenType, content) ? '  ' : content;
};

/**
 * Base chip styling matching CodeMirror chip appearance
 */
export const BaseChip = styled('span')(BASE_CHIP_STYLES);

/**
 * Document chip with icon - matches CodeUtils.ts createDocumentChip
 */
export const DocumentChip = styled(BaseChip)(DOCUMENT_CHIP_STYLES);

/**
 * Standard chip for variables/properties/parameters
 */
export const StandardChip = styled(BaseChip)<{ chipType: TokenType }>((props) => ({
    background: getTokenTypeColor(props.chipType).background,
    border: `1px solid ${getTokenTypeColor(props.chipType).border}`,
    padding: STANDARD_CHIP_STYLES.padding,
    minWidth: STANDARD_CHIP_STYLES.minWidth,
    transition: STANDARD_CHIP_STYLES.transition,
    display: STANDARD_CHIP_STYLES.display,
}));

/**
 * Icon container for document chips
 */
export const DocumentIcon = styled.i(DOCUMENT_ICON_STYLES);

/**
 * Text container with ellipsis for long content
 */
export const ChipText = styled.span(CHIP_TEXT_STYLES);
