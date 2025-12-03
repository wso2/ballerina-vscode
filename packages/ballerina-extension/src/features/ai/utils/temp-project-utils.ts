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

/**
 * Result of getTempProject operation
 */
export interface TempProjectResult {
    /** Path to the temporary project directory */
    path: string;
}

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


// TODO: Improve sync strategy and timing
// Current approach syncs all workspace files to temp on every session continuation.
// Consider:
// - More granular sync triggers (only sync when external changes detected)
// - Smarter sync timing (sync before AI operations, not during session start)
// - Bidirectional conflict detection (workspace vs temp changes)
// - Performance optimization for large projects

/**
 * Gets or creates a temporary project directory for AI operations.
 * Detects modifications since last session and syncs with workspace.
 *
 * @param projectSource The source project to copy
 * @param hasHistory Whether chat history exists (true = continuing session, false = new session)
 * @returns Result containing temp path, modifications, and isNew flag
 */
export async function getTempProject(): Promise<TempProjectResult> {
    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
        throw new Error('No workspace folder found');
    }

    const projectRoot = workspace.workspaceFolders[0].uri.fsPath;
    const projectHash = generateProjectHash();
    const randomNum = Math.floor(Math.random() * 101);
    const tempDir = path.join(os.tmpdir(), `bal-proj-${projectHash}-${randomNum}`);

    // Check if temp project already exists
    if (fs.existsSync(tempDir)) {
        // Remove and recreate to sync changes
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Copy entire workspace to temp directory
    fs.cpSync(projectRoot, tempDir, { recursive: true });

    console.log(`Created new temp project at: ${tempDir}`);
    return {
        path: tempDir
    };
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
