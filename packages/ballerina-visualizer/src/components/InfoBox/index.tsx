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

interface InfoBoxProps {
    text: string;
    description?: string;
    codeCommand?: string;
}

const Container = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
`;

const InfoBoxContainer = styled.div`
    font-size: 13px;
    color: var(--vscode-foreground);
    padding: 12px;
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    border-radius: 4px;

    strong {
        font-weight: 600;
    }

    .description {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
    }

    .command-wrapper {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
    }
`;

const CodeBlock = styled.code`
    font-size: 11px;
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family);
    background-color: var(--vscode-textCodeBlock-background);
    padding: 2px 4px;
    border-radius: 3px;
    border: 1px solid var(--vscode-widget-border);
    margin-top: 6px;
    display: inline-block;
`;

export function InfoBox({ text, description, codeCommand }: InfoBoxProps): JSX.Element {
    return (
        <Container>
            <InfoBoxContainer>
                <div className="command-wrapper">
                    <span>{text}</span>
                </div>
                {description && codeCommand && (
                    <div className="description">
                        {description} <br />
                        <CodeBlock>
                            {codeCommand}
                        </CodeBlock>
                    </div>
                )}
            </InfoBoxContainer>
        </Container>
    );
}
