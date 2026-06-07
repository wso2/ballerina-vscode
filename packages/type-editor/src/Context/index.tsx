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
import { createContext, useContext } from "react"
import { RecordCreatorContext } from "../types"
import { TypeHelperCategory, TypeHelperItem, TypeHelperOperator } from "../TypeHelper";
import { AddImportItemResponse } from "@wso2/ballerina-core";

const defaultContext: any = {}

export const Context = createContext<RecordCreatorContext>(defaultContext);

export type TypeHelperContext = {
    // Whether the types or operators are being loaded
    loading?: boolean;
    // Whether the type browser is loading
    loadingTypeBrowser?: boolean;
    // Array of reference types for the type helper
    referenceTypes: TypeHelperCategory[];
    // Array of types for the type helper
    basicTypes: TypeHelperCategory[];
    // Array of imported types for the type helper
    importedTypes: TypeHelperCategory[];
    // Array of workspace types for the type helper
    workspaceTypes: TypeHelperCategory[];
    // Array of operators for type helper
    operators: TypeHelperOperator[];
    // Callback function to search the type helper
    onSearchTypeHelper: (searchText: string, isType: boolean) => void;
    // Array of types for the type browser
    typeBrowserTypes: TypeHelperCategory[];
    // Callback function to search the type browser
    onSearchTypeBrowser: (searchText: string) => void;
    // Callback function to handle type item click
    onTypeItemClick: (item: TypeHelperItem) => Promise<AddImportItemResponse>;
    // Callback function to close the completions
    onCloseCompletions?: () => void;
    // Callback function to be executed when a new type is created
    onTypeCreate?: (fieldIndex: number,typeName?: string) => void;
};

const defaultTypeHelperContext: TypeHelperContext = {
    loading: false,
    loadingTypeBrowser: false,
    referenceTypes: [],
    basicTypes: [],
    importedTypes: [],
    workspaceTypes: [],
    operators: [],
    typeBrowserTypes: [],
    onSearchTypeHelper: () => { },
    onSearchTypeBrowser: () => { },
    onTypeItemClick: () => Promise.resolve({} as AddImportItemResponse),
    onCloseCompletions: () => { },
    onTypeCreate: () => { }
};

export const TypeHelperContext = createContext<TypeHelperContext>(defaultTypeHelperContext);

export const useTypeHelperContext = () => {
    return useContext(TypeHelperContext);
};
