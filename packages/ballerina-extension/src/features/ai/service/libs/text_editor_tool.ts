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

import { SourceFile } from "@wso2/ballerina-core";
import { tool } from 'ai';
import { z } from 'zod';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface TextEditorResult {
  success: boolean;
  message: string;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_FILE_EXTENSIONS = [
    '.bal', '.toml', '.md', '.sql'
];

const MAX_LINE_LENGTH = 2000;
const PREVIEW_LENGTH = 200;

// ============================================================================
// Error Messages
// ============================================================================

const ErrorMessages = {
  FILE_NOT_FOUND: 'File not found',
  FILE_ALREADY_EXISTS: 'File already exists with content',
  INVALID_FILE_PATH: 'Invalid file path',
  INVALID_EXTENSION: 'Invalid file extension',
  EMPTY_CONTENT: 'Content cannot be empty',
  NO_MATCH_FOUND: 'No match found for old_string',
  MULTIPLE_MATCHES: 'Multiple matches found - old_string must be unique',
  IDENTICAL_STRINGS: 'old_string and new_string are identical',
  INVALID_LINE_RANGE: 'Invalid line range',
  EDIT_FAILED: 'Edit operation failed',
  NO_EDITS: 'No edits provided',
};

// ============================================================================
// Validation Functions
// ============================================================================

function validateFilePath(filePath: string): ValidationResult {
  if (!filePath || typeof filePath !== 'string') {
    return {
      valid: false,
      error: 'File path is required and must be a string.'
    };
  }

  if (filePath.includes('..') || filePath.includes('~')) {
    return {
      valid: false,
      error: 'File path contains invalid characters (.., ~).'
    };
  }

  const hasValidExtension = VALID_FILE_EXTENSIONS.some(ext => 
    filePath.endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `File must have a valid extension: ${VALID_FILE_EXTENSIONS.join(', ')}`
    };
  }

  return { valid: true };
}

