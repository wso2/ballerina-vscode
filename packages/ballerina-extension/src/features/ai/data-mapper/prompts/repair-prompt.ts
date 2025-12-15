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

/**
 * Generates the code repair prompt for AI using DM Model
 */
export function getBallerinaCodeRepairPrompt(dmModel: string, imports: string): string {
  return `You are an expert Ballerina programmer tasked with repairing mapping expressions that have compiler errors.

## Context

You have been provided with a Data Mapper Model (DMModel) that contains mapping definitions with diagnostics (compiler errors and warnings). Your task is to fix the expressions in these mappings.

The DMModel structure includes:
- **inputs**: Array of input record structures with their fields and types
- **output**: Output record structure with fields and types
- **subMappings**: Nested mapping definitions
- **mappings**: Array of mapping objects, each containing:
  - \`output\`: Target field path (e.g., "outputRecord.fieldName")
  - \`expression\`: Ballerina expression to map the value
  - \`diagnostics\`: Array of compiler errors/warnings for this mapping (if any)
- **refs**: Referenced type definitions

# Input Data

## Data Mapper Model (DMModel with diagnostics):
${dmModel}

## Available Imports:
${imports}

## Your Task

Analyze each mapping that has diagnostics and repair the expression to fix all compiler errors. Focus on:

1. **Type Compatibility**: Ensure the expression produces the correct type for the output field
2. **Field Access**: Use correct syntax for accessing record fields
   - Required fields: \`record.field\`
   - Optional fields: \`record?.field\` or \`record["field"]\`
3. **Null Safety**: Handle optional/nilable types appropriately
4. **Function Calls**: Verify imported functions are called correctly
5. **Type Conversions**: Add necessary type casts or conversions
6. **Syntax Errors**: Fix any Ballerina syntax issues

## Output Format

Return a JSON object with the repaired mappings:

{
  "repairedMappings": [
    {
      "output": "path.to.output.field",
      "expression": "corrected_ballerina_expression"
    }
  ]
}

## Requirements

- Only include mappings that had diagnostics and were repaired
- Provide the complete corrected expression, not partial code
- Ensure expressions are valid Ballerina syntax
- Maintain the original mapping intent and logic
- Do NOT add comments or explanations in the expressions
- The repaired expression must resolve all diagnostic errors for that mapping

## Example

**Input Mapping with Diagnostic:**
{
  "output": "person.age",
  "expression": "inputData.years",
  "diagnostics": [
    {
      "message": "incompatible types: expected 'int', found 'string'"
    }
  ]
}

##Repaired Output:
{
  "repairedMappings": [
    {
      "output": "person.age",
      "expression": "int:fromString(inputData.years) ?: 0"
    }
  ]
}

Generate the repaired mappings now.`;
}
