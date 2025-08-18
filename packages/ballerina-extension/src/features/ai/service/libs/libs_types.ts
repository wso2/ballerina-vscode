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

import { jsonSchema } from "ai";

export interface Type {
    name: string;
    links?: Link[];
}

export interface Link {
    category: Category;
    recordName: string;
    libraryName?: string;
}

export type Category = "internal" | "external";

export interface Parameter {
    name: string;
    description: string;
    type: Type;
    default?: string;
}

export interface ParameterDef {
    description: string;
    type: Type;
    default?: string;
    optional: boolean;
}

export interface Return {
    description?: string;
    type: Type;
}

export interface EnumValue {
    name: string;
    description: string;
}

export interface Field {
    name: string;
    description: string;
    type: Type;
    default?: string;
}

export interface UnionValue {
    name: string;
    type: Type;
}

export interface PathParameter {
    name: string;
    type: string;
}

export interface TypeDefinitionBase {
    name: string;
    description: string;
    type: string;
}

export interface ConstantTypeDefinition extends TypeDefinitionBase {
    value: string;
    varType: Type;
}

export interface RecordTypeDefinition extends TypeDefinitionBase {
    fields: Field[];
}

export interface EnumTypeDefinition extends TypeDefinitionBase {
    members: EnumValue[];
}

export interface UnionTypeDefinition extends TypeDefinitionBase {
    members: UnionValue[];
}

export interface ClassTypeDefinition extends TypeDefinitionBase {
    functions: any[];
}

export type TypeDefinition = 
    | RecordTypeDefinition 
    | EnumTypeDefinition 
    | UnionTypeDefinition 
    | ClassTypeDefinition 
    | TypeDefinitionBase
    | ConstantTypeDefinition;

export interface AbstractFunction {
    type: string;
    description: string;
    parameters: Parameter[];
    return: Return;
}

export interface ResourceFunction extends AbstractFunction {
    accessor: string;
    paths: (PathParameter | string)[];
}

export interface RemoteFunction extends AbstractFunction {
    name: string;
}

export interface ServiceRemoteFunction {
    type: "remote" | "resource";
    description: string;
    parameters: ParameterDef[];
    return: Return;
    optional: boolean;
}

export interface Client {
    name: string;
    description: string;
    functions: (RemoteFunction | ResourceFunction)[];
}

export interface Listener {
    name: string;
    parameters: Parameter[];
}

export interface Service {
    listener: Listener;
    type: "generic" | "fixed";
}

export interface GenericService extends Service {
    instructions: string;
    type: "generic";
}

export interface FixedService extends Service {
    type: "fixed";
    methods: ServiceRemoteFunction[];
}

export interface Library {
    name: string;
    description: string;
    typeDefs: TypeDefinition[];
    clients: Client[];
    functions?: RemoteFunction[];
    services?: Service[];
}


export interface LibraryWithUrl extends Library {
    library_link: string;
}

export interface MiniType {
    name: string;
    description: string;
}

export interface GetTypesRequest {
    name: string;
    description: string;
    types: MiniType[];

}

export interface GetTypeResponse {
    libName: string;
    types: MiniType[];
}

export interface GetTypesResponse {
    libraries: GetTypeResponse[];
}


export const getTypesResponseSchema = jsonSchema<GetTypesResponse>({
    type: 'object',
    properties: {
        libraries: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    libName: { type: 'string' },
                    types: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                description: { type: 'string' }
                            },
                            required: ['name', 'description']
                        }
                    }
                },
                required: ['libName', 'types']
            }
        }
    },
    required: ['libraries']
});
