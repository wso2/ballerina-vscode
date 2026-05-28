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
import {
    LibraryInfo,
    LibrarySearchResponse,
    ModuleProperty
} from "@wso2/ballerina-core";

export function filterByKeyword(libraryData: LibrarySearchResponse , searchTxt: string): LibrarySearchResponse {
    const filteredModuleList = getFilteredModulesList(libraryData.modules, searchTxt);
    const filteredFunctionsList = getFilteredModulePropertiesList(libraryData.functions, searchTxt);
    const filteredClassesList = getFilteredModulePropertiesList(libraryData.classes, searchTxt);
    const filteredObjTypesList = getFilteredModulePropertiesList(libraryData.objectTypes, searchTxt);
    const filteredRecordsList = getFilteredModulePropertiesList(libraryData.records, searchTxt);
    const filteredConstantsList = getFilteredModulePropertiesList(libraryData.constants, searchTxt);
    const filteredErrorsList = getFilteredModulePropertiesList(libraryData.errors, searchTxt);
    const filteredTypesList = getFilteredModulePropertiesList(libraryData.types, searchTxt);
    const filteredClientsList = getFilteredModulePropertiesList(libraryData.clients, searchTxt);
    const filteredListenersList = getFilteredModulePropertiesList(libraryData.listeners, searchTxt);
    const filteredAnnotationsList = getFilteredModulePropertiesList(libraryData.annotations, searchTxt);
    const filteredEnumsList = getFilteredModulePropertiesList(libraryData.enums, searchTxt);

    return {
        modules: filteredModuleList,
        classes: filteredClassesList,
        functions: filteredFunctionsList,
        records: filteredRecordsList,
        constants: filteredConstantsList,
        errors: filteredErrorsList,
        types: filteredTypesList,
        clients: filteredClientsList,
        listeners: filteredListenersList,
        annotations: filteredAnnotationsList,
        objectTypes: filteredObjTypesList,
        enums: filteredEnumsList
    };
}

function getFilteredModulesList(libraryInfo: LibraryInfo[], searchTxt: string): LibraryInfo[] {
    return libraryInfo.filter((item) => {
        const lc = item.id.toLowerCase();
        const filter = searchTxt.toLowerCase().trim();
        return lc.includes(filter);
    });
}

function getFilteredModulePropertiesList(libraryData: ModuleProperty[], searchTxt: string): ModuleProperty[] {
    return libraryData.filter((item) => {
        const lc = item.id.toLowerCase();
        const filter = searchTxt.toLowerCase().trim();
        return lc.includes(filter);
    });
}
