/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Interface matching the EvalCase object structure
interface EvalCaseJson {
    id: string;
    name: string;
    traces: any[];
}

// Interface matching the new EvalSet JSON structure
interface EvalSetJson {
    id: string;
    name?: string;
    description?: string;
    cases: EvalCaseJson[]; // Array of Case objects
    created_on?: number;
}

/**
 * Represents an evalset file node in the tree view
 */
class EvalsetFileNode {
    constructor(
        public readonly uri: vscode.Uri,
        public readonly label: string,
        public readonly caseCount: number,
        public readonly description?: string
    ) { }
}

/**
 * Represents a single case within an evalset
 */
class EvalsetCaseNode {
    constructor(
        public readonly parentUri: vscode.Uri,
        public readonly caseIndex: number,
        public readonly label: string,
        public readonly caseId: string,
        public readonly traceCount: number
    ) { }
}

type EvalsetNode = EvalsetFileNode | EvalsetCaseNode;

/**
 * TreeDataProvider for displaying evalsets
 */
export class EvalsetTreeDataProvider implements vscode.TreeDataProvider<EvalsetNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<EvalsetNode | undefined | null | void> =
        new vscode.EventEmitter<EvalsetNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EvalsetNode | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private fileWatcher: vscode.FileSystemWatcher | undefined;

    constructor() {
        this.setupFileWatcher();
    }

    private setupFileWatcher(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }

        // Watch all evalset files in workspace
        const pattern = '**/evalsets/**/*.evalset.json';
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

        // Refresh on file changes
        this.fileWatcher.onDidCreate(() => this.refresh());
        this.fileWatcher.onDidChange(() => this.refresh());
        this.fileWatcher.onDidDelete(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: EvalsetNode): vscode.TreeItem {
        if (element instanceof EvalsetFileNode) {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            item.tooltip = element.description || `EvalSet with ${element.caseCount} cases`;
            item.description = `${element.caseCount} case${element.caseCount !== 1 ? 's' : ''}`;
            item.iconPath = new vscode.ThemeIcon('library');
            item.contextValue = 'evalsetFile';
            item.resourceUri = element.uri;
            return item;
        } else {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.None
            );
            item.tooltip = `Case ID: ${element.caseId} (${element.traceCount} traces)`;

            item.iconPath = new vscode.ThemeIcon('file-text');
            item.contextValue = 'evalsetCase';
            item.resourceUri = element.parentUri;

            item.command = {
                command: 'ballerina.openEvalsetViewer',
                title: 'Open Evalset Case',
                arguments: [element.parentUri, element.caseId]
            };
            return item;
        }
    }

    async getChildren(element?: EvalsetNode): Promise<EvalsetNode[]> {
        if (!element) {
            // Root level - return all evalset files
            return this.getEvalsetFiles();
        } else if (element instanceof EvalsetFileNode) {
            // Return cases for this evalset file
            return this.getCasesForFile(element.uri);
        }

        return [];
    }

    /**
     * Get all evalset files in the workspace
     */
    private async getEvalsetFiles(): Promise<EvalsetFileNode[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return [];
        }

        const evalsetFiles = await vscode.workspace.findFiles('**/evalsets/**/*.evalset.json');
        const nodes: EvalsetFileNode[] = [];

        for (const uri of evalsetFiles) {
            try {
                const content = await fs.promises.readFile(uri.fsPath, 'utf-8');
                const evalsetData: EvalSetJson = JSON.parse(content);

                // Validation for new format
                if (!evalsetData.cases || !Array.isArray(evalsetData.cases)) {
                    continue;
                }

                const caseCount = evalsetData.cases.length;
                const label = evalsetData.name || path.basename(uri.fsPath, '.evalset.json');
                const description = evalsetData.description || '';

                nodes.push(new EvalsetFileNode(uri, label, caseCount, description));
            } catch (error) {
                console.error(`Failed to parse evalset file ${uri.fsPath}:`, error);
            }
        }

        return nodes;
    }

    /**
     * Get cases for a specific evalset file
     */
    private async getCasesForFile(uri: vscode.Uri): Promise<EvalsetCaseNode[]> {
        try {
            const content = await fs.promises.readFile(uri.fsPath, 'utf-8');
            const evalsetData: EvalSetJson = JSON.parse(content);
            const nodes: EvalsetCaseNode[] = [];

            if (!evalsetData.cases || !Array.isArray(evalsetData.cases)) {
                return [];
            }

            evalsetData.cases.forEach((caseObj: EvalCaseJson, index: number) => {
                // Ensure traces is an array
                const traceCount = Array.isArray(caseObj.traces) ? caseObj.traces.length : 0;

                // Use the name defined in the case object, fallback to generated name
                const label = caseObj.name || `Case ${index + 1}`;
                const caseId = caseObj.id || `case-${index + 1}`;

                nodes.push(new EvalsetCaseNode(
                    uri,
                    index,
                    label,
                    caseId,
                    traceCount
                ));
            });

            return nodes;
        } catch (error) {
            console.error(`Failed to get cases for ${uri.fsPath}:`, error);
            return [];
        }
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.fileWatcher?.dispose();
        this._onDidChangeTreeData.dispose();
    }
}
