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

import React, { useState } from "react";

import { Codicon } from "@wso2/ui-toolkit";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { HistoryEntry } from "@wso2/ballerina-core";
import styled from "@emotion/styled";

interface NavButtonGroupProps {
    historyStack?: HistoryEntry[];
    showHome?: boolean;
}

const NavBar = styled.div`
    padding: 6px 8px;
`;
const LeftSection = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
`;
const RightSection = styled.div``;
interface NavButtonProps {
    inactive: boolean;
}
const NavButton = styled(VSCodeButton) <NavButtonProps>`
    padding-right: 2px;
    color: ${(props: NavButtonProps) =>
        props.inactive ? "var(--vscode-activityBar-inactiveForeground)" : "var(--vscode-editor-foreground)"};
`;

export function NavButtonGroup(props: NavButtonGroupProps) {
    const { historyStack, showHome } = props;
    const { rpcClient } = useRpcContext();
    const isHistoryAvailable = historyStack && historyStack.length > 0;

    const handleBackButtonClick = () => {
        rpcClient.getVisualizerRpcClient().goBack();
    };

    const handleHomeButtonClick = () => {
        rpcClient.getVisualizerRpcClient().goHome();
    };

    return (
        <>
            <NavBar>
                <LeftSection>
                    <NavButton
                        appearance="icon"
                        title="Go Back"
                        onClick={isHistoryAvailable ? handleBackButtonClick : undefined}
                        inactive={!isHistoryAvailable}
                    >
                        <Codicon name="arrow-left" />
                    </NavButton>
                    {showHome && <NavButton
                        appearance="icon"
                        title="Home"
                        onClick={isHistoryAvailable ? handleHomeButtonClick : undefined}
                        inactive={!isHistoryAvailable}
                    >
                        <Codicon name="home" />
                    </NavButton>
                    }
                </LeftSection>
            </NavBar>
        </>
    );
}
