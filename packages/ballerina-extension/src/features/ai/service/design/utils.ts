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
 * Integrates code from temp directory to workspace
 * @param tempProjectPath Path to the temporary project directory
 */
export async function integrateCodeToWorkspace(tempProjectPath: string): Promise<void> {
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

    // Read all files from temp directory
    const fileChanges: FileChanges[] = [];

    function collectFiles(dir: string, basePath: string = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(basePath, entry.name);

            if (entry.isDirectory()) {
                // Recursively collect files from subdirectories
                collectFiles(fullPath, relativePath);
            } else if (entry.isFile()) {
                // Read file content
                const content = fs.readFileSync(fullPath, 'utf-8');
                fileChanges.push({
                    filePath: relativePath,
                    content: content
                });
                console.log(`[Design Integration] Prepared: ${relativePath}`);
            }
        }
    }

    collectFiles(tempProjectPath);

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
