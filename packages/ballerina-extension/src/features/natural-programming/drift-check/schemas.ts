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

import { z } from "zod";

// Schema for API Documentation drift check result
export const ApiDocsDriftResultSchema = z.object({
    id: z.string().describe("Unique identifier for the issue"),
    fileName: z.string().describe("Filename from the file tag"),
    startRowforImplementationChangedAction: z.number().describe("Start row for implementation changes, -1 if not applicable"),
    endRowforImplementationChangedAction: z.number().describe("End row for implementation changes, -1 if not applicable"),
    implementationChangeSolution: z.string().describe("Corrected implementation code, empty string if not applicable"),
    startRowforDocChangedAction: z.number().describe("Start row for documentation changes"),
    endRowforDocChangedAction: z.number().describe("End row for documentation changes"),
    docChangeSolution: z.string().describe("Corrected API documentation"),
    cause: z.string().describe("Reason why implementation and API documentation are not synchronized")
});

// Schema for Documentation drift check result (requirements/README)
export const DocumentationDriftResultSchema = z.object({
    id: z.string().describe("Unique identifier for the issue"),
    fileName: z.string().describe("Filename of the requirement specification or README documentation"),
    cause: z.string().describe("Detailed description of why program and documentation are unsynchronized"),
    // Optional fields for fixable issues
    codeFileName: z.string().optional().describe("Filename of Ballerina program file where code change is required"),
    startRowforImplementationChangedAction: z.number().optional().describe("Start row for code changes"),
    endRowforImplementationChangedAction: z.number().optional().describe("End row for code changes"),
    implementationChangeSolution: z.string().optional().describe("Corrected code for the specified lines")
});

// Schema for API Documentation drift check response
export const ApiDocsDriftResponseSchema = z.object({
    results: z.array(ApiDocsDriftResultSchema).describe("Array of drift check results for API documentation")
});

// Schema for Documentation drift check response
export const DocumentationDriftResponseSchema = z.object({
    results: z.array(DocumentationDriftResultSchema).describe("Array of drift check results for documentation")
});

// TypeScript types derived from Zod schemas
export type ApiDocsDriftResult = z.infer<typeof ApiDocsDriftResultSchema>;
export type DocumentationDriftResult = z.infer<typeof DocumentationDriftResultSchema>;
export type ApiDocsDriftResponse = z.infer<typeof ApiDocsDriftResponseSchema>;
export type DocumentationDriftResponse = z.infer<typeof DocumentationDriftResponseSchema>;

// Combined result type for processing
export type DriftResult = ApiDocsDriftResult | DocumentationDriftResult;
