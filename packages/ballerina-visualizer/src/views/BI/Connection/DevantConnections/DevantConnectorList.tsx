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

import React, { FC, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, ProgressRing, Typography } from "@wso2/ui-toolkit";
import ButtonCard from "../../../../components/ButtonCard";
import { BodyTinyInfo } from "../../../styles";
import { useQuery } from "@tanstack/react-query";
import {
    ICreateComponentCmdParams,
    MarketplaceItem,
    CommandIds as PlatformExtCommandIds,
    ICmdParamsBase as PlatformExtICmdParamsBase,
} from "@wso2/wso2-platform-core";
import { VSCodePanelTab, VSCodePanelView, VSCodePanels } from "@vscode/webview-ui-toolkit/react";
import { PlatformExtHooks } from "../../../../PlatformExtHooks";
import { usePlatformExtContext } from "../../../../utils/PlatformExtContext";

const GridContainer = styled.div<{ isHalfView?: boolean }>`
    display: grid;
    grid-template-columns: ${(props: { isHalfView: boolean }) =>
        props.isHalfView ? "unset" : "repeat(auto-fill, minmax(200px, 1fr))"};
    gap: 12px;
    width: 100%;
`;

export const DevantConnectorList: FC<{
    search: string;
    hideTitle?: boolean;
    onSelectDevantConnector: (item: MarketplaceItem) => void;
}> = ({ search, hideTitle, onSelectDevantConnector }) => {
    const { rpcClient } = useRpcContext();
    const { platformExtState, projectPath } = usePlatformExtContext();
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 2000);
        return () => clearTimeout(handler);
    }, [search]);

    const { data: marketplaceResp, isLoading } = useQuery({
        queryKey: [
            "devant-marketplace",
            {
                org: platformExtState?.selectedContext?.org?.uuid,
                project: platformExtState?.selectedContext?.project?.id,
                debouncedSearch,
                isLoggedIn: platformExtState.isLoggedIn,
                component: platformExtState?.selectedComponent?.metadata?.id,
            },
        ],
        queryFn: () =>
            rpcClient.getPlatformRpcClient().getMarketplaceItems({
                orgId: platformExtState?.selectedContext?.org?.id.toString(),
                request: {
                    limit: 60,
                    offset: 0,
                    networkVisibilityFilter: "all",
                    networkVisibilityprojectId: platformExtState?.selectedContext?.project?.id,
                    sortBy: "createdTime",
                    query: debouncedSearch || undefined,
                    searchContent: false,
                    isThirdParty: false,
                },
            }),
        enabled: platformExtState.isLoggedIn && !!platformExtState?.selectedContext?.project,
        select: (data) => ({
            ...data,
            data: data.data.filter((item) => item.component?.componentId !== platformExtState?.selectedComponent?.metadata?.id),
        }),
    });

    if (!platformExtState.isLoggedIn) {
        return (
            <>
                <Typography variant="body3">
                    You need to be signed into Devant in order create Devant connections
                </Typography>
                <Button
                    onClick={() =>
                        rpcClient.getCommonRpcClient().executeCommand({
                            commands: [
                                PlatformExtCommandIds.SignIn,
                                { extName: "Devant" } as PlatformExtICmdParamsBase,
                            ],
                        })
                    }
                >
                    Sign In
                </Button>
            </>
        );
    }

    if (!platformExtState?.selectedComponent) {
        return (
            <>
                <BodyTinyInfo>
                    In order to connect with a dependency in Devant, you need to deploy your integration in Devant
                </BodyTinyInfo>
                <Button
                    onClick={() =>
                        rpcClient.getCommonRpcClient().executeCommand({
                            commands: [
                                PlatformExtCommandIds.CreateNewComponent,
                                {
                                    // integrationType: integrationType as any,
                                    buildPackLang: "ballerina",
                                    // name: path.basename(StateMachine.context().projectUri),
                                    componentDir: projectPath,
                                    extName: "Devant",
                                } as ICreateComponentCmdParams,
                            ],
                        })
                    }
                >
                    Deploy Integration
                </Button>
            </>
        );
    }

    return (
        <>
            <VSCodePanels style={{ height: "100%" }}>
                <VSCodePanelTab id={`tab-internal-services`} key={`tab-internal-services`}>
                    Internal Services
                </VSCodePanelTab>
                <VSCodePanelView id={`view-internal-services`} key={`view-internal-services`}>
                    <div style={{ width: "100%" }}>
                        {isLoading && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    height: "100%",
                                    paddingTop: "50px",
                                }}
                            >
                                <ProgressRing />
                            </div>
                        )}
                        {marketplaceResp?.data?.length === 0 && (
                            <BodyTinyInfo>
                                There are no internal API services available to connect to in your Devant project.
                            </BodyTinyInfo>
                        )}
                        <GridContainer isHalfView={hideTitle}>
                            {marketplaceResp?.data?.map((item, index) => {
                                return (
                                    <ButtonCard
                                        id={`connector-${item.serviceId}`}
                                        key={item.serviceId}
                                        title={item.name}
                                        description={item.description}
                                        icon={<Codicon name="package" />}
                                        onClick={() => onSelectDevantConnector(item)}
                                    />
                                );
                            })}
                        </GridContainer>
                    </div>
                </VSCodePanelView>
            </VSCodePanels>
        </>
    );
};
