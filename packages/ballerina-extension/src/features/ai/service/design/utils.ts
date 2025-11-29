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

import { SourceFile, FileChanges, CodeContext } from "@wso2/ballerina-core";
import { workspace } from "vscode";
import { addToIntegration } from "../../../../rpc-managers/ai-panel/utils";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import type { TextEdit } from "vscode-languageserver-protocol";

/**
 * File extensions to include in codebase structure
 */
const CODEBASE_STRUCTURE_FILE_TYPES = [".bal"];

/**
 * Directories to ignore in codebase structure
 */
const CODEBASE_STRUCTURE_IGNORE_FOLDERS = ["target", ".ballerina", ".vscode", ".git"];

/**
 * Files to ignore in codebase structure
 */
const CODEBASE_STRUCTURE_IGNORE_FILES = ["Ballerina.toml", "Config.toml", "Dependencies.toml"];

/**
 * Files that require path sanitization (temp paths replaced with workspace paths)
 */
const FILES_REQUIRING_PATH_SANITIZATION = ["Ballerina.toml"];

/**
 * Sanitizes temp directory paths in file content by replacing them with workspace paths
 * @param content File content that may contain temp directory paths
 * @param tempPath Temporary project path to be replaced
 * @param workspacePath Workspace path to replace with
 * @returns Sanitized content with workspace paths
 */
function sanitizeTempPaths(content: string, tempPath: string, workspacePath: string): string {
    // Normalize paths to forward slashes for consistent replacement
    const normalizedTempPath = tempPath.replace(/\\/g, "/");
    const normalizedWorkspacePath = workspacePath.replace(/\\/g, "/");

    // Replace all occurrences of temp path with workspace path
    return content.replace(new RegExp(normalizedTempPath, "g"), normalizedWorkspacePath);
}

/**
 * Integrates code from temp directory to workspace
 * @param tempProjectPath Path to the temporary project directory
 * @param modifiedFiles Set of file paths that were actually modified during the sessionDependencies.toml
 */
export async function integrateCodeToWorkspace(tempProjectPath: string, modifiedFiles?: Set<string>): Promise<void> {
    if (!tempProjectPath) {
        console.log("[Design Integration] No temp project path provided");
        return;
    }

    if (!fs.existsSync(tempProjectPath)) {
        console.warn("[Design Integration] Temp project path does not exist:", tempProjectPath);
        return;
    }

    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
        throw new Error("No workspace folder found. Please open a workspace.");
    }

    const workspaceFolderPath = workspaceFolders[0].uri.fsPath;

    const fileChanges: FileChanges[] = [];

    if (modifiedFiles && modifiedFiles.size > 0) {
        for (const relativePath of modifiedFiles) {
            const fullPath = path.join(tempProjectPath, relativePath);

            if (fs.existsSync(fullPath)) {
                let content = fs.readFileSync(fullPath, "utf-8");

                // Check if this file requires path sanitization
                const fileName = path.basename(relativePath);
                if (FILES_REQUIRING_PATH_SANITIZATION.includes(fileName)) {
                    content = sanitizeTempPaths(content, tempProjectPath, workspaceFolderPath);
                    console.log(`[Design Integration] Sanitized temp paths in: ${relativePath}`);
                }

                fileChanges.push({
                    filePath: relativePath,
                    content: content,
                });
                console.log(`[Design Integration] Prepared modified file: ${relativePath}`);
            } else {
                console.warn(`[Design Integration] Modified file not found: ${relativePath}`);
            }
        }
    } else {
        console.log("[Design Integration] No modified files to integrate");
    }

    if (fileChanges.length === 0) {
        console.warn("[Design Integration] No files found in temp project");
        return;
    }

    try {
        console.log(`[Design Integration] Integrating ${fileChanges.length} file(s) from temp project...`);
        await addToIntegration(workspaceFolderPath, fileChanges);
        console.log("[Design Integration] Successfully integrated code");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Design Integration] Failed:", errorMessage);
        throw new Error(`Failed to integrate code to workspace: ${errorMessage}`);
    }
}

export function getCodeBlocks(updatedSourceFiles: SourceFile[], updatedFileNames: string[]): string {
    const codeBlocks = updatedFileNames
        .map((fileName) => {
            const sourceFile = updatedSourceFiles.find((sf) => sf.filePath === fileName);
            if (!sourceFile) {
                return null;
            }

            return `<code filename="${sourceFile.filePath}">
\`\`\`ballerina
${sourceFile.content}
\`\`\`
</code>`;
        })
        .filter((block): block is string => block !== null);

    return codeBlocks.join("\n\n");
}

/**
 * Formats complete codebase structure into XML for Claude
 * Used when starting a new session without history
 * @param tempProjectPath Path to the temporary project directory
 * @param packageName Name of the Ballerina package
 * @returns Formatted XML string with codebase structure
 */
