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

import { CodeData } from "./bi";
import { LineRange } from "./common";

export enum TypeKind {
    Record = "record",
    Array = "array",
    String = "string",
    Int = "int",
    Float = "float",
    Decimal = "decimal",
    Boolean = "boolean",
    Enum = "enum",
    Unknown = "$CompilationError$",
    Anydata = "anydata",
    Byte = "byte",
    Json = "json"
}

export enum InputCategory {
    Constant = "constant",
    ModuleVariable = "moduleVariable",
    Configurable = "configurable",
    Enum = "enum",
    Parameter = "parameter",
    Variable = "variable"
}

export enum IntermediateClauseType {
    LET = "let",
    WHERE = "where",
    FROM = "from",
    ORDER_BY = "order by",
    LIMIT = "limit"
}

export enum ResultClauseType {
    SELECT = "select",
    COLLECT = "collect"
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

export interface ModuleInfo {
    org?: string
    packageName?: string
    moduleName?: string
    version?: string
}

export interface IOType {
    id: string;
    category?: InputCategory;
    kind?: TypeKind;
    typeName?: string;
    variableName?: string;
    fields?: IOType[];
    member?: IOType;
    members?: EnumMember[];
    defaultValue?: unknown;
    optional?: boolean;
    focusedMemberId?: string;
    isFocused?: boolean;
    moduleInfo? : ModuleInfo;
}

export interface Mapping {
    output: string,
    inputs?: string[];
    expression: string;
    elements?: MappingElement[];
    diagnostics?: IDMDiagnostic[];
    isComplex?: boolean;
    isQueryExpression?: boolean;
    isFunctionCall?: boolean;
    functionRange?: LineRange;
}

export interface ExpandedDMModel {
    inputs: IOType[];
    output: IOType;
    subMappings?: IOType[];
    mappings: Mapping[];
    source: string;
    view: string;
    query?: Query;
    mapping_fields?: Record<string, any>;
}

export interface DMModel {
    inputs: IORoot[];
    output: IORoot;
    subMappings?: IORoot[];
    types: Record<string, RecordType | EnumType>;
    mappings: Mapping[];
    view: string;
    query?: Query;
    mapping_fields?: Record<string, any>;
}

export interface ModelState {
    model: ExpandedDMModel;
    hasInputsOutputsChanged?: boolean;
    hasSubMappingsChanged?: boolean;
}

export interface IORoot extends IOTypeField {
    id: string;
    category?: InputCategory;
}

export interface RecordType {
    fields: IOTypeField[];
}

export interface EnumType {
    members?: EnumMember[];
}

export interface IOTypeField {
    typeName?: string;
    kind: TypeKind;
    fieldName?: string;
    member?: IOTypeField;
    defaultValue?: unknown;
    optional?: boolean;
    ref?: string;
}

export interface EnumMember {
    id: string;
    typeName: string;
    optional?: boolean;
}

export interface MappingElement {
    mappings: Mapping[];
}

export interface Query {
    output: string,
    inputs: string[];
    diagnostics?: IDMDiagnostic[];
    fromClause: FromClause;
    intermediateClauses?: IntermediateClause[];
    resultClause: ResultClause;
}

export interface FromClause {
    name: string;
    type: string;
    expression: string;
}

export interface IntermediateClauseProps {
    name?: string;
    type?: string;
    expression: string;
    order?: "ascending" | "descending";
}

export interface IntermediateClause {
    type: IntermediateClauseType;
    properties: IntermediateClauseProps;
}

export interface ResultClause {
    type: ResultClauseType;
    properties: {
        expression: string;
        func?: string;
    };
    query?: Query;
}

export interface CustomFnMetadata {
    returnType: string,
    parameters: CustomFnParams[]
}

export interface CustomFnParams{
    name: string,
    type: string,
    isOptional: boolean,
    isNullable: boolean,
    kind: TypeKind
}

export interface IDMFormProps {
    targetLineRange: LineRange;
    fields: IDMFormField[];
    submitText?: string;
    cancelText?: string;
    nestedForm?: boolean;
    onSubmit: (data: IDMFormFieldValues, formImports?: IDMFormFieldValues, importsCodedata?: CodeData) => void;
    onCancel?: () => void;
    isSaving?: boolean;
}

export interface IDMFormField {
    key: string;
    label: string;
    type: null | string;
    optional: boolean;
    editable: boolean;
    documentation: string;
    value: any;
    valueTypeConstraint: string;
    enabled: boolean;
    items?: string[];
}

export interface IDMFormFieldValues {
    [key: string]: any;
}

export interface IDMViewState {
    viewId: string;
    codedata?: CodeData;
    isSubMapping?: boolean;
}

export interface VisualizableField {
    isDataMapped: boolean;
    defaultValue: string;
}
