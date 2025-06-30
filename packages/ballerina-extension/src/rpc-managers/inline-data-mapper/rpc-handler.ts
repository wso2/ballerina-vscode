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
    InlineDataMapperModelRequest,
    InlineDataMapperSourceRequest,
    VisualizableFieldsRequest,
    addNewArrayElement,
    getDataMapperModel,
    getDataMapperSource,
    getVisualizableFields
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { InlineDataMapperRpcManager } from "./rpc-manager";

export function registerInlineDataMapperRpcHandlers(messenger: Messenger) {
    const rpcManger = new InlineDataMapperRpcManager();
    messenger.onRequest(getDataMapperModel, (args: InlineDataMapperModelRequest) => rpcManger.getDataMapperModel(args));
    messenger.onRequest(getDataMapperSource, (args: InlineDataMapperSourceRequest) => rpcManger.getDataMapperSource(args));
    messenger.onRequest(getVisualizableFields, (args: VisualizableFieldsRequest) => rpcManger.getVisualizableFields(args));
    messenger.onRequest(addNewArrayElement, (args: AddArrayElementRequest) => rpcManger.addNewArrayElement(args));
}
