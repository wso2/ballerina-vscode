// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/)
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * Result of creating an isolated test project
 */
export interface IsolatedProjectResult {
    /** Absolute path to the isolated test project */
    path: string;
    /** Original base project path that was copied */
    basePath: string;
    /** Test case ID this project was created for */
    testId: string;
}

/**
 * Creates an isolated copy of a project for a specific test case.
 * Each test gets its own fresh copy to prevent state contamination.
 *
 * @param baseProjectPath Absolute path to the base project template
 * @param testId Unique identifier for the test case
 * @returns Information about the created isolated project
 */
export function createIsolatedTestProject(
    baseProjectPath: string,
    testId: string
): IsolatedProjectResult {
    // Validate base project exists
    if (!fs.existsSync(baseProjectPath)) {
        throw new Error(`Base project path does not exist: ${baseProjectPath}`);
    }

    // Create unique temp directory for this specific test
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const sanitizedTestId = testId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const tempDirName = `bal-test-${sanitizedTestId}-${timestamp}-${randomSuffix}`;
    const tempProjectPath = path.join(os.tmpdir(), tempDirName);

    // Create temp directory
    fs.mkdirSync(tempProjectPath, { recursive: true });

    try {
        // Copy entire project to isolated temp directory
        fs.cpSync(baseProjectPath, tempProjectPath, {
            recursive: true,
            // Exclude common build artifacts and caches
            filter: (source) => {
                const basename = path.basename(source);
                return basename !== 'target' &&
                       basename !== '.ballerina' &&
                       basename !== 'node_modules';
            }
        });

        console.log(`[Test Isolation] Created isolated project for ${testId} at: ${tempProjectPath}`);

        return {
            path: tempProjectPath,
            basePath: baseProjectPath,
            testId
        };
    } catch (error) {
        // Cleanup on error
        try {
            fs.rmSync(tempProjectPath, { recursive: true, force: true });
        } catch (cleanupError) {
            console.error(`[Test Isolation] Failed to cleanup after error:`, cleanupError);
        }
        throw new Error(`Failed to create isolated test project: ${error}`);
    }
}

/**
 * Cleans up an isolated test project
 *
 * @param isolatedProject The isolated project information
 */
export function cleanupIsolatedTestProject(isolatedProject: IsolatedProjectResult): void {
    if (fs.existsSync(isolatedProject.path)) {
        try {
            fs.rmSync(isolatedProject.path, { recursive: true, force: true });
            console.log(`[Test Isolation] Cleaned up isolated project for ${isolatedProject.testId}`);
        } catch (error) {
            console.error(`[Test Isolation] Failed to cleanup ${isolatedProject.path}:`, error);
        }
    }
}

/**
 * Extracts source files from an isolated test project
 * Used for validation after generation
 *
 * @param projectPath Absolute path to the project
 * @returns Array of source files with their content
 */
export function extractSourceFiles(projectPath: string): Array<{filePath: string, content: string}> {
    const sourceFiles: Array<{filePath: string, content: string}> = [];

    function scanDirectory(dirPath: string, relativeTo: string) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.relative(relativeTo, fullPath);

            if (entry.isDirectory()) {
                // Skip build artifacts and caches
                if (entry.name !== 'target' && entry.name !== '.ballerina') {
                    scanDirectory(fullPath, relativeTo);
                }
            } else if (entry.isFile() && entry.name.endsWith('.bal')) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                sourceFiles.push({ filePath: relativePath, content });
            }
        }
    }

    scanDirectory(projectPath, projectPath);
    return sourceFiles;
}
