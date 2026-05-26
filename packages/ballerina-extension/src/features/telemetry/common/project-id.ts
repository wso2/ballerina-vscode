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

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { parseTomlToConfig } from '../../config-generator/utils';
import { BALLERINA_TOML } from '../../../utils/project-utils';

const projectIdCache = new Map<string, string>();

/**
 * Generates a stable, anonymized project identifier by hashing
 * the project path combined with the package name from Ballerina.toml.
 *
 * @param projectPath - Absolute path to the Ballerina project
 * @returns SHA-256 hashed project ID, or empty string if projectPath is falsy
 */
export async function getHashedProjectId(projectPath: string): Promise<string> {
    if (!projectPath) {
        return '';
    }

    const cached = projectIdCache.get(projectPath);
    if (cached) {
        return cached;
    }

    let packageName = '';
    const ballerinaTomlPath = path.join(projectPath, 'Ballerina.toml');

    try {
        if (fs.existsSync(ballerinaTomlPath)) {
            const tomlContent = await fs.promises.readFile(ballerinaTomlPath, 'utf-8');
            const tomlObj: BALLERINA_TOML = parseTomlToConfig(tomlContent) as BALLERINA_TOML;
            packageName = tomlObj?.package?.name || '';
        }
    } catch (error) {
        console.warn(`[project-id] Failed to read Ballerina.toml from ${projectPath}:`, error);
    }

    const hashInput = projectPath + packageName;
    const hashedId = crypto.createHash('sha256').update(hashInput).digest('hex');

    projectIdCache.set(projectPath, hashedId);

    return hashedId;
}
