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

export interface DeleteBiDevantConnectionReq {
    filePath: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

// OpenAPI 3.0 type definitions
export interface OpenAPISecurityScheme {
    type: "apiKey" | "http" | "oauth2" | "openIdConnect";
    description?: string;
    name?: string;
    in?: "query" | "header" | "cookie";
    scheme?: string;
    bearerFormat?: string;
    flows?: any;
    openIdConnectUrl?: string;
    "x-ballerina-name"?: string;
}

export interface OpenAPIComponents {
    schemas?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
    examples?: Record<string, any>;
    requestBodies?: Record<string, any>;
    headers?: Record<string, any>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    links?: Record<string, any>;
    callbacks?: Record<string, any>;
}

export interface OpenAPIInfo {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: any;
    license?: any;
}

export interface OpenAPIDefinition {
    openapi: string;
    info: OpenAPIInfo;
    servers?: any[];
    paths: Record<string, any>;
    components?: OpenAPIComponents;
    security?: any[];
    tags?: any[];
    externalDocs?: any;
}
