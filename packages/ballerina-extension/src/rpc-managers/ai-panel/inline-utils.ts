/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { Attachment, ExpandedDMModel, FormField, InlineDataMapperModelResponse, InputCategory, IOType, Mapping, MappingElement, TypeKind } from "@wso2/ballerina-core";
import { generateBallerinaCode, mappingFileInlineDataMapperModel, navigateTypeInfo } from "./utils";
import { DatamapperResponse } from "../../../src/features/ai/service/datamapper/types";
import { generateInlineAutoMappings } from "../../../src/features/ai/service/datamapper/inline_datamapper";
import { FieldMetadata, ParameterDefinitions, ParameterField, ParameterMetadata } from "./types";

function transformIOType(input: IOType): FormField {
    const name = input.variableName || extractNameFromId(input.id);

    let typeName: string;
    if (input.kind && input.typeName && input.kind !== input.typeName && input.category) {
        typeName = input.kind;
    } else if (!input.typeName) {
        typeName = input.kind || "unknown";
    } else {
        typeName = input.typeName;
    }

    const baseField = {
        id: input.id,
        name,
        typeName,
        optional: input.optional || false
    };

    // Handle arrays
    if (input.kind === "array" && input.member) {
        const memberTransformed = transformIOType(input.member) as FormField;
        const { name, ...memberWithoutName } = memberTransformed;

        return {
            ...baseField,
            typeName: "array",
            memberType: memberWithoutName as FormField
        } as FormField;
    }

    // Handle records
    if (input.kind === "record" && input.fields) {
        const recordField: FormField = {
            ...baseField,
            typeName: "record",
            fields: input.fields.map(transformIOType) as FormField[]
        };

        if (
            input.typeName &&
            input.kind !== input.typeName &&
            !input.category
        ) {
            recordField.typeInfo = {
                orgName: "",
                moduleName: "",
                name: input.typeName
            };
        }

        return recordField;
    }

    // Handle primitive types
    const primitiveField: FormField = { ...baseField };

    // Add typeInfo if conditions are met
    if (
        input.typeName &&
        input.kind !== input.typeName &&
        !input.category
    ) {
        primitiveField.typeInfo = {
            orgName: "",
            moduleName: "",
            name: input.typeName
        };
    }

    return primitiveField;
}

function extractNameFromId(id: string): string {
    const parts = id.split('.').filter(part => !/^\d+$/.test(part));
    return parts[parts.length - 1];
}

function transformInputs(inputs: IOType[]): {
    constants: Record<string, FieldMetadata>;
    configurables: Record<string, FieldMetadata>;
    variables: Record<string, FieldMetadata>;
    parameters: ParameterField[];
    parameterFields: { [parameterName: string]: FormField[] };
} {
    const constants: Record<string, FieldMetadata> = {};
    const configurables: Record<string, FieldMetadata> = {};
    const variables: Record<string, FieldMetadata> = {};
    const parameters: ParameterField[] = [];
    const parameterFields: { [parameterName: string]: FormField[] } = {};

    inputs.forEach((input) => {
        // Helper function to create ParameterField
        const createParameterField = (input: IOType): ParameterField => {
            const name = input.id;
            let typeName: string;

            if (input.kind !== input.typeName) {
                typeName = input.typeName;
            } else if (!input.typeName) {
                typeName = input.kind || "unknown";
            } else {
                typeName = input.typeName;
            }

            // Determine if it's an array type
            const isArrayType = input.kind === TypeKind.Array;

            // Determine the type string
            let type: string;
            if (isArrayType) {
                // If it's an array, get the member type and append []
                if (input.member) {
                    const memberTypeName = input.member.typeName || input.member.kind || "unknown";
                    type = `${memberTypeName}[]`;
                } else {
                    type = `${typeName}[]`;
                }
            } else {
                type = input.kind;
            }

            return {
                isArrayType,
                parameterName: name,
                parameterType: typeName,
                type
            };
        };

        const createFieldConfig = (input: IOType): FieldMetadata => {
            if (!input.typeName) {
                throw new Error("TypeName is missing");
            }
            return {
                typeName: input.kind || "unknown",
                type: input.kind || "unknown",
                typeInstance: input.id,
                nullable: false, // default to false TODO: Update if needed
                optional: false // default to false TODO: Update if needed
            };
        };

        // Handle different categories
        if (input.category === InputCategory.Constant) {
            constants[input.id] = createFieldConfig(input);
            return;
        }

        if (input.category === InputCategory.Configurable) {
            configurables[input.id] = createFieldConfig(input);
            return;
        }

        if (input.category === InputCategory.Variable) {
            variables[input.id] = createFieldConfig(input);
            return;
        }

        if (input.category === InputCategory.Parameter) {
            const parameterField = createParameterField(input);
            parameters.push(parameterField);

            const parameterName = input.id;
            if (input.fields) {
                parameterFields[parameterName] = input.fields.map(transformIOType);
            } else {
                parameterFields[parameterName] = [transformIOType(input)];
            }
        }
    });

    return { constants, configurables, variables, parameters, parameterFields };
}

