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
import styled from "@emotion/styled";
import { DocumentType, TokenType } from "../../MultiModeExpressionEditor/ChipExpressionEditor/types";
import {
    BASE_CHIP_STYLES,
    DOCUMENT_CHIP_STYLES,
    STANDARD_CHIP_STYLES,
    DOCUMENT_ICON_STYLES,
    CHIP_TEXT_STYLES,
    getDocumentIconClass,
    getTokenTypeColor,
    getChipDisplayContent
} from "../../MultiModeExpressionEditor/ChipExpressionEditor/chipStyles";

/**
 * Base chip styling matching CodeMirror chip appearance
 */
const BaseChip = styled.span`
    border-radius: ${BASE_CHIP_STYLES.borderRadius};
    display: ${BASE_CHIP_STYLES.display};
    align-items: ${BASE_CHIP_STYLES.alignItems};
    font-size: ${BASE_CHIP_STYLES.fontSize};
    min-height: ${BASE_CHIP_STYLES.minHeight};
    outline: ${BASE_CHIP_STYLES.outline};
    vertical-align: ${BASE_CHIP_STYLES.verticalAlign};
    user-select: ${BASE_CHIP_STYLES.userSelect};
    margin: ${BASE_CHIP_STYLES.margin};
`;

/**
 * Document chip with icon - matches CodeUtils.ts createDocumentChip
 */
const DocumentChip = styled(BaseChip)`
    background: ${DOCUMENT_CHIP_STYLES.background};
    border: ${DOCUMENT_CHIP_STYLES.border};
    padding: ${DOCUMENT_CHIP_STYLES.padding};
    gap: ${DOCUMENT_CHIP_STYLES.gap};
    max-width: ${DOCUMENT_CHIP_STYLES.maxWidth};
`;

/**
 * Standard chip for variables/properties/parameters
 */
const StandardChip = styled(BaseChip) <{ chipType: TokenType }>`
    background: ${props => getTokenTypeColor(props.chipType).background};
    border: 1px solid ${props => getTokenTypeColor(props.chipType).border};
    padding: ${STANDARD_CHIP_STYLES.padding};
    min-width: ${STANDARD_CHIP_STYLES.minWidth};
    transition: ${STANDARD_CHIP_STYLES.transition};
`;

/**
 * Icon container for document chips
 */
const DocumentIcon = styled.i`
    display: ${DOCUMENT_ICON_STYLES.display};
    color: ${DOCUMENT_ICON_STYLES.color};
    font-size: ${DOCUMENT_ICON_STYLES.fontSize};
`;

/**
 * Text container with ellipsis for long content
 */
const ChipText = styled.span`
    overflow: ${CHIP_TEXT_STYLES.overflow};
    text-overflow: ${CHIP_TEXT_STYLES.textOverflow};
    white-space: ${CHIP_TEXT_STYLES.whiteSpace};
`;

/**
 * Props for ChipComponent
 */
export interface ChipComponentProps {
    type: 'variable' | 'document' | 'property' | 'parameter';
    content: string;
    documentType?: DocumentType;
}

/**
 * Map string type to TokenType enum
 */
const mapToTokenType = (type: string): TokenType => {
    switch (type) {
        case 'variable':
            return TokenType.VARIABLE;
        case 'property':
            return TokenType.PROPERTY;
        case 'parameter':
            return TokenType.PARAMETER;
        case 'document':
            return TokenType.DOCUMENT;
        default:
            return TokenType.VARIABLE;
    }
};

/**
 * ChipComponent - Reusable chip component for markdown preview
 * Matches the styling from CodeUtils.ts createChip function
 */
export const ChipComponent: React.FC<ChipComponentProps> = ({ type, content, documentType }) => {
    if (type === 'document' && documentType) {
        return (
            <DocumentChip>
                <DocumentIcon className={getDocumentIconClass(documentType)} />
                <ChipText>{content}</ChipText>
            </DocumentChip>
        );
    }

    const tokenType = mapToTokenType(type);
    const displayContent = getChipDisplayContent(tokenType, content);

    return (
        <StandardChip chipType={tokenType}>
            {displayContent}
        </StandardChip>
    );
};
