/* eslint-disable @typescript-eslint/no-explicit-any */
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

// Data-mapper related interfaces
export interface SimpleFieldDescriptor {
    type: string;
    comment: string;
}

export interface NestedFieldDescriptor {
    [key: string]: SimpleFieldDescriptor | NestedFieldDescriptor;
}

export interface RecordDefinitonObject {
    recordFields: NestedFieldDescriptor;
    recordFieldsMetadata: {
        [fieldName: string]: FieldMetadata;
    };
}

export interface FieldMetadata {
    typeName: string;
    type: string;
    typeInstance: string;
    optional: boolean;
    nullable?: boolean;
    nullableArray?: boolean;
    members?: {
        [memberName: string]: FieldMetadata;
    };
    fields?: {
        [fieldName: string]: FieldMetadata;
    };
}

export interface ParameterField {
    isArrayType: boolean;
    parameterName: string;
    parameterType: string;
    type: string;
    members?: {
        [memberName: string]: FieldMetadata;
    };
    fields?: {
        [fieldName: string]: FieldMetadata;
    };
}

export interface InputMetadata {
    [parameterName: string]: ParameterField;
}

export interface OutputMetadata {
    [fieldName: string]: FieldMetadata;
}

export interface MappingField {
    MAPPING_TIP: string;
    INPUT_FIELDS: string[];
}

export interface MappingFields {
    [outputField: string]: MappingField;
}

export interface MappingFileRecord {
    mapping_fields: MappingFields;
}

export interface ParameterMetadata {
    inputs: NestedFieldDescriptor;
    output: NestedFieldDescriptor;
    inputMetadata: InputMetadata;
    outputMetadata: OutputMetadata;
    mapping_fields?: MappingFields;
    constants?: Record<string, FieldMetadata>;
    configurables?: Record<string, FieldMetadata>;
    variables?: Record<string, FieldMetadata>;
}

export interface ParameterDefinitions {
    parameterMetadata: ParameterMetadata;
    errorStatus: boolean;
}

export interface VisitorContext {
    recordFields: NestedFieldDescriptor;
    recordFieldsMetadata: { [key: string]: FieldMetadata };
    memberRecordFields: NestedFieldDescriptor;
    memberFieldsMetadata: { [key: string]: FieldMetadata };
    fieldMetadata: FieldMetadata;
    isNill: boolean;
    isNullable: boolean;
    isArray: boolean;
    isRecord: boolean;
    isSimple: boolean;
    isUnion: boolean;
    isArrayNullable: boolean;
    isRecordNullable: boolean;
    memberName: string;
}

export interface MappingData {
    operation: string;
    parameters: string[];
    targetType: string;
}

export interface IntermediateMapping {
    [key: string]: MappingData | IntermediateMapping;
}

export interface MappingsResponse {
    mappings: IntermediateMapping;
}

export interface ProcessParentKeyResult {
    itemKey: string;
    combinedKey: string;
    inputArrayNullable: boolean;
    isSet: boolean;
    isInputDeeplyNested: boolean;
}

export interface ProcessCombinedKeyResult {
    isinputRecordArrayNullable: boolean;
    isinputRecordArrayOptional: boolean;
    isinputArrayNullable: boolean;
    isinputArrayOptional: boolean;
    isinputNullableArray: boolean;
}
