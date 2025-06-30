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

import React, { useEffect, useState } from "react";
import { PersistERModel, VisualizerLocation } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { PersistDiagram } from "@wso2/persist-layer-diagram";
import { Button, Icon, View, ViewContent } from "@wso2/ui-toolkit";
import { TopNavigationBar } from "../../components/TopNavigationBar";
import { TitleBar } from "../../components/TitleBar";
import styled from "@emotion/styled";

const ActionButton = styled(Button)`
    display: flex;
    align-items: center;
    gap: 4px;
`;

export function ERDiagram() {
    const { rpcClient } = useRpcContext();
    const persistDiagramRPCClient = rpcClient.getPersistDiagramRpcClient();
    const [visualizerLocation, setVisualizerLocation] = React.useState<VisualizerLocation>();
    const [collapsedMode, setIsCollapsedMode] = useState<boolean>(false);

    useEffect(() => {
        if (rpcClient) {
            rpcClient.getVisualizerLocation().then((value) => {
                setVisualizerLocation(value);
            });
        }
    }, [rpcClient]);

    const getPersistModel = async () => {
        if (!rpcClient) {
            return;
        }
        const response: PersistERModel = await persistDiagramRPCClient.getPersistERModel();
        return response;
    };

    const showProblemPanel = async () => {
        if (!rpcClient) {
            return;
        }
        await persistDiagramRPCClient.showProblemPanel();
    };
    
    return (
        <View>
            <TopNavigationBar />
            <TitleBar
                title="Entity Relationship Diagram"
                actions={
                    <>
                        <ActionButton
                            onClick={() => setIsCollapsedMode(!collapsedMode)}
                            appearance="secondary" 
                        >
                            {collapsedMode ? (
                                <Icon name="unfold-more" sx={{ marginRight: "5px", width: 16, height: 16, fontSize: 14 }} />
                            ) : (
                                <Icon name="unfold-less" sx={{ marginRight: "5px", width: 16, height: 16, fontSize: 14 }} />
                            )}
                            {collapsedMode ? "Expand" : "Collapse"}
                        </ActionButton>
                    </>
                }
            />
            <ViewContent>
                <PersistDiagram
                    getPersistModel={getPersistModel}
                    selectedRecordName={visualizerLocation?.identifier}
                    showProblemPanel={showProblemPanel}
                    collapsedMode={collapsedMode}
                />
            </ViewContent>
        </View>
    );
}
