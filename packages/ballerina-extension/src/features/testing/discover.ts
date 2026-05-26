'use strict';
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

import { RelativePattern, TestController, TestItem, TestItemCollection, TestRunRequest, workspace } from "vscode";
import { createTests } from "./activator";

/**
 * Add test items to an queue to run.
 * 
 * @param request test run request
 * @param tests test tree items
 * @param queue queue to add tests
 */
export async function discoverTests(request: TestRunRequest, tests: Iterable<TestItem>, queue: { test: TestItem; data: any }[]) {
    for (const test of tests) {
        if (request.exclude && request.exclude.includes(test)) {
            continue;
        }

        if (test.canResolveChildren) {
            await discoverTests(request, gatherTestItems(test.children), queue);
        } else {
            queue.push({ test: test, data: null });
        }
    }
}

/**
 * Get test items from test collection.
 * 
 * @param collection test item collection
 * @returns test items array
 */
export function gatherTestItems(collection: TestItemCollection) {
    const items: TestItem[] = [];
    collection.forEach(item => items.push(item));
    return items;
}

/**
 * Search for bal files in workspace.
 * 
 */
export function startWatchingWorkspace(controller: TestController) {
    if (!workspace.workspaceFolders) {
        return [];
    }

    return workspace.workspaceFolders.map(workspaceFolder => {
        const pattern = new RelativePattern(workspaceFolder, '**/*.bal');
        const watcher = workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate(uri => createTests(uri));
        watcher.onDidChange(async uri => {
            await createTests(uri);
        });
        watcher.onDidDelete(uri => controller.items.delete(uri.toString()));

        workspace.findFiles(pattern).then(async files => {
            for (const fileX of files) {
                await createTests(fileX);
            }
        });

        return watcher;
    });
}
