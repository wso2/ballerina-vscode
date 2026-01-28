// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

import * as vscode from 'vscode';
import * as fs from 'fs';

export interface ProjectMetrics {
    fileCount: number;
    lineCount: number;
}

export async function getProjectMetrics(workspacePath?: string): Promise<ProjectMetrics> {
    // If a specific workspace path is provided, use it; otherwise use workspace folders
    if (workspacePath) {
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(workspacePath, '**/*.bal'),
            new vscode.RelativePattern(workspacePath, '**/target/**')
        );

        let totalFileCount = 0;
        let totalLineCount = 0;

        for (const fileUri of files) {
            try {
                totalFileCount++;
                const fileContent = await fs.promises.readFile(fileUri.fsPath, 'utf8');
                const lineCount = fileContent.split('\n').length;
                totalLineCount += lineCount;
            } catch (error) {
                console.warn(`Failed to read file ${fileUri.fsPath}:`, error);
            }
        }

        return {
            fileCount: totalFileCount,
            lineCount: totalLineCount
        };
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        return { fileCount: 0, lineCount: 0 };
    }
    const files = await vscode.workspace.findFiles(
        '**/*.bal',
        '**/target/**'
    );

    let totalFileCount = 0;
    let totalLineCount = 0;

    for (const fileUri of files) {
        try {
            totalFileCount++;
            const fileContent = await fs.promises.readFile(fileUri.fsPath, 'utf8');
            const lineCount = fileContent.split('\n').length;
            totalLineCount += lineCount;
        } catch (error) {
            console.warn(`Failed to read file ${fileUri.fsPath}:`, error);
        }
    }

    return {
        fileCount: totalFileCount,
        lineCount: totalLineCount
    };
}