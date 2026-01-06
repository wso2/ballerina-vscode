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

import { jsonSchema } from 'ai';

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

export const getFunctionsResponseSchema = jsonSchema<GetFunctionsResponse>({
  type: 'object',
  properties: {
    libraries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          clients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                functions: {
                  type: 'array',
                  items: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          parameters: {
                            type: 'array',
                            items: { type: 'string' }
                          },
                          returnType: { type: 'string' }
                        },
                        required: ['name']
                      },
                      {
                        type: 'object',
                        properties: {
                          accessor: { type: 'string' },
                          paths: {
                            type: 'array',
                            items: {
                              oneOf: [
                                { type: 'string' },
                                {
                                  type: 'object',
                                  properties: {
                                    name: { type: 'string' },
                                    type: { type: 'string' }
                                  },
                                  required: ['name', 'type']
                                }
                              ]
                            }
                          },
                          parameters: {
                            type: 'array',
                            items: { type: 'string' }
                          },
                          returnType: { type: 'string' }
                        },
                        required: ['accessor', 'paths']
                      }
                    ]
                  }
                }
              },
              required: ['name', 'functions']
            }
          },
          functions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                parameters: {
                  type: 'array',
                  items: { type: 'string' }
                },
                returnType: { type: 'string' }
              },
              required: ['name']
            }
          }
        },
        required: ['name']
      }
    }
  },
  required: ['libraries']
});



