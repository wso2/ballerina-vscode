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
 * Generates the main data mapping prompt for AI
 */
export function getBallerinaCodeRepairPrompt(sourceFiles: string, diagnostics: string, imports: string): string {
  return `You are an expert Ballerina programmer tasked with fixing compiler errors in Ballerina source code.

# Context
You have been provided with:
1. Source files with Ballerina code that contains errors
2. Diagnostic information (compiler errors and warnings)
3. Import statements available in the project

# Your Task
Analyze the provided code and diagnostics, then generate corrected Ballerina source files that:
- Fix all compiler errors identified in the diagnostics
- Maintain the original code structure and logic as much as possible
- Use correct Ballerina syntax and idioms
- Ensure all function signatures, type definitions, and record field accesses are valid
- Verify that all imported modules are used correctly
- Follow Ballerina best practices and conventions

# Input Data

## Source Files:
${sourceFiles}

## Diagnostics (Errors and Warnings):
${diagnostics}

## Available Imports:
${imports}

# Instructions
1. Carefully examine each diagnostic error and identify the root cause
2. Check function signatures, return types, and parameter types against Ballerina documentation
3. Verify record field access patterns are correct (use dot notation for required fields, optional chaining for optional fields)
4. Ensure type compatibility in assignments and function calls
5. Fix any syntax errors or misused language constructs
6. Validate that all imported modules and their functions are used correctly
7. Return the complete corrected source files with the same file paths

# Output Format
Return a JSON object with the following structure:
{
  "repairedFiles": [
    {
      "filePath": "path/to/file.bal",
      "content": "// Complete corrected Ballerina code here"
    }
  ]
}

# Important Notes
- Include ALL source files in your response, even if some don't have errors
- Provide the COMPLETE file content, not just the changed portions
- Ensure the code compiles without errors
- Maintain code readability and formatting
- Preserve all existing comments from the original code
- Do NOT add any new comments or explanatory notes
- Only fix the errors without adding documentation or explanations
- Do not change the core logic or business requirements of the code

Generate the repaired source files now.`;
}
