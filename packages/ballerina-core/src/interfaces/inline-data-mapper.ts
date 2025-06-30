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

export enum TypeKind {
    Record = "record",
    Array = "array",
    String = "string",
    Int = "int",
    Float = "float",
    Decimal = "decimal",
    Boolean = "boolean",
    Unknown = "unknown"
}

export enum InputCategory {
    Const = "const",
    ModuleVariable = "moduleVariable",
    Configurable = "configurable"
}

export interface IDMDiagnostic {
    kind: string;
    message: string;
    range: {
        start: {
            line: number;
            character: number;
        };
        end: {
            line: number;
            character: number;
        };
    };
}

export interface IOType {
    id: string;
    category?: InputCategory;
    kind?: TypeKind;
    typeName?: string;
    variableName?: string;
    fields?: IOType[];
    member?: IOType;
    defaultValue?: unknown;
    optional?: boolean;
}

export interface Mapping {
    output: string,
    inputs: string[];
    expression: string;
    elements?: MappingElement[];
    diagnostics?: IDMDiagnostic[];
    isComplex?: boolean;
    isFunctionCall?: boolean;
}

export interface IDMModel {
    inputs: IOType[];
    output: IOType;
    mappings: Mapping[];
    source: string;
    view: string;
}

export interface MappingElement {
    mappings: Mapping[];
}
