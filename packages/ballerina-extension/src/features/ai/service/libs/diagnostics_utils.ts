import { DiagnosticEntry, SourceFiles, Diagnostics } from '@wso2/ballerina-core';
import { checkProjectDiagnostics } from '../../../../rpc-managers/ai-panel/repair-utils';
import { StateMachine } from '../../../../stateMachine';
import * as path from 'path';

/**
 * Diagnostic entry enriched with resolving hints
 */
export interface EnrichedDiagnostic extends DiagnosticEntry {
    hint?: string;
}

/**
 * Result of diagnostic checking
 */
export interface DiagnosticsCheckResult {
    diagnostics: EnrichedDiagnostic[];
    message: string;
}

/**
 * Map of Ballerina diagnostic codes to resolving hints
 *
 * Each entry maps a diagnostic code (e.g., "BCE2000") to a helpful hint on how to resolve it.
 * These hints are shown alongside the diagnostic message to help developers fix issues quickly.
 *
 * TODO: Populate this map with actual Ballerina diagnostic codes and their corresponding hints.
 * Example structure:
 * {
 *   "BCE2000": "Add missing import statement for the module",
 *   "BCE2001": "Check variable type compatibility",
 *   "BCE2002": "Ensure function return type matches declaration",
 * }
 */
const DIAGNOSTIC_HINTS: Record<string, string> = {
    // Diagnostic code mappings to be populated
};

/**
 * Converts language server Diagnostics to EnrichedDiagnostic entries with hints
 * Filters for error-level diagnostics (severity === 1) only
 */
function transformDiagnosticsToEnriched(diagnostics: Diagnostics[]): EnrichedDiagnostic[] {
    const enrichedDiags: EnrichedDiagnostic[] = [];

    for (const diagParam of diagnostics) {
        for (const diag of diagParam.diagnostics) {
            // Only include error-level diagnostics
            if (diag.severity === 1) {
                const fileName = path.basename(diagParam.uri);
                const msgPrefix = `[${fileName}:${diag.range.start.line},${diag.range.start.character}:${diag.range.end.line},${diag.range.end.character}] `;

                const diagnosticEntry: EnrichedDiagnostic = {
                    code: diag.code.toString(),
                    message: msgPrefix + diag.message
                };

                // Add hint if available for this diagnostic code
                const hint = DIAGNOSTIC_HINTS[diag.code.toString()];
                if (hint) {
                    diagnosticEntry.hint = hint;
                }

                enrichedDiags.push(diagnosticEntry);
            }
        }
    }

    return enrichedDiags;
}

/**
 * Checks the Ballerina package for compilation errors using the language server
 *
 * This function:
 * 1. Gets the current project from the state machine
 * 2. Calls the language server to get package-level diagnostics
 * 3. Enriches diagnostics with resolving hints based on diagnostic codes
 *
 * Note: In Ballerina, diagnostics are generated at the package level, so this checks
 * the entire package/project in the current workspace.
 *
 * @param updatedSourceFiles - Array of source files in the current session (not used, kept for compatibility)
 * @param updatedFileNames - Array of file names in the current session (not used, kept for compatibility)
 * @returns DiagnosticsCheckResult with enriched diagnostics
 */
export async function checkCompilationErrors(
    tempProjectPath: string
): Promise<DiagnosticsCheckResult> {
    try {
        console.log(`[DiagnosticsUtils] Checking Ballerina package for compilation errors`);

        // Get language client from state machine
        const langClient = StateMachine.langClient();

        // Get diagnostics from language server for the current project
        console.log(`[DiagnosticsUtils] Calling language server for diagnostics on ${tempProjectPath}`);
        const diagnostics: Diagnostics[] = await checkProjectDiagnostics(langClient, tempProjectPath);

        // Transform and enrich diagnostics with hints
        const enrichedDiagnostics = transformDiagnosticsToEnriched(diagnostics);

        const errorCount = enrichedDiagnostics.length;

        if (errorCount === 0) {
            return {
                diagnostics: [],
                message: "No compilation errors found. Code compiles successfully."
            };
        }

        return {
            diagnostics: enrichedDiagnostics,
            message: `Found ${errorCount} compilation error(s). Review and fix the errors before proceeding.`
        };
    } catch (error) {
        console.error("[DiagnosticsUtils] Error checking compilation errors:", error);
        return {
            diagnostics: [],
            message: `Failed to check compilation errors: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
