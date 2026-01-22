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

export interface CheckpointConfig {
    enabled: boolean;
    maxCount: number;
    ignorePatterns: string[];
    maxSnapshotSize: number;
}

export const DEFAULT_CHECKPOINT_CONFIG: CheckpointConfig = {
    enabled: true,
    maxCount: 3,
    ignorePatterns: [
        'node_modules/**',
        '.git/**',
        'target/**',
        'build/**',
        'dist/**',
        '.vscode/**',
        '*.log',
        '.DS_Store'
    ],
    maxSnapshotSize: 52428800
};

export function getCheckpointConfig(): CheckpointConfig {
    const config = vscode.workspace.getConfiguration('ballerina.copilot.checkpoints');

    return {
        enabled: config.get('enabled', DEFAULT_CHECKPOINT_CONFIG.enabled),
        maxCount: config.get('maxCount', DEFAULT_CHECKPOINT_CONFIG.maxCount),
        ignorePatterns: config.get('ignorePatterns', DEFAULT_CHECKPOINT_CONFIG.ignorePatterns),
        maxSnapshotSize: config.get('maxSnapshotSize', DEFAULT_CHECKPOINT_CONFIG.maxSnapshotSize)
    };
}
