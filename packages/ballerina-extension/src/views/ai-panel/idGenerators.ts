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
import { workspace } from 'vscode';

/**
 * Generates a unique identifier for messages and other entities
 * @returns A unique string ID
 */
export const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generates a unique session identifier
 * @returns A unique session ID string
 */
export const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generates a unique project identifier based on the workspace root path
 * @returns A UUID string for the current project
 */
export const generateProjectId = (): string => {
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        // Fallback for when no workspace is open
        return 'default-project';
    }

    // Use the first workspace folder path to generate a consistent UUID
    const workspacePath = workspaceFolders[0].uri.fsPath;

    // Create a hash of the workspace path for consistent project ID
    const hash = crypto.createHash('sha256');
    hash.update(workspacePath);
    const projectHash = hash.digest('hex').substring(0, 16);

    return `project-${projectHash}`;
};
