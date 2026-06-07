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
 * Normalizes codeContext filePath to be relative to the workspace root.
 * @param codeContext   The code context with a potentially absolute or package-relative filePath.
 * @param workspaceRoot Ballerina workspace root (workspacePath ?? projectPath).
 * @param projectPath   Active package path, used to resolve package-relative filePaths correctly.
 * @returns CodeContext with workspace-relative filePath, or undefined if input is undefined
 */
export const normalizeCodeContext = (codeContext?: CodeContext, workspaceRoot?: string, projectPath?: string): CodeContext | undefined => {
    if (!codeContext) {
        return undefined;
    }

    const workspaceFolders = workspace.workspaceFolders;
    const root = workspaceRoot || workspaceFolders?.[0]?.uri.fsPath;

    if (!root) {
        return codeContext;
    }

    // Resolve relative paths against the package dir so the workspace prefix is included
    const resolveBase = projectPath || root;
    const absolutePath = path.isAbsolute(codeContext.filePath)
        ? codeContext.filePath
        : path.join(resolveBase, codeContext.filePath);

    const relativePath = path.relative(root, absolutePath);

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