export function formatCodebaseStructure(tempProjectPath: string, packageName: string): string {
    const allFiles: string[] = [];

    function collectFiles(dir: string, basePath: string = "") {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(basePath, entry.name);

            if (entry.isDirectory()) {
                if (CODEBASE_STRUCTURE_IGNORE_FOLDERS.includes(entry.name)) {
                    continue;
                }
                collectFiles(fullPath, relativePath);
            } else if (entry.isFile()) {
                if (CODEBASE_STRUCTURE_IGNORE_FILES.includes(entry.name)) {
                    continue;
                }
                const ext = path.extname(entry.name);
                if (CODEBASE_STRUCTURE_FILE_TYPES.includes(ext)) {
                    allFiles.push(relativePath);
                }
            }
        }
    }

    collectFiles(tempProjectPath);

    let text = "<codebase_structure>\n";
    text += `This is the complete structure of the codebase you are working with (Package: ${packageName}). `;
    text += "You do not need to acknowledge or list these files in your response. ";
    text += "This information is provided for your awareness only.\n\n";
    text += "<files>\n" + allFiles.join("\n") + "\n</files>\n";
    text += "</codebase_structure>";

    return text;
}

/**
 * Applies LSP text edits to create or modify a file
 * @param filePath Absolute path to the file
 * @param textEdits Array of LSP TextEdit objects
 */
export async function applyTextEdits(filePath: string, textEdits: TextEdit[]): Promise<void> {
    const workspaceEdit = new vscode.WorkspaceEdit();
    const fileUri = vscode.Uri.file(filePath);
    const dirPath = path.dirname(filePath);
    const dirUri = vscode.Uri.file(dirPath);

    try {
        await vscode.workspace.fs.createDirectory(dirUri);
        workspaceEdit.createFile(fileUri, { ignoreIfExists: true });
    } catch (error) {
        console.error(`[applyTextEdits] Error creating file or directory:`, error);
    }

    for (const edit of textEdits) {
        const range = new vscode.Range(
            edit.range.start.line,
            edit.range.start.character,
            edit.range.end.line,
            edit.range.end.character
        );
        workspaceEdit.replace(fileUri, range, edit.newText);
    }

    try {
        await vscode.workspace.applyEdit(workspaceEdit);
    } catch (error) {
        console.error(`[applyTextEdits] Error applying edits to ${filePath}:`, error);
        throw error;
    }
}

/**
 * Formats code context with surrounding lines (3 before, 3 after) in XML format
 * @param codeContext The code context (addition or selection type) with relative file path from workspace root
 * @param tempProjectPath The temporary project directory path
 * @returns Formatted XML string with file content and context
 */
export function formatCodeContext(codeContext: CodeContext, tempProjectPath: string): string {
    const absolutePath = path.join(tempProjectPath, codeContext.filePath);

    const fileContent = fs.readFileSync(absolutePath, "utf-8");
    const lines = fileContent.split("\n");
    const totalLines = lines.length;

    let startLine: number;
    let endLine: number;
    let markerLine: number | undefined;

    if (codeContext.type === "addition") {
        // For addition: show 3 lines before and after the insertion point
        const insertLine = codeContext.position.line;
        startLine = Math.max(0, insertLine - 3);
        endLine = Math.min(totalLines - 1, insertLine + 3);
        markerLine = insertLine;
    } else {
        // For selection: show 3 lines before start and 3 lines after end
        const selectionStart = codeContext.startPosition.line;
        const selectionEnd = codeContext.endPosition.line;
        startLine = Math.max(0, selectionStart - 3);
        endLine = Math.min(totalLines - 1, selectionEnd + 3);
    }

    // Build the context snippet
    const contextLines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
        const lineContent = lines[i] || "";

        if (codeContext.type === "addition" && i === markerLine) {
            contextLines.push(lineContent);
            contextLines.push(`>>> Cursor Position <<<`);
        } else if (codeContext.type === "selection") {
            // Add selection start marker before the first selected line
            if (i === codeContext.startPosition.line) {
                contextLines.push(`>>> SELECTION START <<<`);
            }
            contextLines.push(lineContent);
            // Add selection end marker after the last selected line
            if (i === codeContext.endPosition.line) {
                contextLines.push(`>>> SELECTION END <<<`);
            }
        } else {
            contextLines.push(lineContent);
        }
    }

    return `
** Note: ${getCodeContextInstruction(codeContext.type)} **
<selected_code>
<file path="${codeContext.filePath}">
${contextLines.join("\n")}
</file>
</selected_code>`;
}

function getCodeContextInstruction(type: "addition" | "selection"): string {
    if (type === "addition") {
        return "The user has indicated a cursor position where new code can be added. The cursor position is marked with >>> Cursor Position <<< in the code context below.";
    } else {
        return "The user has selected a block of code that is relevant to the current task. The selected code is enclosed between >>> SELECTION START <<< and >>> SELECTION END <<< markers in the code context below.";
    }
}
