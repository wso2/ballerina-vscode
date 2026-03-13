// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).

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
 * Read-only tools that let the AI agent explore and read files from the
 * original migration source project (Mule, Tibco, or any future platform).
 *
 * These tools are registered **only** when a `migrationSourcePath` is provided
 * in the tool registry options — i.e. during migration enhancement runs.
 * They are scoped exclusively to the source project directory and cannot
 * modify files or escape via path traversal.
 */

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { CopilotEventHandler } from '../../utils/events';

// ============================================================================
// Tool name constants
// ============================================================================

export const MIGRATION_SOURCE_LIST_TOOL = 'migration_source_list';
export const MIGRATION_SOURCE_READ_TOOL = 'migration_source_read';

// ============================================================================
// Constants
// ============================================================================

/**
 * Broad set of file extensions that may appear in migration source projects
 * across all supported platforms (Mule, Tibco, and future).
 */
const VALID_SOURCE_EXTENSIONS = new Set([
    // XML / config / schema
    '.xml', '.xsd', '.wsdl', '.xslt', '.xsl',
    // Mule-specific
    '.dwl',
    // Tibco-specific
    '.bwp', '.process', '.substvar', '.bw',
    // Property / config
    '.properties', '.yaml', '.yml', '.json', '.cfg', '.conf', '.ini', '.toml',
    // Script / code
    '.groovy', '.java', '.js', '.py', '.sh', '.bat',
    // Data / doc
    '.csv', '.sql', '.txt', '.md', '.html', '.htm',
    // Build
    '.gradle',
]);

/**
 * Filenames that are always allowed regardless of extension
 * (e.g. extensionless build/config files at the project root).
 */
const ALLOWED_FILENAMES = new Set([
    'pom.xml', 'build.xml', 'build.gradle', 'Makefile', 'Dockerfile',
    'Rakefile', 'Gemfile', 'Jenkinsfile', '.env',
]);

const MAX_READ_BYTES = 80_000;   // ~20k tokens — truncate anything larger
const MAX_LINE_LENGTH = 2000;
const MAX_LIST_ENTRIES = 500;    // safety cap for very large directories

// ============================================================================
// Validation helpers
// ============================================================================

interface ValidationResult {
    valid: boolean;
    error?: string;
}

function validateSourcePath(
    userPath: string,
    sourcePath: string,
): ValidationResult {
    if (!userPath || typeof userPath !== 'string') {
        return { valid: false, error: 'Path is required and must be a string.' };
    }

    // Block obvious traversal attempts
    if (userPath.includes('..') || userPath.includes('~')) {
        return { valid: false, error: 'Path contains invalid characters (.., ~).' };
    }

    // Resolve and verify the path is still under sourcePath
    const resolved = path.resolve(sourcePath, userPath);
    const resolvedRoot = path.resolve(sourcePath);
    if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
        return { valid: false, error: 'Path escapes the source project directory.' };
    }

    return { valid: true };
}

function isAllowedFile(fileName: string): boolean {
    if (ALLOWED_FILENAMES.has(fileName)) {
        return true;
    }
    const ext = path.extname(fileName).toLowerCase();
    return VALID_SOURCE_EXTENSIONS.has(ext);
}

function truncateLongLines(content: string): string {
    return content
        .split('\n')
        .map(line =>
            line.length > MAX_LINE_LENGTH
                ? line.substring(0, MAX_LINE_LENGTH) + '… [truncated]'
                : line
        )
        .join('\n');
}

// ============================================================================
// Event helpers
// ============================================================================

function emitToolCall(
    eventHandler: CopilotEventHandler,
    toolName: string,
    input: Record<string, unknown>,
): void {
    eventHandler({
        type: 'tool_call',
        toolName,
        toolInput: input,
    });
}

function emitToolResult(
    eventHandler: CopilotEventHandler,
    toolName: string,
    success: boolean,
): void {
    eventHandler({
        type: 'tool_result',
        toolName,
        toolOutput: { success },
    });
}

// ============================================================================
// migration_source_list
// ============================================================================

