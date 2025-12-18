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

import { NodeProperties } from "@wso2/ballerina-core";
import { NodePosition, STNode, traversNode } from "@wso2/syntax-tree";

import { FunctionFindingVisitor } from "../../utils/function-finding-visitor";
import { Position, Range, Uri, workspace, WorkspaceEdit } from "vscode";
import { TextEdit } from "@wso2/ballerina-core";

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

    // Adjust position to skip header comments if inserting at the beginning
    if (startLine === 0 && startChar === 0) {
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