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
    AddClausesRequest,
    AddSubMappingRequest,
    ConvertToQueryRequest,
    DeleteMappingRequest,
    GetInlineDataMapperCodedataRequest,
    GetInlineDataMapperCodedataResponse,
    GetSubMappingCodedataRequest,
    InitialIDMSourceRequest,
    InitialIDMSourceResponse,
    InlineDataMapperAPI,
    InlineDataMapperModelRequest,
    InlineDataMapperModelResponse,
    InlineDataMapperSourceRequest,
    InlineDataMapperSourceResponse,
    PropertyRequest,
    PropertyResponse,
    VisualizableFieldsRequest,
    VisualizableFieldsResponse,
    addClauses,
    addNewArrayElement,
    addSubMapping,
    convertToQuery,
    deleteMapping,
    getDataMapperCodedata,
    getDataMapperModel,
    getDataMapperSource,
    getInitialIDMSource,
    getProperty,
    getSubMappingCodedata,
    getVisualizableFields
} from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class InlineDataMapperRpcClient implements InlineDataMapperAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    getInitialIDMSource(params: InitialIDMSourceRequest): Promise<InitialIDMSourceResponse> {
        return this._messenger.sendRequest(getInitialIDMSource, HOST_EXTENSION, params);
    }

    getDataMapperModel(params: InlineDataMapperModelRequest): Promise<InlineDataMapperModelResponse> {
        return this._messenger.sendRequest(getDataMapperModel, HOST_EXTENSION, params);
    }

    getDataMapperSource(params: InlineDataMapperSourceRequest): Promise<InlineDataMapperSourceResponse> {
        return this._messenger.sendRequest(getDataMapperSource, HOST_EXTENSION, params);
    }

    getVisualizableFields(params: VisualizableFieldsRequest): Promise<VisualizableFieldsResponse> {
        return this._messenger.sendRequest(getVisualizableFields, HOST_EXTENSION, params);
    }

    addNewArrayElement(params: AddArrayElementRequest): Promise<InlineDataMapperSourceResponse> {
        return this._messenger.sendRequest(addNewArrayElement, HOST_EXTENSION, params);
    }

    convertToQuery(params: ConvertToQueryRequest): Promise<InlineDataMapperSourceResponse> {
        return this._messenger.sendRequest(convertToQuery, HOST_EXTENSION, params);
    }

    addClauses(params: AddClausesRequest): Promise<InlineDataMapperSourceResponse> {
        return this._messenger.sendRequest(addClauses, HOST_EXTENSION, params);
    }

    addSubMapping(params: AddSubMappingRequest): Promise<InlineDataMapperSourceResponse> {
        return this._messenger.sendRequest(addSubMapping, HOST_EXTENSION, params);
    }

    deleteMapping(params: DeleteMappingRequest): Promise<InlineDataMapperSourceResponse> {
        return this._messenger.sendRequest(deleteMapping, HOST_EXTENSION, params);
    }

    getDataMapperCodedata(params: GetInlineDataMapperCodedataRequest): Promise<GetInlineDataMapperCodedataResponse> {
        return this._messenger.sendRequest(getDataMapperCodedata, HOST_EXTENSION, params);
    }

    getSubMappingCodedata(params: GetSubMappingCodedataRequest): Promise<GetInlineDataMapperCodedataResponse> {
        return this._messenger.sendRequest(getSubMappingCodedata, HOST_EXTENSION, params);
    }

    getProperty(params: PropertyRequest): Promise<PropertyResponse> {
        return this._messenger.sendRequest(getProperty, HOST_EXTENSION, params);
    }
}
