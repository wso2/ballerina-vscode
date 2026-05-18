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

import {
    ComponentKind,
    ConnectionConfigurations,
    ConnectionDetailed,
    ConnectionListItem,
    ContextItemEnriched,
    Environment,
    MarketplaceIdlTypes,
    MarketplaceItem,
    MarketplaceServiceTypes,
    UserInfo,
} from "@wso2/wso2-platform-core";
import { AvailableNode } from "../../interfaces/bi";
import { ModuleVarDecl } from "@wso2/syntax-tree/lib/syntax-tree-interfaces";

export interface GenerateCustomConnectorFromOASReq {
    connectionName: string;
    marketplaceItem: MarketplaceItem;
    securityType?: "" | "oauth" | "apikey";
}

export interface GenerateCustomConnectorFromOASResp {
    connectionNode?: AvailableNode;
}

export interface InitializeDevantOASConnectionReq {
    name: string;
    visibility: string;
    securityType: "" | "oauth" | "apikey";
    marketplaceItem: MarketplaceItem;
    configurations: ConnectionConfigurations;
    devantConfigs: DevantTempConfig[];
}

export interface InitializeDevantOASConnectionResp {
    connectionName?: string;
}

export interface RegisterDevantMarketplaceServiceReq {
    name: string;
    idlType: MarketplaceIdlTypes;
    serviceType: MarketplaceServiceTypes;
    idlFilePath?: string;

    configs: DevantTempConfig[];
}

export interface AddDevantTempConfigReq {
    name: string;
    newLine?: boolean;
}

export interface AddDevantTempConfigResp {
    configNode: ModuleVarDecl;
}

export interface DeleteDevantTempConfigReq {
    nodes: ModuleVarDecl[];
}

export interface ReplaceDevantTempConfigValuesReq {
    createdConnection: ConnectionDetailed;
    configs: DevantTempConfig[];
}

export interface PlatformExtConnectionState {
    loading?: boolean;
    list?: ConnectionListItem[];
    connectedToDevant?: boolean;
}

export interface PlatformExtState {
    isExtInstalled?: boolean;
    isLoggedIn: boolean;
    userInfo: UserInfo | null;
    hasPossibleComponent?: boolean;
    hasLocalChanges?: boolean;
    components: ComponentKind[];
    selectedComponent?: ComponentKind;
    selectedContext?: ContextItemEnriched;
    envs?: Environment[];
    selectedEnv?: Environment;
    devantConns?: PlatformExtConnectionState;
}

export interface DevantTempConfig {
    /** The id matching the key in devant side */
    id: string;
    /** The unique identifier in ballerina code */
    name: string;
    value: string;
    isSecret: boolean;
    node?: ModuleVarDecl;
    description?: string;
    type?: "string" | "int";
}
