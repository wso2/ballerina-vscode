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

import { Diagnostics, ProjectDiagnosticsResponse, STModification, SyntaxTree } from "@wso2/ballerina-core";
import { ExtendedLangClient } from "../../core";
import { Uri, workspace } from "vscode";
import { TextDocumentEdit } from "vscode-languageserver-types";
import { fileURLToPath } from "url";
import { modifyFileContent } from "../../utils/modification";

export async function attemptRepairProject(langClient: ExtendedLangClient, tempDir: string): Promise<Diagnostics[]> {
    // check project diagnostics
    let projectDiags: Diagnostics[] = await checkProjectDiagnostics(langClient, tempDir);
    let isDiagsChanged = await isModuleNotFoundDiagsExist(projectDiags, langClient);
    if (isDiagsChanged) {
        projectDiags = await checkProjectDiagnostics(langClient, tempDir);
    }

    isDiagsChanged = await addMissingImports(projectDiags, langClient);
    if (isDiagsChanged) {
        projectDiags = await checkProjectDiagnostics(langClient, tempDir);
    }

    isDiagsChanged = await removeUnusedImports(projectDiags, langClient);
    if (isDiagsChanged) {
        projectDiags = await checkProjectDiagnostics(langClient, tempDir);
    }
    return projectDiags;
}

export async function checkProjectDiagnostics(langClient: ExtendedLangClient, tempDir: string): Promise<Diagnostics[]> {
    const allDiags: Diagnostics[] = [];
    let response: ProjectDiagnosticsResponse = await langClient.getProjectDiagnostics({
        projectRootIdentifier: {
            uri: Uri.file(tempDir).toString()
        }
    });
    if (!response.errorDiagnosticMap || Object.keys(response.errorDiagnosticMap).length === 0) {
        return [];
    }
    for (const [filePath, diagnostics] of Object.entries(response.errorDiagnosticMap)) {
        allDiags.push({ uri: filePath, diagnostics: diagnostics });
    }
    return allDiags;
}

export async function isModuleNotFoundDiagsExist(diagnosticsResult: Diagnostics[], langClient): Promise<boolean> {
    // Create a Map to store unique diagnostic messages and their corresponding diagnostic information
    const uniqueDiagnosticMap = new Map<string, { diagnostic: any, uri: string }>();
    
    // First pass: collect unique diagnostic messages across all files
    for (const diagResult of diagnosticsResult) {
        for (const diag of diagResult.diagnostics) {
            if (diag.code === "BCE2003" && !uniqueDiagnosticMap.has(diag.message)) {
                uniqueDiagnosticMap.set(diag.message, {
                    diagnostic: diag,
                    uri: diagResult.uri
                });
            }
        }
    }
    
    // If no BCE2003 diagnostics found, return false
    if (uniqueDiagnosticMap.size === 0) {
        return false;
    }
    
    // Process each unique diagnostic only once
    let projectModified = false;
    for (const [_, { uri }] of uniqueDiagnosticMap.entries()) {
        const dependenciesResponse = await langClient.resolveMissingDependencies({
            documentIdentifier: {
                uri: uri
            }
        });
        
        const response = dependenciesResponse as SyntaxTree;
        if (response.parseSuccess) {
            // Read and save content to a string
            const sourceFile = await workspace.openTextDocument(Uri.parse(uri));
            const content = sourceFile.getText();

            langClient.didOpen({
                textDocument: {
                    uri: uri,
                    languageId: 'ballerina',
                    version: 1,
                    text: content
                }
            });
            projectModified = true;
        } else {
            throw Error("Module resolving failed");
        }
    }
    
    return projectModified;
}

export async function addMissingImports(diagnosticsResult: Diagnostics[], langClient: ExtendedLangClient): Promise<boolean> {
    let projectModified = false;
    for (const diag of diagnosticsResult) {
        const fielUri = diag.uri;
        const diagnostics = diag.diagnostics;

        // Find all BCE2000 diagnostics (undefined module errors)
        const bce2000Diagnostics = diagnostics.filter(d => d.code === "BCE2000");
        if (!bce2000Diagnostics.length) { continue; }

        // Filter to get unique diagnostics based on their message
        const uniqueDiagnosticMap = new Map();
        for (const diag of bce2000Diagnostics) {
            if (!uniqueDiagnosticMap.has(diag.message)) {
                uniqueDiagnosticMap.set(diag.message, diag);
            }
        }
        const uniqueDiagnostics = Array.from(uniqueDiagnosticMap.values());
        const astModifications: STModification[] = [];
        for (const diag of uniqueDiagnostics) {
            // Get code actions for the unique diagnostics
            const codeActions = await langClient.codeAction({
                textDocument: { uri: fielUri },
                range: {
                    start: diag.range.start,
                    end: diag.range.end
                },
                context: { diagnostics: diag }
            });
            // Find and apply the appropriate code action
            const action = codeActions.find(action => action.title && action.title.startsWith("Import module"));
            if (!action?.edit?.documentChanges?.length) { continue; }
            const docEdit = action.edit.documentChanges[0] as TextDocumentEdit;
            const edit = docEdit.edits[0];
            astModifications.push({
                startLine: edit.range.start.line,
                startColumn: edit.range.start.character,
                endLine: edit.range.end.line,
                endColumn: edit.range.end.character,
                type: "INSERT",
                isImport: false,
                config: { STATEMENT: edit.newText }
            });
        }

        // Apply modifications to syntax tree
        const syntaxTree = await langClient.stModify({
            documentIdentifier: { uri: fielUri },
            astModifications: astModifications
        });

        // Update file content
        const { source } = syntaxTree as SyntaxTree;
        const absolutePath = fileURLToPath(fielUri);
        await modifyFileContent({ filePath: absolutePath, content: source, updateViewFlag: false });
        if (astModifications.length > 0) {
            projectModified = true;
        }
    }

    return projectModified;
}

export async function removeUnusedImports(diagnosticsResult: Diagnostics[], langClient): Promise<boolean> {
    let projectModified = false;
    for (const diag of diagnosticsResult) {
        const fielUri = diag.uri;
        const diagnostics = diag.diagnostics;
            // Filter the unused import diagnostics
            const diagnostic = diagnostics.find(d => d.code === "BCE2002");
            if (!diagnostic) { continue; }
            const codeActions = await langClient.codeAction({
                textDocument: { uri: fielUri },
                range: {
                    start: diagnostic.range.start,
                    end: diagnostic.range.end
                },
                context: { diagnostics: [diagnostic] }
            });

            // Find and apply the appropriate code action
            const action = codeActions.find(action => action.title === "Remove all unused imports");
            if (!action?.edit?.documentChanges?.length) { continue; }
            const docEdit = action.edit.documentChanges[0] as TextDocumentEdit;

            // Apply modifications to syntax tree
            const syntaxTree = await langClient.stModify({
                documentIdentifier: { uri: docEdit.textDocument.uri },
                astModifications: docEdit.edits.map(edit => ({
                    startLine: edit.range.start.line,
                    startColumn: edit.range.start.character,
                    endLine: edit.range.end.line,
                    endColumn: edit.range.end.character,
                    type: "INSERT",
                    isImport: true,
                    config: { STATEMENT: edit.newText }
                }))
            });

            // Update file content
            const { source } = syntaxTree as SyntaxTree;
            const absolutePath = fileURLToPath(fielUri);
            await modifyFileContent({ filePath: absolutePath, content: source, updateViewFlag: false });
            projectModified = true;
    }
    return projectModified;
}
