// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { CoreMessage, generateObject } from "ai";
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../connection";
import {
    DatamapperResponse,
    AIDataMappings,
    MappingJson,
    MappingRecord,
    MappingOperation,
    FieldMetadata,
    ParameterMetadata,
    MappingFields,
    Mapping,
    InlineInputs,
    InlineDataMapping
} from "./types";
import { MappingSchema } from "./schema";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";
import { ADDITION, DIRECT, DIVISION, LENGTH, MODULAR, MULTIPLICATION, NAME, PARAMETER_1, PARAMETER_2, SPLIT, SUBTRACTION } from "./constant";
import { operationsTable } from "./datamapper";
import { getInlineDataMappingPrompt } from "./inline_prompt";
import { ExpandedDMModel, InlineDataMapperModelResponse, IOType } from "@wso2/ballerina-core";

// =============================================================================
// UTILITY FUNCTIONS FOR SCHEMA PROCESSING
// =============================================================================

/**
 * Finds a schema type by path in the input schemas array
 */
function findSchemaTypeByPath(inputs: IOType[], path: string): IOType | null {
    for (const inputSchema of inputs) {
        if (inputSchema.id === path) {
            return inputSchema;
        }
        
        // Recursively search in fields
        const fields = inputSchema.fields;
        if (fields && Array.isArray(fields)) {
            const found = findSchemaTypeByPath(fields, path);
            if (found) {
                return found;
            }
        }
        
        // Recursively search in member
        const member = inputSchema.member;
        if (member) {
            const found = findSchemaTypeByPath([member], path);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

/**
 * Removes array indices from path to normalize field paths
 */
function removeArrayIndicesFromPath(path: string): string {
    const pathParts = path.split('.');
    const cleanParts: string[] = [];

    for (const part of pathParts) {
        // Skip numeric indices
        if (!isNaN(parseInt(part))) {
            continue;
        }
        cleanParts.push(part);
    }
    
    return cleanParts.join('.');
}

/**
 * Removes output record prefix from field name
 */
function removeOutputRecordPrefix(fieldName: string, output: IOType): string {
    const outputRecordName = output.variableName;
    if (outputRecordName) {
        const prefix = outputRecordName + ".";
        if (fieldName.startsWith(prefix)) {
            return fieldName.substring(prefix.length);
        }
    }
    return fieldName;
}

// =============================================================================
// INLINE MAPPING EVALUATION FUNCTIONS
// =============================================================================

/**
 * Main function to evaluate inline mappings with enhanced schema support
 */
async function evaluateInlineMappings(
    path: string[], 
    llmGeneratedMappings: AIDataMappings, 
    initialRecords: InlineInputs
): Promise<MappingJson | null> {
    if (isMapping(llmGeneratedMappings)) {
        return await processMappingOperation(path, llmGeneratedMappings, initialRecords);
    } else {
        return await processNestedMappings(path, llmGeneratedMappings as { [key: string]: AIDataMappings }, initialRecords);
    }
}

/**
 * Processes individual mapping operations with inline schema validation
 */
async function processMappingOperation(
    path: string[], 
    llmGeneratedMappings: Mapping, 
    initialRecords: InlineInputs
): Promise<MappingJson | null> {
    try {
        const operationRecord = llmGeneratedMappings.OPERATION;
        const parametersTypes: { [key: string]: ParameterMetadata } = {};
        let validParameters = false;

        for (const subKey of Object.keys(operationRecord)) {
            if (subKey === NAME) {
                continue;
            }
            
            const subPathString = operationRecord[subKey as keyof MappingOperation] as string;
            if (!subPathString) {
                continue;
            }
            
            const operationName = operationRecord.NAME;
            const inputType = findSchemaTypeByPath(initialRecords.input, subPathString);
            if (!inputType) {
                continue;
            }

            const fieldMetadata = getFieldMetadataFromSchemaType(inputType, subKey, operationName);
            if (!fieldMetadata) {
                continue;
            }

            parametersTypes[subKey] = {
                type: fieldMetadata.type,
                input: subPathString,
                optional: fieldMetadata.optional,
                nullable: fieldMetadata.nullable
            };
            validParameters = true;
        }

        if (validParameters) {
            const outputType = getOutputFieldMetadata(initialRecords.output, path);
            if (!outputType) {
                return null;
            }
            
            const mapping = validateInlineMappingOperation(
                operationRecord, 
                parametersTypes, 
                outputType, 
                path[path.length - 1], 
                initialRecords.input
            );
            return mapping;
        }
        return null;
    } catch (error) {
        console.error('Error processing mapping operation:', error);
        return null;
    }
}

/**
 * Processes nested mapping structures
 */
async function processNestedMappings(
    path: string[], 
    llmGeneratedMappings: { [key: string]: AIDataMappings }, 
    initialRecords: InlineInputs
): Promise<MappingJson | null> {
    const returnRec: { [key: string]: MappingJson } = {};

    for (const [key, value] of Object.entries(llmGeneratedMappings)) {
        if (value === null || value === undefined) {
            continue;
        }
        
        const newPath = [...path];
        const cleanKey = removeOutputRecordPrefix(key, initialRecords.output);
        newPath.push(key);

        const temporaryRecord = await evaluateInlineMappings(newPath, value, initialRecords);
        if (temporaryRecord) {
            if (isMappingRecord(temporaryRecord) || 
                (typeof temporaryRecord === 'object' && Object.keys(temporaryRecord).length > 0)) {
                returnRec[cleanKey] = temporaryRecord;
            }
        }
    }

    return convertFlatToNestedMap(returnRec);
}

// =============================================================================
// INLINE MAPPING OPERATION VALIDATION
// =============================================================================

/**
 * Validates inline mapping operations with enhanced error handling
 */
function validateInlineMappingOperation(
    mapping: MappingOperation,
    inputType: { [key: string]: ParameterMetadata },
    outputType: FieldMetadata,
    name: string,
    inputs: IOType[]
): MappingJson | null {
    const operation = mapping.NAME;
    const op = operationsTable.get(operation);
    
    if (!op) {
        return null;
    }

    switch (op.name) {
        case DIRECT: {
            const param = inputType[PARAMETER_1];
            if (!param) {
                return null;
            }
            
            if (!findSchemaTypeByPath(inputs, param.input)) {
                throw new Error(`Input path not found for DIRECT operation: ${param.input}`);
            }
            
            return {
                operation: DIRECT,
                targetType: outputType.type,
                parameters: [removeArrayIndicesFromPath(param.input)]
            };
        }
        
        case LENGTH: {
            const param = inputType[PARAMETER_1];
            if (!param) {
                throw new Error("Parameter 1 not found in input type for LENGTH operation");
            }
            
            if (!(outputType.type === "int" || outputType.type === "int|()")) {
                throw new Error("Invalid output type for LENGTH operation");
            }
            
            if (!findSchemaTypeByPath(inputs, param.input)) {
                throw new Error(`Input path not found for LENGTH operation: ${param.input}`);
            }
            
            return {
                operation: LENGTH,
                targetType: outputType.type,
                parameters: [removeArrayIndicesFromPath(param.input)]
            };
        }
        
        case SPLIT: {
            const paramOne = inputType[PARAMETER_1];
            const paramTwo = mapping.PARAMETER_2;
            
            if (!paramOne || !paramTwo) {
                throw new Error("Required parameters not found in input type for SPLIT operation");
            }
            
            if (paramOne.type !== "regex" || 
                !(outputType.type === "string[]" || outputType.type === "string[]|()" ||
                  outputType.type === "(string|())[]" || outputType.type === "(string|())[]|()")) {
                throw new Error("Invalid input or output type for SPLIT operation");
            }
            
            if (!findSchemaTypeByPath(inputs, paramOne.input)) {
                throw new Error(`Input path not found for SPLIT operation: ${paramOne.input}`);
            }
            
            return {
                operation: SPLIT,
                targetType: outputType.type,
                parameters: [removeArrayIndicesFromPath(paramOne.input), paramTwo]
            };
        }
        
        default:
            return null;
    }
}

// =============================================================================
// FIELD METADATA EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extracts field metadata from schema type with enhanced type checking
 */
function getFieldMetadataFromSchemaType(
    inputType: IOType, 
    paramName?: string, 
    operationName?: string
): FieldMetadata | null {
    if (paramName && operationName) {
        if (operationName === SPLIT && paramName === PARAMETER_2) {
            return { type: "regex", optional: false, nullable: false };
        }
    }

    const kind = inputType.kind;
    const typeName = inputType.typeName;

    if (!kind || !typeName) {
        throw new Error("Missing kind or typeName in SchemaType");
    }

    const typeString = typeName;
    const isOptional = false; // TODO: Handle optional types
    let isNullable = false; // TODO: Handle nullable types

    // Check if type is nullable (contains ? or ())
    if (typeName.includes("?") || typeName.includes("()")) {
        isNullable = true;
    }

    return { 
        type: typeString, 
        optional: isOptional, 
        nullable: isNullable 
    };
}

/**
 * Gets output field metadata from schema type
 */
function getOutputFieldMetadata(output: IOType, path: string[]): FieldMetadata | null {
    let current = output;

    for (const pathSegment of path) {
        const found = findFieldInSchemaType(current, pathSegment);
        if (!found) {
            return null;
        }
        current = found;
    }

    return getFieldMetadataFromSchemaType(current);
}

/**
 * Finds a field within a schema type structure
 */
function findFieldInSchemaType(schemaType: IOType, fieldId: string): IOType | null {
    const fields = schemaType.fields;
    if (fields && Array.isArray(fields)) {
        for (const field of fields) {
            if (field.id === fieldId || field.variableName === fieldId) {
                return field;
            }
            
            const found = findFieldInSchemaType(field, fieldId);
            if (found) {
                return found;
            }
        }
    }

    const member = schemaType.member;
    if (member) {
        if (member.id === fieldId || member.variableName === fieldId) {
            return member;
        }
        return findFieldInSchemaType(member, fieldId);
    }

    return null;
}

/**
 * Converts flat mapping structure to nested format
 */
function convertFlatToNestedMap(flatMap: { [key: string]: MappingJson }): { [key: string]: MappingJson } {
    const nested: { [key: string]: MappingJson } = {};

    for (const [flatKey, value] of Object.entries(flatMap)) {
        const parts = flatKey.split('.');
        let current = nested;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current)) {
                current[part] = {};
            } else if (typeof current[part] !== 'object' || current[part] === null) {
                current[part] = {};
            }
            current = current[part] as { [key: string]: MappingJson };
        }

        const lastPart = parts[parts.length - 1];
        current[lastPart] = value;
    }
    
    return nested;
}

