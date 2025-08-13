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
export const NATURAL_PROGRAMMING_DIR_NAME = "natural-programming";
export const REQUIREMENT_DOC_PREFIX = "requirements.";
export const REQUIREMENT_TEXT_DOCUMENT = `${REQUIREMENT_DOC_PREFIX}txt`;
export const REQUIREMENT_MD_DOCUMENT = `${REQUIREMENT_DOC_PREFIX}md`;
export const README_FILE_NAME_LOWERCASE = "readme.md";
export const REQ_KEY = "user_requirements_file";
export const DEVELOPMENT_KEY = "developer_intention_file";
export const DEVELOPMENT_DOCUMENT = "developer.md";
export const TEST_DIR_NAME = "tests";

// Datamapper Constants
// Primitive data types supported by the datamapper
export enum PrimitiveType {
  STRING = "string",
  INT = "int",
  FLOAT = "float",
  DECIMAL = "decimal",
  BOOLEAN = "boolean"
}

export const NUMERIC_AND_BOOLEAN_TYPES = [
    PrimitiveType.INT, 
    PrimitiveType.FLOAT, 
    PrimitiveType.DECIMAL, 
    PrimitiveType.BOOLEAN
];

// Operations that can be performed during data mapping
export enum Operation {
  DIRECT = "DIRECT",
  LENGTH = "LENGTH",
  SPLIT = "SPLIT",
  ADDITION = "ADDITION",
  SUBTRACTION = "SUBTRACTION",
  MULTIPLICATION = "MULTIPLICATION",
  DIVISION = "DIVISION",
  MODULAR = "MODULAR",
  EQUAL = "EQUAL",
  NOTEQUAL = "NOTEQUAL",
  LESS_THAN = "LESS_THAN",
  LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL",
  AND = "AND",
  OR = "OR",
  REPLACE_ALL = "REPLACE_ALL",
  AVERAGE = "AVERAGE",
  MAXIMUM = "MAXIMUM",
  MINIMUM = "MINIMUM",
  SUMMATION = "SUMMATION",
  ABSOLUTE = "ABSOLUTE"
}

// Array types specifically for record data structures
export enum ArrayRecordType {
  RECORD_ARRAY = "record[]",
  RECORD_ARRAY_NULLABLE = "record[]|()",
  READONLY_RECORD_ARRAY = "(readonly&record)[]",
  READONLY_RECORD_ARRAY_NULLABLE = "(readonly&record)[]|()",
  RECORD_OR_NULL_ARRAY = "(record|())[]",
  RECORD_OR_NULL_ARRAY_NULLABLE = "(record|())[]|()",
  READONLY_RECORD_OR_NULL_ARRAY = "(readonly&record|())[]",
  READONLY_RECORD_OR_NULL_ARRAY_NULLABLE = "(readonly&record|())[]|()"
}

// Array types for enum, union, and intersection data structures
export enum ArrayEnumUnionType {
  ENUM_ARRAY = "enum[]",
  UNION_ARRAY = "union[]",
  INTERSECTION_ARRAY = "intersection[]",
  ENUM_ARRAY_NULLABLE = "enum[]|()",
  UNION_ARRAY_NULLABLE = "union[]|()",
  INTERSECTION_ARRAY_NULLABLE = "intersection[]|()"
}

export enum RecordType {
  RECORD = "record",
  RECORD_NULLABLE = "record|()",
  READONLY_RECORD = "readonly&record",
  READONLY_RECORD_NULLABLE = "readonly&record|()",
  RECORD_ARRAY = "record[]",
  RECORD_ARRAY_NULLABLE = "record[]|()",
  READONLY_RECORD_ARRAY = "(readonly&record)[]",
  READONLY_RECORD_ARRAY_NULLABLE = "(readonly&record)[]|()",
  RECORD_OR_NULL_ARRAY = "(record|())[]",
  RECORD_OR_NULL_ARRAY_NULLABLE = "(record|())[]|()",
  READONLY_RECORD_OR_NULL_ARRAY = "(readonly&record|())[]",
  READONLY_RECORD_OR_NULL_ARRAY_NULLABLE = "(readonly&record|())[]|()"
}

export enum UnionEnumIntersectionType {
  ENUM = "enum",
  UNION = "union",
  INTERSECTION = "intersection",
  ENUM_ARRAY = "enum[]",
  ENUM_ARRAY_NULLABLE = "enum[]|()",
  UNION_ARRAY = "union[]",
  UNION_ARRAY_NULLABLE = "union[]|()",
  INTERSECTION_ARRAY = "intersection[]",
  INTERSECTION_ARRAY_NULLABLE = "intersection[]|()"
}

export enum MetadataType {
    INPUT_METADATA = "inputMetadata",
    OUTPUT_METADATA = "outputMetadata"
}