export function createMigrationSourceListTool(
    eventHandler: CopilotEventHandler,
    sourcePath: string,
) {
    return tool({
        description:
            `Lists files and directories in the original migration source project (e.g. MuleSoft, TIBCO, or other platform). ` +
            `Use this to explore the source project structure and find relevant configuration files, scripts, and resources. ` +
            `Returns immediate children only — call again with a subdirectory path to drill deeper.`,
        inputSchema: z.object({
            directory_path: z
                .string()
                .default('.')
                .describe(
                    'Relative path within the source project to list. Defaults to the project root (".").',
                ),
        }),
        execute: async (args: { directory_path?: string }) => {
            const dirPath = args.directory_path || '.';

            emitToolCall(eventHandler, MIGRATION_SOURCE_LIST_TOOL, { directory_path: dirPath });

            // Validate
            const validation = validateSourcePath(dirPath, sourcePath);
            if (!validation.valid) {
                const result = { success: false, message: validation.error! };
                emitToolResult(eventHandler, MIGRATION_SOURCE_LIST_TOOL, false);
                return result;
            }

            const fullPath = path.resolve(sourcePath, dirPath);

            if (!fs.existsSync(fullPath)) {
                const result = { success: false, message: `Directory not found: '${dirPath}'.` };
                emitToolResult(eventHandler, MIGRATION_SOURCE_LIST_TOOL, false);
                return result;
            }

            const stat = fs.statSync(fullPath);
            if (!stat.isDirectory()) {
                const result = { success: false, message: `'${dirPath}' is not a directory.` };
                emitToolResult(eventHandler, MIGRATION_SOURCE_LIST_TOOL, false);
                return result;
            }

            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(fullPath, { withFileTypes: true });
            } catch (error) {
                const result = { success: false, message: `Cannot read directory: '${dirPath}'.` };
                emitToolResult(eventHandler, MIGRATION_SOURCE_LIST_TOOL, false);
                return result;
            }

            // Build the listing — cap at MAX_LIST_ENTRIES to prevent huge responses
            const listing: string[] = [];
            let truncated = false;
            for (const entry of entries) {
                if (listing.length >= MAX_LIST_ENTRIES) {
                    truncated = true;
                    break;
                }
                if (entry.isDirectory()) {
                    listing.push(`${entry.name}/`);
                } else if (entry.isFile()) {
                    listing.push(entry.name);
                }
                // Skip symlinks, sockets, etc.
            }

            const header = `Contents of '${dirPath}' (${listing.length} entries${truncated ? `, truncated to ${MAX_LIST_ENTRIES}` : ''}):\n`;
            const body = listing.join('\n');

            console.log(`[MigrationSourceList] Listed ${listing.length} entries in: ${dirPath}`);

            emitToolResult(eventHandler, MIGRATION_SOURCE_LIST_TOOL, true);
            return { success: true, message: header + body };
        },
    });
}

// ============================================================================
// migration_source_read
// ============================================================================

export function createMigrationSourceReadTool(
    eventHandler: CopilotEventHandler,
    sourcePath: string,
) {
    return tool({
        description:
            `Reads a file from the original migration source project (e.g. MuleSoft, TIBCO, or other platform). ` +
            `Use this to examine the original source code, configurations, transforms, and property files ` +
            `when implementing TODO/FIXME items or performing fidelity checks. ` +
            `Supports optional line-range pagination for large files.`,
        inputSchema: z.object({
            file_path: z
                .string()
                .describe('Relative path to the file within the source project.'),
            offset: z
                .number()
                .optional()
                .describe('Line number to start reading from (1-based). Only needed for large files.'),
            limit: z
                .number()
                .optional()
                .describe('Number of lines to read. Only needed for large files.'),
        }),
        execute: async (args: { file_path: string; offset?: number; limit?: number }) => {
            const { file_path, offset, limit } = args;

            emitToolCall(eventHandler, MIGRATION_SOURCE_READ_TOOL, { file_path });

            // Validate path
            const pathValidation = validateSourcePath(file_path, sourcePath);
            if (!pathValidation.valid) {
                emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, false);
                return { success: false, message: pathValidation.error! };
            }

            // Validate extension / filename
            const fileName = path.basename(file_path);
            if (!isAllowedFile(fileName)) {
                emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, false);
                return {
                    success: false,
                    message: `File type not supported for reading. Allowed extensions: ${[...VALID_SOURCE_EXTENSIONS].join(', ')}`,
                };
            }

            const fullPath = path.resolve(sourcePath, file_path);

            if (!fs.existsSync(fullPath)) {
                emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, false);
                return { success: false, message: `File not found: '${file_path}'.` };
            }

            const stat = fs.statSync(fullPath);
            if (!stat.isFile()) {
                emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, false);
                return { success: false, message: `'${file_path}' is not a file.` };
            }

            // Read content
            let content: string;
            try {
                content = fs.readFileSync(fullPath, 'utf-8');
            } catch (error) {
                emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, false);
                return { success: false, message: `Cannot read file: '${file_path}'.` };
            }

            // Truncate if too large
            if (Buffer.byteLength(content, 'utf-8') > MAX_READ_BYTES) {
                content = content.substring(0, MAX_READ_BYTES) + '\n\n[TRUNCATED — file exceeds size limit]';
            }

            // Handle empty file
            if (content.trim().length === 0) {
                emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, true);
                return { success: true, message: `File '${file_path}' is empty.` };
            }

            const lines = content.split('\n');
            const totalLines = lines.length;

            // Handle ranged read
            if (offset !== undefined && limit !== undefined) {
                if (offset < 1 || offset > totalLines) {
                    emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, false);
                    return {
                        success: false,
                        message: `Invalid offset ${offset}. File has ${totalLines} lines.`,
                    };
                }
                if (limit < 1) {
                    emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, false);
                    return { success: false, message: `Invalid limit ${limit}. Must be at least 1.` };
                }

                const startIndex = offset - 1;
                const endIndex = Math.min(startIndex + limit, totalLines);
                const rangedContent = truncateLongLines(
                    lines.slice(startIndex, endIndex).join('\n'),
                );

                console.log(
                    `[MigrationSourceRead] Read lines ${offset}-${endIndex} from: ${file_path}`,
                );
                emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, true);
                return {
                    success: true,
                    message: `Read lines ${offset} to ${endIndex} from '${file_path}' (${endIndex - startIndex} lines).\nContent:\n${rangedContent}`,
                };
            }

            // Full file read
            const truncatedContent = truncateLongLines(content);

            console.log(
                `[MigrationSourceRead] Read entire file: ${file_path} (${totalLines} lines)`,
            );
            emitToolResult(eventHandler, MIGRATION_SOURCE_READ_TOOL, true);
            return {
                success: true,
                message: `Read '${file_path}' (${totalLines} lines).\nContent:\n${truncatedContent}`,
            };
        },
    });
}
