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

export const GREP_TOOL_NAME = "grep";

const MAX_LINES = 1000;

/** File globs to search by default in Ballerina projects */
const DEFAULT_GLOB_ARGS = [
    "--glob", "*.bal",
    "--glob", "*.toml",
    "--glob", "*.md",
    "--glob", "*.json",
    "--glob", "*.yaml",
    "--glob", "*.yml",
    "--glob", "*.sql",
];

/** Paths and files always excluded from search */
const EXCLUDE_GLOB_ARGS = ["--glob", "!.git/**", "--glob", "!target/**", "--glob", "!Config.toml"];

/** Base ripgrep flags applied to every search */
const BASE_RG_ARGS = [
    "--engine",
    "default",
    "-C",
    "2", // show 2 lines of context before and after each match
    "--heading", // print the file name once as a header, not on every line
    "--line-number", // prefix each output line with its line number
];

const enum RgExitCode {
    MatchesFound = 0,
    NoMatches = 1,
    Error = 2,
}

// ============================================================================
// Types
// ============================================================================

interface GrepInput {
    pattern: string;
    path?: string;
    case_insensitive?: boolean;
}

export interface GrepResult {
    success: boolean;
    message: string;
    pattern?: string;
    matchCount?: number;
    error?: string;
}

// ============================================================================
// Tool Execute Function
// ============================================================================

export function createGrepExecute(eventHandler: CopilotEventHandler, tempProjectPath: string) {
    const roots = resolveProjectRoots(tempProjectPath);

    function fail(message: string, error: string): GrepResult {
        const result: GrepResult = { success: false, message, error };
        eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
        return result;
    }

    return async (input: GrepInput): Promise<GrepResult> => {
        const { pattern, path: searchPath, case_insensitive = false } = input;

        eventHandler({
            type: "tool_call",
            toolName: GREP_TOOL_NAME,
            toolInput: { pattern, path: searchPath, case_insensitive },
        });

        console.log(`[GrepTool] Searching for pattern: "${pattern}" in ${searchPath || "."}`);

        if (!pattern || pattern.trim().length === 0) {
            return fail("Search pattern cannot be empty.", "Error: Empty pattern");
        }

        const validation = validateSearchPath(tempProjectPath, searchPath);

        if (validation.ok === false) {
            return fail(validation.message, validation.error);
        }
        const { resolvedPath } = validation;

        // Build ripgrep args
        const args: string[] = [...BASE_RG_ARGS];

        if (case_insensitive) {
            args.push("--ignore-case");
        }

        args.push(...DEFAULT_GLOB_ARGS);

        args.push(...EXCLUDE_GLOB_ARGS);

        args.push("--", pattern, resolvedPath);

        const proc = spawnSync(getRgExecutable(), args, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });

        if (proc.status === RgExitCode.Error) {
            const errMsg = (proc.stderr || "").trim();
            const result: GrepResult = { success: false, message: `ripgrep error: ${errMsg}`, error: errMsg };
            eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
            return result;
        }

        if (proc.status === RgExitCode.NoMatches || !proc.stdout || proc.stdout.trim().length === 0) {
            const result: GrepResult = { success: true, message: `No matches found for pattern: "${pattern}"`, pattern, matchCount: 0 };
            eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
            return result;
        }

        let lines = proc.stdout.split("\n").filter((l) => l.length > 0);

        // Make paths relative to project root (always strip from tempProjectPath, not resolvedPath,
        // so scoped searches like path:'order_service' still return 'order_service/file.bal')
        lines = lines.map((line) => stripRootPrefix(line, roots.normalizedRawRoot, tempProjectPath));

        const truncated = lines.length > MAX_LINES;
        const displayed = truncated ? lines.slice(0, MAX_LINES) : lines;
        const truncationNote = truncated ? `\n... (truncated, showing ${MAX_LINES} of ${lines.length} lines)` : "";
        const matchLines = lines.filter((l) => /^\d+[:\-]/.test(l));

        const result: GrepResult = {
            success: true,
            message: displayed.join("\n") + truncationNote,
            pattern,
            matchCount: matchLines.length,
        };

        eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
        console.log(`[GrepTool] ripgrep returned ${lines.length} lines.`);

        return result;
    };
}

// ============================================================================
// Tool Definition
// ============================================================================

export function createGrepTool(execute: (input: GrepInput) => Promise<GrepResult>) {
    return tool({
        description: `
A powerful search tool built on ripgrep.
Usage:
 - ALWAYS use Grep for search tasks. NEVER invoke \`grep\` as a Bash command.
 - Supports full ripgrep regex syntax
 - Always returns matching lines with 2 lines of surrounding context and grouped by file
 - Only searches these file types by default: .bal, .toml, .md, .json, .yaml, .yml, .sql — searches for other extensions will return no results
`,
        inputSchema: z.object({
            pattern: z.string().describe("The regular expression pattern to search for in file contents"),
            path: z
                .string()
                .optional()
                .describe("File or directory to search in (rg PATH). Defaults to searching the entire project."),
            case_insensitive: z.boolean().optional().describe("Case insensitive search. Defaults to false."),
        }),
        execute,
    });
}