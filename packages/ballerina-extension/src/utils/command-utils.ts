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

import { window } from "vscode";
import { MACHINE_VIEW, ProjectInfo } from "@wso2/ballerina-core";
import { MESSAGES } from "../features/project";

export function requiresPackageSelection(
    workspacePath: string | undefined,
    view: MACHINE_VIEW | undefined,
    projectPath: string | undefined,
    isWebviewOpen: boolean,
    hasActiveTextEditor: boolean
): boolean {
    return !!(
        workspacePath &&
        (view === MACHINE_VIEW.WorkspaceOverview || !projectPath || !isWebviewOpen) &&
        !hasActiveTextEditor
    );
}

async function promptPackageSelection(
    availablePackages: string[],
    placeHolder?: string
): Promise<string | undefined> {
    return window.showQuickPick(availablePackages, {
        placeHolder: placeHolder || "Select a package",
        ignoreFocusOut: false
    });
}

export async function selectPackageOrPrompt(
    availablePackages: string[],
    placeHolder?: string
): Promise<string | undefined> {
    if (availablePackages.length === 0) {
        window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
        return;
    }
    if (availablePackages.length === 1) {
        return availablePackages[0];
    }
    return await promptPackageSelection(availablePackages, placeHolder);
}

export function needsProjectDiscovery(
    projectInfo: ProjectInfo,
    projectRoot: string | undefined,
    projectPath: string | undefined
): boolean {
    return !projectInfo || (!!projectRoot && projectPath !== projectRoot);
}
