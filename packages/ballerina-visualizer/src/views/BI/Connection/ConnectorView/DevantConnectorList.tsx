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
import { Button, Codicon, ProgressRing, ThemeColors, Typography, Overlay } from "@wso2/ui-toolkit";
import ButtonCard from "../../../../components/ButtonCard";
import { BodyTinyInfo } from "../../../styles";
import { useQuery } from "@tanstack/react-query";
import { ICreateComponentCmdParams, MarketplaceItem, CommandIds as PlatformExtCommandIds, ICmdParamsBase as PlatformExtICmdParamsBase } from "@wso2/wso2-platform-core";
import { VSCodePanelTab, VSCodePanelView, VSCodePanels } from "@vscode/webview-ui-toolkit/react";
import { MarketplaceItemDetails } from "./MarketplaceItemDetails";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { CreateConnection } from "./CreateConnection";

const GridContainer = styled.div<{ isHalfView?: boolean }>`
    display: grid;
    grid-template-columns: ${(props: { isHalfView: boolean }) =>
        props.isHalfView ? "unset" : "repeat(auto-fill, minmax(200px, 1fr))"};
    gap: 12px;
    width: 100%;
`;

export const DevantConnectorList: FC<{ search: string; hideTitle?: boolean }> = ({ search, hideTitle }) => {
    const { rpcClient } = useRpcContext();
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [selectedItem, setSelectedItem] = useState<MarketplaceItem>();
    const [showCreateForm, setShowCreateForm] = useState(false);

    const { data: projectPath } = useQuery({
        queryKey: ["projectPath"],
        queryFn: () => rpcClient.getVisualizerLocation(),
    });

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 2000);
        return () => clearTimeout(handler);
    }, [search]);

    const { data: isLoggedIn } = useQuery({
        queryKey: ["isLoggedIn"],
        queryFn: () => rpcClient.getPlatformRpcClient().isLoggedIn(),
        refetchInterval: 2000,
    });

    const { data: selected } = useQuery({
        queryKey: ["devant-context", isLoggedIn],
        queryFn: () => rpcClient.getPlatformRpcClient().getSelectedContext(),
        enabled: !!isLoggedIn,
        refetchInterval: 2000,
    });

    const { data: directoryComponent } = useQuery({
        queryKey: [
            "getDirectoryComponents",
            { isLoggedIn, org: selected?.org?.uuid, project: selected?.project?.id, projectPath },
        ],
        queryFn: () => rpcClient.getPlatformRpcClient().getDirectoryComponents(projectPath?.projectUri),
        enabled: isLoggedIn && !!projectPath,
        select: (components) => components[0] || null,
        refetchInterval: 2000,
    });

    const { data: marketplaceResp, isLoading } = useQuery({
        queryKey: [
            "devant-marketplace",
            {
                org: selected?.org?.uuid,
                project: selected?.project?.id,
                debouncedSearch,
                isLoggedIn,
                component: directoryComponent?.metadata?.id,
            },
        ],
        queryFn: () =>
            rpcClient.getPlatformRpcClient().getMarketplaceItems({
                orgId: selected?.org?.id.toString(),
                request: {
                    limit: 60,
                    offset: 0,
                    networkVisibilityFilter: "all",
                    networkVisibilityprojectId: selected?.project?.id,
                    sortBy: "createdTime",
                    query: debouncedSearch || undefined,
                    searchContent: false,
                    isThirdParty: false,
                },
            }),
        enabled: isLoggedIn && !!selected?.project,
        select: (data) => ({
            ...data,
            data: data.data.filter((item) => item.component?.componentId !== directoryComponent?.metadata?.id),
        }),
    });

    if (!isLoggedIn) {
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

    if (!directoryComponent) {
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
                                    componentDir: projectPath?.projectUri,
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
            {selectedItem && (
                <>
                    <Overlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 2000 }} />
                    <PanelContainer
                        show={true}
                        title={`Create connection for ${selectedItem?.name}`}
                        onClose={() => {
                            setSelectedItem(undefined);
                            setShowCreateForm(false);
                        }}
                        width={600}
                        subPanelWidth={600}
                        onBack={showCreateForm ? ()=>setShowCreateForm(false): undefined}
                    >
                        {showCreateForm ? <>
                            <CreateConnection 
                                allItems={[]}   // todo update
                                component={directoryComponent}
                                item={selectedItem}
                                onCreate={()=>{
                                    setSelectedItem(undefined);
                                    setShowCreateForm(false);
                                }}
                                directoryFsPath={projectPath?.projectUri}
                                org={selected.org}
                                project={selected.project}
                            />
                        </> :  <MarketplaceItemDetails
                            onCreateClick={() => setShowCreateForm(true)}
                            org={selected?.org}
                            directoryFsPath={projectPath?.projectUri}
                            item={selectedItem}
                        />}
                       
                    </PanelContainer>
                </>
            )}

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
                        {/** Use the same empty view in connectors section */}
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
                                        onClick={() => setSelectedItem(item)}
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
