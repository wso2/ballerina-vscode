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
// tslint:disable: jsx-no-multiline-js
import React, { ReactNode, SyntheticEvent, useContext, useRef, useState } from "react";


import { PanelContainer } from "@wso2/ballerina-side-panel";
import { Grid, ProgressRing, Typography } from '@wso2/ui-toolkit';
import { LocalVarDecl } from "@wso2/syntax-tree";

import ModuleCard from "./ModuleCard";
import useStyles from "./style";
import { BallerinaRpcClient, useRpcContext } from "@wso2/ballerina-rpc-client";
import { BallerinaConstruct, BallerinaModuleResponse } from "@wso2/ballerina-core";
import SearchBar from "./SearchBar";
import styled from "@emotion/styled";


const GridContainer = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    width: 100%;
`;

const LoadingContainer = styled.div`
    align-items: center;
    display: flex;
    flex-direction: row;
    height: 15vh;
    justify-content: center;
    padding-top: 16px;
    width: 100%;
`;

export interface MarketplaceProps {
    currentFilePath: string;
    onSelect: (balModule: BallerinaConstruct, rpcClient: BallerinaRpcClient, selectedBalModule?: LocalVarDecl) => void;
    onClose: () => void;
    fetchModulesList: (
        queryParams: SearchQueryParams,
        currentFilePath: string,
        langClient: BallerinaRpcClient
    ) => Promise<BallerinaModuleResponse>;
    title: string;
    shortName?: string;
}

export interface SearchQueryParams {
    query: string;
    category?: string;
    filterState?: FilterStateMap;
    page?: number;
    limit?: number;
}

export interface FilterStateMap {
    [key: string]: boolean;
}

export enum BallerinaModuleType {
    Trigger,
    Connector,
}

export function Marketplace(props: MarketplaceProps) {
    const { rpcClient } = useRpcContext();
    const classes = useStyles();
    const { onSelect, title, currentFilePath, onClose } = props;


    const [isSearchResultsFetching, setIsSearchResultsFetching] = useState(true);
    const [isNextPageFetching, setIsNextPageFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const currentPage = useRef(1);
    const fetchCount = useRef(0);
    const isLastPage = useRef(false);
    const centralModules = useRef(new Map<string, BallerinaConstruct>());
    const localModules = useRef(new Map<string, BallerinaConstruct>());

    const pageLimit = 18;

    const shortName = props.shortName || title;

    React.useEffect(() => {
        fetchModulesList();
        // trackFilterChange();
    }, [searchQuery]);

    let centralModuleComponents: ReactNode[] = [];
    let localModuleComponents: ReactNode[] = [];

    const onSelectModule = (balModule: BallerinaConstruct) => {
        onSelect(balModule, rpcClient, undefined);
    };

    const getModuleComponents = (balModules: Map<string, BallerinaConstruct>): ReactNode[] => {
        const componentList: ReactNode[] = [];
        balModules?.forEach((module: BallerinaConstruct, key: string) => {
            const component = (
                <ModuleCard key={key} module={module} onSelectModule={onSelectModule} columns={3} />
            );
            componentList.push(component);
        });
        return componentList;
    };

    const fetchModulesList = async (page?: number) => {
        if (page) {
            setIsNextPageFetching(true);
        } else {
            // Keep track of fetch request count to show/hide preloader
            fetchCount.current = fetchCount.current + 1;
            isLastPage.current = false;
            setIsSearchResultsFetching(true);
        }

        const queryParams: SearchQueryParams = {
            query: searchQuery,
            category: "",
            filterState: {},
            limit: pageLimit,
            page,
        };
        const response: BallerinaModuleResponse = await props.fetchModulesList(queryParams, currentFilePath,
            rpcClient);
        localModules.current.clear();
        response.local?.forEach((module) => {
            localModules.current.set((module.package?.name || module.name), module);
        });
        if (!page) {
            centralModules.current.clear();
            response.central?.forEach((module) => {
                if (module.id && haveConstruct(module)) {
                    centralModules.current.set(module.id, module);
                }
            });
        } else if (response.central?.length > 0) {
            response.central.forEach((module) => {
                if (module.id && haveConstruct(module)) {
                    centralModules.current.set(module.id, module);
                }
            });
        } else {
            isLastPage.current = true;
        }

        if (page) {
            setIsNextPageFetching(false);
        } else {
            fetchCount.current = fetchCount.current > 0 ? fetchCount.current - 1 : 0;
            // Hide preloader only all fetch request are finished
            if (fetchCount.current === 0) {
                setIsSearchResultsFetching(false);
            }
        }
    };

    const haveConstruct = (module: BallerinaConstruct): boolean => {
        return !(module.name === "Caller");
    };

    const preventDiagramScrolling = (e: SyntheticEvent) => {
        e.stopPropagation();
    };

    const onSearchButtonClick = (query: string) => {
        setSearchQuery(query);
    };

    const handleModulesListScroll = (e: React.UIEvent<HTMLElement>) => {
        const bottom = Math.floor(e.currentTarget.scrollHeight - e.currentTarget.scrollTop) <= e.currentTarget.clientHeight;
        if (!isLastPage.current && bottom && !isSearchResultsFetching) {
            currentPage.current = currentPage.current + 1;
            fetchModulesList(currentPage.current);
        }
    };


    if (!isSearchResultsFetching) {
        centralModuleComponents = getModuleComponents(centralModules.current);
        localModuleComponents = getModuleComponents(localModules.current);
    }

    const renderModulesList = (modulesListTitle: string, modules: ReactNode[]): ReactNode => {
        return (
            <>
                {shortName !== "Triggers" ? (
                    <Typography variant="h4">{modulesListTitle}</Typography>
                ) : null}
                <div id="module-list-container" style={{ overflowY: 'scroll', display: 'flex', width: '100%' }}>
                    <GridContainer>
                        {modules}
                    </GridContainer>
                </div>
            </>
        );
    };

    const loadingScreen = (
        <>
            <div>
                <ProgressRing data-testid="marketplace-search-loader" />
            </div>
            <div>
                <Typography variant="body1">Loading {shortName}...</Typography>
            </div>
        </>
    );

    const notFoundComponent = (
        <div>
            <Typography variant="body1">No {shortName.toLocaleLowerCase()} found.</Typography>
        </div>
    );

    const modulesList = (
        <div style={{
            height: '80vh',
            overflowY: 'scroll',
            scrollbarWidth: 'none'
        }} onScroll={handleModulesListScroll}>

            {localModules.current.size > 0 && renderModulesList("Local " + shortName, localModuleComponents)}
            {centralModules.current.size > 0 && renderModulesList("Public " + shortName, centralModuleComponents)}
            {isNextPageFetching && (
                <LoadingContainer>
                    <ProgressRing data-testid="marketplace-next-page-loader" sx={{ height: '16px', width: '16px', marginRight: '20px' }} />
                    <Typography variant="body1" className={classes.pageLoadingText}>
                        Loading more {shortName}...
                    </Typography>
                </LoadingContainer>
            )}
        </div>
    );

    const searchBar = <SearchBar searchQuery={searchQuery} onSearch={onSearchButtonClick} type={shortName} />;

    return (
        <PanelContainer title="Connectors" show={true} width={600} onClose={onClose}>
            {searchBar}
            <div
                id="module-list-container"
                style={{ width: '100%', flexDirection: "row", padding: '15px 20px' }}
                onWheel={preventDiagramScrolling}
            >
                {isSearchResultsFetching && loadingScreen}
                {!isSearchResultsFetching &&
                    (centralModules.current.size > 0 || localModules.current.size > 0) &&
                    modulesList}

                {!isSearchResultsFetching &&
                    centralModules.current.size === 0 &&
                    localModules.current.size === 0 &&
                    notFoundComponent}
            </div>
        </PanelContainer>
    );
}
