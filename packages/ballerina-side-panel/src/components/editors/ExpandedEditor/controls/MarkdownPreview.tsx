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
import { ThemeColors } from "@wso2/ui-toolkit";
import ReactMarkdown from "react-markdown";

const PreviewContainer = styled.div`
    width: 100%;
    height: 100%;
    padding: 12px;
    fontSize: 14px;
    font-family: var(--vscode-editor-font-family);
    background: var(--input-background);
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-top: none;
    border-radius: 0 0 4px 4px;
    overflow-y: auto;
    overflow-x: auto;
    box-sizing: border-box;

    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;

    p, li, td, th, blockquote {
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    pre {
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    
    code {
        white-space: pre-wrap;
        word-wrap: break-word;
    }
`;

interface MarkdownPreviewProps {
    /** Markdown content to render */
    content: string;
}

/**
 * Markdown preview component that renders markdown content
 */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
    return (
        <PreviewContainer>
            <ReactMarkdown
                components={{
                    // Prevent rendering of potentially dangerous elements
                    script: () => null,
                    iframe: () => null,
                }}
                disallowedElements={['script', 'iframe', 'object', 'embed']}
                unwrapDisallowed={true}
            >
                {content}
            </ReactMarkdown>
        </PreviewContainer>
    );
};
