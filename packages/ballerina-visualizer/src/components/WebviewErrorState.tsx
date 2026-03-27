/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

interface WebviewErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

const ErrorContainer = styled.div`
    background-color: var(--vscode-editor-background);
    color: var(--vscode-foreground);
    height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: var(--vscode-font-family);
`;

const ErrorCard = styled.div`
    max-width: 480px;
    text-align: center;
`;

const ErrorTitle = styled.h2`
    margin: 0 0 12px;
    font-size: 20px;
    font-weight: 500;
`;

const ErrorMessage = styled.p`
    margin: 0 0 16px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
`;

const RetryButton = styled.button`
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;

    &:hover {
        background: var(--vscode-button-hoverBackground);
    }
`;

export function WebviewErrorState({
    title = "Unable to load this view",
    message,
    onRetry,
}: WebviewErrorStateProps) {
    return (
        <ErrorContainer>
            <ErrorCard>
                <ErrorTitle>{title}</ErrorTitle>
                <ErrorMessage>{message}</ErrorMessage>
                {onRetry && <RetryButton onClick={onRetry}>Retry</RetryButton>}
            </ErrorCard>
        </ErrorContainer>
    );
}
