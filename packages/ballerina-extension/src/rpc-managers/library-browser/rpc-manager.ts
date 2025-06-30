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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    LibrariesListRequest,
    LibrariesListResponse,
    LibraryBrowserAPI,
    LibraryDataRequest,
    LibraryDataResponse,
    LibrarySearchResponse
} from "@wso2/ballerina-core";
import { getAllResources, getLibrariesList, getLibraryData } from "../../features/library-browser";

export class LibraryBrowserRpcManager implements LibraryBrowserAPI {
    async getLibrariesList(params: LibrariesListRequest): Promise<LibrariesListResponse> {
        return getLibrariesList(params.kind);
    }

    async getLibrariesData(): Promise<LibrarySearchResponse> {
        return getAllResources();
    }

    async getLibraryData(params: LibraryDataRequest): Promise<LibraryDataResponse> {
        return getLibraryData(params.orgName, params.moduleName, params.version);
    }
}
