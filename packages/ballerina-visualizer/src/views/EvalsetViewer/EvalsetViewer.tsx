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
import { EvalSet } from "@wso2/ballerina-core";
import { EvalThreadViewer } from "./EvalThreadViewer";

const Container = styled.div`
    padding: 20px;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
    height: 100%;
    overflow-y: auto;
`;

const Header = styled.div`
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const Title = styled.h1`
    font-size: 1.5em;
    font-weight: 600;
    margin: 0 0 10px 0;
    color: var(--vscode-foreground);
`;

const Subtitle = styled.p`
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin: 0;
`;

const ContentSection = styled.div`
    background-color: var(--vscode-textCodeBlock-background);
    padding: 15px;
    border-radius: 4px;
    border: 1px solid var(--vscode-panel-border);
`;

const Preformatted = styled.pre`
    margin: 0;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--vscode-editor-foreground);
`;

const ErrorMessage = styled.div`
    padding: 15px;
    background-color: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    color: var(--vscode-errorForeground);
`;

interface EvalsetViewerProps {
    projectPath: string;
    filePath: string;
    content: EvalSet;
    threadId?: string;
}

export const EvalsetViewer: React.FC<EvalsetViewerProps> = ({ projectPath, filePath, content, threadId }) => {
    if (threadId) {
        const evalThread = content.threads.find(c => c.id === threadId);

        if (!evalThread) {
            return (
                <Container>
                    <Header>
                        <Title>{filePath}</Title>
                        <Subtitle>Case not found</Subtitle>
                    </Header>
                    <ErrorMessage>
                        Case with ID "{threadId}" not found in this evalset.
                    </ErrorMessage>
                </Container>
            );
        }

        return <EvalThreadViewer projectPath={projectPath} filePath={filePath} evalSet={content} evalThread={evalThread} />;
    }
    return (
        <Container>
            <Header>
                <Title>{filePath}</Title>
                <Subtitle>{content.threads.length} case(s)</Subtitle>
            </Header>
            <ContentSection>
                <Preformatted>{JSON.stringify(content, null, 2)}</Preformatted>
            </ContentSection>
        </Container>
    );
};
