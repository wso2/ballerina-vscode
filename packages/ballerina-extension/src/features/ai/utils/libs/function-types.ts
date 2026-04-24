// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { z } from 'zod';

export interface GetFunctionsRequest {
    name: string;
    description: string;
    clients: MinifiedClient[];
    functions?: MinifiedRemoteFunction[];
}

export interface MinifiedClient {
    name: string;
    description?: string;
    functions: (MinifiedRemoteFunction | MinifiedResourceFunction)[];
}

export interface MinifiedRemoteFunction extends MiniFunction {
    name: string;
}

export interface MiniFunction {
    parameters?: string[];
    returnType?: string;
    description?: string;
}

export interface MinifiedResourceFunction extends MiniFunction {
    accessor: string;
    paths: (PathParameter | string)[];
}

export interface GetFunctionsResponse {
    libraries: GetFunctionResponse[];
}

export interface GetFunctionResponse {
    name: string;
    clients?: MinifiedClient[];
    functions?: MinifiedRemoteFunction[];
}

export interface PathParameter {
    name: string;
    type: string;
}

const pathItemSchema = z.union([
    z.string(),
    z.object({
        name: z.string(),
        type: z.string(),
    }),
]);

const remoteFunctionSchema = z.object({
    name: z.string(),
    parameters: z.array(z.string()).optional(),
    returnType: z.string().optional(),
    description: z.string().optional(),
});

const resourceFunctionSchema = z.object({
    accessor: z.string(),
    paths: z.array(pathItemSchema),
    parameters: z.array(z.string()).optional(),
    returnType: z.string().optional(),
    description: z.string().optional(),
});

const clientSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    functions: z.array(z.union([resourceFunctionSchema, remoteFunctionSchema])),
});

const libraryResponseSchema = z.object({
    name: z.string(),
    clients: z.array(clientSchema).optional(),
    functions: z.array(remoteFunctionSchema).optional(),
});

export const getFunctionsResponseSchema = z.object({
    libraries: z.array(libraryResponseSchema),
});



