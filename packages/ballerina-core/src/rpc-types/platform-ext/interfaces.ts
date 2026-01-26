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

import { ComponentKind, ConnectionListItem, ContextItemEnriched, MarketplaceItem } from "@wso2/wso2-platform-core";
import { AvailableNode, NodePosition } from "../../interfaces/bi";

export interface CreateDevantConnectionReq {
    params:{
        name: string;
	    visibility: string;
        schemaId: string;
        isProjectLevel?: boolean;
        envKeys?: string[]; // applicable only for 3rd party connectors
    }
    marketplaceItem: MarketplaceItem;
}

export interface ImportDevantConnectionReq {
    connectionListItem: ConnectionListItem;
}

export interface RegisterAndCreateDevantConnectionReq {
    name: string;
    configs: {
        name: string;
        value: string;
        isSecret: boolean;
    }[]
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