import { SourceFiles } from "@wso2/ballerina-core";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface TextEditorResult {
    success: boolean;
    message: string;
    content?: string;
    error?: string;
}

enum TextEditorCommand {
    VIEW = 'view',
    CREATE = 'create',
    STR_REPLACE = 'str_replace',
    INSERT = 'insert',
    DELETE = 'delete',
    UNDO_EDIT = 'undo_edit'
}

interface ExecuteArgs {
    command: string;
    path: string;
    file_text?: string;
    insert_line?: number;
    new_str?: string;
    old_str?: string;
    view_range?: number[];
}

interface PathValidation {
    valid: boolean;
    error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_HISTORY_SIZE = 50;
const VALID_FILE_EXTENSIONS = ['.bal', '.toml', '.md'];
const PREVIEW_CONTENT_LENGTH = 500;

// ============================================================================
// State Management
// ============================================================================

const editHistory = new Map<string, string[]>();

// ============================================================================
// Error Messages
// ============================================================================

const ErrorMessages = {
    INVALID_PATH: 'Invalid file path',
    FILE_NOT_FOUND: 'File not found',
    INVALID_RANGE: 'Invalid line range',
    MISSING_PARAMETER: 'Missing required parameter',
    FILE_ALREADY_EXISTS: 'File already exists',
    NO_MATCH_FOUND: 'String not found',
    MULTIPLE_MATCHES: 'Multiple matches found',
    INVALID_LINE_NUMBER: 'Invalid line number',
    NO_HISTORY: 'No edit history',
    INVALID_COMMAND: 'Unknown command',
    PERMISSION_DENIED: 'Permission denied',
    EXECUTION_ERROR: 'Execution error'
} as const;

// ============================================================================
// Validation Functions
// ============================================================================

function validateFilePath(filePath: string): PathValidation {
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
    start: number,
    end: number,
    totalLines: number
): PathValidation {
    if (start < 1 || end < start || start > totalLines) {
        return {
            valid: false,
            error: `Invalid line range [${start}, ${end}]. File has ${totalLines} lines. Please double check the range.`
        };
    }
    return { valid: true };
}

// ============================================================================
// File Operations
// ============================================================================

function findFileIndex(files: SourceFiles[], filePath: string): number {
    return files.findIndex(f => f.filePath === filePath);
}

function getFileContent(files: SourceFiles[], filePath: string): string | null {
    const file = files.find(f => f.filePath === filePath);
    return file?.content ?? null;
}

function updateOrCreateFile(
    files: SourceFiles[],
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

function addFileToUpdatedList(
    updatedFileNames: string[],
    filePath: string
): void {
    if (!updatedFileNames.includes(filePath)) {
        updatedFileNames.push(filePath);
    }
}

// ============================================================================
// History Management
// ============================================================================

function saveToHistory(
    updatedSourceFiles: SourceFiles[],
    filePath: string
): void {
    const sourceFile = updatedSourceFiles.find(f => f.filePath === filePath);
    if (!sourceFile) { return; }

    if (!editHistory.has(filePath)) {
        editHistory.set(filePath, []);
    }

    const history = editHistory.get(filePath)!;
    history.push(sourceFile.content);

    if (history.length > MAX_HISTORY_SIZE) {
        history.shift();
    }
}

// ============================================================================
// String Utilities
// ============================================================================

function countOccurrences(text: string, searchString: string): number {
    if (searchString.trim().length === 0 && text.trim().length === 0) {
        return 1;
    }

    if (!searchString) { return 0; }

    let count = 0;
    let position = 0;
    
    while ((position = text.indexOf(searchString, position)) !== -1) {
        count++;
        if (count > 1) { break; }
        position += searchString.length;
    }
    
    return count;
}

// ============================================================================
// Command Handlers
// ============================================================================

function handleViewCommand(
    files: SourceFiles[],
    filePath: string,
    viewRange?: number[]
): TextEditorResult {
    const content = getFileContent(files, filePath);
    
    if (content === null) {
        return {
            success: false,
            message: `File '${filePath}' not found. Please create it first or double check the file path.`,
            error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
        };
    }

    if (viewRange && viewRange.length === 2) {
        return handleRangedView(filePath, content, viewRange);
    }

    return {
        success: true,
        message: `Viewing entire file ${filePath}).`,
        content
    };
}

function handleRangedView(
    filePath: string,
    content: string,
    viewRange: number[]
): TextEditorResult {
    let [start, end] = viewRange;
    const lines = content.split('\n');
    
    if (end === -1) {
        end = lines.length;
    }
    
    const validation = validateLineRange(start, end, lines.length);
    if (!validation.valid) {
        return {
            success: false,
            message: validation.error!,
            error: `Error: ${ErrorMessages.INVALID_RANGE}`
        };
    }

    const actualEnd = Math.min(end, lines.length);
    const rangedContent = lines.slice(start - 1, actualEnd).join('\n');
    
    return {
        success: true,
        message: `Viewing lines ${start}-${actualEnd} of ${filePath}.`,
        content: rangedContent
    };
}

function handleCreateCommand(
    files: SourceFiles[],
    updatedFileNames: string[],
    filePath: string,
    fileText?: string
): TextEditorResult {
    if (fileText === undefined) {
        return {
            success: false,
            message: "The 'file_text' parameter is required for the 'create' command.",
            error: `Error: ${ErrorMessages.MISSING_PARAMETER}`
        };
    }

    const existingFile = getFileContent(files, filePath);
    
    if (existingFile !== null) {
        if (existingFile.trim() === "") {
            console.warn(`[Text Editor] Overwriting empty file '${filePath}'.`);
            updateOrCreateFile(files, filePath, fileText);
            addFileToUpdatedList(updatedFileNames, filePath);
            
            return {
                success: true,
                message: `Successfully created file '${filePath}'.).`
            };
        }

        return {
            success: false,
            message: `File '${filePath}' already exists. Use 'str_replace' command to modify it or double check the filepath.`,
            error: `Error: ${ErrorMessages.FILE_ALREADY_EXISTS}`
        };
    }

    updateOrCreateFile(files, filePath, fileText);
    addFileToUpdatedList(updatedFileNames, filePath);

    return {
        success: true,
        message: `Successfully created file '${filePath}' with ${fileText.split('\n').length} lines.`
    };
}

function handleStrReplaceCommand(
    files: SourceFiles[],
    updatedFileNames: string[],
    filePath: string,
    oldStr?: string,
    newStr?: string
): TextEditorResult {
    if (oldStr === undefined || newStr === undefined) {
        return {
            success: false,
            message: "Both 'old_str' and 'new_str' parameters are required for 'str_replace' command.",
            error: `Error: ${ErrorMessages.MISSING_PARAMETER}`
        };
    }

    const content = getFileContent(files, filePath);
    
    if (content === null) {
        return {
            success: false,
            message: `File '${filePath}' not found. Cannot perform replacement. double check the file path.`,
            error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
        };
    }

    const occurrenceCount = countOccurrences(content, oldStr);

    if (occurrenceCount === 0) {
        return {
            success: false,
            message: `String to replace was not found in '${filePath}'. Please verify the exact text to replace, including whitespace and line breaks.`,
            error: `Error: ${ErrorMessages.NO_MATCH_FOUND}`,
            content: content.substring(0, PREVIEW_CONTENT_LENGTH) + '...'
        };
    }

    if (occurrenceCount > 1) {
        return {
            success: false,
            message: `Found ${occurrenceCount} occurrences of the text in '${filePath}'. The 'str_replace' command requires exactly one unique match. Please make 'old_str' more specific..`,
            error: `Error: ${ErrorMessages.MULTIPLE_MATCHES}`,
            content: `Occurrences: ${occurrenceCount}`
        };
    }

    saveToHistory(files, filePath);
    
    const newContent = content.replace(oldStr, newStr);
    updateOrCreateFile(files, filePath, newContent);
    addFileToUpdatedList(updatedFileNames, filePath);

    return {
        success: true,
        message: `Successfully replaced text in '${filePath}'. Changed ${oldStr.split('\n').length} line(s).`
    };
}

function handleInsertCommand(
    files: SourceFiles[],
    updatedFileNames: string[],
    filePath: string,
    insertLine?: number,
    newStr?: string
): TextEditorResult {
    if (insertLine === undefined || newStr === undefined) {
        return {
            success: false,
            message: "Both 'insert_line' and 'new_str' parameters are required for 'insert' command.",
            error: `Error: ${ErrorMessages.MISSING_PARAMETER}`
        };
    }

    const content = getFileContent(files, filePath);
    
    if (content === null) {
        return {
            success: false,
            message: `File '${filePath}' not found. Cannot insert text.`,
            error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
        };
    }

    const lines = content.split('\n');
    
    if (insertLine < 0 || insertLine > lines.length) {
        return {
            success: false,
            message: `Invalid insert line ${insertLine}. File has ${lines.length} lines. Use line 0-${lines.length}.`,
            error: `Error: ${ErrorMessages.INVALID_LINE_NUMBER}`
        };
    }

    saveToHistory(files, filePath);

    const clampedLine = Math.max(0, Math.min(lines.length, insertLine));
    lines.splice(clampedLine, 0, newStr);
    const newContent = lines.join('\n');

    updateOrCreateFile(files, filePath, newContent);
    addFileToUpdatedList(updatedFileNames, filePath);

    return {
        success: true,
        message: `Successfully inserted ${newStr.split('\n').length} line(s) at line ${insertLine} in '${filePath}'.`
    };
}

function handleDeleteCommand(
    files: SourceFiles[],
    updatedFileNames: string[],
    filePath: string,
    oldStr?: string
): TextEditorResult {
    if (oldStr === undefined) {
        return {
            success: false,
            message: "The 'old_str' parameter is required for 'delete' command.",
            error: `Error: ${ErrorMessages.MISSING_PARAMETER}`
        };
    }

    const content = getFileContent(files, filePath);
    
    if (content === null) {
        return {
            success: false,
            message: `File '${filePath}' not found. Cannot delete text.`,
            error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
        };
    }

    const occurrenceCount = countOccurrences(content, oldStr);

    if (occurrenceCount === 0) {
        return {
            success: false,
            message: `String to delete was not found in '${filePath}'. No changes made. Double check the text to delete, including whitespace and line breaks.`,
            error: `Error: ${ErrorMessages.NO_MATCH_FOUND}`
        };
    }

    saveToHistory(files, filePath);

    const newContent = content.replaceAll(oldStr, '');
    updateOrCreateFile(files, filePath, newContent);
    addFileToUpdatedList(updatedFileNames, filePath);

    return {
        success: true,
        message: `Successfully deleted ${occurrenceCount} occurrence(s) of text from '${filePath}'.`
    };
}

function handleUndoEditCommand(
    files: SourceFiles[],
    updatedFileNames: string[],
    filePath: string
): TextEditorResult {
    const history = editHistory.get(filePath);
    
    if (!history || history.length === 0) {
        return {
            success: false,
            message: `No edit history found for '${filePath}'. Cannot undo.`,
            error: ErrorMessages.NO_HISTORY
        };
    }

    const lastState = history.pop()!;
    updateOrCreateFile(files, filePath, lastState);
    addFileToUpdatedList(updatedFileNames, filePath);

    return {
        success: true,
        message: `Successfully undid last edit on '${filePath}'. ${history.length} undo(s) remaining.`
    };
}

// ============================================================================
// Command Router
// ============================================================================

function executeCommand(
    files: SourceFiles[],
    updatedFileNames: string[],
    args: ExecuteArgs
): TextEditorResult {
    const { command, path: filePath, file_text, insert_line, new_str, old_str, view_range } = args;

    switch (command) {
        case TextEditorCommand.VIEW:
            return handleViewCommand(files, filePath, view_range);

        case TextEditorCommand.CREATE:
            return handleCreateCommand(files, updatedFileNames, filePath, file_text);

        case TextEditorCommand.STR_REPLACE:
            return handleStrReplaceCommand(files, updatedFileNames, filePath, old_str, new_str);

        case TextEditorCommand.INSERT:
            return handleInsertCommand(files, updatedFileNames, filePath, insert_line, new_str);

        case TextEditorCommand.DELETE:
            return handleDeleteCommand(files, updatedFileNames, filePath, old_str);

        case TextEditorCommand.UNDO_EDIT:
            return handleUndoEditCommand(files, updatedFileNames, filePath);

        default:
            return {
                success: false,
                message: `Unknown command '${command}'. Valid commands: view, create, str_replace, insert, delete, undo_edit.`,
                error: ErrorMessages.INVALID_COMMAND
            };
    }
}

// ============================================================================
// Error Handling
// ============================================================================

function handleExecutionError(
    error: unknown,
    command: string,
    filePath: string
): TextEditorResult {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`[Text Editor] Failed to execute '${command}':`, error);
    
    if (errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
        return {
            success: false,
            message: `Permission denied: Cannot access '${filePath}'. Check file permissions.`,
            error: ErrorMessages.PERMISSION_DENIED
        };
    }

    return {
        success: false,
        message: `Error executing '${command}': ${errorMessage}`,
        error: ErrorMessages.EXECUTION_ERROR
    };
}

// ============================================================================
// Main Entry Point
// ============================================================================

export function handleTextEditorCommands(
    updatedSourceFiles: SourceFiles[],
    updatedFileNames: string[],
    args: ExecuteArgs
): TextEditorResult {
    const { command, path: filePath } = args;

    try {
        console.log(`[Text Editor] Command: '${command}', File: '${filePath}'`);

        const pathValidation = validateFilePath(filePath);
        if (!pathValidation.valid) {
            return {
                success: false,
                message: `Invalid file path: ${pathValidation.error}`,
                error: `Error: ${ErrorMessages.INVALID_PATH}`
            };
        }

        return executeCommand(updatedSourceFiles, updatedFileNames, args);
    } catch (error) {
        return handleExecutionError(error, command, filePath);
    }
}
