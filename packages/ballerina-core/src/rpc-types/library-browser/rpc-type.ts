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
import { LibraryDataRequest, LibraryDataResponse, LibrariesListResponse, LibrarySearchResponse, LibrariesListRequest } from "./interfaces";
import { RequestType } from "vscode-messenger-common";

const _preFix = "library-browser";
export const getLibrariesList: RequestType<LibrariesListRequest, LibrariesListResponse> = { method: `${_preFix}/getLibrariesList` };
export const getLibrariesData: RequestType<void, LibrarySearchResponse> = { method: `${_preFix}/getLibrariesData` };
export const getLibraryData: RequestType<LibraryDataRequest, LibraryDataResponse> = { method: `${_preFix}/getLibraryData` };
