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

import { AddSubMappingRequest, CodeData } from "@wso2/ballerina-core";

// Constants for default values related to the sub mapping form
const EMPTY_LABEL = "";
const EMPTY_DESCRIPTION = "";

// Helper function to create metadata object
const createMetadata = (label: string = EMPTY_LABEL, description: string = EMPTY_DESCRIPTION) => ({
    label,
    description
});

// Helper function to create property object
const createProperty = (valueType: string, value: string, optional: boolean, editable: boolean) => ({
    metadata: createMetadata(),
    valueType,
    value,
    optional,
    editable
});

// Helper function to create flowNode properties
const createFlowNodeProperties = (subMappingName: string, type: string, defaultValue: string) => ({
    expression: createProperty("EXPRESSION", defaultValue, true, true),
    variable: createProperty("IDENTIFIER", subMappingName, false, true),
    type: createProperty("TYPE", type, false, true)
});

// Helper function to create flowNode
const createFlowNode = (subMappingName: string, type: string, codedata: CodeData, defaultValue: string) => ({
    id: subMappingName,
    returning: false,
    metadata: createMetadata(),
    codedata: codedata,
    branches: [] as any[],
    properties: createFlowNodeProperties(subMappingName, type, defaultValue)
});

// Helper function to create AddSubMappingRequest
export const createAddSubMappingRequest = (
    filePath: string,
    codedata: CodeData,
    index: number,
    targetField: string,
    subMappingName: string,
    type: string,
    varName: string,
    defaultValue: string
): AddSubMappingRequest => ({
    filePath,
    codedata,
    index,
    targetField,
    flowNode: createFlowNode(subMappingName, type, codedata, defaultValue),
    varName
});
