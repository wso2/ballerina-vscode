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

export const completionEditorTypeKinds : number[] = [
    // Type
    11,
    // Union
    25,
    // Record
    22,
    // Module
    9,
    // Class
    8
]

export const FILE_SCHEME = "file://";
export const EXPR_SCHEME = "expr://";

export const INPUT_EDITOR_PLACEHOLDERS = new Map<string, string>([
    ['EXPRESSION', '<add-expression>'],
    ['FUNCTION_CALL', '<add-function>'],
    ['STATEMENT', '<add-statement>'],
    ['TYPE_DESCRIPTOR', '<add-type>'],
    ['FIELD_NAME', '<add-field-name>'],
    ['CONF_NAME', '<add-config-name>'],
    ['DEFAULT_INTERMEDIATE_CLAUSE', '<add-intermediate-clause>'],
    ['BINDING_PATTERN', '<add-binding-pattern>'],
    ['VAR_NAME', '<add-variable-name>'],
    ['ACCESS_MODIFIER', '<add-access-modifier>'],
    ['PARAMETER', '<add-param>']
]);
