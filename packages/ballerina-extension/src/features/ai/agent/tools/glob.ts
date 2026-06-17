// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

import { tool } from "ai";
import { z } from "zod";
import { spawnSync } from "child_process";
import type { CopilotEventHandler } from "../../utils/events";
import { getRgExecutable, resolveProjectRoots, validateSearchPath, stripRootPrefix } from "./utils/rg-utils";

// ============================================================================
// Constants
// ============================================================================

export const GLOB_TOOL_NAME = "glob";

const MAX_RESULTS = 500;

const enum RgExitCode {
    MatchesFound = 0,
    NoMatches = 1,
    Error = 2,
}

/** Paths and files always excluded from search */
const EXCLUDE_GLOB_ARGS = ["--glob", "!.git/**", "--glob", "!target/**"];

// ============================================================================
// Types
// ============================================================================

interface GlobInput {
    pattern: string;
    path?: string;
}

export interface GlobResult {
    success: boolean;
    message: string;
    pattern?: string;
    fileCount?: number;
    error?: string;
}

// ============================================================================
// Tool Execute Function
// ============================================================================

export function createGlobExecute(eventHandler: CopilotEventHandler, tempProjectPath: string) {
    const roots = resolveProjectRoots(tempProjectPath);

    function fail(message: string, error: string): GlobResult {
        const result: GlobResult = { success: false, message, error };
        eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
        return result;
    }

    return async (input: GlobInput): Promise<GlobResult> => {
        const { pattern, path: searchPath } = input;

        eventHandler({
            type: "tool_call",
            toolName: GLOB_TOOL_NAME,
            toolInput: { pattern, path: searchPath },
        });

        console.log(`[GlobTool] Pattern: "${pattern}" in ${searchPath || "."}`);

        if (!pattern || pattern.trim().length === 0) {
            return fail("Glob pattern cannot be empty.", "Error: Empty pattern");
        }

        const validation = validateSearchPath(tempProjectPath, searchPath, { requireDirectory: true });

        if (validation.ok === false) {
            return fail(validation.message, validation.error);
        }
        const { resolvedPath } = validation;

        const args: string[] = ["--files", "--glob", pattern, ...EXCLUDE_GLOB_ARGS];
        args.push("--", resolvedPath);

        const proc = spawnSync(getRgExecutable(), args, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });

        if (proc.status === RgExitCode.Error) {
            const errMsg = (proc.stderr || "").trim();
            return fail(`ripgrep error: ${errMsg}`, errMsg);
        }

        if (proc.status === RgExitCode.NoMatches || !proc.stdout || proc.stdout.trim().length === 0) {
            const result: GlobResult = {
                success: true,
                message: `No files found matching pattern: "${pattern}"`,
                pattern,
                fileCount: 0,
            };
            eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
            return result;
        }

        const { normalizedRawRoot } = roots;
        const files = proc.stdout
            .split("\n")
            .filter((l) => l.length > 0)
            .map((l) => stripRootPrefix(l, normalizedRawRoot, tempProjectPath));

        const truncated = files.length > MAX_RESULTS;
        const displayed = truncated ? files.slice(0, MAX_RESULTS) : files;
        const truncationNote = truncated ? `\n... (truncated, showing ${MAX_RESULTS} of ${files.length} matches)` : "";

        const result: GlobResult = {
            success: true,
            message: `Found ${files.length} file(s) matching "${pattern}":\n${displayed.join("\n")}${truncationNote}`,
            pattern,
            fileCount: files.length,
        };

        eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
        console.log(`[GlobTool] Found ${files.length} file(s).`);

        return result;
    };
}

// ============================================================================
// Tool Definition
// ============================================================================

export function createGlobTool(execute: (input: GlobInput) => Promise<GlobResult>) {
    return tool({
        description: `
Fast file pattern matching tool
- Support glob patterns
- Returns matching file paths
- Use this tool when you need to find files by name patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping
`,
        inputSchema: z.object({
            pattern: z.string().describe("The glob pattern to match files against."),
            path: z
                .string()
                .optional()
                .describe(
                    'The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.',
                ),
        }),
        execute,
    });
}