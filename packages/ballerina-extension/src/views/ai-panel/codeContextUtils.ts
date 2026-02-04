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

import * as path from 'path';
import { workspace } from 'vscode';
import { CodeContext } from '@wso2/ballerina-core/lib/rpc-types/ai-panel/interfaces';

/**
 * Normalizes codeContext to use relative paths from workspace root
 * @param codeContext The code context with potentially absolute file path
 * @returns CodeContext with relative file path, or undefined if input is undefined
 */
export const normalizeCodeContext = (codeContext?: CodeContext): CodeContext | undefined => {
    if (!codeContext) {
        return undefined;
    }

    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return codeContext;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const absolutePath = path.isAbsolute(codeContext.filePath)
        ? codeContext.filePath
        : path.join(workspaceRoot, codeContext.filePath);

    // Convert to relative path from workspace root
    const relativePath = path.relative(workspaceRoot, absolutePath);

    if (codeContext.type === 'addition') {
        return {
            type: 'addition',
            position: codeContext.position,
            filePath: relativePath
        };
    } else {
        return {
            type: 'selection',
            startPosition: codeContext.startPosition,
            endPosition: codeContext.endPosition,
            filePath: relativePath
        };
    }
};
