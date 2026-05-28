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
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React, { useContext, useEffect, useMemo, useState } from "react";

import {
    LibraryDataResponse,
    LibrarySearchResponse
} from "@wso2/ballerina-core";
import { Button, Codicon, Icon, ProgressRing, SearchBox, Typography } from "@wso2/ui-toolkit";
import debounce from "lodash.debounce";

import { StatementEditorContext } from "../../store/statement-editor-context";
import { DiagnosticsPaneId } from "../Diagnostics";
import { useStmtEditorHelperPanelStyles } from "../styles";

import { useLibrariesList, useLibrarySearchData } from "./Hooks";
import { LibrariesList } from "./LibrariesList";
import { SearchResult } from "./SearchResult";
import { filterByKeyword } from "./utils";

interface LibraryBrowserProps {
    libraryType: string;
}

enum LibraryBrowserMode {
    LIB_LIST = 'libraries_list',
    LIB_SEARCH = 'libraries_search',
    LIB_BROWSE = 'library_browse',
}

const DEFAULT_SEARCH_SCOPE = "distribution";

export function LibraryBrowser(props: LibraryBrowserProps) {
    const { libraryType } = props;
    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();
    const { libraryBrowserRpcClient } = useContext(StatementEditorContext);

    const [libraryBrowserMode, setLibraryBrowserMode] = useState(LibraryBrowserMode.LIB_LIST);
    const [searchScope, setSearchScope] = useState(DEFAULT_SEARCH_SCOPE);
    const [filteredSearchData, setFilteredSearchData] = useState<LibrarySearchResponse>();
    const [libraryData, setLibraryData] = useState<LibraryDataResponse>();
    const [moduleTitle, setModuleTitle] = useState('');
    const [moduleSelected, setModuleSelected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [diagnosticsHeight, setDiagnosticsHeight] = useState(0);

    const { librariesSearchData, isFetchingSearchData } = useLibrarySearchData(libraryBrowserRpcClient);
    const { libraries, isFetchingLibList } = useLibrariesList(libraryBrowserRpcClient, libraryType);

    const {
        statementCtx: {
            diagnostics,
            errorMsg
        }
    } = useContext(StatementEditorContext);

    useEffect(() => {
        setLibraryBrowserMode(LibraryBrowserMode.LIB_LIST);
        setSearchScope(DEFAULT_SEARCH_SCOPE);
        setModuleTitle('');
        setModuleSelected(false);
        resetKeyword();
        libraryDataFetchingHandler(false);
    }, [libraryType]);

    // A workaround for https://github.com/microsoft/vscode-webview-ui-toolkit/issues/464
    useEffect(() => {
        const handleResize = () => {
            const diagnosticsElement = document.getElementById(DiagnosticsPaneId);
            if (diagnosticsElement) {
                const height = diagnosticsElement.offsetHeight;
                setDiagnosticsHeight(height);
            }
        };
        handleResize();
    }, [diagnostics, errorMsg]);

    const libraryBrowsingHandler = (data: LibraryDataResponse) => {
        setLibraryData(data);
        setLibraryBrowserMode(LibraryBrowserMode.LIB_BROWSE);
        setSearchScope(data.searchData.modules[0].id);
        setModuleTitle(data.searchData.modules[0].id);
        setModuleSelected(true);
        resetKeyword();
    };

    const onClickOnReturnIcon = async () => {
        setLibraryBrowserMode(LibraryBrowserMode.LIB_LIST);
        setSearchScope(DEFAULT_SEARCH_SCOPE);
        setModuleTitle('');
        setModuleSelected(false);
        resetKeyword();
    }

    const isEmptyFilteredList = useMemo(() => {
        if (filteredSearchData){
            return !Object.values(filteredSearchData).some(it => it.length > 0);
        }
    }, [filteredSearchData]);

    const libraryDataFetchingHandler = (isFetching: boolean) => {
        setIsLoading(isFetching);
    }

    const resetKeyword = () => {
        const searchInput = (document.getElementById("searchKeyword") as HTMLInputElement);
        searchInput.value = '';
    }

    const loadingScreen = (
        <div className={stmtEditorHelperClasses.loadingContainer}>
            <ProgressRing sx={{height: '35px', width: '35px', marginBottom: '12px'}} />
            <Typography variant="body2">Loading...</Typography>
        </div>
    );

    const searchLibrary = (value: string) => {
        setSearchValue(value);
        libraryDataFetchingHandler(true);

        if (value === '' && !moduleSelected) {
            setLibraryBrowserMode(LibraryBrowserMode.LIB_LIST);
            setSearchScope(DEFAULT_SEARCH_SCOPE);
        } else {
            let filteredData;
            if (librariesSearchData && searchScope === DEFAULT_SEARCH_SCOPE) {
                filteredData = filterByKeyword(librariesSearchData, value);
            } else if (libraryData && searchScope !== DEFAULT_SEARCH_SCOPE) {
                filteredData = filterByKeyword(libraryData.searchData, value);
            }
            setLibraryBrowserMode(LibraryBrowserMode.LIB_SEARCH);
            setFilteredSearchData(filteredData);
        }

        libraryDataFetchingHandler(false);
    }

    const debounceLibrarySearch = debounce(searchLibrary, 500);

    return (
        <div className={stmtEditorHelperClasses.libraryBrowser}>
            <div className={stmtEditorHelperClasses.libraryBrowserHeader}>
                {(libraryBrowserMode !== LibraryBrowserMode.LIB_LIST || searchScope !== DEFAULT_SEARCH_SCOPE) && (
                    <>
                        <Button
                            appearance="icon"
                            onClick={onClickOnReturnIcon}
                            className={stmtEditorHelperClasses.libraryReturnIcon}
                            data-testid="search-return"
                        >
                            <Codicon name="arrow-left" />
                        </ Button>
                        {moduleTitle && (
                            <>
                                <Icon
                                    name="module-icon"
                                    sx={{fontSize: "16px"}}
                                />
                                <div className={stmtEditorHelperClasses.moduleTitle}>{moduleTitle}</div>
                            </>
                        )}
                    </>
                )}
                <SearchBox
                    id={'searchKeyword'}
                    autoFocus={true}
                    placeholder={`Search in ${searchScope}`}
                    value={searchValue}
                    onChange={debounceLibrarySearch}
                    size={100}
                    data-testid="library-searchbar"
                />
            </div>
            {isLoading || isFetchingSearchData || isFetchingLibList ? loadingScreen : (
                <>
                    <div
                        className={stmtEditorHelperClasses.libraryWrapper}
                        style={{maxHeight: `calc(100vh - ${ 305 + diagnosticsHeight}px)`}}
                    >
                        {libraryBrowserMode === LibraryBrowserMode.LIB_LIST && !moduleTitle && (
                            <LibrariesList
                                libraries={libraries}
                                libraryBrowsingHandler={libraryBrowsingHandler}
                                libraryDataFetchingHandler={libraryDataFetchingHandler}
                            />
                        )}
                        {libraryBrowserMode === LibraryBrowserMode.LIB_BROWSE && (
                            <SearchResult
                                librarySearchResponse={libraryData.searchData}
                                moduleSelected={moduleSelected}
                                libraryDataFetchingHandler={libraryDataFetchingHandler}
                            />
                        )}
                        {libraryBrowserMode === LibraryBrowserMode.LIB_SEARCH && filteredSearchData &&
                        (isEmptyFilteredList ?
                            (
                                <Typography
                                    variant="body3"
                                    sx={{marginTop: '15px'}}
                                >
                                    No result found for the searched keyword
                                </Typography>
                            ) :
                            (
                                <SearchResult
                                    librarySearchResponse={filteredSearchData}
                                    libraryBrowsingHandler={libraryBrowsingHandler}
                                    moduleSelected={moduleSelected}
                                    libraryDataFetchingHandler={libraryDataFetchingHandler}
                                />
                            )
                        )}
                    </div>
                </>
            )
            }
        </div >
    );
}
