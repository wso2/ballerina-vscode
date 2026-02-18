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

import { TypeInfo } from "./ballerina";
import { CodeData, InputType } from "./bi";
import { LineRange } from "./common";

export enum TypeKind {
    Record = "record",
    Array = "array",
    String = "string",
    StringChar = "string:Char",
    Int = "int",
    IntSigned8 = "int:Signed8",
    IntSigned16 = "int:Signed16",
    IntSigned32 = "int:Signed32",
    IntUnsigned8 = "int:Unsigned8",
    IntUnsigned16 = "int:Unsigned16",
    IntUnsigned32 = "int:Unsigned32",
    Float = "float",
    Decimal = "decimal",
    Boolean = "boolean",
    Enum = "enum",
    Union = "union",
    Unknown = "$CompilationError$",
    Anydata = "anydata",
    Byte = "byte",
    Json = "json",
    Xml = "xml",
}

export enum InputCategory {
    Constant = "constant",
    ModuleVariable = "module-variable",
    Configurable = "configurable",
    Enum = "enum",
    Parameter = "parameter",
    Variable = "variable",
    LocalVariable = "local-variable",
    ConvertedVariable = "converted-variable"
}

export enum IntermediateClauseType {
    WHERE = "where",
    LET = "let",
    ORDER_BY = "order-by",
    LIMIT = "limit",
    FROM = "from",
    JOIN = "join",
    GROUP_BY = "group-by"
}

export enum ResultClauseType {
    SELECT = "select",
    COLLECT = "collect"
}

export interface DMDiagnostic {
    code: string;
    message: string;
}

export interface IOType {
    id: string;
    category?: InputCategory;
    kind?: TypeKind;
    typeName?: string;
    name?: string;
    displayName?: string;
    fields?: IOType[];
    member?: IOType;
    members?: IOType[];
    defaultValue?: unknown;
    optional?: boolean;
    isFocused?: boolean;
    isSeq?: boolean;
    isRecursive?: boolean;
    isDeepNested?: boolean;
    ref?: string;
    typeInfo?: TypeInfo;
    convertedField?: IOType;
}

export interface Mapping {
    output: string,
    inputs?: string[];
    expression: string;
    elements?: MappingElement[];
    diagnostics?: DMDiagnostic[];
    isComplex?: boolean;
    isQueryExpression?: boolean;
    isFunctionCall?: boolean;
    functionRange?: LineRange;
    functionContent?: string;
    elementAccessIndex?: string[];
}

export interface ExpandedDMModel {
    inputs: IOType[];
    output: IOType;
    subMappings?: IOType[] | Mapping[];
    mappings: Mapping[];
    source: string;
    rootViewId: string;
    query?: Query;
    mapping_fields?: Record<string, any>;
    triggerRefresh?: boolean;
    focusInputRootMap?: Record<string, string>;
}

export interface DMModel {
    inputs: IORoot[];
    output: IORoot;
    subMappings?: IORoot[] | Mapping[];
    refs: Record<string, RecordType | EnumType>;
    mappings: Mapping[];
    view: string;
    query?: Query;
    focusInputs?: Record<string, IOTypeField>;
    mapping_fields?: Record<string, any>;
    triggerRefresh?: boolean;
    traversingRoot?: string;
    focusInputRootMap?: Record<string, string>;
    groupById?: string;
}

export interface ModelState {
    model: ExpandedDMModel;
    hasInputsOutputsChanged?: boolean;
    hasSubMappingsChanged?: boolean;
}

export interface IORoot extends IOTypeField {
    category?: InputCategory;
}

export interface RecordType {
    fields: IOTypeField[];
    typeName: string;
    kind: TypeKind;
}

export interface EnumType {
    members?: EnumMember[];
}

export interface IOTypeField {
    typeName?: string;
    kind: TypeKind;
    name: string;
    displayName?: string;
    member?: IOTypeField;
    members?: IOTypeField[];
    fields?: IOTypeField[];
    defaultValue?: unknown;
    optional?: boolean;
    ref?: string;
    focusExpression?: string;
    isSeq?: boolean;
    isIterationVariable?: boolean;
    isGroupingKey?: boolean;
    typeInfo?: TypeInfo;
    convertedVariable?: IORoot;
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
    diagnostics?: DMDiagnostic[];
    fromClause: IntermediateClause;
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
    lhsExpression?: string;
    rhsExpression?: string;
    isOuter?: boolean;
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

export interface FnMetadata {
    returnType: FnReturnType,
    parameters: FnParams[],
    importTypeInfo?: TypeInfo[]
}

export interface FnParams{
    name: string,
    type: string,
    isOptional: boolean,
    isNullable: boolean,
    kind: TypeKind
}

export interface FnReturnType {
    type: string;
    kind: TypeKind;
}

export interface DMFormProps {
    targetLineRange: LineRange;
    fields: DMFormField[];
    submitText?: string;
    cancelText?: string;
    nestedForm?: boolean;
    onSubmit: (data: DMFormFieldValues, formImports?: DMFormFieldValues, importsCodedata?: CodeData) => void;
    onCancel?: () => void;
    isSaving?: boolean;
}

export interface DMFormField {
    key: string;
    label: string;
    type: null | string;
    optional: boolean;
    editable: boolean;
    documentation: string;
    value: any;
    types: InputType[];
    enabled: boolean;
    items?: string[];
}

export interface DMFormFieldValues {
    [key: string]: any;
}

export interface DMViewState {
    viewId: string;
    codedata?: CodeData;
    subMappingName?: string;
}

export interface VisualizableField {
    isDataMapped: boolean;
    defaultValue: string;
}
