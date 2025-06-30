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

export interface ConfigProperty {
    name: string;
    type: string;
    property: Property;
    required?: boolean;
    orgKey?: string;  
    pkgKey?: string;
}

export interface Property {
    name?: string;
    type: string;
    additionalProperties?: { type: string };
    properties?: {};
    required?: string[];
    description?: string;
    items?: Property;
}

export enum Constants {
    ENUM = "enum",
    ITEMS = "items",
    TYPE = "type",
    VALUE = "value",
    NAME = "name",
    DESCRIPTION = "description",
    PROPERTIES = "properties",
    REQUIRED = "required",
    ADDITIONAL_PROPERTIES = "additionalProperties",
    ANY_OF = "anyOf",
    ARRAY = "array",
    MODULE = "module",
    OBJECT = "object",
    ARRAY_TYPE = "arrayType",
    FLOAT = "float",
    INTEGER = "integer",
    HTTP = "http"
}

/**
 * xml no type defined but string value
 * tuple no type defined
 * map no type defined
 * record no type defined
 * table and table[] as arrays
 */ 
export enum ConfigTypes {
    BOOLEAN = "boolean",
    INTEGER = "integer",
    NUMBER = "number",
    STRING = "string",
    ARRAY = "array",
    OBJECT = "object",
    ENUM = "enum",
    ANY_OF = "anyOf",
}
