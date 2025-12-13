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

import { z } from 'zod';

// Forward declaration for recursive Mapping schema
const MappingSchema: z.ZodType<any> = z.lazy(() => z.object({
  output: z.string(),
  expression: z.string(),
  requiresCustomFunction: z.boolean(),
  functionContent: z.string().optional(),
}));

// Main schema for the complete data mapping (array of Mapping objects)
const DataMappingSchema = z.array(MappingSchema);

// Top-level schema for the generated mappings
const GeneratedMappingSchema = z.object({
  generatedMappings: DataMappingSchema,
});

// Schema for a single source file
const SourceFileSchema = z.object({
  filePath: z.string().min(1),
  content: z.string(),
});

// Schema for the array of repaired source files
const RepairedSourceFilesSchema = z.object({
  repairedFiles: z.array(SourceFileSchema),
});

// Export the schema for reuse
export { GeneratedMappingSchema, RepairedSourceFilesSchema };
