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

import { SourceFiles, FileChanges } from "@wso2/ballerina-core";
import { workspace } from "vscode";
import { addToIntegration } from "../../../../rpc-managers/ai-panel/utils";
import * as fs from 'fs';
import * as path from 'path';

/**
 * File extensions to include in codebase structure
 */
const CODEBASE_STRUCTURE_FILE_TYPES = ['.bal'];

/**
 * Directories to ignore in codebase structure
 */
const CODEBASE_STRUCTURE_IGNORE_FOLDERS = [
    'target',
    '.ballerina',
    '.vscode',
    '.git',
];

/**
 * Files to ignore in codebase structure
 */
const CODEBASE_STRUCTURE_IGNORE_FILES = [
    'Ballerina.toml',
    'Config.toml',
    'Dependencies.toml'
];

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
                const content = fs.readFileSync(fullPath, 'utf-8');
                fileChanges.push({
                    filePath: relativePath,
                    content: content
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

export function getCodeBlocks(updatedSourceFiles: SourceFiles[], updatedFileNames: string[]): string {
    const codeBlocks = updatedFileNames
        .map(fileName => {
            const sourceFile = updatedSourceFiles.find(sf => sf.filePath === fileName);
            if (!sourceFile) { return null; }

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
 * @returns Formatted XML string with codebase structure
 */
export function formatCodebaseStructure(tempProjectPath: string): string {
    const allFiles: string[] = [];

    function collectFiles(dir: string, basePath: string = '') {
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

    let text = '<codebase_structure>\n';
    text += 'This is the complete structure of the codebase you are working with. ';
    text += 'You do not need to acknowledge or list these files in your response. ';
    text += 'This information is provided for your awareness only.\n\n';
    text += '<files>\n' + allFiles.join('\n') + '\n</files>\n';
    text += '</codebase_structure>';

    return text;
}
