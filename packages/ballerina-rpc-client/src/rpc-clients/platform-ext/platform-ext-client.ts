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

import { PlatformExtAPI, getMarketplaceItems, getMarketplaceItem, getMarketplaceIdl, getConnections, deleteLocalConnectionsConfig, getDevantConsoleUrl, importDevantComponentConnection, getConnection, onPlatformExtStoreStateChange, refreshConnectionList, getPlatformStore, setConnectedToDevant, setSelectedComponent, deployIntegrationInDevant, registerMarketplaceConnection, registerAndCreateDevantComponentConnection, deleteDevantTempConfigs, createDevantComponentConnectionV2, generateCustomConnectorFromOAS, addDevantTempConfig } from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";
import { ContextItemEnriched, GetMarketplaceListReq,MarketplaceListResp, ComponentKind, GetMarketplaceIdlReq, MarketplaceIdlResp, ConnectionListItem, GetConnectionsReq, DeleteLocalConnectionsConfigReq, GetMarketplaceItemReq, MarketplaceItem, GetConnectionItemReq, ConnectionDetailed, RegisterMarketplaceConnectionReq } from "@wso2/wso2-platform-core"
import { AddDevantTempConfigReq, AddDevantTempConfigResp, CreateDevantConnectionResp, CreateDevantConnectionV2Req, DeleteDevantTempConfigReq, GenerateCustomConnectorFromOASReq, GenerateCustomConnectorFromOASResp, ImportDevantConnectionReq, ImportDevantConnectionResp, PlatformExtState, RegisterAndCreateDevantConnectionReq, SetConnectedToDevantReq } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";

export class PlatformExtRpcClient implements PlatformExtAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    getPlatformStore(): Promise<PlatformExtState> {
        return this._messenger.sendRequest(getPlatformStore, HOST_EXTENSION, undefined);
    }

    getMarketplaceItems(params: GetMarketplaceListReq): Promise<MarketplaceListResp> {
        return this._messenger.sendRequest(getMarketplaceItems, HOST_EXTENSION, params);
    }

    getMarketplaceItem(params: GetMarketplaceItemReq): Promise<MarketplaceItem> {
        return this._messenger.sendRequest(getMarketplaceItem, HOST_EXTENSION, params);
    }

    getMarketplaceIdl(params: GetMarketplaceIdlReq): Promise<MarketplaceIdlResp> {
        return this._messenger.sendRequest(getMarketplaceIdl, HOST_EXTENSION, params);
    }

    generateCustomConnectorFromOAS(params: GenerateCustomConnectorFromOASReq): Promise<GenerateCustomConnectorFromOASResp> {
        return this._messenger.sendRequest(generateCustomConnectorFromOAS, HOST_EXTENSION, params);
    }

    createDevantComponentConnectionV2(params: CreateDevantConnectionV2Req): Promise<CreateDevantConnectionResp> {
        return this._messenger.sendRequest(createDevantComponentConnectionV2, HOST_EXTENSION, params);
    }

    importDevantComponentConnection(params: ImportDevantConnectionReq): Promise<ImportDevantConnectionResp> {
        return this._messenger.sendRequest(importDevantComponentConnection, HOST_EXTENSION, params);
    }

    registerAndCreateDevantComponentConnection(params: RegisterAndCreateDevantConnectionReq): Promise<CreateDevantConnectionResp> {
        return this._messenger.sendRequest(registerAndCreateDevantComponentConnection, HOST_EXTENSION, params);
    }

    addDevantTempConfig(params: AddDevantTempConfigReq): Promise<AddDevantTempConfigResp> {
        return this._messenger.sendRequest(addDevantTempConfig, HOST_EXTENSION, params);
    }

    deleteDevantTempConfigs(params: DeleteDevantTempConfigReq): Promise<void> {
        return this._messenger.sendRequest(deleteDevantTempConfigs, HOST_EXTENSION, params);
    }

    registerMarketplaceConnection(params: RegisterMarketplaceConnectionReq): Promise<MarketplaceItem> {
        return this._messenger.sendRequest(registerMarketplaceConnection, HOST_EXTENSION, params);
    }
    
    getConnections(params: GetConnectionsReq): Promise<ConnectionListItem[]> {
        return this._messenger.sendRequest(getConnections, HOST_EXTENSION, params);
    }

    getConnection(params: GetConnectionItemReq): Promise<ConnectionDetailed> {
        return this._messenger.sendRequest(getConnection, HOST_EXTENSION, params);
    }

    deleteLocalConnectionsConfig(params: DeleteLocalConnectionsConfigReq): Promise<void> {
        return this._messenger.sendRequest(deleteLocalConnectionsConfig, HOST_EXTENSION, params);
    }

    getDevantConsoleUrl(): Promise<string> {
        return this._messenger.sendRequest(getDevantConsoleUrl, HOST_EXTENSION, undefined);
    }

    onPlatformExtStoreStateChange(callback: (state: PlatformExtState) => void) {
        this._messenger.onNotification(onPlatformExtStoreStateChange, callback);
    }

    refreshConnectionList(): Promise<void> {
        return this._messenger.sendRequest(refreshConnectionList, HOST_EXTENSION, undefined);
    }

    setConnectedToDevant(params: SetConnectedToDevantReq): Promise<void> {
        return this._messenger.sendRequest(setConnectedToDevant, HOST_EXTENSION, params);
    }

    setSelectedComponent(componentId: string): Promise<void> {
        return this._messenger.sendRequest(setSelectedComponent, HOST_EXTENSION, componentId);
    }

    deployIntegrationInDevant(): Promise<void> {
        return this._messenger.sendRequest(deployIntegrationInDevant, HOST_EXTENSION);
    }
}
