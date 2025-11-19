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

import { DocumentType, TokenType } from "../../MultiModeExpressionEditor/ChipExpressionEditor/types";
import {
    getDocumentIconClass,
    getChipDisplayContent,
    DocumentChip,
    StandardChip,
    DocumentIcon,
    ChipText
} from "../../MultiModeExpressionEditor/ChipExpressionEditor/chipStyles";

/**
 * Props for ChipComponent
 */
export interface ChipComponentProps {
    type: TokenType;
    content: string;
    documentType?: DocumentType;
}

/**
 * ChipComponent - Reusable chip component for markdown preview
 * Matches the styling from CodeUtils.ts createChip function
 */
export const ChipComponent: React.FC<ChipComponentProps> = ({ type, content, documentType }) => {
    if (type === TokenType.DOCUMENT && documentType) {
        return (
            <DocumentChip>
                <DocumentIcon className={getDocumentIconClass(documentType)} />
                <ChipText>{content}</ChipText>
            </DocumentChip>
        );
    }

    const displayContent = getChipDisplayContent(type, content);

    return (
        <StandardChip chipType={type}>
            {displayContent}
        </StandardChip>
    );
};
