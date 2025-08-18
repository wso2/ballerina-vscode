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
    ConvertToQueryRequest,
    AddClausesRequest,
    InlineDataMapperModelRequest,
    InlineDataMapperModelResponse,
    InlineDataMapperSourceRequest,
    InlineDataMapperSourceResponse,
    VisualizableFieldsRequest,
    VisualizableFieldsResponse,
    PropertyRequest,
    PropertyResponse,
    InitialIDMSourceResponse,
    InitialIDMSourceRequest,
    GetInlineDataMapperCodedataRequest,
    GetInlineDataMapperCodedataResponse,
    GetSubMappingCodedataRequest,
    InlineAllDataMapperSourceRequest,
    AddSubMappingRequest,
    DeleteMappingRequest,
    MapWithCustomFnRequest
} from "../../interfaces/extended-lang-client";
import { RequestType } from "vscode-messenger-common";

const _preFix = "inline-data-mapper";
export const getInitialIDMSource: RequestType<InitialIDMSourceRequest, InitialIDMSourceResponse> = { method: `${_preFix}/getInitialIDMSource` };
export const getDataMapperModel: RequestType<InlineDataMapperModelRequest, InlineDataMapperModelResponse> = { method: `${_preFix}/getDataMapperModel` };
export const getDataMapperSource: RequestType<InlineDataMapperSourceRequest, InlineDataMapperSourceResponse> = { method: `${_preFix}/getDataMapperSource` };
export const getVisualizableFields: RequestType<VisualizableFieldsRequest, VisualizableFieldsResponse> = { method: `${_preFix}/getVisualizableFields` };
export const addNewArrayElement: RequestType<AddArrayElementRequest, InlineDataMapperSourceResponse> = { method: `${_preFix}/addNewArrayElement` };
export const convertToQuery: RequestType<ConvertToQueryRequest, InlineDataMapperSourceResponse> = { method: `${_preFix}/convertToQuery` };
export const addClauses: RequestType<AddClausesRequest, InlineDataMapperSourceResponse> = { method: `${_preFix}/addClauses` };
export const addSubMapping: RequestType<AddSubMappingRequest, InlineDataMapperSourceResponse> = { method: `${_preFix}/addSubMapping` };
export const deleteMapping: RequestType<DeleteMappingRequest, InlineDataMapperSourceResponse> = { method: `${_preFix}/deleteMapping` };
export const mapWithCustomFn: RequestType<MapWithCustomFnRequest, InlineDataMapperSourceResponse> = { method: `${_preFix}/mapWithCustomFn` };
export const getDataMapperCodedata: RequestType<GetInlineDataMapperCodedataRequest, GetInlineDataMapperCodedataResponse> = { method: `${_preFix}/getDataMapperCodedata` };
export const getSubMappingCodedata: RequestType<GetSubMappingCodedataRequest, GetInlineDataMapperCodedataResponse> = { method: `${_preFix}/getSubMappingCodedata` };
export const getAllDataMapperSource: RequestType<InlineAllDataMapperSourceRequest, InlineDataMapperSourceResponse> = { method: `${_preFix}/getAllDataMapperSource` };
export const getProperty: RequestType<PropertyRequest, PropertyResponse> = { method: `${_preFix}/getProperty` };
