/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 *  This software is the property of WSO2 LLC. and its suppliers, if any.
 *  Dissemination of any information or reproduction of any material contained
 *  herein is strictly forbidden, unless permitted by WSO2 in accordance with
 *  the WSO2 Commercial License available at http://wso2.com/licenses.
 *  For specific language governing the permissions and limitations under
 *  this license, please see the license as well as any agreement you’ve
 *  entered into with WSO2 governing the purchase of this software and any
 *  associated services.
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
                        <Typography variant="subtitle2">Login to BI Copilot</Typography>
                        <Typography variant="caption">
                            Login to access AI-powered code generation, completions, test generation, data mappings, and
                            more.
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
