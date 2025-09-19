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
    Operation,
    DataMappingRequest,
    DataMappingResponse,
    IOTypeVisitor,
    VisitorContext,
    Payload
} from "./types";
import { MappingSchema } from "./schema";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";
import { ADDITION, DIRECT, DIVISION, LENGTH, MODULAR, MULTIPLICATION, NAME, PARAMETER_1, SPLIT, SUBTRACTION } from "./constant";
import { ExpandedDMModel, DataMapperModelResponse, IOType, TypeKind } from "@wso2/ballerina-core";
import { getDataMappingPrompt } from "./prompt";

// Operations table - In a real implementation, this would be loaded from JSON files
const operationsTable: Map<string, Operation> = new Map([
    [
        DIRECT,
        {
            name: DIRECT,
            structure: {
                operation: "DIRECT",
                outputType: ["int", "float", "decimal", "string", "boolean"],
                inputType: ["int", "float", "decimal", "string", "boolean"],
                imports: {},
                errorReturned: false,
                expression: "${LHS} : ${PA_1}",
            },
        },
    ],
    [
        ADDITION,
        {
            name: ADDITION,
            structure: {
                operation: "ADDITION",
                outputType: ["int", "float", "decimal"],
                inputType: ["int", "float", "decimal"],
                imports: {},
                errorReturned: false,
                expression: "+",
            },
        },
    ],
    [
        DIVISION,
        {
            name: DIVISION,
            structure: {
                operation: "DIVISION",
                outputType: ["int", "float", "decimal"],
                inputType: ["int", "float", "decimal"],
                imports: {},
                errorReturned: false,
                expression: "/",
            },
        },
    ],
    [
        LENGTH,
        {
            name: LENGTH,
            structure: {
                operation: "LENGTH",
                outputType: ["int"],
                inputType: ["string[]", "int[]", "float[]", "decimal[]", "boolean[]", "record[]"],
                imports: {},
                errorReturned: false,
                expression: "${LHS} : ${RHS}.length()",
            },
        },
    ],
    [
        MODULAR,
        {
            name: MODULAR,
            structure: {
                operation: "MODULAR",
                outputType: ["int"],
                inputType: ["int"],
                imports: {},
                errorReturned: false,
                expression: "%",
            },
        },
    ],
    [
        MULTIPLICATION,
        {
            name: MULTIPLICATION,
            structure: {
                operation: "MULTIPLICATION",
                outputType: ["int", "float", "decimal"],
                inputType: ["int", "float", "decimal"],
                imports: {},
                errorReturned: false,
                expression: "*",
            },
        },
    ],
    [
        SPLIT,
        {
            name: SPLIT,
            structure: {
                operation: "SPLIT",
                outputType: ["string[]", "string"],
                inputType: ["string"],
                imports: { org: "ballerina", package: "lang.regexp" },
                errorReturned: false,
                expression: "${LHS} : re `,`.split(${RHS})",
            },
        },
    ],
    [
        SUBTRACTION,
        {
            name: SUBTRACTION,
            structure: {
                operation: "SUBTRACTION",
                outputType: ["int", "float", "decimal"],
                inputType: ["int", "float", "decimal"],
                imports: {},
                errorReturned: false,
                expression: "-",
            },
        },
    ],
]);

// =============================================================================
// UTILITY FUNCTIONS FOR SCHEMA PROCESSING
// =============================================================================

/**
 * Finds a schema type by path in the input schemas array
 */

class IOTypeVisitorImpl implements IOTypeVisitor {
    visitIOType(ioType: IOType, context: VisitorContext): IOType | null {
        if (ioType.id === context.targetPath) {
            context.found = ioType;
            return this.isContainerWithRecordFields(ioType) ? null : ioType;
        }

        // Visit all child types
        const childTypes = [
            ...(ioType.fields || []),
            ...(ioType.members || []),
            ...(ioType.member ? [ioType.member] : [])
        ];

        for (const child of childTypes) {
            const result = this.visitIOType(child, context);
            if (result) { return result; }
        }

        return null;
    }

    private isContainerWithRecordFields(ioType: IOType): boolean {
        return this.hasRecordFields(ioType);
    }

    private hasRecordFields(type: IOType): boolean {
        if (!type) { return false; }
        
        // Direct record with fields
        if (type.kind === TypeKind.Record && type.fields?.length) {
            return true;
        }
        
        // Array containing records
        if (type.kind === TypeKind.Array) {
            return this.hasRecordFields(type.member);
        }
        
        // Union containing records
        if (type.kind === TypeKind.Union && type.members?.length) {
            return type.members.some(member => this.hasRecordFields(member));
        }
        
        return false;
    }
}


