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

import React, { useState, useCallback } from "react";
import { AvailableNode, LinePosition } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Codicon, ProgressRing } from "@wso2/ui-toolkit";
import { debounce } from "lodash";
import ButtonCard from "../../../../components/ButtonCard";
import { BodyTinyInfo } from "../../../styles";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { useQuery } from "@tanstack/react-query";
import { GetMarketplaceItemsParams, MarketplaceItem } from "@wso2/wso2-platform-core";
import {
    ConnectorsGrid,
    FilterButton,
    FilterButtons,
    IntroText,
    SearchContainer,
    Section,
    SectionHeader,
    SectionTitle,
    StyledSearchBox,
} from "../AddConnectionPopup/styles";
import { DevantConnectionFlow } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { DevantConnectionType, getKnownAvailableNode, ProgressWrap } from "./utils";

interface DevantConnectorListProps {
    onItemSelect: (
        flow: DevantConnectionFlow | null,
        item: MarketplaceItem,
        availableNode: AvailableNode | undefined,
    ) => void;
    fileName: string;
    target?: LinePosition;
}

export function DevantConnectorList(props: DevantConnectorListProps) {
    const { onItemSelect, fileName, target } = props;
    const { platformExtState, platformRpcClient } = usePlatformExtContext();
    const [searchText, setSearchText] = useState<string>("");
    const { rpcClient } = useRpcContext();

    const debouncedSetSearchText = useCallback(
        debounce((value: string) => setSearchText(value), 500),
        [],
    );

    const { data: balOrgConnectors, isLoading: loadingBalOrgConnectors } = useQuery({
        queryKey: ["searchConnectors", fileName, target],
        queryFn: () =>
            rpcClient
                .getBIDiagramRpcClient()
                .search({ filePath: fileName, queryMap: { limit: 60, orgName: "ballerina" }, searchKind: "CONNECTOR" }),
    });

    const handleMarketplaceItemClick = (item: MarketplaceItem, type: DevantConnectionType) => {
        // TODO: once we store the connector info in Devant side,
        // we should be able to open the correct form
        let availableNode: AvailableNode | undefined;
        if (item.serviceType === "REST") {
            availableNode = getKnownAvailableNode(balOrgConnectors?.categories, "ballerina", "http");
        } else if (item.serviceType === "GRAPHQL") {
            availableNode = getKnownAvailableNode(balOrgConnectors?.categories, "ballerina", "graphql");
        } else if (item.serviceType === "SOAP") {
            availableNode = getKnownAvailableNode(balOrgConnectors?.categories, "ballerina", "soap");
        } else if (item.serviceType === "GRPC") {
            availableNode = getKnownAvailableNode(balOrgConnectors?.categories, "ballerina", "grpc");
        }

        if (type === DevantConnectionType.THIRD_PARTY) {
            if (item.serviceType === "REST") {
                onItemSelect(DevantConnectionFlow.CREATE_THIRD_PARTY_OAS, item, availableNode);
            } else if (availableNode) {
                onItemSelect(DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER, item, availableNode);
            } else {
                onItemSelect(DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR, item, availableNode);
            }
        } else if (type === DevantConnectionType.INTERNAL) {
            if (item.serviceType === "REST") {
                onItemSelect(DevantConnectionFlow.CREATE_INTERNAL_OAS, item, availableNode);
            } else if (availableNode) {
                onItemSelect(DevantConnectionFlow.CREATE_INTERNAL_OTHER, item, availableNode);
            } else {
                onItemSelect(DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR, item, availableNode);
            }
        }
    };

    const reactQueryKey = {
        org: platformExtState?.selectedContext?.org?.uuid,
        project: platformExtState?.selectedContext?.project?.id,
        debouncedSearch: searchText,
        isLoggedIn: platformExtState.isLoggedIn,
        component: platformExtState?.selectedComponent?.metadata?.id,
    };

    const getMarketPlaceParams: GetMarketplaceItemsParams = {
        limit: 24,
        offset: 0,
        networkVisibilityFilter: "all",
        networkVisibilityprojectId: platformExtState?.selectedContext?.project?.id,
        sortBy: "createdTime",
        query: searchText || undefined,
        searchContent: false,
        isThirdParty: false,
    };

    const { data: internalApisResp, isLoading: internalApisLoading } = useQuery({
        queryKey: ["devant-internal-services", reactQueryKey],
        queryFn: () =>
            platformRpcClient?.getMarketplaceItems({
                orgId: platformExtState?.selectedContext?.org?.id?.toString(),
                request: getMarketPlaceParams,
            }),
        enabled: platformExtState.isLoggedIn && !!platformExtState?.selectedContext?.project,
        select: (data) => ({
            ...data,
            data: data.data.filter(
                (item) => item.component?.componentId !== platformExtState?.selectedComponent?.metadata?.id,
            ),
        }),
    });

    const { data: thirdPartyApisResp, isLoading: thirdPartyApisLoading } = useQuery({
        queryKey: ["third-party-services", reactQueryKey],
        queryFn: () =>
            platformRpcClient?.getMarketplaceItems({
                orgId: platformExtState?.selectedContext?.org?.id?.toString(),
                request: {
                    ...getMarketPlaceParams,
                    isThirdParty: true,
                    networkVisibilityFilter: "org,project,public",
                },
            }),
        enabled: platformExtState.isLoggedIn && !!platformExtState?.selectedContext?.project,
    });

    return (
        <>
            <IntroText>
                Connect to API services running in Devant or use existing third-party connections.
            </IntroText>

            <SearchContainer>
                <StyledSearchBox
                    value={searchText}
                    placeholder="Search services..."
                    onChange={debouncedSetSearchText}
                    size={60}
                />
            </SearchContainer>

            <>
                {loadingBalOrgConnectors && (
                    <ProgressWrap>
                        <ProgressRing />
                    </ProgressWrap>
                )}
                <ConnectionSection
                    emptyText="No API services deployed"
                    title="Services running in Devant"
                    loading={internalApisLoading}
                    data={internalApisResp?.data || []}
                    searchText={searchText}
                    onItemClick={(item) => handleMarketplaceItemClick(item, DevantConnectionType.INTERNAL)}
                />
                <ConnectionSection
                    emptyText={"No third party services configured"}
                    title="Services configured in Devant"
                    loading={thirdPartyApisLoading}
                    data={thirdPartyApisResp?.data || []}
                    searchText={searchText}
                    onItemClick={(item) => handleMarketplaceItemClick(item, DevantConnectionType.THIRD_PARTY)}
                />
            </>
        </>
    );
}

