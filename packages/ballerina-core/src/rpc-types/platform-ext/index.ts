/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { GetMarketplaceListReq,MarketplaceListResp, GetMarketplaceIdlReq, MarketplaceIdlResp, ConnectionListItem, GetConnectionsReq, DeleteLocalConnectionsConfigReq, GetMarketplaceItemReq, MarketplaceItem, GetConnectionItemReq, ConnectionDetailed, CreateLocalConnectionsConfigReq, CreateThirdPartyConnectionReq, CreateComponentConnectionReq, GetComponentsReq, ComponentKind } from "@wso2/wso2-platform-core"
import { DeleteDevantTempConfigReq, GenerateCustomConnectorFromOASReq, GenerateCustomConnectorFromOASResp, AddDevantTempConfigReq, AddDevantTempConfigResp, ReplaceDevantTempConfigValuesReq, RegisterDevantMarketplaceServiceReq, InitializeDevantOASConnectionReq, InitializeDevantOASConnectionResp } from "./interfaces";
export * from "./rpc-type"
export * from "./utils"

// TODO: check if we can directly use the wso2-extension api interface
export interface PlatformExtAPI {
    // BI ext handlers
    generateCustomConnectorFromOAS: (params: GenerateCustomConnectorFromOASReq) => Promise<GenerateCustomConnectorFromOASResp>
    initializeDevantOASConnection: (params: InitializeDevantOASConnectionReq) => Promise<InitializeDevantOASConnectionResp>
    addDevantTempConfig: (params: AddDevantTempConfigReq) => Promise<AddDevantTempConfigResp>
    deleteDevantTempConfigs: (params: DeleteDevantTempConfigReq) => Promise<void>
    replaceDevantTempConfigValues: (params: ReplaceDevantTempConfigValuesReq) => Promise<void>
    // Platform ext proxies
    createThirdPartyConnection: (params: CreateThirdPartyConnectionReq) => Promise<ConnectionDetailed>
    createInternalConnection: (params: CreateComponentConnectionReq) => Promise<ConnectionDetailed>
    registerDevantMarketplaceService: (params: RegisterDevantMarketplaceServiceReq) => Promise<MarketplaceItem>
    getMarketplaceItems: (params: GetMarketplaceListReq) => Promise<MarketplaceListResp>;
    getMarketplaceItem: (params: GetMarketplaceItemReq) => Promise<MarketplaceItem>;
    getMarketplaceIdl: (params: GetMarketplaceIdlReq) => Promise<MarketplaceIdlResp>;
    getConnections: (params: GetConnectionsReq) => Promise<ConnectionListItem[]>;
    getConnection: (params: GetConnectionItemReq) => Promise<ConnectionDetailed>;
    getComponentList: (params: GetComponentsReq) => Promise<ComponentKind[]>;
    deleteLocalConnectionsConfig: (params: DeleteLocalConnectionsConfigReq) => void;
    getDevantConsoleUrl: () => Promise<string>;
    refreshConnectionList: () => Promise<void>;
    setConnectedToDevant: (connected: boolean) => void;
    setSelectedComponent: (componentId: string) => void;
    setSelectedEnv: (envId: string) => void;
    deployIntegrationInDevant: () => void;
    createConnectionConfig: (params: CreateLocalConnectionsConfigReq) => Promise<string>;
}
