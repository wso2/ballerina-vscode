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

import { LineRange } from "./common";

// Component Diagram Model
export type CDModel = {
    automation?: CDAutomation;
    connections: CDConnection[];
    listeners: CDListener[];
    services: CDService[];
};

export type CDAutomation = {
    name: string;
    displayName: string;
    location: CDLocation;
    connections: string[];
    uuid: string;
};

export type CDLocation = LineRange & {
    filePath: string;
};

export type CDConnection = {
    symbol: string;
    location: CDLocation;
    scope: string;
    uuid: string;
    enableFlowModel: boolean;
    sortText: string;
    icon?: string;
};

export type CDListener = {
    symbol: string;
    location: CDLocation;
    attachedServices: string[];
    kind: string;
    type: string;
    args: CDArg[];
    uuid: string;
    icon: string;
    enableFlowModel: boolean;
    sortText: string;
};

export type CDArg = {
    key: string;
    value: string;
};

export type CDService = {
    location: CDLocation;
    attachedListeners: string[];
    connections: string[];
    functions: CDFunction[];
    remoteFunctions: CDFunction[];
    resourceFunctions: CDResourceFunction[];
    absolutePath: string;
    type: string;
    icon: string;
    uuid: string;
    enableFlowModel: boolean;
    sortText: string;
    displayName?: string;
};

export type CDFunction = {
    name: string;
    location: CDLocation;
    connections?: string[];
};

export type CDResourceFunction = {
    accessor: string;
    path: string;
    location: CDLocation;
    connections?: string[];
};
