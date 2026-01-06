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

import React, { useEffect, useState, useMemo, useCallback } from "react";
import styled from "@emotion/styled";
import { AvailableNode, Category, Item, LinePosition, MACHINE_VIEW, ParentPopupData } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Codicon, Icon, SearchBox, ThemeColors, Typography, ProgressRing, Tooltip } from "@wso2/ui-toolkit";
import { cloneDeep, debounce } from "lodash";
import ButtonCard from "../../../../components/ButtonCard";
import { ConnectorIcon } from "@wso2/bi-diagram";
import APIConnectionPopup from "../APIConnectionPopup";
import ConnectionConfigurationPopup from "../ConnectionConfigurationPopup";
import DatabaseConnectionPopup from "../DatabaseConnectionPopup";
import { BodyTinyInfo } from "../../../styles";
import { PopupOverlay, PopupContainer, PopupHeader, PopupTitle, CloseButton } from "../styles";

const PopupContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const IntroText = styled(Typography)`
    font-size: 14px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    line-height: 1.5;
    margin: 0;
`;

const SearchContainer = styled.div`
    width: 100%;
`;

const StyledSearchBox = styled(SearchBox)`
    width: 100%;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SectionTitle = styled(Typography)`
    font-size: 14px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const CreateConnectorOptions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ConnectorOptionCard = styled.div<{ disabled?: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    cursor: ${(props: { disabled?: boolean }) => (props.disabled ? "not-allowed" : "pointer")};
    transition: all 0.2s ease;
    opacity: ${(props: { disabled?: boolean }) => (props.disabled ? 0.5 : 1)};

    &:hover {
        background-color: ${(props: { disabled?: boolean }) =>
        props.disabled ? ThemeColors.SURFACE_DIM : ThemeColors.PRIMARY_CONTAINER};
        border-color: ${(props: { disabled?: boolean }) =>
        props.disabled ? ThemeColors.OUTLINE_VARIANT : ThemeColors.PRIMARY};
    }
`;

const ConnectorOptionIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    flex-shrink: 0;
`;

const ConnectorOptionContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ConnectorOptionTitleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: space-between;
`;

const ConnectorOptionTitle = styled(Typography)`
    font-size: 14px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const ExperimentalBadge = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    padding: 4px;
    border-radius: 4px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    margin: 0;
    display: inline-block;
`;

const ConnectorOptionDescription = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const ConnectorOptionButtons = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const ConnectorTypeLabel = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    padding: 6px;
    border-radius: 4px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    margin: 0;
    display: inline-block;
`;

const ArrowIcon = styled.div`
    display: flex;
    align-items: center;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
`;

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const FilterButtons = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`;

const FilterButton = styled.button<{ active?: boolean }>`
    font-size: 12px;
    padding: 6px 12px;
    height: 28px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-weight: ${(props: { active?: boolean }) => (props.active ? 600 : 400)};
    background-color: ${(props: { active?: boolean }) =>
        props.active ? ThemeColors.PRIMARY : "transparent"};
    color: ${(props: { active?: boolean }) =>
        props.active ? ThemeColors.ON_PRIMARY : ThemeColors.ON_SURFACE_VARIANT};
    transition: all 0.2s ease;

    &:hover {
        background-color: ${(props: { active?: boolean }) =>
        props.active ? ThemeColors.PRIMARY : ThemeColors.SURFACE_CONTAINER};
        color: ${(props: { active?: boolean }) =>
        props.active ? ThemeColors.ON_PRIMARY : ThemeColors.ON_SURFACE};
    }
`;

const ConnectorsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 8px;
`;

interface AddConnectionPopupProps {
    projectPath: string;
    fileName: string;
    target?: LinePosition;
    onClose?: (parent?: ParentPopupData) => void;
    onNavigateToOverview: () => void;
    isPopup?: boolean;
}

export function AddConnectionPopup(props: AddConnectionPopupProps) {
    const { projectPath, fileName, target, onClose, onNavigateToOverview, isPopup } = props;
    const { rpcClient } = useRpcContext();

    const [searchText, setSearchText] = useState<string>("");
    const [connectors, setConnectors] = useState<Category[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [fetchingInfo, setFetchingInfo] = useState(false);
    const [filterType, setFilterType] = useState<"All" | "Standard" | "Organization">("All");
    const [wizardStep, setWizardStep] = useState<"database" | "api" | "connector" | null>(null);
    const [selectedConnector, setSelectedConnector] = useState<AvailableNode | null>(null);
    const [experimentalEnabled, setExperimentalEnabled] = useState<boolean>(false);
    const [hasPersistConnection, setHasPersistConnection] = useState<boolean>(false);

    useEffect(() => {
        rpcClient
            ?.getCommonRpcClient()
            .experimentalEnabled()
            .then((enabled) => setExperimentalEnabled(enabled))
            .catch((err) => {
                console.error(">>> error checking experimental flag", err);
                setExperimentalEnabled(false);
            });
    }, [rpcClient]);

    // Temporary fix to check for existing database Persist connection till the backend is updated to support this.
    useEffect(() => {
        const checkExistingDatabaseConnection = async () => {
            if (!rpcClient || !experimentalEnabled) {
                return;
            }
            try {
                const res = await rpcClient.getBIDiagramRpcClient().getModuleNodes();

                const hasDatabaseConnection = res.flowModel.connections?.some((connection) => {
                    const metadataData = connection.metadata?.data as any;
                    return metadataData?.connectorType === "persist";
                });

                setHasPersistConnection(hasDatabaseConnection || false);
            } catch (error) {
                console.error(">>> Error checking for existing database connection", error);
                setHasPersistConnection(false);
            }
        };

        if (experimentalEnabled) {
            checkExistingDatabaseConnection();
        }
    }, [rpcClient, experimentalEnabled]);

    const fetchConnectors = useCallback((filter?: boolean) => {
        setFetchingInfo(true);
        const defaultPosition: LinePosition = { line: 0, offset: 0 };
        const position = target || defaultPosition;
        rpcClient
            .getBIDiagramRpcClient()
            .search({
                position: {
                    startLine: position,
                    endLine: position,
                },
                filePath: fileName,
                queryMap: {
                    limit: 60,
                    filterByCurrentOrg: filter ?? filterType === "Organization",
                },
                searchKind: "CONNECTOR",
            })
            .then(async (model) => {
                console.log(">>> bi connectors", model);
                console.log(">>> bi filtered connectors", model.categories);
                setConnectors(model.categories);
            })
            .finally(() => {
                setIsSearching(false);
                setFetchingInfo(false);
            });
    }, [rpcClient, target, fileName, filterType]);

    useEffect(() => {
        setIsSearching(true);
        fetchConnectors();
    }, []);

    const handleSearch = useCallback((text: string) => {
        const defaultPosition: LinePosition = { line: 0, offset: 0 };
        const position = target || defaultPosition;
        rpcClient
            .getBIDiagramRpcClient()
            .search({
                position: {
                    startLine: position,
                    endLine: position,
                },
                filePath: fileName,
                queryMap: {
                    q: text,
                    limit: 60,
                    filterByCurrentOrg: filterType === "Organization" ? true : false,
                },
                searchKind: "CONNECTOR",
            })
            .then(async (model) => {
                console.log(">>> bi searched connectors", model);
                console.log(">>> bi filtered connectors", model.categories);

                // When searching, the API might return a flat array of connectors instead of categories
                // Check if categories exist and have the proper structure (with items arrays)
                let normalizedCategories: Category[] = [];

                if (model.categories && Array.isArray(model.categories)) {
                    // Check if the first item is a category (has items) or a connector (has codedata)
                    const firstItem = model.categories[0];
                    if (firstItem && "items" in firstItem && Array.isArray(firstItem.items)) {
                        // Proper category structure - use as is
                        normalizedCategories = model.categories;
                    } else if (firstItem && "codedata" in firstItem) {
                        // Flat array of connectors - wrap in a category
                        normalizedCategories = [{
                            metadata: {
                                label: "Search Results",
                                description: ""
                            },
                            items: model.categories as unknown as AvailableNode[]
                        }];
                    }
                }

                console.log(">>> normalized categories for search", normalizedCategories);
                setConnectors(normalizedCategories);
            })
            .finally(() => {
                setIsSearching(false);
            });
    }, [rpcClient, target, fileName, filterType]);

    const debouncedSearch = useMemo(
        () => debounce(handleSearch, 1100),
        [handleSearch]
    );

    useEffect(() => {
        setIsSearching(true);
        debouncedSearch(searchText);
        return () => debouncedSearch.cancel();
    }, [searchText, debouncedSearch]);

    useEffect(() => {
        setIsSearching(true);
        fetchConnectors();
    }, [filterType, fetchConnectors]);

    useEffect(() => {
        rpcClient?.onProjectContentUpdated((state: boolean) => {
            if (state) {
                fetchConnectors();
            }
        });
    }, [rpcClient, fetchConnectors]);

    const handleOnSearch = (text: string) => {
        setSearchText(text);
    };

    const handleDatabaseConnection = () => {
        // Navigate to database connection wizard
        setWizardStep("database");
    };

    const handleApiSpecConnection = () => {
        // Navigate to API spec connection wizard (OpenAPI/WSDL)
        setWizardStep("api");
    };

    const handleSelectConnector = (connector: AvailableNode) => {
        if (!connector.codedata) {
            console.error(">>> Error selecting connector. No codedata found");
            return;
        }
        setSelectedConnector(connector);
        setWizardStep("connector");
    };

    const handleBackToConnectorList = () => {
        setWizardStep(null);
        setSelectedConnector(null);
    };

    const handleCloseWizard = (parent?: ParentPopupData) => {
        // If a parent payload is provided, we are done with the entire flow.
        // Close this popup (and navigate back) without resetting internal state first,
        if (parent) {
            if (isPopup) {
                rpcClient.getVisualizerLocation().then((location) => {
                    if (location.view === MACHINE_VIEW.BIComponentView) {
                        onNavigateToOverview();
                    } else {
                        onClose?.(parent);
                    }
                }).catch((err) => {
                    console.error(">>> error getting visualizer location", err);
                    onClose?.(parent);
                });
            } else {
                onNavigateToOverview();
            }
        } else {
            // Otherwise, just close the inner wizard and go back to the connector list.
            setWizardStep(null);
            setSelectedConnector(null);
        }   
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
        // Only apply client-side filtering if there's no search text (backend already filtered)
        if (searchText) {
            // When searching, show all items from backend results
            return category;
        }
        category.items = filterItems(category.items);
        return category;
    }).filter((category) => {
        if (!category) {
            return false;
        }
        // When searching, show all categories that have items
        if (searchText) {
            return category.items && category.items.length > 0;
        }
        // Map filterType to category labels similar to ConnectorView
        // "Standard" maps to "StandardLibrary" (exclude Local and CurrentOrg)
        // "Organization" maps to "CurrentOrg"
        if (filterType === "Standard") {
            return category.metadata.label !== "Local" && category.metadata.label !== "CurrentOrg";
        } else if (filterType === "Organization") {
            return category.metadata.label === "CurrentOrg";
        }
        // "All" shows all categories except Local (which is handled separately)
        return category.metadata.label !== "Local";
    });

    const isLoading = isSearching || fetchingInfo;

    // Show configuration form when connector is selected
    if (wizardStep === "connector" && selectedConnector) {
        return (
            <ConnectionConfigurationPopup
                selectedConnector={selectedConnector}
                fileName={fileName}
                target={target}
                onClose={handleCloseWizard}
                onBack={handleBackToConnectorList}
                filteredCategories={filteredCategories}
            />
        );
    }

    if (wizardStep === "api") {
        return (
            <>
                <PopupOverlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }} />
                <APIConnectionPopup
                    projectPath={projectPath}
                    fileName={fileName}
                    target={target}
                    onClose={handleCloseWizard}
                    onBack={handleBackToConnectorList}
                />
            </>
        );
    }

    if (wizardStep === "database") {
        return (
            <DatabaseConnectionPopup
                fileName={fileName}
                target={target}
                onClose={handleCloseWizard}
                onBack={handleBackToConnectorList}
                onBrowseConnectors={handleBackToConnectorList}
            />
        );
    }

    const handleClosePopup = () => {
        if (isPopup) {
            onClose?.();
        } else {
            onNavigateToOverview();
        }
    };

    const openLearnMoreURL = () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: 'https://ballerina.io/learn/publish-packages-to-ballerina-central/'
        })
    };

    const getConnectorCreationOptions = () => {
        if (!searchText || searchText.trim() === "") {
            // No search - show both options (database shown disabled if hasPersistConnection)
            return { showApiSpec: true, showDatabase: experimentalEnabled };
        }

        const lowerSearchText = searchText.toLowerCase().trim();

        // Database-related keywords
        const databaseKeywords = [
            "database", "db", "mysql", "postgresql", "postgres", "mssql", "sql server",
            "sqlserver", "oracle", "sqlite", "mariadb", "mongodb", "cassandra",
            "redis", "dynamodb", "table", "schema", "query", "sql"
        ];

        // API-related keywords
        const apiKeywords = [
            "api", "http", "https", "rest", "graphql", "soap", "wsdl", "openapi",
            "swagger", "endpoint", "service", "client", "request", "response",
            "json", "xml", "yaml", "websocket", "rpc"
        ];

        const isDatabaseSearch = databaseKeywords.some(keyword => lowerSearchText.includes(keyword));
        const isApiSearch = apiKeywords.some(keyword => lowerSearchText.includes(keyword));

        // If search matches database keywords, show only database option
        if (isDatabaseSearch && !isApiSearch) {
            return { showApiSpec: false, showDatabase: experimentalEnabled };
        }

        // If search matches API keywords, show only API spec option
        if (isApiSearch && !isDatabaseSearch) {
            return { showApiSpec: true, showDatabase: false };
        }

        // If both or neither match, show both options
        return { showApiSpec: true, showDatabase: experimentalEnabled };
    };

    const connectorOptions = getConnectorCreationOptions();

    return (
        <>
            <PopupOverlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }} />
            <PopupContainer>
                <PopupHeader>
                    <PopupTitle variant="h2">Add Connection</PopupTitle>
                    <CloseButton appearance="icon" onClick={() => handleClosePopup()}>
                        <Codicon name="close" />
                    </CloseButton>
                </PopupHeader>
                <PopupContent>
                    <IntroText>
                        {experimentalEnabled ? (
                            <>
                                To establish your connection, first define a connector. You may create a custom connector using
                                an API specification or by introspecting a database. Alternatively, you can select one of the
                                pre-built connectors below. You will then be guided to provide the required details to complete
                                the connection setup.
                            </>
                        ) : (
                            <>
                                To establish your connection, first define a connector. You may create a custom connector using
                                an API specification. Alternatively, you can select one of the pre-built connectors below. You will then be guided to provide the required details to complete
                                the connection setup.
                            </>
                        )}

                    </IntroText>

                    <SearchContainer>
                        <StyledSearchBox
                            value={searchText}
                            placeholder="Search connectors..."
                            onChange={handleOnSearch}
                            size={60}
                        />
                    </SearchContainer>

                    {(connectorOptions.showApiSpec || connectorOptions.showDatabase) && (
                        <Section>
                            <SectionTitle variant="h4">Create New Connector</SectionTitle>
                            <CreateConnectorOptions>
                                {connectorOptions.showApiSpec && (
                                    <ConnectorOptionCard onClick={handleApiSpecConnection}>
                                        <ConnectorOptionIcon>
                                            <Icon name="bi-api-spec" sx={{ fontSize: 24, width: 24, height: 24 }} />
                                        </ConnectorOptionIcon>
                                        <ConnectorOptionContent>
                                            <ConnectorOptionTitle>Connect via API Specification</ConnectorOptionTitle>
                                            <ConnectorOptionDescription>
                                                Import an OpenAPI or WSDL file to create a connector
                                            </ConnectorOptionDescription>
                                            <ConnectorOptionButtons>
                                                <ConnectorTypeLabel>
                                                    OpenAPI
                                                </ConnectorTypeLabel>
                                                <ConnectorTypeLabel>
                                                    WSDL
                                                </ConnectorTypeLabel>
                                            </ConnectorOptionButtons>
                                        </ConnectorOptionContent>
                                        <ArrowIcon>
                                            <Codicon name="chevron-right" />
                                        </ArrowIcon>
                                    </ConnectorOptionCard>
                                )}
                                {/* Temporary disable DB connection option if persist connection exists */}
                                {connectorOptions.showDatabase && (() => {
                                    const databaseCardContent = (
                                        <>
                                            <ConnectorOptionIcon>
                                                <Icon name="bi-db" sx={{ fontSize: 24, width: 24, height: 24 }} />
                                            </ConnectorOptionIcon>
                                            <ConnectorOptionContent>
                                                <ConnectorOptionTitleContainer>
                                                    <ConnectorOptionTitle>Connect to a Database</ConnectorOptionTitle>
                                                    <ExperimentalBadge>Experimental</ExperimentalBadge>
                                                </ConnectorOptionTitleContainer>
                                                <ConnectorOptionDescription>
                                                    Enter credentials to introspect and discover database tables
                                                </ConnectorOptionDescription>
                                                <ConnectorOptionButtons>
                                                    <ConnectorTypeLabel>
                                                        MySQL
                                                    </ConnectorTypeLabel>
                                                    <ConnectorTypeLabel>
                                                        MSSQL
                                                    </ConnectorTypeLabel>
                                                    <ConnectorTypeLabel>
                                                        PostgreSQL
                                                    </ConnectorTypeLabel>
                                                </ConnectorOptionButtons>
                                            </ConnectorOptionContent>
                                            <ArrowIcon>
                                                <Codicon name="chevron-right" />
                                            </ArrowIcon>
                                        </>
                                    );

                                    const databaseCard = (
                                        <ConnectorOptionCard
                                            disabled={hasPersistConnection}
                                            onClick={(e) => {
                                                if (hasPersistConnection) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                handleDatabaseConnection();
                                            }}
                                        >
                                            {databaseCardContent}
                                        </ConnectorOptionCard>
                                    );

                                    return hasPersistConnection ? (
                                        <Tooltip
                                            content="Currently, only one database connection with schema introspection is supported per project. Use pre-built connectors to connect to other databases."
                                            position="top"
                                        >
                                            {databaseCard}
                                        </Tooltip>
                                    ) : (
                                        databaseCard
                                    );
                                })()}
                            </CreateConnectorOptions>
                        </Section>
                    )}

                    <Section>
                        <SectionHeader>
                            <SectionTitle variant="h4">Pre-built Connectors</SectionTitle>
                            <FilterButtons>
                                <FilterButton
                                    active={filterType === "All"}
                                    onClick={() => setFilterType("All")}
                                >
                                    All
                                </FilterButton>
                                <FilterButton
                                    active={filterType === "Standard"}
                                    onClick={() => setFilterType("Standard")}
                                >
                                    Standard
                                </FilterButton>
                                <FilterButton
                                    active={filterType === "Organization"}
                                    onClick={() => setFilterType("Organization")}
                                >
                                    Organization
                                </FilterButton>
                            </FilterButtons>
                        </SectionHeader>
                        {isLoading && (
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
                                <ProgressRing />
                            </div>
                        )}
                        {!isLoading && filteredCategories && filteredCategories.length > 0 && (
                            <ConnectorsGrid>
                                {filteredCategories.map((category, index) => {
                                    if (!category.items || category.items.length === 0) {
                                        return null;
                                    }

                                    return (
                                        <React.Fragment key={category.metadata.label + index}>
                                            {category.items.map((connector, connectorIndex) => {
                                                const availableNode = connector as AvailableNode;
                                                if (!("codedata" in connector)) {
                                                    return null;
                                                }
                                                return (
                                                    <ButtonCard
                                                        id={`connector-${availableNode.metadata.label.replace(/[ .]/g, "-").toLowerCase()}`}
                                                        key={availableNode.metadata.label + connectorIndex}
                                                        title={availableNode.metadata.label}
                                                        description={
                                                            availableNode.codedata
                                                                ? availableNode.codedata.org +
                                                                " / " +
                                                                availableNode.codedata.module
                                                                : availableNode.metadata.description || ""
                                                        }
                                                        truncate={true}
                                                        icon={
                                                            availableNode.metadata.icon ? (
                                                                <ConnectorIcon url={availableNode.metadata.icon} />
                                                            ) : (
                                                                <Codicon name="package" />
                                                            )
                                                        }
                                                        onClick={() => handleSelectConnector(availableNode)}
                                                    />
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </ConnectorsGrid>
                        )}
                        {!isLoading && (!filteredCategories || filteredCategories.length === 0) && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", padding: "40px" }}>
                                {filterType === "Organization" ? (
                                    <>
                                        <BodyTinyInfo style={{ textAlign: "center" }}>
                                            No connectors found in your organization. You can create and publish connectors to Ballerina Central.
                                        </BodyTinyInfo>
                                        <BodyTinyInfo style={{ textAlign: "center", color: 'var(--vscode-descriptionForeground)' }}>
                                            Learn how to{' '}
                                            <span
                                                style={{
                                                    color: 'var(--vscode-textLink-foreground)',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline'
                                                }}
                                                onClick={() => {
                                                    openLearnMoreURL();
                                                }}
                                            >
                                                publish packages to Ballerina Central
                                            </span>
                                        </BodyTinyInfo>
                                    </>
                                ) : (
                                    <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                                        No connectors found.
                                    </Typography>
                                )}
                            </div>
                        )}
                    </Section>
                </PopupContent>
            </PopupContainer>
        </>
    );
}

export default AddConnectionPopup;

