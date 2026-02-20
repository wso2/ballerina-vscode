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

import React, { useState, useEffect, useMemo } from "react";
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
    Section,
    SectionHeader,
    SectionTitle,
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
    searchText?: string;
}

export function DevantConnectorList(props: DevantConnectorListProps) {
    const { onItemSelect, fileName, target, searchText } = props;
    const { platformExtState, platformRpcClient } = usePlatformExtContext();
    const { rpcClient } = useRpcContext();
    const [filterType, setFilterType] = useState<"all" | "internal" | "thirdParty">("all");

    const [debouncedSearchText, setDebouncedSearchText] = useState(searchText || "");

    const debouncedSetSearch = useMemo(() => debounce((text: string) => setDebouncedSearchText(text), 500), []);

    useEffect(() => {
        debouncedSetSearch(searchText || "");
        return () => debouncedSetSearch.cancel();
    }, [searchText, debouncedSetSearch]);

    const { data: balOrgConnectors, isLoading: loadingBalOrgConnectors } = useQuery({
        queryKey: ["searchConnectors", fileName, target],
        queryFn: () =>
            rpcClient
                .getBIDiagramRpcClient()
                .search({ filePath: fileName, queryMap: { limit: 60, orgName: "ballerina" }, searchKind: "CONNECTOR" }),
    });

    const handleMarketplaceItemClick = (item: MarketplaceItem) => {
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

        if (item.isThirdParty) {
            if (item.serviceType === "REST") {
                onItemSelect(DevantConnectionFlow.CREATE_THIRD_PARTY_OAS, item, availableNode);
            } else if (availableNode) {
                onItemSelect(DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER, item, availableNode);
            } else {
                onItemSelect(DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR, item, availableNode);
            }
        } else {
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
        debouncedSearch: debouncedSearchText,
        isLoggedIn: platformExtState.isLoggedIn,
        component: platformExtState?.selectedComponent?.metadata?.id,
    };

    const getMarketPlaceParams: GetMarketplaceItemsParams = {
        limit: 24,
        offset: 0,
        networkVisibilityFilter: "all",
        networkVisibilityprojectId: platformExtState?.selectedContext?.project?.id,
        sortBy: "createdTime",
        query: debouncedSearchText || undefined,
        searchContent: false,
    };

    if(filterType === "internal") {
        getMarketPlaceParams.isThirdParty = false;
    }
    if(filterType === "thirdParty") {
        getMarketPlaceParams.isThirdParty = true;
        getMarketPlaceParams.networkVisibilityFilter = "org,project,public";
    }

    const { data: marketplaceServices, isLoading: isLoadingMarketplace } = useQuery({
        queryKey: ["marketplace-services", filterType, reactQueryKey],
        queryFn: () =>
            platformRpcClient?.getMarketplaceItems({
                orgId: platformExtState?.selectedContext?.org?.id?.toString(),
                request: getMarketPlaceParams,
            }),
        enabled: platformExtState.isLoggedIn && !!platformExtState?.selectedContext?.project,
        select: (data) => ({
            ...data,
            data: data.data.filter(
                (item) => {
                    if (filterType === "internal") {
                        return item.component?.componentId !== platformExtState?.selectedComponent?.metadata?.id
                    }
                    return true
                },
            ),
        }),
    });

    let emptyText = "No services running or configured in Devant";
    if (filterType === "internal") {
        emptyText = "No services running in Devant";
    } else if (filterType === "thirdParty") {
        emptyText = "No third party services configured in Devant";
    }

    return (
        <>
            <Section>
                <SectionHeader>
                    <SectionTitle variant="h4">Devant Services</SectionTitle>
                    <FilterButtons onClick={(e) => e.stopPropagation()}>
                        <FilterButton
                            title="All Services running or configured in Devant"
                            active={filterType === "all"}
                            onClick={() => setFilterType("all")}
                        >
                            All
                        </FilterButton>
                        <FilterButton
                            title="Services running in Devant"
                            active={filterType === "internal"}
                            onClick={() => setFilterType("internal")}
                        >
                            Internal
                        </FilterButton>
                        <FilterButton
                            title="Services configured in Devant"
                            active={filterType === "thirdParty"}
                            onClick={() => setFilterType("thirdParty")}
                        >
                            Third Party
                        </FilterButton>
                    </FilterButtons>
                </SectionHeader>
                <ConnectionSection
                    emptyText={emptyText}
                    loading={isLoadingMarketplace}
                    data={marketplaceServices?.data || []}
                    searchText={searchText}
                    onItemClick={(item) => handleMarketplaceItemClick(item)}
                    disableItems={loadingBalOrgConnectors}
                />
            </Section>
        </>
    );
}

const ConnectionSection = ({
    emptyText,
    loading,
    data,
    searchText,
    onItemClick,
    disableItems = false,
}: {
    emptyText?: string;
    loading: boolean;
    data: MarketplaceItem[];
    searchText: string;
    onItemClick: (item: MarketplaceItem) => void;
    disableItems?: boolean;
}) => {
    return (
        <>
            {loading ? (
                <ProgressWrap>
                    <ProgressRing />
                </ProgressWrap>
            ) : (
                <>
                    {data?.length === 0 ? (
                        <>
                            {searchText ? (
                                <BodyTinyInfo style={{ paddingBottom: "10px" }}>
                                    {emptyText} in your Devant organization matching with "{searchText}"
                                </BodyTinyInfo>
                            ) : (
                                <BodyTinyInfo style={{ paddingBottom: "10px" }}>
                                    {emptyText} in your Devant organization
                                </BodyTinyInfo>
                            )}
                        </>
                    ) : (
                        <ConnectorsGrid>
                            {data?.map((item) => {
                                return (
                                    <ButtonCard
                                        id={`connector-${item.serviceId}`}
                                        key={item.serviceId}
                                        title={item.name}
                                        description={item.description}
                                        icon={<Codicon name="package" />}
                                        onClick={() => onItemClick(item)}
                                        disabled={disableItems}
                                    />
                                );
                            })}
                        </ConnectorsGrid>
                    )}
                </>
            )}
        </>
    );
};
