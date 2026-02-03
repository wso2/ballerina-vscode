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

import { ConnectionDetailed, ConnectionListItem, DeleteLocalConnectionsConfigReq, GetConnectionItemReq, GetConnectionsReq, GetMarketplaceIdlReq, GetMarketplaceItemReq, GetMarketplaceListReq,MarketplaceIdlResp,MarketplaceItem,MarketplaceListResp, RegisterMarketplaceConnectionReq } from "@wso2/wso2-platform-core"
import { NotificationType, RequestType } from "vscode-messenger-common";
import { CreateDevantConnectionResp, CreateDevantConnectionV2Req, DeleteDevantTempConfigReq, GenerateCustomConnectorFromOASReq, GenerateCustomConnectorFromOASResp, ImportDevantConnectionReq, ImportDevantConnectionResp, PlatformExtState, RegisterAndCreateDevantConnectionReq, SetConnectedToDevantReq, UpdateDevantTempConfigsReq, UpdateDevantTempConfigsResp } from "./interfaces";

const _preFix = "platform-ext";
// BI ext handlers
export const generateCustomConnectorFromOAS: RequestType<GenerateCustomConnectorFromOASReq, GenerateCustomConnectorFromOASResp> = { method: `${_preFix}/generateCustomConnectorFromOAS` };
export const createDevantComponentConnectionV2: RequestType<CreateDevantConnectionV2Req,  CreateDevantConnectionResp> = { method: `${_preFix}/createDevantComponentConnectionV2` };
export const importDevantComponentConnection: RequestType<ImportDevantConnectionReq,  ImportDevantConnectionResp> = { method: `${_preFix}/importDevantComponentConnection` };
export const registerAndCreateDevantComponentConnection: RequestType<RegisterAndCreateDevantConnectionReq,  CreateDevantConnectionResp> = { method: `${_preFix}/registerAndCreateDevantComponentConnection` };
export const updateDevantTempConfigs: RequestType<UpdateDevantTempConfigsReq,  UpdateDevantTempConfigsResp> = { method: `${_preFix}/updateDevantTempConfigs` };
export const deleteDevantTempConfigs: RequestType<DeleteDevantTempConfigReq,  void> = { method: `${_preFix}/deleteDevantTempConfigs` };

// Platform ext proxies
export const getMarketplaceItems: RequestType<GetMarketplaceListReq, MarketplaceListResp> = { method: `${_preFix}/getMarketplaceItems` };
export const getMarketplaceItem: RequestType<GetMarketplaceItemReq, MarketplaceItem> = { method: `${_preFix}/getMarketplaceItem` };
export const getMarketplaceIdl: RequestType<GetMarketplaceIdlReq,  MarketplaceIdlResp> = { method: `${_preFix}/getMarketplaceIdl` };
export const getConnections: RequestType<GetConnectionsReq,  ConnectionListItem[]> = { method: `${_preFix}/getConnections` };
export const getConnection: RequestType<GetConnectionItemReq,  ConnectionDetailed> = { method: `${_preFix}/getConnection` };
export const deleteLocalConnectionsConfig: RequestType<DeleteLocalConnectionsConfigReq,  void> = { method: `${_preFix}/deleteLocalConnectionsConfig` };
export const getDevantConsoleUrl: RequestType<void,  string> = { method: `${_preFix}/getDevantConsoleUrl` };
export const refreshConnectionList: RequestType<void,  void> = { method: `${_preFix}/refreshConnectionList` };
export const getPlatformStore: RequestType<void,  PlatformExtState> = { method: `${_preFix}/getPlatformStore` };
export const setConnectedToDevant: RequestType<SetConnectedToDevantReq,  void> = { method: `${_preFix}/setConnectedToDevant` };
export const setSelectedComponent: RequestType<string,  void> = { method: `${_preFix}/setSelectedComponent` };
export const deployIntegrationInDevant: RequestType<void,  void> = { method: `${_preFix}/deployIntegrationInDevant` };
export const registerMarketplaceConnection: RequestType<RegisterMarketplaceConnectionReq, MarketplaceItem> = { method: `${_preFix}/registerMarketplaceConnection` };

// Notifications
export const onPlatformExtStoreStateChange: NotificationType<PlatformExtState> = { method: `${_preFix}/onPlatformExtStoreStateChange` };
