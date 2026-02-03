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

import { ComponentKind, ConnectionListItem, ContextItemEnriched, MarketplaceIdlTypes, MarketplaceItem, MarketplaceServiceTypes } from "@wso2/wso2-platform-core";
import { AvailableNode, NodePosition } from "../../interfaces/bi";


export interface GenerateCustomConnectorFromOASReq {
    connectionName: string;
    marketplaceItem: MarketplaceItem;
}

export interface GenerateCustomConnectorFromOASResp {
    connectionNode?: AvailableNode;
}

export interface CreateDevantConnectionV2Req {
    flow: DevantConnectionFlow;
    createInternalConnectionParams?: {
        name: string;
	    visibility: string;
        schemaId: string;
        isProjectLevel?: boolean;
        devantTempConfigs?: DevantTempConfig[];
    }
    importThirdPartyConnectionParams?: {
        name: string;
        schemaId: string;
        isProjectLevel?: boolean;
        devantTempConfigs?: DevantTempConfig[];
    }
    marketplaceItem: MarketplaceItem;
}

export interface ImportDevantConnectionReq {
    connectionListItem: ConnectionListItem;
}

export interface RegisterAndCreateDevantConnectionReq {
    name: string;
    idlType: MarketplaceIdlTypes;
    serviceType: MarketplaceServiceTypes;
    idlFilePath?: string;
    configs: DevantTempConfig[];
}

export interface UpdateDevantTempConfigsReq {
    configs: {
        name: string;
        value: string;
        isSecret: boolean;
        nodePosition?: NodePosition;
    }[];
}

export interface UpdateDevantTempConfigsResp {
    configs: {
        name: string;
        value: string;
        isSecret: boolean;
        nodePosition?: NodePosition;
    }[];
}

export interface DeleteDevantTempConfigReq {
    nodePosition: NodePosition;
}

export interface CreateDevantConnectionResp {
    connectionName?: string;
    connectionNode?: AvailableNode;
}

export interface ImportDevantConnectionResp {
    connectionName?: string;
    connectionNode?: AvailableNode;
}

export interface BiDevantConnectionListItem extends ConnectionListItem {
    isUsed?: boolean;
}

export interface PlatformExtConnectionState {
    loading?: boolean;
    list?: BiDevantConnectionListItem[];
    runInDevant?: boolean;
    debugInDevant?: boolean;
}

export interface PlatformExtState {
	isLoggedIn: boolean;
    hasPossibleComponent?: boolean;
    hasLocalChanges?: boolean;
	components: ComponentKind[];
    selectedComponent?: ComponentKind;
	selectedContext?: ContextItemEnriched;
    devantConns?: PlatformExtConnectionState;
}

export interface SetConnectedToDevantReq {
    mode: "runInDevant" | "debugInDevant";
    value: boolean;
}

export enum DevantConnectionFlow {
    CREATE_INTERNAL_OAS = 'CREATE_INTERNAL_OAS',
    CREATE_INTERNAL_OTHER = 'CREATE_INTERNAL_OTHER',
    CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR = 'CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR',
    CREATE_THIRD_PARTY_OAS = 'CREATE_THIRD_PARTY_OAS',
    CREATE_THIRD_PARTY_OTHER = 'CREATE_THIRD_PARTY_OTHER',
    CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR = 'CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR',
    REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR = 'REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR',
    REGISTER_CREATE_THIRD_PARTY_FROM_OAS = 'REGISTER_CREATE_THIRD_PARTY_FROM_OAS',
}

export interface DevantTempConfig {
    id: string;
    name: string;
    value: string;
    isSecret: boolean;
    nodePosition?: NodePosition;
    description?: string;
    type?: string;
    selected?: boolean;
}