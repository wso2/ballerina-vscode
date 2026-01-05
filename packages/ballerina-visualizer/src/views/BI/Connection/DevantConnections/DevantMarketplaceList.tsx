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

import { ReactNode, useState } from "react";
import styled from "@emotion/styled";
import { Button, Codicon, ProgressRing } from "@wso2/ui-toolkit";
import { MarketplaceItem } from "@wso2/wso2-platform-core";
import { VSCodePanels, VSCodePanelTab, VSCodePanelView } from "@vscode/webview-ui-toolkit/react";
import ButtonCard from "../../../../components/ButtonCard";
import { BodyTinyInfo } from "../../../styles";
import { useQuery } from "@tanstack/react-query";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";

const AddButtonWrap = styled.div`
    position: absolute;
    top: 10px;
    right: 12px;
`;

const GridContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 8px;
`;

const ProgressRingWrap = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 40px;
`;

const EmptyWrap = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 10px;
    padding: 35% 10%;
`;

interface DevantMarketplaceListProps {
    searchText?: string;
    onSelectItem: (item: MarketplaceItem) => void;
    onRegisterNew3rdPartySvc: (isNew?: boolean) => void;
}

export const DevantMarketplaceList = ({
    searchText = "",
    onSelectItem,
    onRegisterNew3rdPartySvc,
}: DevantMarketplaceListProps) => {
    const [selectedTab, setSelectedTab] = useState<"internal-services" | "third-party-services">("internal-services");
    const { platformExtState, platformRpcClient } = usePlatformExtContext();

    const { data: marketplaceResp, isLoading } = useQuery({
        queryKey: [
            "devant-marketplace",
            {
                org: platformExtState?.selectedContext?.org?.uuid,
                project: platformExtState?.selectedContext?.project?.id,
                debouncedSearch: searchText,
                isLoggedIn: platformExtState.isLoggedIn,
                component: platformExtState?.selectedComponent?.metadata?.id,
                internalOnly: selectedTab === "internal-services",
            },
        ],
        queryFn: () =>
            platformRpcClient?.getMarketplaceItems({
                orgId: platformExtState?.selectedContext?.org?.id?.toString(),
                request: {
                    limit: 60,
                    offset: 0,
                    networkVisibilityFilter: selectedTab === "third-party-services" ? "org,project,public" : "all",
                    networkVisibilityprojectId: platformExtState?.selectedContext?.project?.id,
                    sortBy: "createdTime",
                    query: searchText || undefined,
                    searchContent: false,
                    isThirdParty: selectedTab === "third-party-services",
                },
            }),
        enabled: platformExtState.isLoggedIn && !!platformExtState?.selectedContext?.project,
        select: (data) => ({
            ...data,
            data: data.data.filter((item) =>
                selectedTab === "third-party-services"
                    ? true
                    : item.component?.componentId !== platformExtState?.selectedComponent?.metadata?.id
            ),
        }),
    });

    const marketplaceData = marketplaceResp?.data || [];

    return (
        <div style={{ position: "relative" }}>
            {selectedTab === "third-party-services" && marketplaceData?.length > 0 && !isLoading && (
                <AddButtonWrap>
                    <Button
                        appearance="icon"
                        tooltip="Register new 3rd party service"
                        onClick={() => onRegisterNew3rdPartySvc(true)}
                    >
                        <Codicon name="plus" />
                    </Button>
                </AddButtonWrap>
            )}
            <VSCodePanels style={{ height: "100%" }} activeid={selectedTab}>
                <VSCodePanelTab
                    id={`internal-services`}
                    key={`tab-internal-services`}
                    onClick={() => setSelectedTab("internal-services")}
                >
                    Internal API Services
                </VSCodePanelTab>
                <VSCodePanelTab
                    id={`third-party-services`}
                    key={`tab-third-party-services`}
                    onClick={() => setSelectedTab("third-party-services")}
                >
                    Third Party API Services
                </VSCodePanelTab>

                <PanelTab
                    id="internal-services"
                    data={marketplaceData}
                    emptyMessage="There are no internal API services available to connect to in your Devant project."
                    isLoading={isLoading}
                    onSelectItem={onSelectItem}
                />
                <PanelTab
                    id="tab-third-party-services"
                    data={marketplaceData}
                    emptyMessage="There are no third party API services registered in your Devant account."
                    isLoading={isLoading}
                    onSelectItem={onSelectItem}
                    emptyActionButton={{
                        text: "Register New Service",
                        tooltip: "Open Devant console and register a new 3rd party API service",
                        onClick: () => onRegisterNew3rdPartySvc(),
                    }}
                />
            </VSCodePanels>
        </div>
    );
};

const PanelTab = (props: {
    id: string;
    isLoading: boolean;
    data: MarketplaceItem[];
    onSelectItem: (item: MarketplaceItem) => void;
    emptyMessage: ReactNode;
    emptyActionButton?: {
        text: string;
        tooltip: string;
        onClick: () => void;
    };
}) => {
    const { isLoading, data, id, onSelectItem, emptyMessage, emptyActionButton } = props;
    return (
        <VSCodePanelView id={id} key={id}>
            <div style={{ width: "100%", marginTop: 12 }}>
                {isLoading ? (
                    <ProgressRingWrap>
                        <ProgressRing />
                    </ProgressRingWrap>
                ) : (
                    <>
                        {data?.length === 0 ? (
                            <EmptyWrap>
                                <BodyTinyInfo style={{ textAlign: "center" }}>{emptyMessage}</BodyTinyInfo>
                                {emptyActionButton && (
                                    <Button
                                        sx={{ marginTop: 6 }}
                                        tooltip={emptyActionButton.tooltip}
                                        onClick={emptyActionButton.onClick}
                                        buttonSx={{ minWidth: "160px" }}
                                    >
                                        {emptyActionButton.text}
                                    </Button>
                                )}
                            </EmptyWrap>
                        ) : (
                            <GridContainer>
                                {data?.map((item) => {
                                    return (
                                        <ButtonCard
                                            id={`connector-${item.serviceId}`}
                                            key={item.serviceId}
                                            title={item.name}
                                            description={item.description}
                                            icon={<Codicon name="package" />}
                                            onClick={() => onSelectItem(item)}
                                        />
                                    );
                                })}
                            </GridContainer>
                        )}
                    </>
                )}
            </div>
        </VSCodePanelView>
    );
};
