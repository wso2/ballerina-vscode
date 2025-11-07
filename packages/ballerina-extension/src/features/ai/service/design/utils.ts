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

export async function integrateCodeToWorkspace(updatedSourceFiles: SourceFiles[], updatedFileNames: string[]): Promise<void> {
    if (!updatedSourceFiles?.length || !updatedFileNames?.length) {
        console.log("[Design Integration] No files to integrate");
        return;
    }

    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
        throw new Error("No workspace folder found. Please open a workspace.");
    }

    const workspaceFolderPath = workspaceFolders[0].uri.fsPath;
    console.log(`[Design Integration] Integrating ${updatedFileNames.length} file(s)`);

    const fileChanges: FileChanges[] = updatedFileNames
        .map(fileName => {
            const sourceFile = updatedSourceFiles.find(sf => sf.filePath === fileName);
            if (!sourceFile) {
                console.warn(`[Design Integration] Source file not found: ${fileName}`);
                return null;
            }
            console.log(`[Design Integration] Prepared: ${sourceFile.filePath}`);
            return {
                filePath: sourceFile.filePath,
                content: sourceFile.content
            };
        })
        .filter((fc): fc is FileChanges => fc !== null);

    if (fileChanges.length === 0) {
        console.warn("[Design Integration] No valid file changes to integrate");
        return;
    }

    try {
        console.log(`[Design Integration] Applying ${fileChanges.length} file change(s)...`);
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