const ConnectionSection = ({
    emptyText,
    title,
    loading,
    data,
    searchText,
    onItemClick,
}: {
    emptyText?: string;
    title: string;
    loading: boolean;
    data: MarketplaceItem[];
    searchText: string;
    onItemClick: (item: MarketplaceItem) => void;
}) => {
    const { platformExtState } = usePlatformExtContext();
    const [filterType, setFilterType] = useState<"Project" | "Organization">("Organization");
    const filteredData = data.filter((item) => {
        if (filterType === "Project") {
            return item.projectId === platformExtState?.selectedContext?.project?.id;
        }
        return true;
    });
    return (
        <Section>
            <SectionHeader>
                <SectionTitle variant="h4">{title}</SectionTitle>
                <FilterButtons>
                    <FilterButton active={filterType === "Organization"} onClick={() => setFilterType("Organization")}>
                        All
                    </FilterButton>
                    <FilterButton active={filterType === "Project"} onClick={() => setFilterType("Project")}>
                        Project
                    </FilterButton>
                </FilterButtons>
            </SectionHeader>
            {loading ? (
                <ProgressWrap>
                    <ProgressRing />
                </ProgressWrap>
            ) : (
                <>
                    {filteredData?.length === 0 ? (
                        <>
                            {searchText ? (
                                <BodyTinyInfo style={{ paddingBottom: "30px" }}>
                                    {emptyText} in your Devant {filterType === "Project" ? "project" : "organization"}{" "}
                                    matching with "{searchText}"
                                </BodyTinyInfo>
                            ) : (
                                <BodyTinyInfo style={{ paddingBottom: "30px" }}>
                                    {emptyText} in your Devant {filterType === "Project" ? "project" : "organization"}
                                </BodyTinyInfo>
                            )}
                        </>
                    ) : (
                        <ConnectorsGrid>
                            {filteredData?.map((item) => {
                                return (
                                    <ButtonCard
                                        id={`connector-${item.serviceId}`}
                                        key={item.serviceId}
                                        title={item.name}
                                        description={item.description}
                                        icon={<Codicon name="package" />}
                                        onClick={() => onItemClick(item)}
                                    />
                                );
                            })}
                        </ConnectorsGrid>
                    )}
                </>
            )}
        </Section>
    );
};
