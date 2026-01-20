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
import { CodeContext } from "@wso2/ballerina-core";
import { Codicon } from "@wso2/ui-toolkit";
import React from "react";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 8px 0;
`;

const Card = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    border: 1px solid var(--vscode-inputBorder);
    background-color: var(--vscode-input-background);
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
`;

const IconWrapper = styled.div`
    margin-right: 8px;
    display: flex;
    align-items: center;
    color: var(--vscode-symbolIcon-fileForeground);
`;

const InfoWrapper = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const FilePath = styled.span`
    font-size: 12px;
    color: var(--vscode-inputForeground);
    font-weight: 500;
`;

const Location = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-icon-foreground);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    margin-left: 8px;

    &:hover {
        color: var(--vscode-inputForeground);
    }
`;

interface CodeContextCardProps {
    codeContext: CodeContext;
    onRemove: () => void;
}

const CodeContextCard: React.FC<CodeContextCardProps> = ({ codeContext, onRemove }) => {
    const getFileName = (filePath: string) => {
        const parts = filePath.split('/');
        return parts[parts.length - 1];
    };

    const getLocationText = () => {
        if (codeContext.type === 'addition') {
            return `Line ${codeContext.position.line + 1}, Column ${codeContext.position.offset}`;
        } else {
            return `Lines ${codeContext.startPosition.line + 1}-${codeContext.endPosition.line + 1}`;
        }
    };

    return (
        <Container>
            <Card>
                <IconWrapper>
                    <Codicon name="file-code" />
                </IconWrapper>
                <InfoWrapper>
                    <FilePath>{getFileName(codeContext.filePath)}</FilePath>
                    <Location>{getLocationText()}</Location>
                </InfoWrapper>
                <CloseButton onClick={onRemove} title="Remove code context">
                    <Codicon name="close" />
                </CloseButton>
            </Card>
        </Container>
    );
};

export default CodeContextCard;
