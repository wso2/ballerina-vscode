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
import React, { createRef, useEffect } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, Typography } from "@wso2/ui-toolkit";

import { AIChatView } from "../styles";
import { AIMachineEventType } from "@wso2/ballerina-core";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
    gap: 28px;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px;
`;

const VerticalLine = styled.div`
    width: 100%;
    height: 1px;
    background-color: var(--vscode-editorWidget-border);
`;

const RowGroup = styled.div`
    display: flex;
    width: 100%;
    align-items: flex-start;
`;

const Row = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    gap: 4px;
`;

export const SettingsPanel = (props: { onClose: () => void }) => {
    const { rpcClient } = useRpcContext();

    const [copilotAuthorized, setCopilotAuthorized] = React.useState(false);

    const messagesEndRef = createRef<HTMLDivElement>();

    useEffect(() => {
        isCopilotAuthorized().then((authorized) => {
            setCopilotAuthorized(authorized);
        });
    }, []);

    const handleCopilotLogout = () => {
        rpcClient.sendAIStateEvent(AIMachineEventType.LOGOUT);
    };

    const handleAuthorizeCopilot = async () => {
        const resp = await rpcClient.getAiPanelRpcClient().promptGithubAuthorize();
        if (resp) {
            setCopilotAuthorized(true);
        } else {
            setCopilotAuthorized(false);
        }
    };

    const isCopilotAuthorized = async () => {
        return await rpcClient.getAiPanelRpcClient().isCopilotSignedIn();
    };

    return (
        <AIChatView>
            <Header>
                <Button appearance="icon" onClick={() => props.onClose()} tooltip="Chat">
                    <Codicon name="arrow-left" />
                </Button>

                <Typography variant="subtitle2">Manage Accounts</Typography>
            </Header>
            <VerticalLine />
            <Container>
                <Typography variant="subtitle1">Connect to AI Platforms for Enhanced Features</Typography>
                <RowGroup>
                    <Row>
                        <Typography variant="subtitle2">Logout from BI Copilot</Typography>
                        <Typography variant="caption">
                            Logging out will end your session and disconnect access to AI-powered tools like code
                            generation, completions, test generation, and data mappings.
                        </Typography>
                    </Row>
                    <Button onClick={() => handleCopilotLogout()}>Logout</Button>
                </RowGroup>
                <RowGroup>
                    <Row>
                        <Typography variant="subtitle2">Enable GitHub Copilot Integration</Typography>
                        <Typography variant="caption">
                            Authorize Github Copilot and get Visual Completions via Github.
                        </Typography>
                    </Row>
                    <Button onClick={() => handleAuthorizeCopilot()} disabled={copilotAuthorized}>
                        {copilotAuthorized ? "Authorized" : "Authorize"}
                    </Button>
                </RowGroup>
                <div ref={messagesEndRef} />
            </Container>
        </AIChatView>
    );
};
