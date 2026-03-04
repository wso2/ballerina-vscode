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
    addSubMapping,
    AddSubMappingRequest,
    ClausePositionRequest,
    clearTypeCache,
    ConvertExpressionRequest,
    convertToQuery,
    ConvertToQueryRequest,
    createConvertedVariable,
    CreateConvertedVariableRequest,
    DataMapperModelRequest,
    DataMapperSourceRequest,
    deleteClause,
    DeleteClauseRequest,
    deleteMapping,
    DeleteMappingRequest,
    deleteSubMapping,
    DeleteSubMappingRequest,
    DMModelRequest,
    FieldPropertyRequest,
    getClausePosition,
    getConvertedExpression,
    getDataMapperCodedata,
    GetDataMapperCodedataRequest,
    getDataMapperModel,
    getDataMapperSource,
    getExpandedDMFromDMModel,
    getFieldProperty,
    getInitialIDMSource,
    getProcessTypeReference,
    getProperty,
    getSubMappingCodedata,
    GetSubMappingCodedataRequest,
    getVisualizableFields,
    InitialIDMSourceRequest,
    mapWithCustomFn,
    MapWithFnRequest,
    mapWithTransformFn,
    ProcessTypeReferenceRequest,
    PropertyRequest,
    VisualizableFieldsRequest,
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { DataMapperRpcManager } from "./rpc-manager";

export function registerDataMapperRpcHandlers(messenger: Messenger) {
    const rpcManger = new DataMapperRpcManager();
    messenger.onRequest(getInitialIDMSource, (args: InitialIDMSourceRequest) => rpcManger.getInitialIDMSource(args));
    messenger.onRequest(getDataMapperModel, (args: DataMapperModelRequest) => rpcManger.getDataMapperModel(args));
    messenger.onRequest(getDataMapperSource, (args: DataMapperSourceRequest) => rpcManger.getDataMapperSource(args));
    messenger.onRequest(getVisualizableFields, (args: VisualizableFieldsRequest) => rpcManger.getVisualizableFields(args));
    messenger.onRequest(addNewArrayElement, (args: AddArrayElementRequest) => rpcManger.addNewArrayElement(args));
    messenger.onRequest(convertToQuery, (args: ConvertToQueryRequest) => rpcManger.convertToQuery(args));
    messenger.onRequest(addClauses, (args: AddClausesRequest) => rpcManger.addClauses(args));
    messenger.onRequest(deleteClause, (args: DeleteClauseRequest) => rpcManger.deleteClause(args));
    messenger.onRequest(addSubMapping, (args: AddSubMappingRequest) => rpcManger.addSubMapping(args));
    messenger.onRequest(deleteMapping, (args: DeleteMappingRequest) => rpcManger.deleteMapping(args));
    messenger.onRequest(deleteSubMapping, (args: DeleteSubMappingRequest) => rpcManger.deleteSubMapping(args));
    messenger.onRequest(mapWithCustomFn, (args: MapWithFnRequest) => rpcManger.mapWithCustomFn(args));
    messenger.onRequest(mapWithTransformFn, (args: MapWithFnRequest) => rpcManger.mapWithTransformFn(args));
    messenger.onRequest(getDataMapperCodedata, (args: GetDataMapperCodedataRequest) => rpcManger.getDataMapperCodedata(args));
    messenger.onRequest(getSubMappingCodedata, (args: GetSubMappingCodedataRequest) => rpcManger.getSubMappingCodedata(args));
    messenger.onRequest(getProperty, (args: PropertyRequest) => rpcManger.getProperty(args));
    messenger.onRequest(getFieldProperty, (args: FieldPropertyRequest) => rpcManger.getFieldProperty(args));
    messenger.onRequest(getClausePosition, (args: ClausePositionRequest) => rpcManger.getClausePosition(args));
    messenger.onRequest(getExpandedDMFromDMModel, (args: DMModelRequest) => rpcManger.getExpandedDMFromDMModel(args));
    messenger.onRequest(getProcessTypeReference, (args: ProcessTypeReferenceRequest) => rpcManger.getProcessTypeReference(args));
    messenger.onRequest(getConvertedExpression, (args: ConvertExpressionRequest) => rpcManger.getConvertedExpression(args));
    messenger.onRequest(createConvertedVariable, (args: CreateConvertedVariableRequest) => rpcManger.createConvertedVariable(args));
    messenger.onRequest(clearTypeCache, () => rpcManger.clearTypeCache());
}
