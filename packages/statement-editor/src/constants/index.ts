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
import {
    ActionStatement, AssignmentStatement, CallStatement, CompoundAssignmentStatement, DoStatement,
    ElseBlock,
    ForeachStatement, ForkStatement,
    IfElseStatement,
    LocalVarDecl, LockStatement, MatchStatement,
    PanicStatement, ReturnStatement, RollbackStatement, TransactionStatement,
    WhileStatement
} from "@wso2/syntax-tree";

import {
    BINDING_PATTERN_PLACEHOLDER, DEFAULT_INTERMEDIATE_CLAUSE_PLACEHOLDER,
    EXPR_PLACEHOLDER,
    FUNCTION_CALL_PLACEHOLDER,
    PARAMETER_PLACEHOLDER,
    STMT_PLACEHOLDER,
    TYPE_DESC_PLACEHOLDER
} from "../utils/expressions";

export const VARIABLE = "Variable";
export const ARITHMETIC = "Arithmetic";
export const CONDITIONAL = "Conditional";
export const RELATIONAL = "Relational";
export const EQUALITY = "Equality";
export const LOGICAL = "Logical";
export const RANGE = "Range";
export const STRING_TEMPLATE = "StringTemplate";
export const DEFAULT_BOOL = "DefaultBoolean";
export const DEFAULT_INTEGER = "DefaultInteger";
export const DEFAULT_STRING = "DefaultString";
export const DEFAULT_RETURN = "DefaultReturn";
export const UNARY = "Unary";
export const STRING_LITERAL = "StringLiteral";
export const NUMERIC_LITERAL = "NumericLiteral";
export const BOOLEAN_LITERAL = "BooleanLiteral";
export const SIMPLE_NAME_REFERENCE = "SimpleNameReference";
export const QUALIFIED_NAME_REFERENCE = "QualifiedNameReference";
export const OTHER_STATEMENT = "OtherStatement";
export const STRING_TYPE_DESC = "StringTypeDesc";
export const DECIMAL_TYPE_DESC = "DecimalTypeDesc";
export const FLOAT_TYPE_DESC = "FloatTypeDesc";
export const INT_TYPE_DESC = "IntTypeDesc";
export const JSON_TYPE_DESC = "JsonTypeDesc";
export const VAR_TYPE_DESC = "VarTypeDesc";
export const TYPE_TEST = "TypeTestExpression";
export const TYPE_DESCRIPTOR = "TypeDescriptor";
export const BOOLEAN_TYPE_DESC = "BooleanTypeDesc";
export const OTHER_EXPRESSION = "OtherExpression";
export const CUSTOM_CONFIG_TYPE = "Custom";
export const CALL_CONFIG_TYPE = "Call";
export const LOG_CONFIG_TYPE = "Log";
export const ALL_LIBS_IDENTIFIER = "All";
export const LANG_LIBS_IDENTIFIER = "Language";
export const STD_LIBS_IDENTIFIER = "Standard";
export const TABLE_CONSTRUCTOR = "TableConstructor";
export const OBJECT_CONSTRUCTOR = "ObjectConstructor";
export const WHITESPACE_MINUTIAE = "WHITESPACE_MINUTIAE";
export const END_OF_LINE_MINUTIAE = "END_OF_LINE_MINUTIAE";
export const COMMENT_MINUTIAE = "COMMENT_MINUTIAE";
export const CONFIGURABLE_TYPE_STRING = "string";
export const CONFIGURABLE_TYPE_BOOLEAN = "boolean";
export const ADD_CONFIGURABLE_LABEL = "Add Configurable";
export const DEFAULT_IDENTIFIER = "identifier";
export const CONNECTOR = "Connector";
export const ACTION = "Action";
export const HTTP_ACTION = "HttpAction";
export const RECORD_EDITOR = "RecordEditor";

export const TYPE_DESC_CONSTRUCTOR = "TYPE_DESCRIPTOR";
export const EXPR_CONSTRUCTOR = "EXPRESSION";
export const PARAM_CONSTRUCTOR = "PARAMETER_";
export const FIELD_DESCRIPTOR = "TYPE_DESCRIPTOR FIELD_NAME";
export const MAPPING_TYPE_DESCRIPTER = "map<TYPE_DESCRIPTOR>";
export const TABLE_TYPE_DESCRIPTER = "table<TYPE_DESCRIPTOR>";
export const OBJECT_TYPE_DESCRIPTER = "object {}";
export const SERVICE_TYPE_DESCRIPTER = "service object {}";
export const FUNCTION_TYPE_DESCRIPTER = "function ()";
export const MAPPING_CONSTRUCTOR = "key : EXPRESSION";
export const DEFAULT_INTERMEDIATE_CLAUSE = "DEFAULT_INTERMEDIATE_CLAUSE";
export const DEFAULT_WHERE_INTERMEDIATE_CLAUSE = `where ${DEFAULT_INTERMEDIATE_CLAUSE}`;
export const FUNCTION_CALL = "FUNCTION_CALL()"

