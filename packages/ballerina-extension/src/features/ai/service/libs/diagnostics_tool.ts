import { tool } from 'ai';
import { z } from 'zod';
import { SourceFiles } from '@wso2/ballerina-core';
import { checkCompilationErrors, DiagnosticsCheckResult } from './diagnostics_utils';

export const DIAGNOSTICS_TOOL_NAME = "getCompilationErrors";

/**
 * Input schema for the diagnostics tool
 * No input parameters needed - tool operates on current code state
 */
const DiagnosticsInputSchema = z.object({});

/**
 * Creates the compilation errors checking tool
 *
 * This tool checks the current Ballerina package for compilation errors using the language server.
 * It operates on all files in the current project/package being modified.
 *
 * @param updatedSourceFiles - Array of source files being modified in the current session
 * @param updatedFileNames - Array of file names being modified in the current session
 * @returns Tool instance for checking compilation errors
 */
export function createDiagnosticsTool(
    tempProjectPath: string
) {
    return tool({
        description: `Checks the compilation errors in the current Ballerina package.

Use this tool when:
// before you mark a task as completed, use this tool to check diagnostics.
- You have completed a significant portion of a task and want to verify the code compiles
- You want to catch errors early before marking a task as complete
- You need detailed diagnostics with resolving hints for any compilation issues

The tool analyzes the entire Ballerina package and returns:
- Compilation errors with file location, error message, and diagnostic code
- Resolving hints for common error codes to help fix issues quickly
- Empty list if no errors are found
`,
        inputSchema: DiagnosticsInputSchema,
        execute: async (): Promise<DiagnosticsCheckResult> => {
            console.log(`[${DIAGNOSTICS_TOOL_NAME}] Checking compilation errors for Ballerina package at ${tempProjectPath}`);

            // Use shared utility to check compilation errors
            const result = await checkCompilationErrors(tempProjectPath);

            return result;
        }
    });
}