// =============================================================================
// ENHANCED MAIN ORCHESTRATOR FUNCTION
// =============================================================================

/**
 * Enhanced main function for AI-powered data mapping generation with inline schema support
 */
async function mapInlineData(payload: InlineDataMapperModelResponse): Promise<DatamapperResponse> {
    const maxRetries = 3;
    let retries = 0;
    let lastError: Error;

    while (retries < maxRetries) {
        if (retries > 0) {
            console.debug("Retrying to generate mappings for the payload.");
        }

        try {
            // Extract existing mapping field hints
            const mappingFields: { [key: string]: MappingFields } = payload.mappingsModel.mapping_fields || {};

            // STEP 1: Generate AI-powered mappings using Claude
            const generatedMappings = await getInlineMappings((payload.mappingsModel as ExpandedDMModel)?.inputs, (payload.mappingsModel as ExpandedDMModel)?.output, payload.mappingsModel.mappings, mappingFields);

            if (Object.keys(generatedMappings).length === 0) {
                const error = new Error("No valid fields were identified for mapping between the given input and output records.");
                lastError = error;
                retries += 1;
                continue;
            }

            // STEP 2: Prepare inline inputs for validation
            const inlineInputs: InlineInputs = {
                input: (payload.mappingsModel as ExpandedDMModel)?.inputs,
                output: (payload.mappingsModel as ExpandedDMModel)?.output
            };

            // STEP 3: Validate and process AI-generated mappings with inline schema
            const evaluateMappingsResult = await evaluateInlineMappings([], generatedMappings, inlineInputs);

            if (evaluateMappingsResult) {
                // STEP 4: Extract and structure the validated mappings
                const mappings = extractMappings(evaluateMappingsResult);
                return mappings;
            } else {
                throw new Error("Failed to generate mappings for the payload.");
            }
        } catch (error) {
            console.error(`Error occurred while generating mappings: ${error}`);
            lastError = error as Error;
            retries += 1;
            continue;
        }
    }
    throw lastError;
}

