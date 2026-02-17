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
import * as path from 'path';
import * as fs from 'fs';
import { getCurrentProjectRoot } from '../../utils/project-utils';

export async function ensureEvalsetsDirectory(): Promise<string> {
    // Check if workspace is open
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        throw new Error('Please open a workspace first');
    }

    let projectRoot: string;
    try {
        projectRoot = await getCurrentProjectRoot();
    } catch (error) {
        // Fallback to workspace root if project root cannot be determined
        projectRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }

    const evalsetsDir = path.join(projectRoot, 'evalsets');
    const evalsetsDirUri = vscode.Uri.file(evalsetsDir);

    try {
        await vscode.workspace.fs.createDirectory(evalsetsDirUri);
    } catch (e) {
        // Directory might exist, ignore
    }

    return evalsetsDir;
}

export function validateEvalsetName(name: string, evalsetsDir: string): string | null {
    if (!name || name.trim().length === 0) {
        return 'Evalset name cannot be empty';
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
        return 'Name can only contain letters, numbers, hyphens, and underscores';
    }
    if (name.length > 100) {
        return 'Name is too long (max 100 characters)';
    }
    const filePath = path.join(evalsetsDir, `${name}.evalset.json`);
    if (fs.existsSync(filePath)) {
        return 'An evalset with this name already exists';
    }
    return null; // Valid
}

export function validateThreadName(name: string): string | null {
    if (!name || name.trim().length === 0) {
        return 'Thread name cannot be empty';
    }
    if (name.length > 100) {
        return 'Thread name is too long (max 100 characters)';
    }
    return null; // Valid
}

export async function findExistingEvalsets(evalsetsDir: string): Promise<Array<{
    label: string;
    description: string;
    filePath: string;
}>> {
    const pattern = new vscode.RelativePattern(evalsetsDir, '*.evalset.json');
    const files = await vscode.workspace.findFiles(pattern);

    return files.map(uri => ({
        label: path.basename(uri.fsPath, '.evalset.json'),
        description: uri.fsPath,
        filePath: uri.fsPath
    }));
}
