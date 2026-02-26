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
    ClausePositionRequest,
    ClausePositionResponse,
    ClearTypeCacheResponse,
    ConvertExpressionRequest,
    ConvertExpressionResponse,
    ConvertToQueryRequest,
    CreateConvertedVariableRequest,
    DMModelRequest,
    DataMapperAPI,
    DataMapperModelRequest,
    DataMapperModelResponse,
    DataMapperSourceRequest,
    DataMapperSourceResponse,
    DeleteClauseRequest,
    DeleteMappingRequest,
    DeleteSubMappingRequest,
    ExpandedDMModelResponse,
    FieldPropertyRequest,
    GetDataMapperCodedataRequest,
    GetDataMapperCodedataResponse,
    GetSubMappingCodedataRequest,
    InitialIDMSourceRequest,
    InitialIDMSourceResponse,
    MapWithFnRequest,
    ProcessTypeReferenceRequest,
    ProcessTypeReferenceResponse,
    PropertyRequest,
    PropertyResponse,
    VisualizableFieldsRequest,
    VisualizableFieldsResponse,
    addClauses,
    addNewArrayElement,
    addSubMapping,
    clearTypeCache,
    convertToQuery,
    createConvertedVariable,
    deleteClause,
    deleteMapping,
    deleteSubMapping,
    getClausePosition,
    getConvertedExpression,
    getDataMapperCodedata,
    getDataMapperModel,
    getDataMapperSource,
    getExpandedDMFromDMModel,
    getFieldProperty,
    getInitialIDMSource,
    getProcessTypeReference,
    getProperty,
    getSubMappingCodedata,
    getVisualizableFields,
    mapWithCustomFn,
    mapWithTransformFn
} from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class DataMapperRpcClient implements DataMapperAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    getInitialIDMSource(params: InitialIDMSourceRequest): Promise<InitialIDMSourceResponse> {
        return this._messenger.sendRequest(getInitialIDMSource, HOST_EXTENSION, params);
    }

    getDataMapperModel(params: DataMapperModelRequest): Promise<DataMapperModelResponse> {
        return this._messenger.sendRequest(getDataMapperModel, HOST_EXTENSION, params);
    }

    getDataMapperSource(params: DataMapperSourceRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(getDataMapperSource, HOST_EXTENSION, params);
    }

    getVisualizableFields(params: VisualizableFieldsRequest): Promise<VisualizableFieldsResponse> {
        return this._messenger.sendRequest(getVisualizableFields, HOST_EXTENSION, params);
    }

    addNewArrayElement(params: AddArrayElementRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(addNewArrayElement, HOST_EXTENSION, params);
    }

    convertToQuery(params: ConvertToQueryRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(convertToQuery, HOST_EXTENSION, params);
    }

    addClauses(params: AddClausesRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(addClauses, HOST_EXTENSION, params);
    }

    deleteClause(params: DeleteClauseRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(deleteClause, HOST_EXTENSION, params);
    }

    addSubMapping(params: AddSubMappingRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(addSubMapping, HOST_EXTENSION, params);
    }

    deleteMapping(params: DeleteMappingRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(deleteMapping, HOST_EXTENSION, params);
    }

    deleteSubMapping(params: DeleteSubMappingRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(deleteSubMapping, HOST_EXTENSION, params);
    }

    mapWithCustomFn(params: MapWithFnRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(mapWithCustomFn, HOST_EXTENSION, params);
    }

    mapWithTransformFn(params: MapWithFnRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(mapWithTransformFn, HOST_EXTENSION, params);
    }

    getDataMapperCodedata(params: GetDataMapperCodedataRequest): Promise<GetDataMapperCodedataResponse> {
        return this._messenger.sendRequest(getDataMapperCodedata, HOST_EXTENSION, params);
    }

    getSubMappingCodedata(params: GetSubMappingCodedataRequest): Promise<GetDataMapperCodedataResponse> {
        return this._messenger.sendRequest(getSubMappingCodedata, HOST_EXTENSION, params);
    }

    getProperty(params: PropertyRequest): Promise<PropertyResponse> {
        return this._messenger.sendRequest(getProperty, HOST_EXTENSION, params);
    }

    getFieldProperty(params: FieldPropertyRequest): Promise<PropertyResponse> {
        return this._messenger.sendRequest(getFieldProperty, HOST_EXTENSION, params);
    }

    getClausePosition(params: ClausePositionRequest): Promise<ClausePositionResponse> {
        return this._messenger.sendRequest(getClausePosition, HOST_EXTENSION, params);
    }

    getExpandedDMFromDMModel(params: DMModelRequest): Promise<ExpandedDMModelResponse> {
        return this._messenger.sendRequest(getExpandedDMFromDMModel, HOST_EXTENSION, params);
    }

    getProcessTypeReference(params: ProcessTypeReferenceRequest): Promise<ProcessTypeReferenceResponse> {
        return this._messenger.sendRequest(getProcessTypeReference, HOST_EXTENSION, params);
    }

    getConvertedExpression(params: ConvertExpressionRequest): Promise<ConvertExpressionResponse> {
        return this._messenger.sendRequest(getConvertedExpression, HOST_EXTENSION, params);
    }

    createConvertedVariable(params: CreateConvertedVariableRequest): Promise<DataMapperSourceResponse> {
        return this._messenger.sendRequest(createConvertedVariable, HOST_EXTENSION, params);
    }

    clearTypeCache(): Promise<ClearTypeCacheResponse> {
        return this._messenger.sendRequest(clearTypeCache, HOST_EXTENSION);
    }
}
