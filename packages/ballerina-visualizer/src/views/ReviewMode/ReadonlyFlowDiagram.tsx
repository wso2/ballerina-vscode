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
import { NodePosition } from "@wso2/ballerina-core";
import styled from "@emotion/styled";

const Container = styled.div`
    width: 100%;
    height: 100%;
`;

const PlaceholderContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 16px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family);
`;

const PlaceholderTitle = styled.div`
    font-size: 16px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const PlaceholderText = styled.div`
    font-size: 13px;
    max-width: 400px;
    text-align: center;
    line-height: 1.5;
`;

const CodeBlock = styled.div`
    background: var(--vscode-textCodeBlock-background);
    padding: 8px 12px;
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-textPreformat-foreground);
`;

interface ReadonlyFlowDiagramProps {
    projectPath: string;
    filePath: string;
    position: NodePosition;
}

export function ReadonlyFlowDiagram(props: ReadonlyFlowDiagramProps): JSX.Element {
    const { filePath, position } = props;
    const fileName = filePath.split('/').pop() || filePath;

    return (
        <Container>
            <PlaceholderContainer>
                <span className="codicon codicon-symbol-method" style={{ fontSize: '48px', opacity: 0.5 }}></span>
                <PlaceholderTitle>Flow Diagram View</PlaceholderTitle>
                <CodeBlock>
                    {fileName}
                </CodeBlock>
                <PlaceholderText>
                    Lines {position.startLine + 1} - {position.endLine + 1}
                </PlaceholderText>
                <PlaceholderText style={{ fontSize: '12px', opacity: 0.7, marginTop: '16px' }}>
                    Flow diagram visualization in review mode will be available in a future update.
                    <br />
                    For now, you can review changes using the component diagram.
                </PlaceholderText>
            </PlaceholderContainer>
        </Container>
    );
}
