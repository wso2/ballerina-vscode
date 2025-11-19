
export interface DeleteBiDevantConnectionReq{
    filePath: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

// OpenAPI 3.0 type definitions
export interface OpenAPISecurityScheme {
    type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
    description?: string;
    name?: string;
    in?: 'query' | 'header' | 'cookie';
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