export const CONFIGURABLE_VALUE_REQUIRED_TOKEN = "?";
export const QUERY_INTERMEDIATE_CLAUSES = "Query Intermediate-Clauses";
export const BINDING_PATTERN = "BINDING_PATTERN"
export const LET_VAR_DECL = `var varName = EXPRESSION`;
export const ELSEIF_CLAUSE = `} else if (EXPRESSION) {\n\n}`;
export const ELSE_CLAUSE = `\n} else {\n\n}`;

export const BAL_SOURCE = "```ballerina";

export const CURRENT_REFERENCES_TITLE = "Current References"

export const METHOD_COMPLETION_KIND = 2;
export const FUNCTION_COMPLETION_KIND = 3;
const FIELD_COMPLETION_KIND = 5;
const VARIABLE_COMPLETION_KIND = 6;
export const PROPERTY_COMPLETION_KIND = 10;
const TYPE_COMPLETION_KIND = 11;
const USER_DEFINED_TYPE_COMPLETION_KIND = 25;
const VALUE_COMPLETION_KIND = 12;
const ENUM_MEMBER_COMPLETION_KIND = 20;
const STRUCT_COMPLETION_KIND = 22;
const OPERATOR_COMPLETION_KIND = 24;

export const PLACEHOLDER_DIAGNOSTICS: string[] = [
    EXPR_PLACEHOLDER, STMT_PLACEHOLDER, TYPE_DESC_PLACEHOLDER, BINDING_PATTERN_PLACEHOLDER,
    DEFAULT_INTERMEDIATE_CLAUSE_PLACEHOLDER, FUNCTION_CALL_PLACEHOLDER, PARAMETER_PLACEHOLDER
];

export const IGNORABLE_DIAGNOSTICS: string[] = [
    'expression is not a constant expression'
];

// The suggestion column size is handled with css (suggestionList -> gridTemplateColumns)
export const SUGGESTION_COLUMN_SIZE = 3;
export const MAX_COLUMN_WIDTH = '155px';

// Statement types supported in function-body-block
export type StatementNodes = ActionStatement
    | AssignmentStatement
    | CallStatement
    | CompoundAssignmentStatement
    | DoStatement
    | ForeachStatement
    | ForkStatement
    | IfElseStatement
    | LocalVarDecl
    | LockStatement
    | MatchStatement
    | PanicStatement
    | ReturnStatement
    | RollbackStatement
    | TransactionStatement
    | WhileStatement
    | ElseBlock;

export type OtherStatementNodeTypes = ActionStatement
    | AssignmentStatement
    | CallStatement
    | CompoundAssignmentStatement
    | DoStatement
    | ForkStatement
    | LockStatement
    | MatchStatement
    | PanicStatement
    | ReturnStatement
    | RollbackStatement
    | TransactionStatement;

export enum ArrayType {
    MAPPING_CONSTRUCTOR,
    INTERMEDIATE_CLAUSE
}

export enum SymbolParameterType {
    REQUIRED = "REQUIRED",
    DEFAULTABLE = "DEFAULTABLE",
    INCLUDED_RECORD = "INCLUDED_RECORD",
    REST = "REST"
}

export const acceptedCompletionKindForTypes : number[] = [
    TYPE_COMPLETION_KIND,
    USER_DEFINED_TYPE_COMPLETION_KIND,
    STRUCT_COMPLETION_KIND
];

export const acceptedCompletionKindForExpressions : number[] = [
    METHOD_COMPLETION_KIND,
    FUNCTION_COMPLETION_KIND,
    FIELD_COMPLETION_KIND,
    VARIABLE_COMPLETION_KIND,
    PROPERTY_COMPLETION_KIND,
    VALUE_COMPLETION_KIND,
    ENUM_MEMBER_COMPLETION_KIND,
    OPERATOR_COMPLETION_KIND
];
