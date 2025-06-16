// =============================================================================
// OPERATION TYPES
// =============================================================================

export type OperationType = string;

// =============================================================================
// MAPPING TYPES
// =============================================================================

export interface MappingRecord {
    operation: OperationType;
    targetType: string;
    parameters: string[];
}

export type MappingJson = MappingRecord | { [key: string]: MappingJson };

export interface DatamapperResponse {
    mappings: { [key: string]: MappingJson };
}

export interface Payload {
    inputs: { [key: string]: RecordField };
    output: { [key: string]: RecordField };
    inputMetadata: { [key: string]: Metadata };
    outputMetadata: { [key: string]: MetadataField };
    mapping_fields?: { [key: string]: MappingFields };
}

// =============================================================================
// FIELD AND METADATA TYPES
// =============================================================================

export interface SimpleField {
    type: string;
    comment: string;
}

export interface MappingOperation {
    NAME: OperationType;
    PARAMETER_1: string;
    PARAMETER_2?: string;
    PARAMETER_3?: string;
    PARAMETER_4?: string;
}

export type RecordField = SimpleField | { [key: string]: RecordField };

export interface Mapping {
    OPERATION: MappingOperation;
}

export type AIDataMappings = (Mapping) | { [key: string]: AIDataMappings };

export interface Metadata {
    parameterName: string;
    parameterType: string;
    type: string;
    isArrayType?: boolean;
    fields: { [key: string]: MetadataField };
}

export interface MetadataField {
    type: string;
    typeInstance: string;
    typeName: string;
    nullable: boolean;
    optional: boolean;
    fields?: { [key: string]: MetadataField };
    members?: { [key: string]: MetadataField };
}

// =============================================================================
// MAPPING HINT TYPES
// =============================================================================

export interface MappingField {
    MAPPING_TIP: string;
    INPUT_FIELDS: string[];
}

export type MappingFields = MappingField | { [key: string]: MappingFields };

export type MetadataType = Metadata | MetadataField | { [key: string]: MetadataField };

export interface Inputs {
    input: { [key: string]: Metadata };
    output: { [key: string]: MetadataField };
}

// =============================================================================
// OPERATION METADATA STRUCTURES
// =============================================================================

export interface FieldMetadata {
    type: string;
    optional: boolean;
    nullable: boolean;
}

export interface ParameterMetadata extends FieldMetadata {
    input: string;
}

export interface Structure {
    operation: string;
    outputType: string[];
    inputType: string[];
    imports: {
        org?: string;
        package?: string;
    };
    errorReturned: boolean;
    expression: string;
}

export interface Operation {
    readonly name: string;
    structure: Structure;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ChatMessage {
    role: string;
    content: string;
}

export interface ChatChoice {
    message: ChatMessage;
    index: number;
    finish_reason: string;
}

export interface ChatResponse {
    choices: ChatChoice[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

