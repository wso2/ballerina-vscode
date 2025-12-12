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

import { BallerinaConnectorInfo, BallerinaConnectorsRequest, BallerinaConnector } from "../../interfaces/ballerina";
import { TextEdit } from "../../interfaces/extended-lang-client";

export interface ConnectorRequest {
    id?: string
    orgName?: string
    packageName?: string
    moduleName?: string
    version?: string
    name?: string
    targetFile?: string
}

export interface ConnectorResponse extends BallerinaConnectorInfo {
    error?: string;
}

export interface ConnectorsRequest extends BallerinaConnectorsRequest {
    error?: string;
}

export interface ConnectorsResponse {
    central: BallerinaConnector[];
    local?: BallerinaConnector[];
    error?: string;
}

export interface IntrospectDatabaseRequest {
    projectPath: string;
    dbSystem: string;
    host: string;
    port: string;
    database: string;
    user: string;
    password: string;
}

export interface IntrospectDatabaseResponse {
    tables?: string[];
    errorMsg?: string;
}

export interface PersistClientGenerateRequest {
    projectPath: string;
    name: string;
    dbSystem: string;
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    selectedTables: string[];
    module?: string;
}

export interface PersistClientGenerateResponse {
    source?: PersistSource;
    errorMsg?: string;
    stackTrace?: string;
}

export interface PersistSource {
    isModuleExists?: boolean;
    textEditsMap?: {
        [key: string]: TextEdit[];
    };
}

export interface WSDLApiClientGenerationRequest {
    projectPath: string;
    module: string;
    wsdlFilePath: string;
    portName?: string;
    operations?: string[];
}

export interface WSDLApiClientGenerationResponse {
    source?: WSDLApiClientSource;
    errorMsg?: string;
    stackTrace?: string;
} 

export interface WSDLApiClientSource {
    textEditsMap: {
        [key: string]: TextEdit[];
    };
}