function validateLineRange(
  offset: number,
  limit: number,
  totalLines: number
): ValidationResult {
  if (offset < 1 || offset > totalLines) {
    return {
      valid: false,
      error: `Invalid offset ${offset}. File has ${totalLines} lines.`
    };
  }

  if (limit < 1) {
    return {
      valid: false,
      error: `Invalid limit ${limit}. Must be at least 1.`
    };
  }

  return { valid: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

function findFileIndex(files: SourceFile[], filePath: string): number {
  return files.findIndex(f => f.filePath === filePath);
}

function getFileContent(files: SourceFile[], filePath: string): string | null {
  const file = files.find(f => f.filePath === filePath);
  return file?.content ?? null;
}

function updateOrCreateFile(
  files: SourceFile[],
  filePath: string,
  content: string
): void {
  const index = findFileIndex(files, filePath);
  if (index !== -1) {
    files[index].content = content;
  } else {
    files.push({ filePath, content });
  }
}

function countOccurrences(text: string, searchString: string): number {
  if (searchString.trim().length === 0 && text.trim().length === 0) {
        return 1;
  }

  if (!searchString) { return 0; }
  
  let count = 0;
  let position = 0;

  while ((position = text.indexOf(searchString, position)) !== -1) {
    count++;
    position += searchString.length;
  }

  return count;
}

function truncateLongLines(content: string, maxLength: number = MAX_LINE_LENGTH): string {
  const lines = content.split('\n');
  return lines.map(line => {
    if (line.length > maxLength) {
      return line.substring(0, maxLength) + '... [truncated]';
    }
    return line;
  }).join('\n');
}

// ============================================================================
// Write Tool Execute Function
// ============================================================================

export function createWriteExecute(files: SourceFile[], updatedFileNames: string[]) {
  return async (args: {
    file_path: string;
    content: string;
  }): Promise<TextEditorResult> => {
    const { file_path, content } = args;
    console.log(`[FileWriteTool] Writing to ${file_path}, content: ${content.substring(0, 50)}${content.length > 100 ? '... [truncated]' : ''}`);

    // Validate file path
    const pathValidation = validateFilePath(file_path);
    if (!pathValidation.valid) {
      console.error(`[FileWriteTool] Invalid file path: ${file_path}`);
      return {
        success: false,
        message: pathValidation.error!,
        error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`
      };
    }

    // Validate content is not empty
    if (!content || content.trim().length === 0) {
      console.error(`[FileWriteTool] Empty content provided for file: ${file_path}`);
      return {
        success: false,
        message: 'Content cannot be empty when writing a file.',
        error: `Error: ${ErrorMessages.EMPTY_CONTENT}`
      };
    }

    // Check if file exists with non-empty content
    const existingContent = getFileContent(files, file_path);
    if (existingContent !== null && existingContent.trim().length > 0) {
      console.error(`[FileWriteTool] File already exists with content: ${file_path}`);
      return {
        success: false,
        message: `File '${file_path}' already exists with content. Use file_edit or file_multi_edit to modify it instead.`,
        error: `Error: ${ErrorMessages.FILE_ALREADY_EXISTS}`
      };
    }

    // Create or overwrite the file
    updateOrCreateFile(files, file_path, content);

    const lineCount = content.split('\n').length;

    insertIntoUpdateFileNames(updatedFileNames, file_path);

    if (existingContent != undefined && existingContent != null && existingContent.trim().length === 0) {
      console.warn(`[FileWriteTool] Warning: Created new file for empty file: ${file_path}`);
    }

    console.log(`[FileWriteTool] Successfully wrote file: ${file_path} with ${lineCount} lines.`);
    return {
      success: true,
      message: `Successfully created file '${file_path}' with ${lineCount} line(s).`
    };
  };
}

// ============================================================================
// Edit Tool Execute Function
// ============================================================================

export function createEditExecute(files: SourceFile[], updatedFileNames: string[]) {
  return async (args: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  }): Promise<TextEditorResult> => {
    const { file_path, old_string, new_string, replace_all = false } = args;
    console.log(`[FileEditTool] Editing ${file_path}, replacing '${old_string.substring(0, 50)}' with '${new_string.substring(0,50)}', replace_all: ${replace_all}`);

    // Validate file path
    const pathValidation = validateFilePath(file_path);
    if (!pathValidation.valid) {
      console.error(`[FileEditTool] Invalid file path: ${file_path}`);
      return {
        success: false,
        message: pathValidation.error!,
        error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`
      };
    }

    // Check if old_string and new_string are identical
    if (old_string === new_string) {
      console.error(`[FileEditTool] old_string and new_string are identical for file: ${file_path}`);
      return {
        success: false,
        message: 'old_string and new_string are identical. No changes to make.',
        error: `Error: ${ErrorMessages.IDENTICAL_STRINGS}`
      };
    }

    // Get file content
    const content = getFileContent(files, file_path);
    if (content === null) {
      console.error(`[FileEditTool] File not found: ${file_path}`);
      return {
        success: false,
        message: `File '${file_path}' not found. Use file_write to create new files.`,
        error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
      };
    }

    // Count occurrences
    const occurrenceCount = countOccurrences(content, old_string);

    if (occurrenceCount === 0) {
      const preview = content.substring(0, PREVIEW_LENGTH);
      console.error(`[FileEditTool] No occurrences of old_string found in file: ${file_path}`);
      return {
        success: false,
        message: `String to replace was not found in '${file_path}'. Please verify the exact text to replace, including whitespace and indentation. \n File Preview: \n${preview + (content.length > PREVIEW_LENGTH ? '...' : '')}`,
        error: `Error: ${ErrorMessages.NO_MATCH_FOUND}`,
      };
    }

    // If not replace_all, ensure exactly one match
    if (!replace_all && occurrenceCount > 1) {
      console.error(`[FileEditTool] Multiple occurrences (${occurrenceCount}) found for old_string in file: ${file_path}`);
      return {
        success: false,
        message: `Found ${occurrenceCount} occurrences of the text in '${file_path}'. Either make old_string more specific to match exactly one occurrence, or set replace_all to true to replace all occurrences.`,
        error: `Error: ${ErrorMessages.MULTIPLE_MATCHES}`,
      };
    }

    // Perform replacement
    let newContent: string;
    if (replace_all) {
      newContent = content.replaceAll(old_string, new_string);
    } else {
      newContent = content.replace(old_string, new_string);
    }

    updateOrCreateFile(files, file_path, newContent);

    const replacedCount = replace_all ? occurrenceCount : 1;
    insertIntoUpdateFileNames(updatedFileNames, file_path);
    console.log(`[FileEditTool] Successfully replaced ${replacedCount} occurrence(s) in file: ${file_path}`);
    return {
      success: true,
      message: `Successfully replaced ${replacedCount} occurrence(s) in '${file_path}'.`
    };
  };
}

// ============================================================================
// Multi Edit Tool Execute Function
// ============================================================================

export function createMultiEditExecute(files: SourceFile[], updatedFileNames: string[]) {
  return async (args: {
    file_path: string;
    edits: Array<{
      old_string: string;
      new_string: string;
      replace_all?: boolean;
    }>;
  }): Promise<TextEditorResult> => {
    const { file_path, edits } = args;
    console.log(`[FileMultiEditTool] Editing ${file_path} with ${edits.length} edits.`);

    // Validate file path
    const pathValidation = validateFilePath(file_path);
    if (!pathValidation.valid) {
      console.error(`[FileMultiEditTool] Invalid file path: ${file_path}`);
      return {
        success: false,
        message: pathValidation.error!,
        error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`
      };
    }

    // Validate edits array
    if (!edits || edits.length === 0) {
      console.error(`[FileMultiEditTool] No edits provided for file: ${file_path}`);
      return {
        success: false,
        message: 'No edits provided. At least one edit is required.',
        error: `Error: ${ErrorMessages.NO_EDITS}`
      };
    }

    // Get file content
    let content = getFileContent(files, file_path);
    if (content === null) {
      console.error(`[FileMultiEditTool] File not found: ${file_path}`);
      return {
        success: false,
        message: `File '${file_path}' not found. Use file_write to create new files.`,
        error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
      };
    }

    // Store original content for rollback
    const originalContent = content;

    // Validate all edits before applying any
    const validationErrors: string[] = [];

    for (let i = 0; i < edits.length; i++) {
      const edit = edits[i];

      // Check if old_string and new_string are identical
      if (edit.old_string === edit.new_string) {
        validationErrors.push(`Edit ${i + 1}: old_string and new_string are identical`);
        continue;
      }

      // Count occurrences in current content state
      const occurrenceCount = countOccurrences(content, edit.old_string);

      if (occurrenceCount === 0) {
        validationErrors.push(`Edit ${i + 1}: old_string not found in file`);
        continue;
      }

      if (!edit.replace_all && occurrenceCount > 1) {
        validationErrors.push(`Edit ${i + 1}: Found ${occurrenceCount} occurrences. Set replace_all to true or make old_string more specific`);
        continue;
      }

      // Apply the edit to simulate the sequence
      if (edit.replace_all) {
        content = content.replaceAll(edit.old_string, edit.new_string);
      } else {
        content = content.replace(edit.old_string, edit.new_string);
      }
    }

    // If there were validation errors, return them without applying any edits
    if (validationErrors.length > 0) {
      console.error(`[FileMultiEditTool] Validation errors:\n${validationErrors.join('\n')}`);
      return {
        success: false,
        message: `Multi-edit validation failed:\n${validationErrors.join('\n')}`,
        error: `Error: ${ErrorMessages.EDIT_FAILED}`,
      };
    }

    // All validations passed, content already has all edits applied
    updateOrCreateFile(files, file_path, content);
    insertIntoUpdateFileNames(updatedFileNames, file_path);
    console.log(`[FileMultiEditTool] Successfully applied ${edits.length} edits to file: ${file_path}`);
    return {
      success: true,
      message: `Successfully applied ${edits.length} edit(s) to '${file_path}'.`
    };
  };
}

// ============================================================================
// Read Tool Execute Function
// ============================================================================

export function createReadExecute(files: SourceFile[], updatedFileNames: string[]) {
  return async (args: {
    file_path: string;
    offset?: number;
    limit?: number;
  }): Promise<TextEditorResult> => {
    const { file_path, offset, limit } = args;

    // Validate file path
    const pathValidation = validateFilePath(file_path);
    if (!pathValidation.valid) {
      console.error(`[FileReadTool] Invalid file path: ${file_path}`);
      return {
        success: false,
        message: pathValidation.error!,
        error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`
      };
    }

    // Get file content
    const content = getFileContent(files, file_path);
    if (content === null) {
      console.error(`[FileReadTool] File not found: ${file_path}`);
      return {
        success: false,
        message: `File '${file_path}' not found.`,
        error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
      };
    }

    // Handle empty file
    if (content.trim().length === 0) {
      console.log(`[FileReadTool] File is empty: ${file_path}`);
      return {
        success: true,
        message: `File '${file_path}' is empty.`,
      };
    }

    // Split content into lines
    const lines = content.split('\n');
    const totalLines = lines.length;

    // Handle ranged read
    if (offset !== undefined && limit !== undefined) {
      const validation = validateLineRange(offset, limit, totalLines);
      if (!validation.valid) {
        console.error(`[FileReadTool] Invalid line range for file: ${file_path}, offset: ${offset}, limit: ${limit}`);
        return {
          success: false,
          message: validation.error!,
          error: `Error: ${ErrorMessages.INVALID_LINE_RANGE}`
        };
      }

      const startIndex = offset - 1; // Convert to 0-based index
      const endIndex = Math.min(startIndex + limit, totalLines);
      const rangedLines = lines.slice(startIndex, endIndex);
      const rangedContent = truncateLongLines(rangedLines.join('\n'));

      console.log(`[FileReadTool] Read lines ${offset} to ${endIndex} from file: ${file_path}`);
      return {
        success: true,
        message: `Read lines ${offset} to ${endIndex} from '${file_path}' (${endIndex - startIndex} lines). \nContent:${rangedContent}`,
      };
    }

    // Return full content
    const truncatedContent = truncateLongLines(content);

    console.log(`[FileReadTool] Read entire file: ${file_path}, total lines: ${totalLines}`);
    return {
      success: true,
      message: `Read entire file '${file_path}' (${totalLines} lines).\nContent:${truncatedContent}`,
    };
  };
}

// ============================================================================

export const FILE_BATCH_EDIT_TOOL_NAME = "file_batch_edit";
export const FILE_SINGLE_EDIT_TOOL_NAME = "file_edit";
export const FILE_WRITE_TOOL_NAME = "file_write";
export const FILE_READ_TOOL_NAME = "file_read";

const getFilePathDescription = (op: string) => `The path to the file to ${op}. Just use the filename as the path, do not include any directories unless user specifically requests it`;

// Type definitions for execute functions
type WriteExecute = (args: {
  file_path: string;
  content: string;
}) => Promise<any>;

type EditExecute = (args: {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}) => Promise<any>;

type MultiEditExecute = (args: {
  file_path: string;
  edits: Array<{
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  }>;
}) => Promise<any>;

type ReadExecute = (args: {
  file_path: string;
  offset?: number;
  limit?: number;
}) => Promise<any>;

// 1. Write Tool
export function createWriteTool(execute: WriteExecute) {
  return tool({
    description: `Writes a file to the local filesystem.
    Usage:
    - This tool will return an error if there is a file with non-empty content at the provided path.
    - ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
    - If this is an existing file, Use ${FILE_BATCH_EDIT_TOOL_NAME} or ${FILE_SINGLE_EDIT_TOOL_NAME} to modify it instead.
    - NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
    - Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`,
    inputSchema: z.object({
      file_path: z.string().describe(getFilePathDescription("write")),
      content: z.string().describe("The content to write to the file, This cannot be empty")
    }),
    execute
  });
}

// The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
// ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix.

// 2. Edit Tool
export function createEditTool(execute: EditExecute) {
  return tool({
    description: `Performs exact string replacements in files. 
    Usage:
    - You must read the chat history at least once before editing, as the user’s message contains the content of the each source file. This tool will error if you attempt an edit without reading the chat history. 
    - When editing text content of a file that you obtained from the chat history you read earlier, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix.
    - If there are multiple edits to be made to the same file, prefer using the ${FILE_BATCH_EDIT_TOOL_NAME} tool instead of this one.
    - Do not create new files using this tool. Only edit existing files. If the file does not exist, Use ${FILE_WRITE_TOOL_NAME} to create new files.
    - NEVER proactively edit documentation files (*.md) or README files. Only edit documentation files if explicitly requested by the User.
    - Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
    - The edit will FAIL if **old_string** is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use **replace_all** to change every instance of **old_string**. 
    - Use **replace_all** for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.`,
    inputSchema: z.object({
      file_path: z.string().describe(getFilePathDescription("edit")),
      old_string: z.string().describe("The text to replace (must match the file contents exactly, including all whitespace and indentation)"),
      new_string: z.string().describe("The text to replace it with (must be different from old_string)"),
      replace_all: z.boolean().default(false).describe("Replace all occurences of old_string (default false), if true will replace all occurences of old_string, otherwise will only replace if there is exactly one match.")
    }),
    execute
  });
}

// 3. Multi Edit Tool
export function createBatchEditTool(execute: MultiEditExecute) {
  return tool({
    description: `This is a tool for making multiple edits to a single file in one operation. It is built on top of the ${FILE_SINGLE_EDIT_TOOL_NAME} tool and allows you to perform multiple find-and-replace operations efficiently. Prefer this tool over the ${FILE_SINGLE_EDIT_TOOL_NAME} tool when you need to make multiple edits to the same file.
    Before using this tool:
    1. You must read the chat history at least once before editing, as the user’s message contains the content of the each source file and the context.
    2. Verify the file path is correct
    3. Do not create new files using this tool. Only edit existing files. If the file does not exist, Use ${FILE_WRITE_TOOL_NAME} to create new files.
    To make multiple file edits, provide the following:
    1. file_path: The file_path parameter must be an filename only, do not include any directories unless the user specifically requests it.
    2. edits: An array of edit operations to perform, where each edit contains:
       - old_string: The text to replace (must match the file contents exactly, including all whitespace and indentation)
       - new_string: The edited text to replace the old_string
       - replace_all: Replace all occurences of old_string. This parameter is optional and defaults to false. if true will replace all occurences of old_string, otherwise will only replace if there is exactly one match.
    IMPORTANT:
    - All edits are applied in sequence, in the order they are provided
    - Each edit operates on the result of the previous edit
    - All edits must be valid for the operation to succeed - if any edit fails, none will be applied
    - This tool is ideal when you need to make several changes to different parts of the same file
    - NEVER proactively edit documentation files (*.md) or README files. Only edit documentation files if explicitly requested by the User.
    CRITICAL REQUIREMENTS:
    1. All edits follow the same requirements as the ${FILE_SINGLE_EDIT_TOOL_NAME} tool
    2. The edits are atomic - either all succeed or none are applied
    3. Plan your edits carefully to avoid conflicts between sequential operations
    WARNING:
    - The tool will fail if edits.old_string doesn't match the file contents exactly (including whitespace)
    - The tool will fail if edits.old_string and edits.new_string are the same
    - Since edits are applied in sequence, ensure that earlier edits don't affect the text that later edits are trying to find
    When making edits:
    - Ensure all edits result in idiomatic, correct code
    - Do not leave the code in a broken state
    - Always use filename as the filepath unless the user specifically requests a directory.
    - Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
    - Use replace_all for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.`,
    inputSchema: z.object({
      file_path: z.string().describe(getFilePathDescription("edit")),
      edits: z.array(
        z.object({
          old_string: z.string().describe("The text to replace (must match the file contents exactly, including all whitespace and indentation)"),
          new_string: z.string().describe("The text to replace it with (must be different from old_string)"),
          replace_all: z.boolean().default(false).describe("Replace all occurences of old_string (default false), if true will replace all occurences of old_string, otherwise will only replace if there is exactly one match.")
        })
      ).min(1).describe("Array of edit operations to perform sequentially on the file")
    }),
    execute
  });
}

// 4. Read Tool
export function createReadTool(execute: ReadExecute) {
  return tool({
    description: `Reads a file from the local filesystem.
    ALWAYS prefer reading files mentioned in the ser’s message in the chat history first. Only use this tool if you need to read a file that is not present in the chat history.
    Usage:
    - The file_path parameter must be an filename only, do not include any directories unless the user specifically requests it.
    - You can optionally specify a line offset and limit (especially handy for long files).
    - Any lines longer than 2000 characters will be truncated
    - The file content will be returned as string
    - If the file is very large, consider using the offset and limit parameters to read it in chunks.`,
    inputSchema: z.object({
      file_path: z.string().describe(getFilePathDescription("read")),
      offset: z.number().optional().describe("The line number to start reading from. Only provide if the file is too large to read at once"),
      limit: z.number().optional().describe("The number of lines to read. Only provide if the file is too large to read at once.")
    }),
    execute
  });
}
function insertIntoUpdateFileNames(updatedFileNames: string[], file_path: string) {
    if (!updatedFileNames.includes(file_path)) {
      updatedFileNames.push(file_path);
    }
}
