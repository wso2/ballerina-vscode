/**
 * Data Mapper Context API
 * 
 * This module provides TypeScript functions for processing files and text content
 * to generate Ballerina mapping instructions, record types, and requirement analysis.
 * 
 * Migrated from Python FastAPI service with the following changes:
 * - HTTP endpoints replaced with function-based API
 * - File writing removed (content returned directly)
 * - DOCX support removed (not needed)
 * - File representation using {fileName, content} records
 * - Prompts defined as functions instead of files
 * - Uses existing Claude endpoint for LLM calls
 * - File type detection based on extension only (no content-type needed)
 * 
 * Usage:
 * ```typescript
 * // Generate mapping instructions from text
 * const result = await generateMappingInstruction({ 
 *   text: "source data structure..." 
 * });
 * 
 * // Generate Ballerina records from image
 * const result = await generateRecord({ 
 *   file: { fileName: "schema.png", content: "base64ImageData..." } 
 * });
 * 
 * // Extract requirements from PDF
 * const result = await extractRequirements({ 
 *   file: { fileName: "requirements.pdf", content: "base64PdfData..." } 
 * });
 * ```
 */

import { generateText, CoreMessage } from "ai";
import { anthropic, ANTHROPIC_SONNET_4 } from "../connection";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";

// Types
export type FileData = {
    fileName: string;
    content: string;
};

export type ProcessType = "mapping_instruction" | "records" | "requirements";

export type DataMapperRequest = {
    file?: FileData;
    text?: string;
    processType: ProcessType;
    isRequirementAnalysis?: boolean; //TODO: Why is this
};

export type DataMapperResponse = {
    fileContent: string;
};

export type SupportedFileExtension = "pdf" | "jpg" | "jpeg" | "png" | "txt";

// Maybe have better names and types?
export async function processDataMapperInput(request: DataMapperRequest): Promise<DataMapperResponse> {
    if (request.file) {
        return await processFile(request.file, request.processType, request.isRequirementAnalysis);
    } else if (request.text) {
        const message = await processText(request.text, request.processType);
        const fileContent = request.isRequirementAnalysis 
            ? message 
            : extractBallerinaCode(message, request.processType);
        return { fileContent };
    } else {
        throw new Error("No file or text provided. Please provide file data or text input.");
    }
}

