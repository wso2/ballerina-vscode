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



