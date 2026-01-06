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

import { generateText, ModelMessage } from "ai";
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../utils/ai-client";
import { ContentPart, DataMapperRequest, DataMapperResponse, FileData, FileTypeHandler, ProcessType } from "./types";


// Maybe have better names and types?
export async function processDataMapperInput(request: DataMapperRequest): Promise<DataMapperResponse> {
    if (request.files.length > 0) {
        return await processFiles(request.files, request.processType, request.isRequirementAnalysis);
    } else if (request.text) {
        return await processFiles([{ fileName: 'text', content: btoa(request.text) }], request.processType, request.isRequirementAnalysis);
    } else {
        throw new Error("No files or text provided. Please provide file data or text input.");
    }
}

// Process files (single or multiple)
async function processFiles(files: FileData[], processType: ProcessType, isRequirementAnalysis: boolean = false): Promise<DataMapperResponse> {
    try {
        const message = await processFilesWithClaude(files, processType);

        const fileContent = isRequirementAnalysis
            ? getRequirementsContent(message)
            : extractBallerinaCode(message, processType);
            
        return { fileContent };
    } catch (error) {
        throw new Error(`Error processing ${files.length === 1 ? 'file' : 'files'}: ${error instanceof Error ? error.message : String(error)}`);
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

// Supported file types configuration
const SUPPORTED_FILE_TYPES: Record<string, FileTypeHandler> = {
    pdf: (file: FileData) => ({
        type: "file",
        data: file.content,
        mediaType: "application/pdf"
    }),
    jpeg: (file: FileData) => ({
        type: "image",
        image: file.content,
        mediaType: "image/jpeg"
    }),
    jpg: (file: FileData) => ({
        type: "image",
        image: file.content,
        mediaType: "image/jpeg"
    }),
    png: (file: FileData) => ({
        type: "image",
        image: file.content,
        mediaType: "image/png"
    }),
    txt: (file: FileData, includeFileName: boolean) => {
        const txtContent = atob(file.content);
        return {
            type: "text",
            text: includeFileName ? `File: ${file.fileName}\n\n${txtContent}` : txtContent
        };
    },
    csv: (file: FileData, includeFileName: boolean) => {
        const txtContent = atob(file.content);
        return {
            type: "text",
            text: includeFileName ? `File: ${file.fileName}\n\n${txtContent}` : txtContent
        };
    }
};

// Get file extension from filename
function getFileExtension(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    return extension || "";
}

// Convert file to content part for Claude API
function convertFileToContentPart(file: FileData, includeFileName: boolean = false): ContentPart {
    const extension = getFileExtension(file.fileName);

    const handler = SUPPORTED_FILE_TYPES[extension];

    if (handler) {
        return handler(file, includeFileName);
    }

    // Fallback for files without extension
    if (!extension) {
        const txtContent = atob(file.content);
        return {
            type: "text",
            text: includeFileName ? `File: ${file.fileName}\n\n${txtContent}` : txtContent
        };
    }

    const supportedTypes = Object.keys(SUPPORTED_FILE_TYPES).join(', ');
    throw new Error(`Unsupported file type: ${extension}. Supported types are: ${supportedTypes}`);
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
    return `You are an AI assistant specializing in the Ballerina programming language. Your task is to analyze provided content and generate comprehensive Ballerina type record definitions based on all the information present in that content.

Your goal is to extract every possible record type and field from this content and convert them into proper Ballerina type record definitions. You must capture all the information mentioned - leave nothing out.

## Code Generation Requirements

Generate Ballerina code that includes:

- Type record definitions for ALL identified records with ALL their fields
- Proper handling of optional (\`?\`) and nullable features - but ONLY when explicitly mentioned as optional or nullable in the content
- Correct Ballerina naming conventions
- No comments in the generated code
- No assumptions beyond what's explicitly stated in the content

## Enum Declaration Format

When you encounter enumerated types, use this specific syntax:

\`\`\`ballerina
enum EnumName {
    VALUE1,
    VALUE2,
    VALUE3
};
\`\`\`

## Output Format

Present your final code within \`<ballerina_code>\` tags. Structure your code as follows:

- Place all enum definitions first
- Follow with type record definitions
- Use proper Ballerina syntax throughout

Example structure (generic structure only):

type Person record {
    int? id?;
    string firstName;
    string? lastName;
    int? age;
    Address? address?;
};

type Address record {
    string? city?;
    string street;
    string? zipcode;
};

enum Gender {
    MALE,
    FEMALE,
    OTHER
};

Generate only Ballerina code with in <ballerina_code> tags based on the provided content.
`;
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

// Process files with Claude (handles both single and multiple files)
async function processFilesWithClaude(files: FileData[], processType: ProcessType): Promise<string> {
    const promptText = getPromptForProcessType(processType);

    // Build content array with all files
    const contentParts: Array<any> = [];
    const includeFileName = files.length > 1;

    for (const file of files) {
        contentParts.push(convertFileToContentPart(file, includeFileName));
    }

    // Add the prompt at the end
    contentParts.push({
        type: "text",
        text: promptText
    });

    const messages: ModelMessage[] = [
        {
            role: "user",
            content: contentParts
        }
    ];

    const { text } = await generateText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 8192,
        temperature: 0,
        messages: messages,
        abortSignal: new AbortController().signal
    });

    return text;
}

// Utility functions for specific use cases
export async function generateMappingInstruction(input: { files: FileData[]; text?: string }): Promise<DataMapperResponse> {
    return await processDataMapperInput({
        ...input,
        processType: "mapping_instruction"
    });
}

export async function generateRecord(input: { files: FileData[]; text?: string }): Promise<DataMapperResponse> {
    return await processDataMapperInput({
        ...input,
        processType: "records"
    });
}

export async function extractRequirements(input: { files: FileData[]; text?: string }): Promise<DataMapperResponse> {
    return await processDataMapperInput({
        ...input,
        processType: "requirements",
        isRequirementAnalysis: true
    });
}
