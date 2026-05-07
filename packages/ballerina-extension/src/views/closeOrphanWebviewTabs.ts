/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import * as vscode from "vscode";

/**
 * Closes all webview tabs whose viewType matches any of the given raw viewType strings.
 *
 * VS Code prefixes the stored tab viewType as "mainThreadWebview-<viewType>", so
 * comparison checks both an exact match and the "-<viewType>" suffix.
 *
 * Call this before creating a new webview panel to remove orphaned empty tabs that
 * VS Code persisted from a previous session but could not restore (no serializer).
 */
export async function closeOrphanWebviewTabs(viewTypes: string[]): Promise<void> {
    const tabsToClose: vscode.Tab[] = [];

    for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
            if (!(tab.input instanceof vscode.TabInputWebview)) {
                continue;
            }
            const inputViewType = tab.input.viewType;
            const matches = viewTypes.some(
                (vt) => inputViewType === vt || inputViewType.endsWith(`-${vt}`)
            );
            if (matches) {
                tabsToClose.push(tab);
            }
        }
    }

    if (tabsToClose.length > 0) {
        await vscode.window.tabGroups.close(tabsToClose);
    }
}
