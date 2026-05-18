/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { NodeProperties, ReadmeContentRequest, ReadmeContentResponse } from "@wso2/ballerina-core";
import { NodePosition, STNode, traversNode } from "@wso2/syntax-tree";
import { TextEdit } from "@wso2/ballerina-core";
import { Position, Range, Uri, workspace, WorkspaceEdit } from "vscode";
import * as fs from "fs";
import * as path from 'path';

import { FunctionFindingVisitor } from "../../utils/function-finding-visitor";
import { README_FILE } from "../../utils/bi";

export const DATA_MAPPING_FILE_NAME = "data_mappings.bal";

export function getFunctionNodePosition(nodeProperties: NodeProperties, syntaxTree: STNode): NodePosition {
    const functionName = nodeProperties.hasOwnProperty("functionName")
        ? nodeProperties["functionName"].value as string
        : "";
    const functionFindingVisitor = new FunctionFindingVisitor(functionName);
    traversNode(syntaxTree, functionFindingVisitor);
    const functionNode = functionFindingVisitor.getFunctionNode();

    return functionNode.position;
}

export async function applyBallerinaTomlEdit(tomlPath: Uri, textEdit: TextEdit) {
    const workspaceEdit = new WorkspaceEdit();
    let { startLine, startChar, endLine, endChar } = {
        startLine: textEdit.range.start.line,
        startChar: textEdit.range.start.character,
        endLine: textEdit.range.end.line,
        endChar: textEdit.range.end.character
    };

    // Adjust position to skip header comments if inserting at the beginning of the file
    if (startLine === 0) {
        try {
            const document = await workspace.openTextDocument(tomlPath);
            ({ startLine, startChar, endLine, endChar } = adjustRangeForHeaderComments(
                document.getText(),
                textEdit.range
            ));
        } catch (error) {
            console.warn('Could not read TOML file to check for header comments:', error);
        }
    }

    const range = new Range(new Position(startLine, startChar), new Position(endLine, endChar));
    workspaceEdit.replace(tomlPath, range, textEdit.newText);
    await workspace.applyEdit(workspaceEdit);
}

/**
 * Adjusts a text edit range to skip header comments in a TOML file.
 * If the edit targets line 0, it will be moved after any header comments.
 * @param content The content of the TOML file
 * @param range The original range from the text edit
 * @returns Adjusted position coordinates
 */
function adjustRangeForHeaderComments(
    content: string,
    range: { start: { line: number; character: number }; end: { line: number; character: number } }
): { startLine: number; startChar: number; endLine: number; endChar: number } {
    let { line: startLine, character: startChar } = range.start;
    let { line: endLine, character: endChar } = range.end;

    if (content.length > 0 && content.trimStart().startsWith('#')) {
        const headerEndLine = findHeaderCommentEndLine(content);
        if (headerEndLine > 0) {
            if (endLine < headerEndLine || (endLine === 0 && endChar === 0)) {
                endLine = headerEndLine;
                endChar = 0;
            }
            startLine = headerEndLine;
            startChar = 0;
        }
    }

    return { startLine, startChar, endLine, endChar };
}

/**
 * Find the end position of header comments in a TOML file.
 * Header comments are consecutive lines starting with '#' at the beginning of the file.
 * @param content The content of the TOML file
 * @returns The line number after the header comments (0-based), or 0 if no header comments
 */
function findHeaderCommentEndLine(content: string): number {
    const lines = content.split('\n');
    let headerEndLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        // Continue if line is a comment or empty (part of header)
        if (trimmedLine.startsWith('#') || trimmedLine === '') {
            headerEndLine = i + 1;
        } else {
            // Stop at first non-comment, non-empty line
            break;
        }
    }
    
    return headerEndLine;
}

/**
 * Resolves the path to the project's README file using case-insensitive matching.
 * On case-sensitive filesystems, finds "readme.md", "Readme.md", "README.md", etc.
 * @param projectPath - Absolute path to the project directory
 * @returns Full path to the existing README file, or undefined if not found
 */
export function resolveReadmePath(projectPath: string): string | undefined {
    try {
        const entries = fs.readdirSync(projectPath, { withFileTypes: true });
        const match = entries.find(
            (e) => e.isFile() && e.name.toLowerCase() === README_FILE.toLowerCase()
        );
        return match ? path.join(projectPath, match.name) : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Reads or writes the project's README.md file.
 * When `params.read` is true, reads the file at `{projectPath}/README.md` (or any case variant
 * such as readme.md) and returns its content. If the file does not exist, returns an empty string.
 * When `params.read` is false, writes `params.content` to the README file (creating it if missing
 * as README.md) and returns the written content.
 * @param params - Request containing `projectPath`, and either `read: true` for read mode
 *                 or `content` for write mode.
 * @returns A promise that resolves with `{ content: string }` — the read or written content.
 */
export async function readOrWriteReadmeContent(params: ReadmeContentRequest): Promise<ReadmeContentResponse> {
    const projectPath = params.projectPath;
    if (!projectPath) {
        return { content: "" };
    }
    const canonicalPath = path.join(projectPath, README_FILE);
    const existingReadmePath = resolveReadmePath(projectPath);
    const readmePath = existingReadmePath ?? canonicalPath;

    if (params.read) {
        if (!existingReadmePath) {
            return { content: "" };
        }
        const content = fs.readFileSync(readmePath, "utf8");
        return { content };
    }

    const contentToWrite = params.content ?? "";
    if (!existingReadmePath) {
        fs.writeFileSync(canonicalPath, contentToWrite);
    } else {
        fs.writeFileSync(readmePath, contentToWrite);
    }
    return { content: contentToWrite };
}
