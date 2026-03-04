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
    AddArrayElementRequest,
    ConvertToQueryRequest,
    AddClausesRequest,
    DeleteClauseRequest,
    DataMapperModelRequest,
    DataMapperModelResponse,
    DataMapperSourceRequest,
    DataMapperSourceResponse,
    VisualizableFieldsRequest,
    VisualizableFieldsResponse,
    PropertyRequest,
    PropertyResponse,
    InitialIDMSourceResponse,
    InitialIDMSourceRequest,
    GetDataMapperCodedataRequest,
    GetDataMapperCodedataResponse,
    GetSubMappingCodedataRequest,
    AllDataMapperSourceRequest,
    AddSubMappingRequest,
    DeleteMappingRequest,
    DeleteSubMappingRequest,
    MapWithFnRequest,
    DMModelRequest,
    ProcessTypeReferenceResponse,
    ProcessTypeReferenceRequest,
    ExpandedDMModelResponse,
    ClearTypeCacheResponse,
    FieldPropertyRequest,
    ClausePositionRequest,
    ClausePositionResponse,
    ConvertExpressionRequest,
    ConvertExpressionResponse,
    CreateConvertedVariableRequest
} from "../../interfaces/extended-lang-client";

export interface DataMapperAPI {
    getInitialIDMSource: (params: InitialIDMSourceRequest) => Promise<InitialIDMSourceResponse>;
    getDataMapperModel: (params: DataMapperModelRequest) => Promise<DataMapperModelResponse>;
    getDataMapperSource: (params: DataMapperSourceRequest) => Promise<DataMapperSourceResponse>;
    getVisualizableFields: (params: VisualizableFieldsRequest) => Promise<VisualizableFieldsResponse>;
    addNewArrayElement: (params: AddArrayElementRequest) => Promise<DataMapperSourceResponse>;
    convertToQuery: (params: ConvertToQueryRequest) => Promise<DataMapperSourceResponse>;
    addClauses: (params: AddClausesRequest) => Promise<DataMapperSourceResponse>;
    deleteClause: (params: DeleteClauseRequest) => Promise<DataMapperSourceResponse>;
    addSubMapping: (params: AddSubMappingRequest) => Promise<DataMapperSourceResponse>;
    deleteMapping: (params: DeleteMappingRequest) => Promise<DataMapperSourceResponse>;
    deleteSubMapping: (params: DeleteSubMappingRequest) => Promise<DataMapperSourceResponse>;
    mapWithCustomFn: (params: MapWithFnRequest) => Promise<DataMapperSourceResponse>;
    mapWithTransformFn: (params: MapWithFnRequest) => Promise<DataMapperSourceResponse>;
    getDataMapperCodedata: (params: GetDataMapperCodedataRequest) => Promise<GetDataMapperCodedataResponse>;
    getSubMappingCodedata: (params: GetSubMappingCodedataRequest) => Promise<GetDataMapperCodedataResponse>;
    getProperty: (params: PropertyRequest) => Promise<PropertyResponse>;
    getFieldProperty: (params: FieldPropertyRequest) => Promise<PropertyResponse>;
    getClausePosition: (params: ClausePositionRequest) => Promise<ClausePositionResponse>;
    getExpandedDMFromDMModel: (params: DMModelRequest) => Promise<ExpandedDMModelResponse>;
    getProcessTypeReference: (params: ProcessTypeReferenceRequest) => Promise<ProcessTypeReferenceResponse>;
    getConvertedExpression: (params: ConvertExpressionRequest) => Promise<ConvertExpressionResponse>;
    createConvertedVariable: (params: CreateConvertedVariableRequest) => Promise<DataMapperSourceResponse>;
    clearTypeCache: () => Promise<ClearTypeCacheResponse>;
}
