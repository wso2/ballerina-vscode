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

import { ComponentKind, ConnectionDetailed, ConnectionListItem, ContextItemEnriched, DeleteConnectionReq, DeleteLocalConnectionsConfigReq, GetConnectionItemReq, GetConnectionsReq, GetMarketplaceIdlReq, GetMarketplaceItemReq, GetMarketplaceListReq,MarketplaceIdlResp,MarketplaceItem,MarketplaceListResp } from "@wso2/wso2-platform-core"
import { NotificationType, RequestType } from "vscode-messenger-common";
import { CreateDevantConnectionReq, CreateDevantConnectionResp, ImportDevantConnectionReq, ImportDevantConnectionResp, PlatformExtState } from "./interfaces";

const _preFix = "platform-ext";
// BI ext handlers
export const createDevantComponentConnection: RequestType<CreateDevantConnectionReq,  CreateDevantConnectionResp> = { method: `${_preFix}/createDevantComponentConnection` };
export const importDevantComponentConnection: RequestType<ImportDevantConnectionReq,  ImportDevantConnectionResp> = { method: `${_preFix}/importDevantComponentConnection` };
// Platform ext proxies
export const isLoggedIn: RequestType<void, boolean> = { method: `${_preFix}/isLoggedIn` };
export const getMarketplaceItems: RequestType<GetMarketplaceListReq, MarketplaceListResp> = { method: `${_preFix}/getMarketplaceItems` };
export const getMarketplaceItem: RequestType<GetMarketplaceItemReq, MarketplaceItem> = { method: `${_preFix}/getMarketplaceItem` };
export const getSelectedContext: RequestType<void, ContextItemEnriched | null> = { method: `${_preFix}/getSelectedContext` };
export const getDirectoryComponents: RequestType<string,  ComponentKind[]> = { method: `${_preFix}/getDirectoryComponents` };
export const getDirectoryComponent: RequestType<string,  ComponentKind | null> = { method: `${_preFix}/getDirectoryComponent` };
export const getMarketplaceIdl: RequestType<GetMarketplaceIdlReq,  MarketplaceIdlResp> = { method: `${_preFix}/getMarketplaceIdl` };
export const getConnections: RequestType<GetConnectionsReq,  ConnectionListItem[]> = { method: `${_preFix}/getConnections` };
export const getConnection: RequestType<GetConnectionItemReq,  ConnectionListItem> = { method: `${_preFix}/getConnection` };
export const deleteConnection: RequestType<DeleteConnectionReq,  void> = { method: `${_preFix}/deleteConnection` };
export const deleteLocalConnectionsConfig: RequestType<DeleteLocalConnectionsConfigReq,  void> = { method: `${_preFix}/deleteLocalConnectionsConfig` };
export const getDevantConsoleUrl: RequestType<void,  string> = { method: `${_preFix}/getDevantConsoleUrl` };

// Notifications
export const onPlatformExtStoreStateChange: NotificationType<PlatformExtState> = { method: `${_preFix}/onPlatformExtStoreStateChange` };
