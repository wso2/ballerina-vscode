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

import { commands, TestItem, window } from "vscode";
import { openView, StateMachine, history } from "../../stateMachine";
import { BI_COMMANDS, EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";
import { isTestFunctionItem } from "./discover";
import path from "path";
import { promises as fs } from 'fs';
import { needsProjectDiscovery, requiresPackageSelection, selectPackageOrPrompt } from "../../utils/command-utils";
import { VisualizerWebview } from "../../views/visualizer/webview";
import { getCurrentProjectRoot, tryGetCurrentBallerinaFile } from "../../utils/project-utils";
import { findBallerinaPackageRoot } from "../../utils";
import { MESSAGES } from "../project";
import { findWorkspaceTypeFromWorkspaceFolders } from "../../rpc-managers/common/utils";

export function activateEditBiTest() {
    // register run project tests handler
    commands.registerCommand(BI_COMMANDS.BI_EDIT_TEST_FUNCTION, async (entry: TestItem) => {
        const projectPath = await findProjectPath(entry.uri?.fsPath);

        if (!projectPath) {
            window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
            return;
        }

        if (!isTestFunctionItem(entry)) {
            return;
        }

        const fileName = entry.id.split(":")[1];
        const fileUri = path.resolve(projectPath, `tests`, fileName);
        if (fileUri) {
            const range = entry.range;
            openView(EVENT_TYPE.OPEN_VIEW, { documentUri: fileUri, 
                position: { startLine: range.start.line, startColumn: range.start.character, 
                    endLine: range.end.line, endColumn: range.end.character } });
            history.clear();
        }        
    });

    commands.registerCommand(BI_COMMANDS.BI_ADD_TEST_FUNCTION, async (entry?: TestItem) => {
        const projectPath = await findProjectPath(entry?.uri?.fsPath);

        if (!projectPath) {
            window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
            return;
        }

        const fileUri = path.resolve(projectPath, `tests`, `tests.bal`);
        ensureFileExists(fileUri);
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BITestFunctionForm, 
            documentUri: fileUri, identifier: '', serviceType: 'ADD_NEW_TEST' });
    });

    commands.registerCommand(BI_COMMANDS.BI_EDIT_TEST_FUNCTION_DEF, async (entry: TestItem) => {
        const projectPath = await findProjectPath(entry.uri?.fsPath);

        if (!projectPath) {
            window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
            return;
        }

        if (!isTestFunctionItem(entry)) {
            return;
        }

        const fileName = entry.id.split(":")[1];
        const fileUri = path.resolve(projectPath, `tests`, fileName);
        if (fileUri) {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BITestFunctionForm, 
                documentUri: fileUri, identifier: entry.label, serviceType: 'UPDATE_TEST' });
        }
    });
}

async function ensureFileExists(filePath: string) {
  try {
    await fs.access(filePath);
  } catch {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    await fs.writeFile(filePath, '', 'utf8');
    console.log('File created:', filePath);
  }
}

async function findProjectPath(filePath?: string): Promise<string | undefined> {
    const { projectInfo, projectPath, view, workspacePath } = StateMachine.context();

    // 1. Try resolving from provided file path
    if (filePath) {
        const projectRoot = await findBallerinaPackageRoot(filePath);
        if (projectRoot) {
            if (!projectPath || projectRoot !== projectPath) {
                await StateMachine.updateProjectRootAndInfo(projectRoot, projectInfo);
            }
            return projectRoot;
        }
    }

    // 2. Try package selection if needed
    const isWebviewOpen = VisualizerWebview.currentPanel !== undefined;
    const hasActiveTextEditor = !!window.activeTextEditor;

    if (requiresPackageSelection(workspacePath, view, projectPath, isWebviewOpen, hasActiveTextEditor)) {
        const availablePackages = projectInfo?.children.map((child: any) => child.projectPath) ?? [];
        const selectedPackage = await selectPackageOrPrompt(availablePackages);
        if (selectedPackage) {
            await StateMachine.updateProjectRootAndInfo(selectedPackage, projectInfo);
            return selectedPackage;
        }
        return undefined;
    }

    // 3. Try project discovery if needed
    const currentBallerinaFile = tryGetCurrentBallerinaFile();
    const projectRoot = await findBallerinaPackageRoot(currentBallerinaFile);

    if (needsProjectDiscovery(projectInfo, projectRoot, projectPath)) {
        try {
            const packageRoot = await getCurrentProjectRoot();
            if (!packageRoot) {
                return undefined;
            }

            // Test explorer only supports build-projects and workspace-projects.
            // Single-file projects don't require discovery, so we only proceed for workspaces.
            if (!!workspacePath) {
                await StateMachine.updateProjectRootAndInfo(packageRoot, projectInfo);
                return packageRoot;
            }
        } catch {
            window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
        }
        return undefined;
    }

    return projectPath;
}