function findSchemaTypeByPath(inputs: IOType[], path: string): IOType | null {
    const context: VisitorContext = {
        targetPath: path,
        found: null
    };

    const visitor = new IOTypeVisitorImpl();

    for (const inputSchema of inputs) {
        const result = visitor.visitIOType(inputSchema, context);
        if (result) { return result; }
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
    const outputRecordName = output.name;
    if (outputRecordName) {
        const prefix = outputRecordName + ".";
        if (fieldName.startsWith(prefix)) {
            return fieldName.substring(prefix.length);
        }
    }
    return fieldName;
}

// =============================================================================
// MAPPING EVALUATION FUNCTIONS
// =============================================================================

/**
 * Main function to evaluate mappings with enhanced schema support
 */
async function evaluateMappings(
    path: string[], 
    llmGeneratedMappings: AIDataMappings, 
    initialRecords: DataMappingRequest
): Promise<MappingJson | null> {
    if (isMapping(llmGeneratedMappings)) {
        return await processMappingOperation(path, llmGeneratedMappings, initialRecords);
    } else {
        return await processNestedMappings(path, llmGeneratedMappings as { [key: string]: AIDataMappings }, initialRecords);
    }
}

/**
 * Processes individual mapping operations with schema validation
 */
async function processMappingOperation(
    path: string[], 
    llmGeneratedMappings: Mapping, 
    initialRecords: DataMappingRequest
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
            
            const mapping = validateMappingOperation(
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
    initialRecords: DataMappingRequest
): Promise<MappingJson | null> {
    const returnRec: { [key: string]: MappingJson } = {};

    for (const [key, value] of Object.entries(llmGeneratedMappings)) {
        if (value === null || value === undefined) {
            continue;
        }
        
        const newPath = [...path];
        let cleanKey = removeOutputRecordPrefix(key, initialRecords.output);
        newPath.push(key);

        const temporaryRecord = await evaluateMappings(newPath, value, initialRecords);
        if (temporaryRecord) {
            if (isMappingRecord(temporaryRecord) || 
                (typeof temporaryRecord === 'object' && Object.keys(temporaryRecord).length > 0)) {
                returnRec[removeArrayIndicesFromPath(cleanKey)] = temporaryRecord;
            }
        }
    }

    return convertFlatToNestedMap(returnRec);
}

// =============================================================================
// MAPPING OPERATION VALIDATION
// =============================================================================

/**
 * Validates mapping operations with enhanced error handling
 */
function validateMappingOperation(
    mapping: MappingOperation,
    inputType: { [key: string]: ParameterMetadata },
    outputType: FieldMetadata,
    name: string,
    inputs: IOType[]
): MappingJson | null {
    const operation = mapping.NAME;
    // STEP 1: Verify operation exists in operations database
    const op = operationsTable.get(operation);
    
    if (!op) {
        return null;
    }

    switch (op.name) {
        // STEP 2: Validate DIRECT mapping operation
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
        // STEP 3: Validate LENGTH operation
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
        // STEP 4: Validate SPLIT operation
        case SPLIT: {
            const paramOne = inputType[PARAMETER_1];
            const paramTwo = mapping.PARAMETER_2;
            
            if (!paramOne || !paramTwo) {
                throw new Error("Required parameters not found in input type for SPLIT operation");
            }
            
            if (paramOne.type !== "regex" ||
                !(
                    outputType.type === "string[]" ||
                    outputType.type === "string[]|()" ||
                    outputType.type === "(string|())[]" ||
                    outputType.type === "(string|())[]|()"
                )
            ) {
                throw new Error("Invalid input or output type for SPLIT operation");
            }
            
            if (!findSchemaTypeByPath(inputs, paramOne.input)) {
                throw new Error(`Input path not found for SPLIT operation: ${paramOne.input}`);
            }
            
            return {
                operation: SPLIT,
                targetType: outputType.type,
                parameters: [paramOne.input, paramTwo]
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
        if (operationName === SPLIT && paramName === PARAMETER_1) {
            return { type: "regex", optional: inputType.optional, nullable: false };
        }
    }

    const kind = inputType.kind;
    const typeName = inputType.typeName;

    if (!kind || !typeName) {
        throw new Error("Missing kind or typeName in SchemaType");
    }

    const typeString = typeName;
    const isOptional = inputType.optional;
    let isNullable = false;

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
    const fields = schemaType.fields || schemaType.members;
    if (fields && Array.isArray(fields)) {
        for (const field of fields) {
            if (field.id === fieldId || field.name === fieldId) {
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
        if (member.id === fieldId || member.name === fieldId) {
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
 * Enhanced main function for AI-powered data mapping generation with schema support
 */
async function mapData(payload: DataMapperModelResponse): Promise<DatamapperResponse> {
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
            const generatedMappings = await getMappings((payload.mappingsModel as ExpandedDMModel)?.inputs, (payload.mappingsModel as ExpandedDMModel)?.output, payload.mappingsModel.mappings, mappingFields);

            if (Object.keys(generatedMappings).length === 0) {
                const error = new Error("No valid fields were identified for mapping between the given input and output records.");
                lastError = error;
                retries += 1;
                continue;
            }

            // STEP 2: Prepare inputs for validation
            const inputs: DataMappingRequest = {
                input: (payload.mappingsModel as ExpandedDMModel)?.inputs,
                output: (payload.mappingsModel as ExpandedDMModel)?.output
            };

            // STEP 3: Validate and process AI-generated mappings with schema
            const evaluateMappingsResult = await evaluateMappings([], generatedMappings, inputs);

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
async function getMappings(
    inputJsonRecord: IOType[],
    outputJsonRecord: IOType,
    userMappings: DataMappingResponse[],
    mappingTips: { [key: string]: MappingFields }
): Promise<AIDataMappings> {
    const prompt = getDataMappingPrompt(
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

/**
 * Type guard to check if value is a MappingRecord
 */
function isMappingRecord(value: any): value is MappingRecord {
    return value && typeof value === "object" && "operation" in value && "targetType" in value && "parameters" in value;
}

/**
 * Type guard to check if value is a Mapping
 */
function isMapping(value: any): value is { OPERATION: MappingOperation } {
    return value && typeof value === "object" && "OPERATION" in value;
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

export async function generateAutoMappings(payload?: DataMapperModelResponse): Promise<DatamapperResponse> {
    if (!payload) {
        throw new Error("Payload is required for generating auto mappings");
    }
    try {
        return await mapData(payload);
    } catch (error) {
        console.error(`Error generating auto mappings: ${error}`);
        throw error;
    }
}

/**
 * Helper function to create a sample payload for testing
 */
export function createSamplePayload(): Payload {
    return {
        inputs: {
            person: {
                id: { type: "string", comment: "Unique identifier for the person" },
                firstName: { type: "string", comment: "First name of the person" },
                lastName: { type: "string", comment: "Last name of the person" },
                age: { type: "int", comment: "Age of the person" },
                country: { type: "string", comment: "Country of the person" },
                courses: {
                    id: { type: "string", comment: "Unique identifier for the course" },
                    name: { type: "string", comment: "Name of the course" },
                    credits: { type: "int", comment: "Credits of the course" },
                },
            },
        },
        output: {
            id: { type: "string", comment: "Unique identifier for the student" },
            firstName: { type: "string", comment: "First name of the student" },
            age: { type: "int", comment: "Age of the student" },
            country: { type: "string", comment: "Country of the student" },
            courses: {
                id: { type: "string", comment: "Unique identifier for the course" },
                name: { type: "string", comment: "Name of the course" },
                credits: { type: "int", comment: "Credits of the course" },
            },
        },
        inputMetadata: {
            person: {
                parameterType: "Person",
                parameterName: "person",
                isArrayType: false,
                type: "record",
                fields: {
                    id: {
                        type: "string",
                        typeInstance: "id",
                        typeName: "string",
                        nullable: false,
                        optional: false,
                    },
                    firstName: {
                        type: "string",
                        typeInstance: "firstName",
                        typeName: "string",
                        nullable: false,
                        optional: false,
                    },
                    lastName: {
                        type: "string",
                        typeInstance: "lastName",
                        typeName: "string",
                        nullable: false,
                        optional: false,
                    },
                    age: {
                        type: "int",
                        typeInstance: "age",
                        typeName: "int",
                        nullable: false,
                        optional: false,
                    },
                    country: {
                        type: "string",
                        typeInstance: "country",
                        typeName: "string",
                        nullable: false,
                        optional: false,
                    },
                    courses: {
                        type: "record[]",
                        typeInstance: "courses",
                        typeName: "record[]",
                        nullable: false,
                        optional: false,
                        fields: {
                            id: {
                                type: "string",
                                typeInstance: "id",
                                typeName: "string",
                                nullable: false,
                                optional: false,
                            },
                            name: {
                                type: "string",
                                typeInstance: "name",
                                typeName: "string",
                                nullable: false,
                                optional: false,
                            },
                            credits: {
                                type: "int",
                                typeInstance: "credits",
                                typeName: "int",
                                nullable: false,
                                optional: false,
                            },
                        },
                    },
                },
            },
        },
        outputMetadata: {
            id: {
                type: "string",
                typeInstance: "id",
                typeName: "string",
                nullable: false,
                optional: false,
            },
            firstName: {
                type: "string",
                typeInstance: "firstName",
                typeName: "string",
                nullable: false,
                optional: false,
            },
            age: {
                type: "int",
                typeInstance: "age",
                typeName: "int",
                nullable: false,
                optional: false,
            },
            country: {
                type: "string",
                typeInstance: "country",
                typeName: "string",
                nullable: false,
                optional: false,
            },
            courses: {
                type: "record[]",
                typeInstance: "courses",
                typeName: "record[]",
                nullable: false,
                optional: false,
                fields: {
                    id: {
                        type: "string",
                        typeInstance: "id",
                        typeName: "string",
                        nullable: false,
                        optional: false,
                    },
                    name: {
                        type: "string",
                        typeInstance: "name",
                        typeName: "string",
                        nullable: false,
                        optional: false,
                    },
                    credits: {
                        type: "int",
                        typeInstance: "credits",
                        typeName: "int",
                        nullable: false,
                        optional: false,
                    },
                },
            },
        },
    };
}

/**
 * Helper function to validate the structure of a mapping response
 */
export function validateMappingResponse(response: DatamapperResponse): boolean {
    if (!response || !response.mappings) {
        return false;
    }

    for (const [key, mapping] of Object.entries(response.mappings)) {
        if (!isValidMapping(mapping)) {
            console.warn(`Invalid mapping found for key: ${key}`);
            return false;
        }
    }

    return true;
}

/**
 * Recursive function to validate a mapping structure
 */
function isValidMapping(mapping: MappingJson): boolean {
    if (isMappingRecord(mapping)) {
        return Boolean(
            mapping.operation && mapping.targetType && mapping.parameters && Array.isArray(mapping.parameters)
        );
    }

    if (typeof mapping === "object" && mapping !== null) {
        return Object.values(mapping).every((value) => isValidMapping(value));
    }

    return false;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    operationsTable
};
// Default export for the main function
export default generateAutoMappings;

/*
// Example Usage:
async function testDataMapping() {
    try {
        // Create sample payload
        const payload = createSamplePayload();
        
        // Generate mappings
        const response = await generateAutoMappings(payload);
        
        // Validate response
        const isValid = validateMappingResponse(response);
        
        if (isValid) {
            console.log("Generated mappings:", JSON.stringify(response, null, 2));
        } else {
            console.error("Invalid mapping response");
        }
        
        // Expected output structure:
        // {
        //   "mappings": {
        //     "id": {
        //       "operation": "DIRECT",
        //       "targetType": "string",
        //       "parameters": ["person.id"]
        //     },
        //     "firstName": {
        //       "operation": "DIRECT",
        //       "targetType": "string", 
        //       "parameters": ["person.firstName"]
        //     },
        //     "age": {
        //       "operation": "DIRECT",
        //       "targetType": "int",
        //       "parameters": ["person.age"]
        //     },
        //     "courses": {
        //       "id": {
        //         "operation": "DIRECT",
        //         "targetType": "string",
        //         "parameters": ["person.courses.id"]
        //       },
        //       "name": {
        //         "operation": "DIRECT",
        //         "targetType": "string",
        //         "parameters": ["person.courses.name"]
        //       },
        //       "credits": {
        //         "operation": "DIRECT",
        //         "targetType": "int",
        //         "parameters": ["person.courses.credits"]
        //       }
        //     },
        //     "country": {
        //       "operation": "DIRECT",
        //       "targetType": "string",
        //       "parameters": ["person.country"]
        //     }
        //   }
        // }
        
    } catch (error) {
        console.error("Error generating mappings:", error);
    }
}
*/
