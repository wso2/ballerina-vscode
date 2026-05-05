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
import ReactMarkdown from "react-markdown";
import { ThemeColors } from "@wso2/ui-toolkit";
import { stripHtmlTags } from "./utils";

const MarkdownContainer = styled.div`
    width: 100%;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    border-radius: 4px;

    h1, h2, h3, h4, h5, h6 {
        margin: 16px 0 8px 0;
        font-family: var(--vscode-font-family);
        font-weight: normal;
        font-size: 13px;
        color: var(--vscode-editor-foreground);
    }

    p {
        font-size: 13px;
        margin: 0;
        line-height: 1.5;
        margin-bottom: 8px;
        font-family: var(--vscode-font-family);
    }

    p:last-child {
        margin-bottom: 0;
    }

    pre {
        display: none;
    }

    code {
        display: inline;
    }

    ul, ol {
        margin: 8px 0;
        padding-left: 24px;
        font-size: 13px;
        font-family: var(--vscode-font-family);
    }

    li {
        margin: 4px 0;
        font-size: 13px;
        font-family: var(--vscode-font-family);
    }

    blockquote {
        margin: 8px 0;
        padding-left: 8px;
        border-left: 4px solid ${ThemeColors.PRIMARY};
        font-size: 13px;
        font-family: var(--vscode-font-family);
    }

    table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
        font-size: 13px;
        font-family: var(--vscode-font-family);
    }

    th, td {
        border: 1px solid var(--vscode-editor-inactiveSelectionBackground);
        padding: 8px;
        text-align: left;
        font-size: 13px;
        font-family: var(--vscode-font-family);
    }

    th {
        background-color: var(--vscode-editor-inactiveSelectionBackground);
    }
`;

interface MarkdownDescriptionProps {
    description: string;
    className?: string;
}

export const MarkdownDescription: React.FC<MarkdownDescriptionProps> = ({ description, className }) => {
    if (!description) {
        return null;
    }

    return (
        <MarkdownContainer className={className}>
            <ReactMarkdown>{stripHtmlTags(description)}</ReactMarkdown>
        </MarkdownContainer>
    );
};

export default MarkdownDescription;
