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

// Schema for individual operation
const OperationSchema = z.object({
  NAME: z.string(),
  PARAMETER_1: z.union([z.string(), z.number()]).optional(),
  PARAMETER_2: z.union([z.string(), z.number()]).optional(),
  PARAMETER_3: z.union([z.string(), z.number()]).optional(),
  PARAMETER_4: z.union([z.string(), z.number()]).optional(),
  PARAMETER_5: z.union([z.string(), z.number()]).optional(),
  PARAMETER_6: z.union([z.string(), z.number()]).optional(),
  PARAMETER_7: z.union([z.string(), z.number()]).optional(),
  PARAMETER_8: z.union([z.string(), z.number()]).optional(),
  PARAMETER_9: z.union([z.string(), z.number()]).optional(),
  PARAMETER_10: z.union([z.string(), z.number()]).optional(),
});

// Schema for a field mapping that contains an operation
const FieldMappingSchema = z.object({
  OPERATION: OperationSchema
});

// Schema for nested field mappings (like bio.fullName, bio.age)
const NestedFieldMappingSchema = z.record(
  z.string(),
  z.union([
    FieldMappingSchema,
    z.lazy(() => NestedFieldMappingSchema)
  ])
);

// Main schema for the complete data mapping
export const DataMappingSchema = z.record(
  z.string(),
  z.union([
    FieldMappingSchema,
    NestedFieldMappingSchema
  ])
);

// Top-level schema for the data mapping
export const MappingSchema = z.object({
  generatedMappings: DataMappingSchema
});

