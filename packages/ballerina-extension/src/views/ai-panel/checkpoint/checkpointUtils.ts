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

import * as vscode from 'vscode';
import * as path from 'path';
import { Checkpoint } from '@wso2/ballerina-core/lib/state-machine-types';
import { getCheckpointConfig } from './checkpointConfig';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function matchesPattern(filePath: string, pattern: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');

    const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '::DOUBLESTAR::')
        .replace(/\*/g, '[^/]*')
        .replace(/::DOUBLESTAR::/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedPath);
}

export async function captureWorkspaceSnapshot(messageId: string): Promise<Checkpoint | null> {
    const config = getCheckpointConfig();

    if (!config.enabled) {
        return null;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        console.warn('[Checkpoint] No workspace folder found');
        return null;
    }

    const workspaceRoot = workspaceFolders[0].uri;
    const workspaceSnapshot: { [filePath: string]: string } = {};
    const fileList: string[] = [];
    let totalSize = 0;

    try {
        const allFiles = await getAllWorkspaceFiles(workspaceRoot, config.ignorePatterns);

        for (const fileUri of allFiles) {
            try {
                const fileContent = await vscode.workspace.fs.readFile(fileUri);
                const content = Buffer.from(fileContent).toString('utf8');
                const relativePath = path.relative(workspaceRoot.fsPath, fileUri.fsPath);

                workspaceSnapshot[relativePath] = content;
                fileList.push(relativePath);
                totalSize += content.length;

                if (totalSize > config.maxSnapshotSize) {
                    console.warn(`[Checkpoint] Snapshot size exceeded max limit: ${totalSize} bytes`);
                    vscode.window.showWarningMessage(
                        `Checkpoint snapshot size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds limit. Some files may not be included.`
                    );
                    break;
                }
            } catch (error) {
                console.error(`[Checkpoint] Failed to read file ${fileUri.fsPath}:`, error);
            }
        }

        const checkpoint: Checkpoint = {
            id: generateId(),
            messageId,
            timestamp: Date.now(),
            workspaceSnapshot,
            fileList,
            snapshotSize: totalSize
        };

        return checkpoint;
    } catch (error) {
        console.error('[Checkpoint] Failed to capture workspace snapshot:', error);
        vscode.window.showErrorMessage('Failed to create checkpoint: ' + (error as Error).message);
        return null;
    }
}

export async function restoreWorkspaceSnapshot(checkpoint: Checkpoint): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder found');
    }

    const workspaceRoot = workspaceFolders[0].uri;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Restoring checkpoint...',
            cancellable: false
        }, async (progress) => {
            progress.report({ message: 'Reading current workspace...' });

            const config = getCheckpointConfig();
            const currentFiles = await getAllWorkspaceFiles(workspaceRoot, config.ignorePatterns);
            const currentFilePaths = new Set(
                currentFiles.map(uri => path.relative(workspaceRoot.fsPath, uri.fsPath))
            );

            const snapshotFilePaths = new Set(checkpoint.fileList);

            const filesToDelete = Array.from(currentFilePaths).filter(
                filePath => !snapshotFilePaths.has(filePath)
            );

            progress.report({ message: `Deleting ${filesToDelete.length} files...` });
            for (const filePath of filesToDelete) {
                try {
                    const fileUri = vscode.Uri.file(path.join(workspaceRoot.fsPath, filePath));
                    await vscode.workspace.fs.delete(fileUri);
                } catch (error) {
                    console.error(`[Checkpoint] Failed to delete file ${filePath}:`, error);
                }
            }

            progress.report({ message: `Restoring ${checkpoint.fileList.length} files...` });
            for (const [filePath, content] of Object.entries(checkpoint.workspaceSnapshot)) {
                try {
                    const fileUri = vscode.Uri.file(path.join(workspaceRoot.fsPath, filePath));
                    const dirUri = vscode.Uri.file(path.dirname(fileUri.fsPath));

                    await vscode.workspace.fs.createDirectory(dirUri);

                    const contentBuffer = Buffer.from(content, 'utf8');
                    await vscode.workspace.fs.writeFile(fileUri, contentBuffer);
                } catch (error) {
                    console.error(`[Checkpoint] Failed to restore file ${filePath}:`, error);
                }
            }

            progress.report({ message: 'Checkpoint restored successfully!' });
        });

        vscode.window.showInformationMessage('Checkpoint restored successfully');
    } catch (error) {
        console.error('[Checkpoint] Failed to restore workspace snapshot:', error);
        vscode.window.showErrorMessage('Failed to restore checkpoint: ' + (error as Error).message);
    }
}

async function getAllWorkspaceFiles(workspaceRoot: vscode.Uri, ignorePatterns: string[]): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];

    async function scanDirectory(dirUri: vscode.Uri): Promise<void> {
        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);

            for (const [name, type] of entries) {
                const entryUri = vscode.Uri.joinPath(dirUri, name);
                const relativePath = path.relative(workspaceRoot.fsPath, entryUri.fsPath);

                if (shouldIgnoreFile(relativePath, ignorePatterns)) {
                    continue;
                }

                if (type === vscode.FileType.File) {
                    files.push(entryUri);
                } else if (type === vscode.FileType.Directory) {
                    await scanDirectory(entryUri);
                }
            }
        } catch (error) {
            console.error(`[Checkpoint] Failed to scan directory ${dirUri.fsPath}:`, error);
        }
    }

    await scanDirectory(workspaceRoot);
    return files;
}

function shouldIgnoreFile(filePath: string, ignorePatterns: string[]): boolean {
    for (const pattern of ignorePatterns) {
        if (matchesPattern(filePath, pattern)) {
            return true;
        }
    }
    return false;
}