// Process file data
async function processFile(file: FileData, processType: ProcessType, isRequirementAnalysis: boolean = false): Promise<DataMapperResponse> {
    let message: string;
    
    const extension = getFileExtension(file.fileName);
    
    try {
        //TODO: I think we should handle supported files from one place.
        if (extension === "pdf") {
            message = await processPdf(file.content, processType);
        } else if (extension === "jpeg" || extension === "jpg" || extension === "png") {
            message = await processImage(file.content, processType, extension);
        } else if (extension === "txt" || extension === "csv" || !extension) {
            const txtContent = atob(file.content);
            message = await processText(txtContent, processType);
        } else {
            throw new Error(`Unsupported file type: ${extension}`);
        }

        const fileContent = isRequirementAnalysis 
            ? getRequirementsContent(message)
            : extractBallerinaCode(message, processType);
            
        return { fileContent };
    } catch (error) {
        throw new Error(`Error processing file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Process PDF content
async function processPdf(base64Content: string, processType: ProcessType): Promise<string> {
    try {
        return await extractionUsingClaude({
            pdfData: base64Content,
            processType
        });
    } catch (error) {
        throw new Error(`PDF processing error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Process image content
async function processImage(base64Content: string, processType: ProcessType, extension: string): Promise<string> {
    // Only process actual image extensions
    if (extension !== "jpeg" && extension !== "jpg" && extension !== "png") {
        throw new Error(`Unsupported image extension: ${extension}`);
    }
    
    try {
        return await imageExtractionUsingClaude({
            imgData: base64Content,
            processType,
            extension
        });
    } catch (error) {
        throw new Error(`Image processing error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Process text content
async function processText(text: string, processType: ProcessType): Promise<string> {
    try {
        return await textExtractionUsingClaude({
            textContent: text,
            processType
        });
    } catch (error) {
        throw new Error(`Error processing text: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Extract Ballerina code or mapping fields from the response
function extractBallerinaCode(message: string, processType: ProcessType): string {
    if (processType === "records") {
        const ballerinaCodeMatch = message.match(/<ballerina_code>([\s\S]*?)<\/ballerina_code>/);
        if (ballerinaCodeMatch) {
            return ballerinaCodeMatch[1].trim();
        }
        console.log("No Ballerina code found.");
    } else {
        const mappingFieldsMatch = message.match(/<mapping_fields>([\s\S]*?)<\/mapping_fields>/);
        if (mappingFieldsMatch) {
            return mappingFieldsMatch[1].trim();
        }
        console.log("No mapping fields found.");
    }
    return "";
}

// Get requirements content from response
function getRequirementsContent(message: any): string {
    if (typeof message === "string") {
        return message;
    }
    // Handle different response structures
    if (message?.content?.[0]?.text) {
        return message.content[0].text;
    }
    if (message?.fileContent?.content?.[0]?.text) {
        return message.fileContent.content[0].text;
    }
    return String(message);
}

// Get file extension from filename
function getFileExtension(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    return extension || "";
}

// Prompt generation functions
function getMappingInstructionPrompt(): string {
    return `You are an AI assistant specialized in generating data field mappings for data integration and transformation tasks.
Your goal is to create a detailed mapping between input and output data fields based on the provided content.

Important:
    - Use clear and concise descriptions in the "MAPPING_TIP" field.
    - Include all relevant input fields for each output field.
    - Do not take any assumptions based on data types and mappings.
    - Do not include any mappings you are unsure about.
    - Consider all provided information, including comments and conditions.
    - Final output has only Ballerina code within <mapping_fields> tags.

Please follow these instructions carefully:

1. Read and analyze the content thoroughly.
2. Identify all input and output fields, including their correct path names, exact data types, and any relevant attributes or descriptions in the content.
3. If it is an image, Input records appear on the left side of the image, and output records appear on the right side.
4. All subfields of nested fields or subfields should be structured hierarchically, expanding downwards recursively within their respective parent fields. This hierarchy should reflect nested relationships.
5. If it is an image, Consider only lines that connect input and output fields from left to right, including any mapping details shown in text or diagram lines.
6. Create mappings that follow a left-to-right direction from input to output records.
7. Ensure all input fields and their subfields are mapped to their corresponding output fields/subfields.
8. Include mappings for array to array fields.
9. For nested fields, focus on mapping the subfields rather than the parent nested field.
10. Document all mapping operations, data transformations, and type conversions from input field(s) to output field(s).
11. Include details about complex operations that involve multiple input fields to construct a single output field value.
12. Document any nested mappings, operations, or data transformations required for the mapping.
13. Do not map anything if you are unsure about the correct mapping.

Before generating the final output, wrap your thought process inside <mapping_analysis> tags:

1. Analyze the content:
   - List all input fields and their exact data types (e.g., 1.1 field1: SI, 1.2 field2: int ).
   - List all output fields and their exact data types (e.g., 1.1 field1: SI, 1.2 field2: int )
   - Note any comments, conditions, or additional information provided

2. Plan the mappings:
   - Identify direct field mappings
   - Identify fields requiring transformations or type conversions
   - Identify and list complex mappings involving multiple input fields
   - Note any array to array mappings
   - Consider nested field mappings

3. Identify complex transformations:
   - List and describe any complex transformations or mappings
   - Provide examples of how these transformations would work

4. Review the mapping plan:
   - Ensure all input fields are accounted for
   - Check for any ambiguities or uncertainties
   - Verify that all provided information has been considered

After your analysis, provide the mapping in the following JSON format in <mapping_fields> tags:

{
    "mapping_fields": {
        "output_field_name": {
            "MAPPING_TIP": "Describe the mapping, including any transformations or special considerations",
            "INPUT_FIELDS": ["input_field_name_1", "input_field_name_2", "input_field_name_3", ...] // Add more input fields as needed
        },
        // Add more output fields as needed
    }
}

Simple example for the required format:

{
    "mapping_fields" : {
        "id": {
            "MAPPING_TIP": "Direct mapping from Person.id to Student.id",
            "INPUT_FIELDS": ["person.id"]
        },
        "name": {
            "MAPPING_TIP": "Direct mapping from Person.name to Student.name",
            "INPUT_FIELDS": ["person.name"]
        },
        "age": {
            "MAPPING_TIP": "Direct mapping from Person.age to Student.age",
            "INPUT_FIELDS": ["person.age"]
        },
        "weight": {
            "MAPPING_TIP": "Direct mapping from Person.weight to Student.weight with type conversion from string to float",
            "INPUT_FIELDS": ["person.weight"]
        }
    }
}

Generate only Ballerina code with in <mapping_fields> tags based on the provided content.
`;
}

function getRecordsPrompt(): string {
    return `You are an AI assistant specializing in the Ballerina programming language.
Your task is to analyze given content and create Ballerina code for type records based on the content provided.

IMPORTANT:
    - Do not take any assumptions based on data types or records.
    - Do not include any comments in the code
    - Final output has only Ballerina code within <ballerina_code> tags.
    - Extract as much as all possible records and fields

Please follow these steps to create the Ballerina code:

    1. Analyze the content:
        a) If it is an image, Input records appear on the left side of the image, and output records appear on the right side.
        b) All subfields of nested fields or subfields should be structured hierarchically, expanding downwards recursively within their respective parent fields. This hierarchy should reflect nested relationships.
        c) Must extract all records and their all fields and their data types in the content.
        d) Using and refer to all links or hyperlinks that provide additional information about records and data types in the content.
        e) Quote and number specific parts of the content that mention record types and data types.
        f) List all record types mentioned in the content, numbering them (e.g., 1. RecordType1, 2. RecordType2, ...).
        g) For each record type, list it's all fields and their exact data types as mentioned in the content, also numbering them (e.g., 1.1 field1: SI, 1.2 field2: int, ... ).
        h) Identify any nested structures and explain how they relate to the main records.
        i) Summarize and use relevant comments or conditions or additional information about the records or data types in the content.

    2. Define the record types:
        Based on your analysis:
            - Create a type record for each identified record with its sub-fields
            - Consider all records and fields with optional and nullable feature
            - Use only the exact data types you identified in step 1 for each field and record
            - Apply these naming conventions: PascalCase for record names, camelCase for field names
            - For nested fields, create recursive record types, stopping at simple data types

After your analysis, provide the Ballerina code within <ballerina_code> tags. The code should include:
    - Type record definitions for all identified records with its all fields

Example output structure (generic, without specific content):

<ballerina_code>
type RecordName1 record {
    FieldDataType1 fieldName1;
    FieldDataType2 fieldName2;
    };

type RecordName2 record {
    FieldDataType3 fieldName3;
    RecordName1 nestedField;
};

type RecordName3 record {
    FieldDataType4 fieldName4;
    RecordName4 nestedField;
};
</ballerina_code>

Sample example for the required format:

type Person record {
    int? id?;
    string firstName;
    string? lastName;
    int? age;
    string country?;
    College? college?;
};

type College record {
    Course[] courses;
};

type Course record {
    string? id?;
    decimal credits?;
    Address? address;
};

type Student record {
    string id;
    string firstName;
    float? age;
    record {
        int id;
        float credits?;
        Address address;
    }[] courses;
};

type A record {
    Person[] person;
};

type B record {
    Student[] student?;
};

type Address record {
    string? city?;
    string street;
    string? zipcode;
};

Generate only Ballerina code with in <ballerina_code> tags based on the provided content.`;
}

function getRequirementsPrompt(): string {
    return `You are tasked with providing a comprehensive explanation of the content in a file. 
Your goal is to thoroughly extract all the information present in the file, 
including both textual content and visual elements such as diagrams and images.

Carefully analyze all the information provided in the file content above. 
This may include text, diagrams, images, and any other visual or textual elements.

For the textual content:
1. Extract the complete content and identify the main points and key ideas presented in the text.
2. Identify and explain all important concepts, definitions, or arguments.
3. Identify any significant data, statistics, or numerical information.

For diagrams and images:
1. Extract each visual element in detail, including its layout, components, and any labels or captions with preserving all the information as it is.
2. Extract the purpose or significance of each diagram or image in relation to the overall content.
3. Interpret any data visualizations, charts, or graphs, providing insights on the information they convey.

Provide a comprehensive explanation of the entire file content, integrating your analysis of both the textual and visual elements. Ensure that your explanation:
1. Covers all major aspects of the content
2. Highlights relationships between different parts of the content
3. Offers insights into the overall message or purpose of the document

Present your explanation in a clear, well-structured format. Use paragraphs to separate different topics or aspects of the content. If appropriate, use bullet points or numbered lists to organize information.

Begin your response with an introductory paragraph that briefly outlines what the file contains and its main subject matter. End with a concluding paragraph that summarizes the key takeaways from the file content.

No need of unnecessary greetings or any other unrelated texts needed in the begining and the end. Just give the comprehensive explanation. No additional information is needed.

Write your comprehensive explanation as a text. 
`;
}

function getPromptForProcessType(processType: ProcessType): string {
    switch (processType) {
        case "mapping_instruction":
            return getMappingInstructionPrompt();
        case "records":
            return getRecordsPrompt();
        case "requirements":
            return getRequirementsPrompt();
        default:
            throw new Error(`Unsupported process type: ${processType}`);
    }
}

// Claude API integration functions
async function extractionUsingClaude({ pdfData, processType }: { pdfData: string; processType: ProcessType }): Promise<string> {
    const promptText = getPromptForProcessType(processType);
    
    const messages: CoreMessage[] = [
        {
            role: "user",
            content: [
                {
                    type: "file",
                    data: pdfData,
                    mimeType: "application/pdf"
                },
                {
                    type: "text",
                    text: promptText
                }
            ]
        }
    ];

    const { text } = await generateText({
        model: anthropic(ANTHROPIC_SONNET_4),
        maxTokens: 8192,
        temperature: 0,
        messages: messages,
        abortSignal: AIPanelAbortController.getInstance().signal
    });

    return text;
}

async function imageExtractionUsingClaude({ 
    imgData, 
    processType, 
    extension 
}: { 
    imgData: string; 
    processType: ProcessType; 
    extension: string; 
}): Promise<string> {
    const promptText = getPromptForProcessType(processType);
    
    // Convert extension to proper media type
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";
    
    const messages: CoreMessage[] = [
        {
            role: "user",
            content: [
                {
                    type: "image",
                    image: imgData,
                    mimeType: mimeType
                },
                {
                    type: "text",
                    text: promptText
                }
            ]
        }
    ];

    const { text } = await generateText({
        model: anthropic(ANTHROPIC_SONNET_4),
        maxTokens: 8192,
        temperature: 0,
        messages: messages,
        abortSignal: AIPanelAbortController.getInstance().signal
    });

    return text;
}

async function textExtractionUsingClaude({ 
    textContent, 
    processType 
}: { 
    textContent: string; 
    processType: ProcessType; 
}): Promise<string> {
    const promptText = getPromptForProcessType(processType);
    
    const messages: CoreMessage[] = [
        {
            role: "user",
            content: promptText + "\n\n" + textContent
        }
    ];

    const { text } = await generateText({
        model: anthropic(ANTHROPIC_SONNET_4),
        maxTokens: 8192,
        temperature: 0,
        messages: messages,
        abortSignal: AIPanelAbortController.getInstance().signal
    });

    return text;
}

// Utility functions for specific use cases
export async function generateMappingInstruction(input: { file?: FileData; text?: string }): Promise<DataMapperResponse> {
    return await processDataMapperInput({
        ...input,
        processType: "mapping_instruction"
    });
}

export async function generateRecord(input: { file?: FileData; text?: string }): Promise<DataMapperResponse> {
    return await processDataMapperInput({
        ...input,
        processType: "records"
    });
}

export async function extractRequirements(input: { file?: FileData; text?: string }): Promise<DataMapperResponse> {
    return await processDataMapperInput({
        ...input,
        processType: "requirements",
        isRequirementAnalysis: true
    });
}
