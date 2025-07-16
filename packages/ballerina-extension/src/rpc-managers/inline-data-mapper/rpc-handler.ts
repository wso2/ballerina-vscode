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
    AddArrayElementRequest,
    addClauses,
    AddClausesRequest,
    addNewArrayElement,
    convertToQuery,
    ConvertToQueryRequest,
    getAllDataMapperSource,
    getDataMapperCodedata,
    getProperty,
    PropertyRequest,
    getDataMapperModel,
    getDataMapperSource,
    getInitialIDMSource,
    GetInlineDataMapperCodedataRequest,
    getSubMappingCodedata,
    GetSubMappingCodedataRequest,
    getVisualizableFields,
    addSubMapping,
    AddSubMappingRequest,
    InitialIDMSourceRequest,
    InlineAllDataMapperSourceRequest,
    InlineDataMapperModelRequest,
    InlineDataMapperSourceRequest,
    VisualizableFieldsRequest
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { InlineDataMapperRpcManager } from "./rpc-manager";

export function registerInlineDataMapperRpcHandlers(messenger: Messenger) {
    const rpcManger = new InlineDataMapperRpcManager();
    messenger.onRequest(getInitialIDMSource, (args: InitialIDMSourceRequest) => rpcManger.getInitialIDMSource(args));
    messenger.onRequest(getDataMapperModel, (args: InlineDataMapperModelRequest) => rpcManger.getDataMapperModel(args));
    messenger.onRequest(getDataMapperSource, (args: InlineDataMapperSourceRequest) => rpcManger.getDataMapperSource(args));
    messenger.onRequest(getVisualizableFields, (args: VisualizableFieldsRequest) => rpcManger.getVisualizableFields(args));
    messenger.onRequest(addNewArrayElement, (args: AddArrayElementRequest) => rpcManger.addNewArrayElement(args));
    messenger.onRequest(convertToQuery, (args: ConvertToQueryRequest) => rpcManger.convertToQuery(args));
    messenger.onRequest(addClauses, (args: AddClausesRequest) => rpcManger.addClauses(args));
    messenger.onRequest(addSubMapping, (args: AddSubMappingRequest) => rpcManger.addSubMapping(args));
    messenger.onRequest(getDataMapperCodedata, (args: GetInlineDataMapperCodedataRequest) => rpcManger.getDataMapperCodedata(args));
    messenger.onRequest(getSubMappingCodedata, (args: GetSubMappingCodedataRequest) => rpcManger.getSubMappingCodedata(args));
    messenger.onRequest(getAllDataMapperSource, (args: InlineAllDataMapperSourceRequest) => rpcManger.getAllDataMapperSource(args));
    messenger.onRequest(getProperty, (args: PropertyRequest) => rpcManger.getProperty(args));
}
