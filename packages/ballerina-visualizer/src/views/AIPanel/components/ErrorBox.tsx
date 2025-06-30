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

import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";
import React from "react";

const Container = styled.div`
    position: relative;
    display: inline-flex;
    align-items: flex-start;
    margin-top: 1em;
    gap: 12px;
    padding: 8px;
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    color: var(--vscode-inputValidation-errorForeground);
    max-width: 100%;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background-color: var(--vscode-inputValidation-errorBorder);
        opacity: 0.15;
        z-index: 0;
    }

    > * {
        position: relative;
        z-index: 1;
    }
`;

const ErrorText = styled.span`
    word-break: break-word;
`;

interface ErrorBoxProps {
    children: React.ReactNode;
}

const ErrorBox: React.FC<ErrorBoxProps> = ({ children }) => {
    return (
        <Container>
            <Codicon name="error" />
            <ErrorText>{children}</ErrorText>
        </Container>
    );
};

export default ErrorBox;
