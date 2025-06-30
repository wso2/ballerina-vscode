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

import { NodePosition, Diagnostic } from "@wso2/syntax-tree";
import { Item } from "@wso2/ui-toolkit";

export interface ResponseConfig {
    id: number;
    code?: number;
    type?: string;
    isTypeArray?: boolean;
    source?: string;
    isNew?: boolean;
    defaultCode?: number;
    namedRecord?: string;
}

export enum PARAM_TYPES {
    DEFAULT = 'QUERY',
    PARAM = 'Param',
    PAYLOAD = 'Payload',
    REQUEST = 'Request',
    CALLER = 'Caller',
    HEADER = 'Header',
}

export interface ParameterConfig {
    id: number;
    name: string;
    type?: string;
    option?: PARAM_TYPES;
    defaultValue?: string;
    isRequired?: boolean;
    isNew?: boolean;
}

export interface ServiceData {
    path: string;
    port: number;
    listener?: string;
}

export interface Resource {
    methods: string[];
    errors?: Diagnostic[];
    path: string;
    pathSegments?: ParameterConfig[];
    params?: ParameterConfig[];
    advancedParams?: Map<string, ParameterConfig>;
    payloadConfig?: ParameterConfig;
    responses?: ResponseConfig[];
    expandable?: boolean;
    updatePosition?: NodePosition; // Insert or Edit position of the resource
    position?: NodePosition; // Actual position of the resource which is used to render the resource
    addtionalInfo?: JSX.Element; // Addtional information to be displayed in the resource expanded view
    additionalActions?: Item[]; // Additional actions for the resource
}

export interface PathConfig {
    path: string;
    resources: ParameterConfig[];
}

export interface Service {
    path: string;
    port?: number;
    listener?: string;
    serviceType?: string;
    resources: Resource[];
    position?: NodePosition;
    triggerModel?: any;
}
