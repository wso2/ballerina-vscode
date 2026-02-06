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

import { getMarketplaceItems, getMarketplaceIdl, getConnections, deleteLocalConnectionsConfig, getDevantConsoleUrl, importDevantComponentConnection, getMarketplaceItem, getConnection, onPlatformExtStoreStateChange, refreshConnectionList, getPlatformStore, setConnectedToDevant, setSelectedComponent, deployIntegrationInDevant, registerMarketplaceConnection, registerAndCreateDevantComponentConnection, deleteDevantTempConfigs, createDevantComponentConnectionV2, generateCustomConnectorFromOAS, addDevantTempConfig } from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { PlatformExtRpcManager } from "./rpc-manager";
import { DeleteLocalConnectionsConfigReq, GetConnectionItemReq, GetConnectionsReq, GetMarketplaceIdlReq, GetMarketplaceItemReq, GetMarketplaceListReq, RegisterMarketplaceConnectionReq, } from "@wso2/wso2-platform-core";
import { AddDevantTempConfigReq, CreateDevantConnectionV2Req, DeleteDevantTempConfigReq, GenerateCustomConnectorFromOASReq, ImportDevantConnectionReq, RegisterAndCreateDevantConnectionReq, SetConnectedToDevantReq } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { platformExtStore } from "./platform-store";
import { debug } from "../../utils";

export function registerPlatformExtRpcHandlers(messenger: Messenger) {
    const rpcManger = new PlatformExtRpcManager();
    rpcManger.initStateSubscription(messenger).catch((err) => {  
        debug(`Failed to init platform ext state: ${err?.message}`);
    });  
    
    messenger.onRequest(getPlatformStore, () => platformExtStore.getState().state);
    messenger.onRequest(getMarketplaceItems, (params: GetMarketplaceListReq) => rpcManger.getMarketplaceItems(params));
    messenger.onRequest(getMarketplaceItem, (params: GetMarketplaceItemReq) => rpcManger.getMarketplaceItem(params));
    messenger.onRequest(getMarketplaceIdl, (params: GetMarketplaceIdlReq) => rpcManger.getMarketplaceIdl(params));
    messenger.onRequest(createDevantComponentConnectionV2, (params: CreateDevantConnectionV2Req) => rpcManger.createDevantComponentConnectionV2(params));
    messenger.onRequest(generateCustomConnectorFromOAS, (params: GenerateCustomConnectorFromOASReq) => rpcManger.generateCustomConnectorFromOAS(params));
    messenger.onRequest(importDevantComponentConnection, (params: ImportDevantConnectionReq) => rpcManger.importDevantComponentConnection(params));
    messenger.onRequest(registerAndCreateDevantComponentConnection, (params: RegisterAndCreateDevantConnectionReq) => rpcManger.registerAndCreateDevantComponentConnection(params));
    messenger.onRequest(addDevantTempConfig, (params: AddDevantTempConfigReq) => rpcManger.addDevantTempConfig(params));
    messenger.onRequest(deleteDevantTempConfigs, (params: DeleteDevantTempConfigReq) => rpcManger.deleteDevantTempConfigs(params));
    messenger.onRequest(registerMarketplaceConnection, (params: RegisterMarketplaceConnectionReq) => rpcManger.registerMarketplaceConnection(params));
    messenger.onRequest(getConnections, (params: GetConnectionsReq) => rpcManger.getConnections(params));
    messenger.onRequest(getConnection, (params: GetConnectionItemReq) => rpcManger.getConnection(params));
    messenger.onRequest(deleteLocalConnectionsConfig, (params: DeleteLocalConnectionsConfigReq) => rpcManger.deleteLocalConnectionsConfig(params));
    messenger.onRequest(getDevantConsoleUrl, () => rpcManger.getDevantConsoleUrl());
    messenger.onRequest(refreshConnectionList, () => rpcManger.refreshConnectionList());
    messenger.onRequest(setConnectedToDevant, (params: SetConnectedToDevantReq) => rpcManger.setConnectedToDevant(params));
    messenger.onRequest(setSelectedComponent, (componentId: string) => rpcManger.setSelectedComponent(componentId));
    messenger.onRequest(deployIntegrationInDevant, () => rpcManger.deployIntegrationInDevant());
}
