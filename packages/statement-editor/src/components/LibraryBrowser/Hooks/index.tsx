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
import React from 'react';

import { useQuery } from '@tanstack/react-query';
import { LibraryInfo, LibraryKind, LibrarySearchResponse } from '@wso2/ballerina-core';
import { LibraryBrowserRpcClient } from '@wso2/ballerina-rpc-client';

import { LANG_LIBS_IDENTIFIER, STD_LIBS_IDENTIFIER } from '../../../constants';

export const useLibrarySearchData = (libraryBrowserRpcClient: LibraryBrowserRpcClient): {
    librariesSearchData: LibrarySearchResponse;
    isFetchingSearchData: boolean;
    isError: boolean;
    refetch: any;
} => {
    const fetchLibrarySearchData = async () => {
        try {
            return await libraryBrowserRpcClient.getLibrariesData();
        } catch (networkError: any) {
            // tslint:disable-next-line:no-console
            console.error('Error while fetching library search data', networkError);
        }
    };

    const {
        data: librariesSearchData,
        isFetching: isFetchingSearchData,
        isError,
        refetch,
    } = useQuery(['fetchProjectComponents'], () => fetchLibrarySearchData(), { networkMode: 'always' });

    return { librariesSearchData, isFetchingSearchData, isError, refetch };
};

export const useLibrariesList = (libraryBrowserRpcClient: LibraryBrowserRpcClient, libraryType: string): {
    libraries: LibraryInfo[];
    isFetchingLibList: boolean;
    isError: boolean;
    refetch: any;
} => {
    const fetchLibrariesList = async () => {
        try {
            let response;
            if (libraryType === LANG_LIBS_IDENTIFIER) {
                response = await libraryBrowserRpcClient.getLibrariesList({kind: LibraryKind.langLib});
            } else if (libraryType === STD_LIBS_IDENTIFIER) {
                response = await libraryBrowserRpcClient.getLibrariesList({kind: LibraryKind.stdLib});
            } else {
                response = await libraryBrowserRpcClient.getLibrariesList({});
            }
            return response.librariesList;
        } catch (networkError: any) {
            // tslint:disable-next-line:no-console
            console.error('Error while fetching libraries list', networkError);
        }
    };

    const {
        data: libraries,
        isFetching: isFetchingLibList,
        isError,
        refetch,
    } = useQuery(['fetchProjectComponents', {libraryType}], () => fetchLibrariesList(), { networkMode: 'always' });

    return { libraries, isFetchingLibList, isError, refetch };
};
