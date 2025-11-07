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

import { PlatformExtAPI, getMarketplaceItems, getMarketplaceItem, getSelectedContext, isLoggedIn, getDirectoryComponents, getDirectoryComponent, getMarketplaceIdl, createDevantComponentConnection, getConnections, deleteConnection, deleteLocalConnectionsConfig, getDevantConsoleUrl, importDevantComponentConnection, getConnection, onPlatformExtStoreStateChange } from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";
import { ContextItemEnriched, GetMarketplaceListReq,MarketplaceListResp, ComponentKind, GetMarketplaceIdlReq, MarketplaceIdlResp, ConnectionListItem, GetConnectionsReq, DeleteConnectionReq, DeleteLocalConnectionsConfigReq, GetMarketplaceItemReq, MarketplaceItem, GetConnectionItemReq } from "@wso2/wso2-platform-core"
import { CreateDevantConnectionReq, CreateDevantConnectionResp, ImportDevantConnectionReq, ImportDevantConnectionResp, PlatformExtState } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";

export class PlatformExtRpcClient implements PlatformExtAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    isLoggedIn(): Promise<boolean> {
        return this._messenger.sendRequest(isLoggedIn, HOST_EXTENSION, undefined);
    }

    getMarketplaceItems(params: GetMarketplaceListReq): Promise<MarketplaceListResp> {
        return this._messenger.sendRequest(getMarketplaceItems, HOST_EXTENSION, params);
    }

    getMarketplaceItem(params: GetMarketplaceItemReq): Promise<MarketplaceItem> {
        return this._messenger.sendRequest(getMarketplaceItem, HOST_EXTENSION, params);
    }

    getSelectedContext(): Promise<ContextItemEnriched> {
        return this._messenger.sendRequest(getSelectedContext, HOST_EXTENSION);
    }

    getDirectoryComponents(fsPath: string): Promise<ComponentKind[]> {
        return this._messenger.sendRequest(getDirectoryComponents, HOST_EXTENSION, fsPath);
    }

    getDirectoryComponent(fsPath: string): Promise<ComponentKind | null> {
        return this._messenger.sendRequest(getDirectoryComponent, HOST_EXTENSION, fsPath);
    }

    getMarketplaceIdl(params: GetMarketplaceIdlReq): Promise<MarketplaceIdlResp> {
        return this._messenger.sendRequest(getMarketplaceIdl, HOST_EXTENSION, params);
    }

    createDevantComponentConnection(params: CreateDevantConnectionReq): Promise<CreateDevantConnectionResp> {
        return this._messenger.sendRequest(createDevantComponentConnection, HOST_EXTENSION, params);
    }

    importDevantComponentConnection(params: ImportDevantConnectionReq): Promise<ImportDevantConnectionResp> {
        return this._messenger.sendRequest(importDevantComponentConnection, HOST_EXTENSION, params);
    }
    
    getConnections(params: GetConnectionsReq): Promise<ConnectionListItem[]> {
        return this._messenger.sendRequest(getConnections, HOST_EXTENSION, params);
    }

    getConnection(params: GetConnectionItemReq): Promise<ConnectionListItem> {
        return this._messenger.sendRequest(getConnection, HOST_EXTENSION, params);
    }

    deleteConnection(params: DeleteConnectionReq): Promise<void> {
        return this._messenger.sendRequest(deleteConnection, HOST_EXTENSION, params);
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
}
