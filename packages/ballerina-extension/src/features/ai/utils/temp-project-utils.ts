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

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { workspace } from 'vscode';
import { ProjectSource } from '@wso2/ballerina-core';

/**
 * Generates a hash from the workspace path
 * @returns SHA-256 hash of the workspace path
 */
function generateProjectHash(): string {
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
        throw new Error('No workspace folder found');
    }

    const workspacePath = workspace.workspaceFolders[0].uri.fsPath;
    const hash = crypto.createHash('sha256');
    hash.update(workspacePath);
    return hash.digest('hex');
}

/**
 * Gets or creates a temporary project directory for AI operations.
 * Currently always creates a new temp project. Future enhancement: reuse existing if valid.
 *
 * @param projectSource The source project to copy
 * @returns The path to the temporary project directory
 */
export async function getTempProject(projectSource: ProjectSource): Promise<string> {
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
        throw new Error('No workspace folder found');
    }

    const projectRoot = workspace.workspaceFolders[0].uri.fsPath;
    const projectHash = generateProjectHash();
    const tempDir = path.join(os.tmpdir(), `bal-proj-${projectHash}`);

    // Check if temp project already exists
    if (fs.existsSync(tempDir)) {
        console.log(`Reusing existing temp project at: ${tempDir}`);
        // Update with latest workspace contents
        await updateTempProject(tempDir, projectSource);
        return tempDir;
    }

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Copy entire workspace to temp directory
    fs.cpSync(projectRoot, tempDir, { recursive: true });

    console.log(`Created new temp project at: ${tempDir}`);
    return tempDir;
}

/**
 * Updates an existing temporary project with the latest workspace contents
 * Performs a clean sync: copies changed files from workspace and removes files that don't exist in workspace
 *
 * @param tempPath Path to the temporary project
 * @param projectSource The source project with updated files
 */
export async function updateTempProject(tempPath: string, projectSource: ProjectSource): Promise<void> {
    if (!fs.existsSync(tempPath)) {
        throw new Error(`Temp project does not exist at: ${tempPath}`);
    }

    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
        throw new Error('No workspace folder found');
    }

    const projectRoot = workspace.workspaceFolders[0].uri.fsPath;

    // Track all files in workspace for clean sync
    const workspaceFiles = new Set<string>();

    // Sync files from workspace to temp directory
    // Only copy files that have been modified (based on mtime)
    function syncDirectory(sourceDir: string, targetDir: string, basePath: string = '') {
        const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(sourceDir, entry.name);
            const targetPath = path.join(targetDir, entry.name);
            const relativePath = path.join(basePath, entry.name);

            if (entry.isDirectory()) {
                // Track directory
                workspaceFiles.add(relativePath);

                // Create directory if it doesn't exist
                if (!fs.existsSync(targetPath)) {
                    fs.mkdirSync(targetPath, { recursive: true });
                }
                // Recursively sync subdirectories
                syncDirectory(sourcePath, targetPath, relativePath);
            } else if (entry.isFile()) {
                // Track file
                workspaceFiles.add(relativePath);

                // Check if file needs updating
                let shouldCopy = false;

                if (!fs.existsSync(targetPath)) {
                    // File doesn't exist in temp, copy it
                    shouldCopy = true;
                } else {
                    // Compare modification times
                    const sourceStats = fs.statSync(sourcePath);
                    const targetStats = fs.statSync(targetPath);

                    if (sourceStats.mtime > targetStats.mtime) {
                        // Source is newer, update it
                        shouldCopy = true;
                    }
                }

                if (shouldCopy) {
                    fs.copyFileSync(sourcePath, targetPath);
                    console.log(`[TempProject] Updated: ${relativePath}`);
                }
            }
        }
    }

    // Clean up files in temp that don't exist in workspace
    function cleanupTempDirectory(targetDir: string, basePath: string = '') {
        if (!fs.existsSync(targetDir)) {
            return;
        }

        const entries = fs.readdirSync(targetDir, { withFileTypes: true });

        for (const entry of entries) {
            const targetPath = path.join(targetDir, entry.name);
            const relativePath = path.join(basePath, entry.name);

            if (entry.isDirectory()) {
                // Recursively clean subdirectories first
                cleanupTempDirectory(targetPath, relativePath);

                // If directory is not in workspace, remove it (will only succeed if empty)
                if (!workspaceFiles.has(relativePath)) {
                    try {
                        fs.rmdirSync(targetPath);
                        console.log(`[TempProject] Removed directory: ${relativePath}`);
                    } catch (error) {
                        // Directory not empty, skip
                    }
                }
            } else if (entry.isFile()) {
                // If file is not in workspace, remove it
                if (!workspaceFiles.has(relativePath)) {
                    fs.unlinkSync(targetPath);
                    console.log(`[TempProject] Removed file: ${relativePath}`);
                }
            }
        }
    }

    syncDirectory(projectRoot, tempPath);
    cleanupTempDirectory(tempPath);
    console.log(`Updated temp project at: ${tempPath}`);
}

/**
 * Cleans up a temporary project directory
 *
 * @param tempPath Path to the temporary project to delete
 */
export function cleanupTempProject(tempPath: string): void {
    if (fs.existsSync(tempPath)) {
        try {
            fs.rmSync(tempPath, { recursive: true, force: true });
            console.log(`Cleaned up temp project at: ${tempPath}`);
        } catch (error) {
            console.error(`Failed to cleanup temp project at ${tempPath}:`, error);
        }
    }
}

/**
 * Gets the temporary project path for the current workspace without creating it
 * Useful for checking if a temp project exists
 *
 * @returns The expected path to the temporary project directory
 */
export function getTempProjectPath(): string {
    const projectHash = generateProjectHash();
    return path.join(os.tmpdir(), `bal-proj-${projectHash}`);
}