function transformOutput(output: IOType): FormField[] {
    if (output.fields) {
        return output.fields.map(transformIOType);
    }
    return [transformIOType(output)];
}

// Utility function to check if a value is null or undefined
function isNullOrUndefined(value: any): boolean {
    return value === null || value === undefined;
}

// Clean IOType by removing null/undefined fields and filtering arrays
function cleanIOType(ioType: IOType | null | undefined): IOType | null {
    if (isNullOrUndefined(ioType)) {
        return null;
    }

    const cleaned = ioType;

    // Clean fields array - remove null/undefined elements and recursively clean
    if (ioType.fields && Array.isArray(ioType.fields)) {
        const cleanedFields = ioType.fields
            .filter(field => !isNullOrUndefined(field))
            .map(field => cleanIOType(field))
            .filter(field => field !== null) as IOType[];

        if (cleanedFields.length > 0) {
            cleaned.fields = cleanedFields;
        }
    }

    // Clean member recursively
    if (ioType.member && !isNullOrUndefined(ioType.member)) {
        const cleanedMember = cleanIOType(ioType.member);
        if (cleanedMember !== null) {
            cleaned.member = cleanedMember;
        }
    }

    // Clean members array - remove null/undefined elements
    if (ioType.members && Array.isArray(ioType.members)) {
        const cleanedMembers = ioType.members.filter(member =>
            !isNullOrUndefined(member) &&
            !isNullOrUndefined(member.id) &&
            !isNullOrUndefined(member.typeName)
        );

        if (cleanedMembers.length > 0) {
            cleaned.members = cleanedMembers;
        }
    }

    return cleaned;
}

// Clean ExpandedDMModel by removing null fields and cleaning nested structures
function cleanExpandedDMModel(model: ExpandedDMModel): ExpandedDMModel {
    const cleaned = model as ExpandedDMModel;

    // Clean inputs array - remove null/undefined elements
    if (model.inputs && Array.isArray(model.inputs)) {
        const cleanedInputs = model.inputs
            .filter(input => !isNullOrUndefined(input))
            .map(input => cleanIOType(input))
            .filter(input => input !== null) as IOType[];

        cleaned.inputs = cleanedInputs;
    }

    // Clean output
    if (model.output && !isNullOrUndefined(model.output)) {
        const cleanedOutput = cleanIOType(model.output);
        if (cleanedOutput !== null) {
            cleaned.output = cleanedOutput;
        }
    }

    // Clean subMappings array if it exists
    if (model.subMappings && Array.isArray(model.subMappings)) {
        const cleanedSubMappings = model.subMappings
            .filter(subMapping => !isNullOrUndefined(subMapping))
            .map(subMapping => cleanIOType(subMapping))
            .filter(subMapping => subMapping !== null) as IOType[];

        if (cleanedSubMappings.length > 0) {
            cleaned.subMappings = cleanedSubMappings;
        }
    }

    // Clean mappings array - remove null/undefined elements
    if (model.mappings && Array.isArray(model.mappings)) {
        const cleanedMappings = model.mappings.filter(mapping =>
            !isNullOrUndefined(mapping) &&
            !isNullOrUndefined(mapping.output) &&
            !isNullOrUndefined(mapping.expression)
        );

        // Also clean inputs array within each mapping
        cleanedMappings.forEach(mapping => {
            if (mapping.inputs && Array.isArray(mapping.inputs)) {
                mapping.inputs = mapping.inputs.filter(input => !isNullOrUndefined(input));
            }
        });

        cleaned.mappings = cleanedMappings;
    }

    // Include query if it exists and is not null
    if (model.query && !isNullOrUndefined(model.query)) {
        cleaned.query = model.query;
    }

    return cleaned;
}

