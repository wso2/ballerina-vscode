/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { LinePosition } from "./common";

export interface Project {
    id: string;
    name: string;
    components: ComponentModel[];
    version?: string;
}

export enum BuildPack {
    Ballerina = "ballerina",
    Java = "java",
    Go = "go",
    NodeJs = "nodejs",
    Python = "python",
    Ruby = "ruby",
    Rust = "rust",
    Other = "other"
}

export interface ComponentModel {
    id: string;
    orgName: string;
    version?: string;
    modelVersion: string;
    services: Map<string, CMService>;
    entities: Map<string, CMEntity>;
    type?: ComponentType;
    buildPack?: string;
    diagnostics?: CMDiagnostics[];
    functionEntryPoint?: CMEntryPoint;
    hasCompilationErrors: boolean;
    hasModelErrors?: boolean;
    connections: CMDependency[];
}

export interface ComponentModelDeprecated {
    packageId: CMPackageID;
    version?: string;
    services: Map<string, any>;
    entities: Map<string, CMEntity>;
    diagnostics?: CMDiagnostics[];
    functionEntryPoint?: any;
    hasCompilationErrors: boolean;
}

export interface CMDiagnostics {
    name: string;
    message?: string;
    severity?: string;
}

export interface CMPackageID {
    name: string,
    org: string,
    version: string
}

export interface CMLocation {
    filePath: string;
    startPosition: LinePosition;
    endPosition: LinePosition;
}

interface CMNode {
    sourceLocation?: CMLocation;
    diagnostics?: CMDiagnostics[];
}

interface CMFunctionNode extends CMNode {
    id: string;
    label: string;
    interactions: CMInteraction[];
    parameters: CMParameter[];
    returns: string[];
}

export interface CMEntryPoint extends CMFunctionNode {
    annotation: CMAnnotation;
    type?: 'scheduledTask' | 'manualTrigger';
    dependencies: string[];
}

export interface CMService extends CMNode {
    id: string;
    label: string;
    remoteFunctions: CMRemoteFunction[];
    resourceFunctions: CMResourceFunction[];
    type: string;
    dependencies: string[];
    annotation: CMAnnotation;
    deploymentMetadata?: CMDeploymentMetadata;
    isNoData?: boolean;
    dataInProgress?: boolean;
}

export interface CMAnnotation extends CMNode {
    id: string;
    label: string;
}

export interface CMDependency extends CMNode {
    id: string;
    type: string;
    onPlatform?: boolean;
    serviceLabel?: string;
}

export interface CMResourceFunction extends CMFunctionNode {
    path: string;
}

export interface CMRemoteFunction extends CMFunctionNode {
    name: string;
}

export interface CMInteraction extends CMNode {
    id: string;
    type: string;
    serviceId: string;
    serviceLabel?: string;
}

export interface CMParameter extends CMNode {
    in?: string;
    isRequired: boolean;
    name: string;
    type: string[];
}

export interface CMEntity extends CMNode {
    attributes: CMAttribute[];
    inclusions: string[];
    isAnonymous: boolean;
}

export interface CMAttribute extends CMNode {
    name: string;
    type: string;
    defaultValue: string;
    required: boolean;
    nillable: boolean;
    isReadOnly?: boolean;
    associations: CMAssociation[];
}

export interface CMAssociation {
    associate: string;
    cardinality: CMCardinality;
}

export interface CMCardinality {
    associate: string;
    self: string;
}

export interface CMDeploymentMetadata {
    gateways: {
        internet: {
            isExposed: boolean;
        },
        intranet: {
            isExposed: boolean;
        }
    }
}

export enum ComponentType {
    SERVICE = "service",
    WEB_APP = "web-app",
    SCHEDULED_TASK = "scheduled-task",
    MANUAL_TASK = "manual-task",
    API_PROXY = "api-proxy",
    WEB_HOOK = "web-hook",
    EVENT_HANDLER = "event-handler",
    TEST = "test",
}

export declare enum ComponentDisplayType {
    RestApi = "restAPI",
    ManualTrigger = "manualTrigger",
    ScheduledTask = "scheduledTask",
    Webhook = "webhook",
    Websocket = "webSocket",
    Proxy = "proxy",
    ByocCronjob = "byocCronjob",
    ByocJob = "byocJob",
    GraphQL = "graphql",
    ByocWebApp = "byocWebApp",
    ByocWebAppDockerLess = "byocWebAppsDockerfileLess",
    ByocRestApi = "byocRestApi",
    ByocWebhook = "byocWebhook",
    MiRestApi = "miRestApi",
    MiEventHandler = "miEventHandler",
    Service = "ballerinaService",
    ByocService = "byocService",
    MiApiService = "miApiService"
}