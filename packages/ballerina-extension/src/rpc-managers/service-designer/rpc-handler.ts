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
    ExportOASRequest,
    FunctionModelRequest,
    FunctionSourceCodeRequest,
    HttpResourceModelRequest,
    ListenerModelFromCodeRequest,
    ListenerModelRequest,
    ListenerSourceCodeRequest,
    ListenersRequest,
    ServiceModelFromCodeRequest,
    ServiceModelRequest,
    ServiceSourceCodeRequest,
    TriggerModelsRequest,
    addFunctionSourceCode,
    addListenerSourceCode,
    addResourceSourceCode,
    addServiceSourceCode,
    exportOASFile,
    getFunctionModel,
    getHttpResourceModel,
    getListenerModel,
    getListenerModelFromCode,
    getListeners,
    getServiceModel,
    getServiceModelFromCode,
    getTriggerModels,
    updateListenerSourceCode,
    updateResourceSourceCode,
    updateServiceSourceCode
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { ServiceDesignerRpcManager } from "./rpc-manager";

export function registerServiceDesignerRpcHandlers(messenger: Messenger) {
    const rpcManger = new ServiceDesignerRpcManager();
    messenger.onRequest(exportOASFile, (args: ExportOASRequest) => rpcManger.exportOASFile(args));
    messenger.onRequest(getTriggerModels, (args: TriggerModelsRequest) => rpcManger.getTriggerModels(args));
    messenger.onRequest(getListeners, (args: ListenersRequest) => rpcManger.getListeners(args));
    messenger.onRequest(getListenerModel, (args: ListenerModelRequest) => rpcManger.getListenerModel(args));
    messenger.onRequest(addListenerSourceCode, (args: ListenerSourceCodeRequest) => rpcManger.addListenerSourceCode(args));
    messenger.onRequest(updateListenerSourceCode, (args: ListenerSourceCodeRequest) => rpcManger.updateListenerSourceCode(args));
    messenger.onRequest(getListenerModelFromCode, (args: ListenerModelFromCodeRequest) => rpcManger.getListenerModelFromCode(args));
    messenger.onRequest(getServiceModel, (args: ServiceModelRequest) => rpcManger.getServiceModel(args));
    messenger.onRequest(getFunctionModel, (args: FunctionModelRequest) => rpcManger.getFunctionModel(args));
    messenger.onRequest(addServiceSourceCode, (args: ServiceSourceCodeRequest) => rpcManger.addServiceSourceCode(args));
    messenger.onRequest(updateServiceSourceCode, (args: ServiceSourceCodeRequest) => rpcManger.updateServiceSourceCode(args));
    messenger.onRequest(getServiceModelFromCode, (args: ServiceModelFromCodeRequest) => rpcManger.getServiceModelFromCode(args));
    messenger.onRequest(getHttpResourceModel, (args: HttpResourceModelRequest) => rpcManger.getHttpResourceModel(args));
    messenger.onRequest(addResourceSourceCode, (args: FunctionSourceCodeRequest) => rpcManger.addResourceSourceCode(args));
    messenger.onRequest(addFunctionSourceCode, (args: FunctionSourceCodeRequest) => rpcManger.addFunctionSourceCode(args));
    messenger.onRequest(updateResourceSourceCode, (args: FunctionSourceCodeRequest) => rpcManger.updateResourceSourceCode(args));
}
