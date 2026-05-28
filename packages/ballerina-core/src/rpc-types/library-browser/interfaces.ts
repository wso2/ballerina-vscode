/* eslint-disable @typescript-eslint/no-explicit-any */
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

export enum LibraryKind {
    langLib = 'langLibs',
    stdLib = 'modules',
}

export interface LibrariesListRequest {
    kind?: LibraryKind;
}

export interface LibrariesListResponse {
    librariesList: LibraryInfo[];
}


export interface LibraryDataRequest {
    orgName: string;
    moduleName: string;
    version: string;
}

export interface LibraryDataResponse {
    docsData: LibraryDocsData;
    searchData: LibrarySearchResponse;
}

export interface LibrarySearchResponse {
    modules: LibraryInfo[];
    classes: ModuleProperty[];
    functions: ModuleProperty[];
    records: ModuleProperty[];
    constants: ModuleProperty[];
    errors: ModuleProperty[];
    types: ModuleProperty[];
    clients: ModuleProperty[];
    listeners: ModuleProperty[];
    annotations: ModuleProperty[];
    objectTypes: ModuleProperty[];
    enums: ModuleProperty[];
}

export interface LibraryDocsData {
    releaseVersion: string;
    langLibs: any;
    modules: LibraryModule[];
}

export interface LibraryInfo {
    id: string;
    summary?: string;
    description?: string;
    orgName: string;
    version: string;
    isDefaultModule: boolean;
}

export interface ModuleProperty {
    id: string;
    description: string;
    moduleId: string;
    moduleOrgName: string;
    moduleVersion: string;
}

export interface LibraryModule {
    relatedModules: any;
    records: any;
    classes: any;
    objectTypes: any;
    clients: any;
    listeners: any;
    functions: LibraryFunction[];
    constants: any;
    annotations: any;
    errors: any;
    types: any;
    enums: any;
    variables: any;
    id: string;
    summary: string;
    description: string;
    orgName: string;
    version: string;
    isDefaultModule: boolean;
}

export interface LibraryFunction {
    isIsolated: boolean;
    isRemote: boolean;
    isExtern: boolean;
    parameters: FunctionParams[];
    returnParameters: any;
    name: string;
    description: string;
    isDeprecated: boolean;
    isReadOnly: boolean;
}

export interface FunctionParams {
    defaultValue: string;
    type: any;
    name: string;
    description: string;
    isDeprecated: boolean;
    isReadOnly: boolean;
}
