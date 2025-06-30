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
import styled from "@emotion/styled";
import { AvailableNode, Category, FlowNode, Item, LinePosition } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, ProgressRing, SearchBox, Typography, View } from "@wso2/ui-toolkit";
import { cloneDeep, debounce } from "lodash";
import ButtonCard from "../../../../components/ButtonCard";
import { BodyText, BodyTinyInfo, TopBar } from "../../../styles";
import { ConnectorIcon } from "@wso2/bi-diagram";
import { TitleBar } from "../../../../components/TitleBar";
import { TopNavigationBar } from "../../../../components/TopNavigationBar";

const ViewWrapper = styled.div<{ isHalfView?: boolean }>`
    display: flex;
    flex-direction: column;
    height: ${(props: { isHalfView: boolean }) => (props.isHalfView ? "40vh" : "100vh")};
    width: 100%;
`;

const Container = styled.div`
    padding: 0 20px;
    width: 100%;
`;

const ListContainer = styled.div<{ isHalfView?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 24px;
    height: ${(props: { isHalfView: boolean }) => (props.isHalfView ? "30vh" : "80vh")};
    gap: 8px;
    height: 80vh;
    overflow-y: scroll;
    margin-top: 16px;
`;

const GridContainer = styled.div<{ isHalfView?: boolean }>`
    display: grid;
    grid-template-columns: ${(props: { isHalfView: boolean }) =>
        props.isHalfView ? "unset" : "repeat(auto-fill, minmax(200px, 1fr))"};
    gap: 16px;
    gap: 12px;
    width: 100%;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    margin-top: 32px;
    width: 100%;
`;

const LabelRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const StyledSearchInput = styled(SearchBox)`
    height: 30px;
`;

interface ConnectorViewProps {
    fileName: string;
    targetLinePosition: LinePosition;
    onSelectConnector: (connector: AvailableNode) => void;
    onAddGeneratedConnector: () => void;
    fetchingInfo: boolean;
    onClose?: () => void;
    hideTitle?: boolean;
}

export function ConnectorView(props: ConnectorViewProps) {
    const {
        fileName,
        targetLinePosition,
        onSelectConnector,
        onAddGeneratedConnector,
        onClose,
        fetchingInfo,
        hideTitle,
    } = props;
    const { rpcClient } = useRpcContext();

    const [connectors, setConnectors] = useState<Category[]>([]);
    const [searchText, setSearchText] = useState<string>("");
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        setIsSearching(true);
        getConnectors();
    }, []);

    rpcClient?.onProjectContentUpdated((state: boolean) => {
        if (state) {
            getConnectors();
        }
    });

    const getConnectors = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .search({
                position: {
                    startLine: targetLinePosition,
                    endLine: targetLinePosition,
                },
                filePath: fileName,
                queryMap: { limit: 60 },
                searchKind: "CONNECTOR",
            })
            .then(async (model) => {
                console.log(">>> bi connectors", model);
                const filtered = await filterCategories(model.categories);
                console.log(">>> bi filtered connectors", filtered);
                setConnectors(filtered);
            })
            .finally(() => {
                setIsSearching(false);
            });
    };

    useEffect(() => {
        setIsSearching(true);
        debouncedSearch(searchText);
        return () => debouncedSearch.cancel();
    }, [searchText]);

    const handleSearch = (text: string) => {
        rpcClient
            .getBIDiagramRpcClient()
            .search({
                position: {
                    startLine: targetLinePosition,
                    endLine: targetLinePosition,
                },
                filePath: fileName,
                queryMap: { q: text, limit: 60 },
                searchKind: "CONNECTOR",
            })
            .then(async (model) => {
                console.log(">>> bi searched connectors", model);
                const filtered = await filterCategories(model.categories);
                console.log(">>> bi filtered connectors", filtered);
                setConnectors(filtered);
            })
            .finally(() => {
                setIsSearching(false);
            });
    };
    const debouncedSearch = debounce(handleSearch, 1100);

    const handleOnSearch = (text: string) => {
        setSearchText(text);
    };

    const filterItems = (items: Item[]): Item[] => {
        return items
            .map((item) => {
                if ("items" in item) {
                    const filteredItems = filterItems(item.items);
                    return {
                        ...item,
                        items: filteredItems,
                    };
                } else {
                    const lowerCaseTitle = item.metadata.label.toLowerCase();
                    const lowerCaseDescription = item.metadata.description?.toLowerCase() || "";
                    const lowerCaseSearchText = searchText.toLowerCase();
                    if (
                        lowerCaseTitle.includes(lowerCaseSearchText) ||
                        lowerCaseDescription.includes(lowerCaseSearchText)
                    ) {
                        return item;
                    }
                }
            })
            .filter(Boolean);
    };

    const filteredCategories = cloneDeep(connectors).map((category) => {
        if (!category || !category.items) {
            return category;
        }
        category.items = filterItems(category.items);
        return category;
    });

    async function filterCategories(categories: Category[]): Promise<Category[]> {
        const localConnectors = (
            await rpcClient.getBIDiagramRpcClient().getOpenApiGeneratedModules({ projectPath: "" })
        ).modules;
        return categories.map((category) => {
            if (category.metadata.label === "Local") {
                const filteredItems = category.items.filter(
                    (item): item is AvailableNode =>
                        "codedata" in item && localConnectors.includes(item.codedata.module || "")
                );

                return { ...category, items: filteredItems };
            }

            return category;
        });
    }

    const isFullView = onClose === undefined;
    const isLoading = isSearching || fetchingInfo;

    return (
        <ViewWrapper isHalfView={hideTitle}>
            {isFullView && (
                <>
                    <TopNavigationBar />
                    <TitleBar title="Connectors" subtitle="Select a connector to integrate with external services" />
                </>
            )}
            <Container>
                {!isFullView && !hideTitle && (
                    <>
                        <TopBar>
                            <Typography variant="h2">Select a Connector</Typography>
                            {onClose && (
                                <Button appearance="icon" onClick={onClose}>
                                    <Codicon name="close" />
                                </Button>
                            )}
                        </TopBar>

                        <BodyText>
                            Select a connector to integrate with external services. Use search to quickly find the right
                            one.
                        </BodyText>
                    </>
                )}
                <Row>
                    <StyledSearchInput
                        value={searchText}
                        placeholder="Search connectors"
                        autoFocus={true}
                        onChange={handleOnSearch}
                        size={60}
                        sx={{ width: "100%" }}
                    />
                </Row>
                {isLoading && (
                    <ListContainer>
                        <div
                            style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}
                        >
                            <ProgressRing />
                        </div>
                    </ListContainer>
                )}
                {!isLoading && filteredCategories && filteredCategories.length > 0 && (
                    <ListContainer isHalfView={hideTitle}>
                        {/* Default connectors of LS is hardcoded and is sent with categories with item field */}
                        {filteredCategories[0]?.items ? (
                            filteredCategories.map((category, index) => {
                                const isLocalConnectorCategory = category.metadata.label === "Local";
                                const itemCount = category.items?.length || 0;
                                const isLocalConnectorsEmpty = isLocalConnectorCategory && itemCount === 0;

                                if (!isLocalConnectorCategory && (!category.items || category.items.length === 0)) {
                                    return null;
                                }

                                return (
                                    <div key={category.metadata.label + index}>
                                        <LabelRow>
                                            <Typography variant="h3">{category.metadata.label}</Typography>
                                            {isLocalConnectorCategory && (
                                                <Button
                                                    appearance="icon"
                                                    tooltip={"Add a Connector from OpenAPI"}
                                                    onClick={onAddGeneratedConnector}
                                                >
                                                    <Codicon name="add" />
                                                </Button>
                                            )}
                                        </LabelRow>
                                        {isLocalConnectorsEmpty ? (
                                            <BodyTinyInfo style={{ textAlign: "center" }}>
                                                No local connectors found. You can create one by importing an OpenAPI
                                                spec.
                                            </BodyTinyInfo>
                                        ) : (
                                            <GridContainer isHalfView={hideTitle}>
                                                {category.items?.map((connector, index) => {
                                                    return (
                                                        <ButtonCard
                                                            key={connector.metadata.label + index}
                                                            title={connector.metadata.label}
                                                            description={
                                                                (connector as AvailableNode).codedata.org +
                                                                " / " +
                                                                (connector as AvailableNode).codedata.module
                                                            }
                                                            truncate={true}
                                                            icon={
                                                                connector.metadata.icon ? (
                                                                    <ConnectorIcon
                                                                        url={connector.metadata.icon}
                                                                    />
                                                                ) : (
                                                                    <Codicon name="package" />
                                                                )
                                                            }
                                                            onClick={() => {
                                                                onSelectConnector(connector as AvailableNode);
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </GridContainer>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <GridContainer isHalfView={hideTitle}>
                                {connectors.map((item, index) => {
                                    const connector = item as Item;
                                    return (
                                        <ButtonCard
                                            key={connector.metadata.label + index}
                                            title={connector.metadata.label}
                                            description={
                                                (connector as AvailableNode).codedata.org +
                                                " / " +
                                                (connector as AvailableNode).codedata.module
                                            }
                                            icon={
                                                connector.metadata.icon ? (
                                                    <ConnectorIcon url={connector.metadata.icon} />
                                                ) : (
                                                    <Codicon name="package" />
                                                )
                                            }
                                            onClick={() => {
                                                onSelectConnector(connector as AvailableNode);
                                            }}
                                        />
                                    );
                                })}
                            </GridContainer>
                        )}
                    </ListContainer>
                )}
                {!isSearching && connectors.length === 0 && <p>No connectors found</p>}
            </Container>
        </ViewWrapper>
    );
}

export default ConnectorView;