// Main function to clean the entire InlineDataMapperModelResponse
function cleanInlineDataMapperModelResponse(
    response: ExpandedDMModel
): InlineDataMapperModelResponse {
    if (!response) {
        throw new Error("Invalid response: missing mappingsModel");
    }

    const cleanedResponse: InlineDataMapperModelResponse = {
        mappingsModel: cleanExpandedDMModel(response as ExpandedDMModel)
    };

    return cleanedResponse;
}

function transformCodeObjectToMappings(codeObject: any, request: InlineDataMapperModelResponse): Mapping[] {
    const mappings: Mapping[] = [];

    // Get the output variable name from the request
    const { output: mappingOutput } = request.mappingsModel as ExpandedDMModel;
    const outputVariableName = mappingOutput.variableName || extractNameFromId(mappingOutput.id);

    // Iterate through each property in codeObject
    Object.keys(codeObject).forEach(key => {
        const mapping: Mapping = {
            output: `${outputVariableName}.${key}`,
            expression: codeObject[key]
        };
        mappings.push(mapping);
    });

    return mappings;
}

export async function getInlineParamDefinitions(
    inlineDataMapperResponse: InlineDataMapperModelResponse
): Promise<ParameterDefinitions> {
    const inputs: { [key: string]: any } = {};
    const inputMetadata: { [key: string]: any } = {};
    
    const { inputs: mappingInputs, output: mappingOutput } = inlineDataMapperResponse.mappingsModel as ExpandedDMModel;
    const transformedInputs = transformInputs(mappingInputs);
    const transformedOutputs = transformOutput(mappingOutput);

    for (const parameter of transformedInputs.parameters) {
        const inputDefinition = navigateTypeInfo(transformedInputs.parameterFields[parameter.parameterName], false);
        
        inputs[parameter.parameterName] = inputDefinition.recordFields;
        inputMetadata[parameter.parameterName] = {
            "isArrayType": parameter.isArrayType,
            "parameterName": parameter.parameterName,
            "parameterType": parameter.parameterType,
            "type": parameter.type,
            "fields": inputDefinition.recordFieldsMetadata
        };
    }

    const outputDefinition = navigateTypeInfo(transformedOutputs, false);
    const output = { ...outputDefinition.recordFields };
    const outputMetadata = { ...outputDefinition.recordFieldsMetadata };

    return {
        parameterMetadata: {
            inputs,
            output,
            inputMetadata,
            outputMetadata,
            constants: transformedInputs.constants,
            configurables: transformedInputs.configurables,
            variables: transformedInputs.variables
        },
        errorStatus: false
    };
}

async function sendInlineDatamapperRequest(inlineDataMapperResponse: InlineDataMapperModelResponse): Promise<DatamapperResponse> {
    const response: DatamapperResponse = await generateInlineAutoMappings(inlineDataMapperResponse);
    return response;
}

async function getInlineDatamapperCode(inlineDataMapperResponse: InlineDataMapperModelResponse, parameterDefinitions: ParameterMetadata): Promise<Record<string, string>> {
    let nestedKeyArray: string[] = [];
    try {
        let response: DatamapperResponse = await sendInlineDatamapperRequest(inlineDataMapperResponse);
        let intermediateMapping = response.mappings;
        let finalCode = await generateBallerinaCode(intermediateMapping, parameterDefinitions, "", nestedKeyArray);
        return finalCode;
    } catch (error) {
        console.error(error);
        throw error; 
    }
}

export async function processInlineMappings(
    request: ExpandedDMModel,
    file?: Attachment
): Promise<MappingElement> {
    let inlineDataMapperResponse = cleanInlineDataMapperModelResponse(request);
    const result = await getInlineParamDefinitions(inlineDataMapperResponse);
    const parameterDefinitions = (result as ParameterDefinitions).parameterMetadata;
    
    if (file) {
        const mappedResult = await mappingFileInlineDataMapperModel(file, inlineDataMapperResponse);
        inlineDataMapperResponse = mappedResult as InlineDataMapperModelResponse;
    }

    const codeObject = await getInlineDatamapperCode(inlineDataMapperResponse, parameterDefinitions);
    const mappings: Mapping[] = transformCodeObjectToMappings(codeObject, inlineDataMapperResponse);
    return { mappings };
}