// Import all existing functions from the original implementation
async function getInlineMappings(
    inputJsonRecord: IOType[],
    outputJsonRecord: IOType,
    userMappings: InlineDataMapping[],
    mappingTips: { [key: string]: MappingFields }
): Promise<AIDataMappings> {
    const prompt = getInlineDataMappingPrompt(
        JSON.stringify(inputJsonRecord),
        JSON.stringify(outputJsonRecord),
        JSON.stringify(userMappings),
        JSON.stringify(mappingTips)
    );

    const messages: CoreMessage[] = [
        { role: "user", content: prompt }
    ];

    try {
        const { object } = await generateObject({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            maxTokens: 4096,
            temperature: 0,
            messages: messages,
            schema: MappingSchema,
            abortSignal: AIPanelAbortController.getInstance().signal,
        });

        const generatedMappings = object.generatedMappings as AIDataMappings;
        return generatedMappings;
    } catch (error) {
        console.error("Failed to parse response:", error);
        throw new Error(`Failed to parse mapping response: ${error}`);
    }
}

function extractMappings(evaluateMappingsResult: MappingJson): DatamapperResponse {
    const mappings: { [key: string]: MappingJson } = {};

    if (isMappingRecord(evaluateMappingsResult)) {
        throw new Error("EvaluateMappingsResult is a MappingRecord, expected map structure.");
    }

    if (typeof evaluateMappingsResult === "object" && evaluateMappingsResult !== null) {
        for (const [key, value] of Object.entries(evaluateMappingsResult)) {
            if (isMappingRecord(value)) {
                mappings[key] = value;
            } else if (typeof value === "object" && value !== null) {
                const nestedMappingsResult = extractMappings(value as MappingJson);
                mappings[key] = nestedMappingsResult.mappings;
            }
        }
    }

    return { mappings };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function isMappingRecord(value: any): value is MappingRecord {
    return value && typeof value === "object" && "operation" in value && "targetType" in value && "parameters" in value;
}

function isMapping(value: any): value is { OPERATION: MappingOperation } {
    return value && typeof value === "object" && "OPERATION" in value;
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

export async function generateInlineAutoMappings(payload?: InlineDataMapperModelResponse): Promise<DatamapperResponse> {
    if (!payload) {
        throw new Error("Payload is required for generating auto mappings");
    }
    try {
        return await mapInlineData(payload);
    } catch (error) {
        console.error(`Error generating auto mappings: ${error}`);
        throw error;
    }
}
