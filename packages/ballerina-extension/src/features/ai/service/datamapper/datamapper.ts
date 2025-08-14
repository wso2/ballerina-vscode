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

import { generateText, CoreMessage, generateObject } from "ai";
import { getDataMappingPrompt } from "./prompt";
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../connection";
import {
    Payload,
    DatamapperResponse,
    AIDataMappings,
    MappingJson,
    MappingRecord,
    Inputs,
    MappingOperation,
    FieldMetadata,
    MetadataField,
    MetadataType,
    Metadata,
    ParameterMetadata,
    MappingFields,
    Operation,
    Structure,
    ChatResponse,
} from "./types";
import {  MappingSchema } from "./schema";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";
import { ADDITION, DIRECT, DIVISION, LENGTH, MODULAR, MULTIPLICATION, NAME, PARAMETER_1, PARAMETER_2, SPLIT, SUBTRACTION } from "./constant";

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
// MAIN ORCHESTRATOR FUNCTION
// =============================================================================

/**
 * Main function for AI-powered data mapping generation
 * Coordinates the entire data mapping workflow with retry logic and error handling
 */
async function mapData(payload: Payload): Promise<DatamapperResponse> {
    const maxRetries = 6;
    let retries = 0;

    while (retries < maxRetries) {
        if (retries > 1) {
            console.debug("Retrying to generate mappings for the payload.");
        }

        try {
            // Extract existing mapping field hints
            const mappingFields: { [key: string]: MappingFields } = payload.mapping_fields || {};

            // STEP 1: Generate AI-powered mappings using Claude
            const generatedMappings = await getAutoMappings(payload.inputs, payload.output, mappingFields);

            // STEP 2: Prepare metadata for validation
            const input: Inputs = {
                input: payload.inputMetadata,
                output: payload.outputMetadata,
            };

            // STEP 3: Validate and process AI-generated mappings
            const evaluateMappingsResult = await evaluateMappings([], generatedMappings, operationsTable, input);

            if (evaluateMappingsResult) {
                // STEP 4: Extract and structure the validated mappings
                const mappings = extractMappings(evaluateMappingsResult);
                return mappings;
            } else {
                throw new Error("Failed to generate mappings for the payload.");
            }
        } catch (error) {
            console.error(`Error occurred while generating mappings: ${error}`);
            retries += 1;
            continue;
        }
    }

    throw new Error("Failed to generate mappings for the payload after all retries.");
}

// =============================================================================
// MAPPING EXTRACTION FUNCTION
// =============================================================================

/**
 * Recursive mapping extraction and structuring function
 * Processes AI-generated and validated mappings into clean, hierarchical structure
 */
function extractMappings(evaluateMappingsResult: MappingJson): DatamapperResponse {
    const mappings: { [key: string]: MappingJson } = {};

    // Guard clause: Ensure we have map-type data (not single mapping record)
    if (isMappingRecord(evaluateMappingsResult)) {
        throw new Error("EvaluateMappingsResult is a MappingRecord, expected map structure.");
    }

    // Process nested mapping structure
    if (typeof evaluateMappingsResult === "object" && evaluateMappingsResult !== null) {
        for (const [key, value] of Object.entries(evaluateMappingsResult)) {
            if (isMappingRecord(value)) {
                // Direct mapping record - add to results
                mappings[key] = value;
            } else if (typeof value === "object" && value !== null) {
                // Nested mapping structure - recursively process
                const nestedMappingsResult = extractMappings(value as MappingJson);
                mappings[key] = nestedMappingsResult.mappings;
            }
        }
    }

    return { mappings };
}

// =============================================================================
// AI-POWERED DATA MAPPING GENERATION
// =============================================================================

/**
 * Generates intelligent data transformation mappings by analyzing input and output schemas
 */
