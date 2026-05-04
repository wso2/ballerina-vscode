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

import React, { useCallback } from "react";
import styled from "@emotion/styled";
import { Button, Codicon } from "@wso2/ui-toolkit";
import type { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";

const Container = styled.div`
    padding: 12px;
    border-radius: 4px;
    margin: 8px 0;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    border: 1px solid var(--vscode-panel-border);
    background-color: var(--vscode-textCodeBlock-background);
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Title = styled.span`
    font-weight: 500;
    font-size: 13px;
    color: var(--vscode-foreground);
`;


const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
`;

const ErrorMessage = styled.div`
    color: var(--vscode-inputValidation-errorForeground);
    font-weight: 500;
`;

const ErrorCode = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
`;

interface ConfigurationVariable {
    name: string;
    description: string;
    type?: "string" | "int";
}

export interface ConfigurationCollectionData {
    requestId: string;
    stage: "collecting" | "done" | "skipped" | "error";
    variables?: ConfigurationVariable[];
    existingValues?: Record<string, string>;
    message: string;
    isTestConfig?: boolean;
    error?: {
        message: string;
        code: string;
    };
}

interface ConfigurationCollectorSegmentProps {
    data: ConfigurationCollectionData;
    rpcClient: BallerinaRpcClient;
}

export const ConfigurationCollectorSegment: React.FC<ConfigurationCollectorSegmentProps> = ({ data, rpcClient }) => {
    const currentStage = data.stage;

    const handleConfigure = useCallback(() => {
        console.log('[ConfigurationCollectorSegment] Reopening configuration collector via backend:', data.requestId);
        rpcClient.getVisualizerRpcClient().reopenApprovalView({
            requestId: data.requestId
        });
    }, [rpcClient, data.requestId]);

    const handleSkip = useCallback(async () => {
        try {
            console.log('[ConfigurationCollectorSegment] Skipping configuration collection:', data.requestId);
            await rpcClient.getAiPanelRpcClient().cancelConfiguration({
                requestId: data.requestId,
            });
        } catch (error) {
            console.error('[ConfigurationCollectorSegment] Error canceling configuration:', error);
        }
    }, [rpcClient, data.requestId]);

    if (currentStage === "collecting") {
        return (
            <Container>
                <Header>
                    <Codicon name="key" />
                    <Title>{data.message}</Title>
                </Header>
                <ButtonGroup>
                    <Button appearance="secondary" onClick={handleSkip}>
                        Skip
                    </Button>
                    <Button appearance="primary" onClick={handleConfigure}>
                        Configure
                    </Button>
                </ButtonGroup>
            </Container>
        );
    }

    if (currentStage === "error" && data.error) {
        return (
            <Container>
                <Header>
                    <Codicon name="warning" />
                    <Title>Configuration Collection Failed</Title>
                </Header>
                <ErrorContainer>
                    <ErrorMessage>{data.error.message}</ErrorMessage>
                    <ErrorCode>Error Code: {data.error.code}</ErrorCode>
                </ErrorContainer>
            </Container>
        );
    }

    if (currentStage === "done") {
        return (
            <Container>
                <Header>
                    <Codicon name="pass" />
                    <Title>{data.message}</Title>
                </Header>
            </Container>
        );
    }

    if (currentStage === "skipped") {
        return (
            <Container>
                <Header>
                    <Codicon name="error" />
                    <Title>{data.message}</Title>
                </Header>
            </Container>
        );
    }

    return null;
};
