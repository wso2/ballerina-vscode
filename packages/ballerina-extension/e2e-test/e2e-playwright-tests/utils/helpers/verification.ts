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

import fs from 'fs';
import path from 'path';
import { newProjectPath } from './setup';

/**
 * Normalize source code for comparison
 */
function normalizeSource(source: string): string {
    return source
        .replace(/\r\n/g, '\n')           // Normalize line endings
        .replace(/\t/g, '    ')           // Convert tabs to spaces
        .split('\n')
        .map(line => line.trimEnd())      // Remove trailing whitespace
        .filter(line => line.trim() !== '') // Remove empty lines
        .join('\n')
        .trim();
}

/**
 * Compare a generated .bal file with an expected .bal file
 * @param generatedFileName - Name of the generated file (e.g., 'types.bal')
 * @param expectedFilePath - Path to the expected file (e.g., path to testOutput.bal)
 */
export async function verifyGeneratedSource(generatedFileName: string, expectedFilePath: string): Promise<void> {
    const { expect } = await import('@playwright/test');

    // Generated file is in the current test project folder
    const generatedFilePath = path.join(newProjectPath, generatedFileName);

    if (!fs.existsSync(generatedFilePath)) {
        throw new Error(`Generated file not found at: ${generatedFilePath}`);
    }

    if (!fs.existsSync(expectedFilePath)) {
        throw new Error(`Expected file not found at: ${expectedFilePath}`);
    }

    const actualContent = fs.readFileSync(generatedFilePath, 'utf-8');
    const expectedContent = fs.readFileSync(expectedFilePath, 'utf-8');

    const normalizedActual = normalizeSource(actualContent);
    const normalizedExpected = normalizeSource(expectedContent);

    expect(normalizedActual).toBe(normalizedExpected);
}