async function getAutoMappings(
    inputJsonRecord: { [key: string]: any },
    outputJsonRecord: { [key: string]: any },
    mappingFields: { [key: string]: MappingFields }
): Promise<AIDataMappings> {
    // STEP 1: Construct AI prompt with schema information
    const prompt = getDataMappingPrompt(
        JSON.stringify(inputJsonRecord),
        JSON.stringify(outputJsonRecord),
        JSON.stringify(mappingFields)
    );

    // STEP 3: Call Claude API using AI SDK
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

// =============================================================================
// MAPPING VALIDATION AND PROCESSING ENGINE
// =============================================================================

/**
 * Recursively validates and processes AI-generated mappings against supported operations
 */
async function evaluateMappings(
    path: string[],
    input: AIDataMappings,
    operations: Map<string, Operation>,
    initialRecords: Inputs
): Promise<MappingJson | null> {
    const returnRec: { [key: string]: MappingJson } = {};

    if (isMapping(input)) {
        // STEP 1: Extract operation record from AI-generated mapping
        const operationRecord = input.OPERATION;
        const parametersTypes: { [key: string]: ParameterMetadata } = {};
        let validParameters = false;

        // STEP 2: Process and validate each parameter in the operation
        for (const subKey of Object.keys(operationRecord)) {
            if (subKey !== NAME) {
                const subPathString = operationRecord[subKey as keyof MappingOperation] as string;
                if (!subPathString) {
                    continue;
                }

                // Extract operation details and input path
                const operationName = operationRecord.NAME;
                const paths = subPathString.split(".");
                if (paths.length <= 1) {
                    continue;
                }

                // STEP 3: Validate input record instance exists
                const recordInstance = paths.shift()!;
                if (!initialRecords.input[recordInstance]) {
                    continue;
                }

                // STEP 4: Extract and validate field type metadata
                const inputFields = initialRecords.input[recordInstance];
                const inputType = getTypeMetadataOfField(inputFields, [...paths].reverse(), subKey, operationName);
                if (!inputType) {
                    continue;
                }

                // STEP 5: Store validated parameter metadata
                parametersTypes[subKey] = {
                    type: inputType.type,
                    input: subPathString,
                    optional: inputType.optional,
                    nullable: inputType.nullable,
                };
                validParameters = true;
            }
        }

        // STEP 6: Validate operation if parameters are valid
        if (validParameters) {
            const outputFields = initialRecords.output;
            const outputType = getTypeMetadataOfField(outputFields, [...path].reverse());
            if (!outputType) {
                return null;
            }

            // STEP 7: Perform comprehensive operation validation
            const mapping = validateMappingOperation(
                operationRecord,
                operations,
                parametersTypes,
                outputType,
                path[path.length - 1],
                initialRecords.input
            );
            return mapping;
        }
        return null;
    } else if (typeof input === "object" && input !== null) {
        // STEP 8: Recursively process nested mapping structures
        for (const [key, value] of Object.entries(input)) {
            if (value === null || value === undefined) {
                continue;
            }

            // Process nested mapping with extended path
            const newPath = [...path, key];
            const temporaryRecord = await evaluateMappings(
                newPath,
                value as AIDataMappings,
                operations,
                initialRecords
            );

            if (temporaryRecord) {
                if (
                    isMappingRecord(temporaryRecord) ||
                    (typeof temporaryRecord === "object" && Object.keys(temporaryRecord).length > 0)
                ) {
                    returnRec[key] = temporaryRecord;
                }
            }
        }
        return returnRec;
    } else {
        throw new Error("Invalid input type");
    }
}

// =============================================================================
// OPERATION-SPECIFIC VALIDATION ENGINE
// =============================================================================

/**
 * Validates individual mapping operations against their specific requirements
 */
function validateMappingOperation(
    mapping: MappingOperation,
    operations: Map<string, Operation>,
    inputType: { [key: string]: ParameterMetadata },
    outputType: FieldMetadata,
    name: string,
    inputs: { [key: string]: Metadata }
): MappingJson | null {
    const operation = mapping.NAME;

    // STEP 1: Verify operation exists in operations database
    const op = operations.get(operation);
    if (!op) {
        return null;
    }

    // STEP 2: Validate DIRECT mapping operation
    if (op.name === DIRECT) {
        const paramOne = inputType[PARAMETER_1];
        if (!paramOne) {
            return null;
        }

        const paths = paramOne.input.split(".");
        if (paths.length === 0) {
            throw new Error("Invalid path in input type for DIRECT operation");
        }

        const recordInstance = paths[0];
        if (!inputs[recordInstance]) {
            throw new Error("Record instance not found in inputs for DIRECT operation");
        }

        return {
            operation: DIRECT,
            targetType: outputType.type,
            parameters: [paramOne.input],
        };

        // STEP 3: Validate LENGTH operation
    } else if (op.name === LENGTH) {
        const paramOne = inputType[PARAMETER_1];
        if (!paramOne) {
            throw new Error("Parameter 1 not found in input type for LENGTH operation");
        }

        const pathString = paramOne.input;
        if (outputType.type === "int" || outputType.type === "int|()") {
            const paths = pathString.split(".");
            if (paths.length === 0) {
                throw new Error("Invalid path in input type for LENGTH operation");
            }

            const recordInstance = paths[0];
            if (!inputs[recordInstance]) {
                throw new Error("Record instance not found in inputs for LENGTH operation");
            }

            return {
                operation: LENGTH,
                targetType: outputType.type,
                parameters: [pathString],
            };
        } else {
            throw new Error("Invalid input or output type for LENGTH operation");
        }

        // STEP 4: Validate SPLIT operation
    } else if (op.name === SPLIT) {
        let paramOne: ParameterMetadata, paramTwo: string | MappingJson;
        if (inputType[PARAMETER_1] && mapping.PARAMETER_2) {
            paramOne = inputType[PARAMETER_1];
            paramTwo = mapping.PARAMETER_2;
        } else if (inputType[PARAMETER_2] && mapping.PARAMETER_1) {
            paramOne = inputType[PARAMETER_2];
            paramTwo = mapping.PARAMETER_1;
        } else {
            throw new Error("Required parameters not found in input type for SPLIT operation");
        }

        if (
            paramOne.type !== "regex" ||
            !(
                outputType.type === "string[]" ||
                outputType.type === "string[]|()" ||
                outputType.type === "(string|())[]" ||
                outputType.type === "(string|())[]|()"
            )
        ) {
            throw new Error("Invalid input or output type for SPLIT operation");
        }

        const paths = paramOne.input.split(".");
        if (paths.length === 0) {
            throw new Error("Invalid path in input type for SPLIT operation");
        }

        const recordInstance = paths[0];
        if (!inputs[recordInstance]) {
            throw new Error("Record instance not found in inputs for SPLIT operation");
        }

        return {
            operation: "SPLIT",
            targetType: outputType.type,
            parameters: [paramOne.input, paramTwo],
        };
    }

    return null;
}

// =============================================================================
// TYPE METADATA EXTRACTION ENGINE
// =============================================================================

/**
 * Extracts type information from schema metadata for validation purposes
 */
function getTypeMetadataOfField(
    input: MetadataType,
    pathParameters: string[],
    paramName?: string,
    operationName?: string
): FieldMetadata | null {
    // STEP 1: Handle special parameter types (e.g., regex for SPLIT operation)
    if (paramName && operationName) {
        if (operationName === SPLIT && paramName === PARAMETER_2) {
            return { type: "regex", optional: false, nullable: false };
        }
    }

    // STEP 2: Process nested field path navigation
    if (pathParameters.length > 0) {
        let modifiedInputs: { [key: string]: MetadataField } | undefined;

        // Extract field map from different metadata types
        if ("fields" in input && input.fields && typeof input.fields === "object" && !("typeName" in input.fields)) {
            modifiedInputs = input.fields as { [key: string]: MetadataField };
        } else if (
            "members" in input &&
            input.members &&
            typeof input.members === "object" &&
            !("typeName" in input.members)
        ) {
            modifiedInputs = input.members as { [key: string]: MetadataField };
        } else if (typeof input === "object" && !("typeName" in input)) {
            modifiedInputs = input as { [key: string]: MetadataField };
        }

        if (!modifiedInputs) {
            throw new Error("No fields found in MetadataField");
        }

        // STEP 3: Navigate to next level in field hierarchy
        const index = pathParameters.pop()!;
        const temporaryRecord = modifiedInputs[index];
        if (temporaryRecord) {
            return getTypeMetadataOfField(temporaryRecord, pathParameters, paramName, operationName);
        } else {
            return null;
        }
    } else {
        // STEP 4: Extract final field type metadata
        try {
            if ("typeName" in input && "optional" in input && "nullable" in input) {
                const metadataField = input as MetadataField;
                return {
                    type: metadataField.typeName,
                    optional: metadataField.optional,
                    nullable: metadataField.nullable,
                };
            } else {
                throw new Error("Invalid metadata structure");
            }
        } catch (error) {
            throw new Error(`Error occurred while getting the type metadata of the field: ${error}`);
        }
    }
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

/**
 * Main export function for generating auto mappings
 * This function matches the original signature and provides a simple interface
 */
export async function generateAutoMappings(payload?: Payload): Promise<DatamapperResponse> {
    if (!payload) {
        throw new Error("Payload is required for generating auto mappings");
    }
    try {
        return await mapData(payload);
    } catch (error) {
        console.error(`Error generating auto mappings: ${error}`);
        throw new Error(`Failed to generate auto mappings: ${error}`);
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
