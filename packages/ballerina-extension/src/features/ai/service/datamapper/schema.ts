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

