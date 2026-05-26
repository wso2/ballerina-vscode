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
import { DownloadIcon } from "../DownloadIcon";

interface DownloadProgressProps {
    message?: string;
    percentage?: number;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
`;

const Message = styled.div`
    font-size: 14px;
    color: var(--vscode-editor-foreground);
    text-align: center;
`;

const ProgressBar = styled.div`
    width: 200px;
    height: 4px;
    background-color: var(--vscode-editorWidget-border);
    border-radius: 2px;
    overflow: hidden;
`;

const ProgressFill = styled.div<{ percentage?: number }>`
    height: 100%;
    width: ${(props: { percentage?: number }) => props.percentage || 0}%;
    background-color: var(--vscode-focusBorder);
    transition: width 0.3s ease;
`;

const PercentageText = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    text-align: center;
`;

export const DownloadProgress = ({ message, percentage }: DownloadProgressProps) => {
    return (
        <Container>
            <DownloadIcon color="var(--vscode-editor-foreground)" />
            {message && <Message>{message}</Message>}
            {percentage !== undefined && (
                <>
                    <ProgressBar>
                        <ProgressFill percentage={percentage} />
                    </ProgressBar>
                    <PercentageText>{Math.round(percentage)}%</PercentageText>
                </>
            )}
        </Container>
    );
};
