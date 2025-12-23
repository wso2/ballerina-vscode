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

import { extension } from "../BalExtensionContext";
import { Uri, window, workspace, RelativePattern, WorkspaceFolder } from "vscode";
import * as path from 'path';
import { checkIsBallerinaPackage, isSupportedVersion, VERSION } from "./config";
import { BallerinaProject } from "@wso2/ballerina-core";
import { readFileSync } from 'fs';
import { dirname, sep } from 'path';
import { parseTomlToConfig } from '../features/config-generator/utils';
import { PROJECT_TYPE } from "../features/project";
import { StateMachine } from "../stateMachine";
import { VisualizerWebview } from "../views/visualizer/webview";
import { findBallerinaPackageRoot } from "./file-utils";
import { needsProjectDiscovery, requiresPackageSelection, selectPackageOrPrompt } from "./command-utils";
import { findWorkspaceTypeFromWorkspaceFolders } from "../rpc-managers/common/utils";

const BALLERINA_TOML_REGEX = `**${sep}Ballerina.toml`;
const BALLERINA_FILE_REGEX = `**${sep}*.bal`;

export interface BALLERINA_TOML {
    package: PACKAGE;
    "build-options": any;
}

export interface PACKAGE {
    org: string;
    name: string;
    version: string;
    distribution: string;
}

function getCurrentBallerinaProject(projectPath?: string): Promise<BallerinaProject> {
    return new Promise((resolve, reject) => {
        const activeEditor = window.activeTextEditor;
        // get path of the current bal file
        const uri = projectPath ? Uri.file(projectPath) : activeEditor.document.uri;
        // if currently opened file is a bal file
        if (extension.ballerinaExtInstance.langClient && isSupportedVersion(extension.ballerinaExtInstance, VERSION.BETA, 1)) {
            // get Ballerina Project path for current Ballerina file
            extension.ballerinaExtInstance.langClient.getBallerinaProject({
                documentIdentifier: {
                    uri: uri.toString(),
                }
            }).then((response) => {
                const project = response as BallerinaProject;
                if (!project.kind) {
                    reject(`Current file does not belong to a ballerina project.`);
                }
                resolve(project);
            }, _error => {
                reject("Language Client did not return a project");
            });
        } else {
            reject("Language Client is not available.");
        }
    });
}

function getCurrentBallerinaFile(): string {
    const activeEditor = window.activeTextEditor;
    if (activeEditor && activeEditor.document.fileName.endsWith('.bal')) {
        return activeEditor.document.fileName;
    }
    const document = extension.ballerinaExtInstance.getDocumentContext().getLatestDocument();
    if (document) {
        return document.toString();
    }
    for (let editor of window.visibleTextEditors) {
        if (editor.document.fileName.endsWith('.bal')) {
            return editor.document.fileName;
        }
    }
    throw new Error("Current file is not a Ballerina file");
}

function getCurrenDirectoryPath(): string {
    const activeEditor = window.activeTextEditor;
    if (activeEditor) {
        return path.dirname(activeEditor.document.fileName);
    }
    throw new Error("There is no active editor");
}

function addToWorkspace(url: string) {
    workspace.updateWorkspaceFolders(workspace.workspaceFolders ? workspace.workspaceFolders.length : 0, null, { uri: Uri.parse(url) });
}

async function selectBallerinaProjectForDebugging(workspaceFolder?: WorkspaceFolder): Promise<string> {
    const tomls = await workspace.findFiles(workspaceFolder ? new RelativePattern(workspaceFolder, BALLERINA_TOML_REGEX) : BALLERINA_TOML_REGEX);
    const projects: { project: BallerinaProject; balFile: Uri; relativePath: string }[] = [];

    for (const toml of tomls) {
        const projectRoot = dirname(toml.fsPath);
        const balFiles = await workspace.findFiles(new RelativePattern(projectRoot, BALLERINA_FILE_REGEX), undefined, 1);
        if (balFiles.length > 0) {
            const tomlContent: string = readFileSync(toml.fsPath, 'utf8');
            const tomlObj: BALLERINA_TOML = parseTomlToConfig(tomlContent) as BALLERINA_TOML;
            const relativePath = workspace.asRelativePath(projectRoot);
            // Add only if package name is present in Ballerina.toml (this is to exclude workspace projects)
            if (tomlObj.package && tomlObj.package.name) {
                projects.push({ project: { packageName: tomlObj.package.name }, balFile: balFiles[0], relativePath });
            }
        }
    }

    if (projects.length === 1) {
        return projects[0].balFile.fsPath;
    } else if (projects.length > 1) {
        const selectedProject = await window.showQuickPick(projects.map((project) => {
            return {
                label: project.project.packageName,
                description: project.relativePath
            };
        }), { placeHolder: "Detected multiple Ballerina projects within the workspace. Select one to debug.", canPickMany: false });

        if (selectedProject) {
            const foundProject = projects.find((project) => project.project.packageName === selectedProject.label);
            if (foundProject) {
                return foundProject.balFile.fsPath;
            }
        }
        throw new Error("Project selection cancelled");
    } else {
        extension.ballerinaExtInstance.showMessageInvalidProject();
        throw new Error("No valid Ballerina projects found");
    }
}


/**
 * Determines and returns the current project root directory.
 * 
 * Resolution order:
 * 1. State machine context (when working within a webview)
 * 2. Open Ballerina file's project root
 * 3. Workspace root (if it's a valid Ballerina package)
 * 
 * @returns The current project root path
 * @throws Error if unable to determine a valid Ballerina project root
 */
async function getCurrentProjectRoot(): Promise<string> {
    const currentFilePath = tryGetCurrentBallerinaFile();
    const contextProjectRoot = StateMachine.context()?.projectPath;

    // Use state machine context only when not in a regular text editor (e.g., within a webview)
    if (contextProjectRoot && !currentFilePath) {
        return contextProjectRoot;
    }

    // Resolve project root from the currently open Ballerina file
    if (currentFilePath) {
        const projectRoot = await resolveProjectRootFromFile(currentFilePath);
        if (projectRoot) {
            return projectRoot;
        }
    }

    // Fallback to workspace root if it's a valid Ballerina package
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        throw new Error("Unable to determine the current workspace root.");
    }

    if (await checkIsBallerinaPackage(Uri.file(workspaceRoot))) {
        return workspaceRoot;
    }

    throw new Error(`No valid Ballerina project found`);
}

/**
 * Safely attempts to get the current Ballerina file without throwing errors.
 * @returns The current Ballerina file path or undefined if not available
 */
export function tryGetCurrentBallerinaFile(): string | undefined {
    try {
        return getCurrentBallerinaFile();
    } catch {
        return undefined;
    }
}

/**
 * Resolves the project root from the given Ballerina file.
 * @param filePath The Ballerina file path
 * @returns The project root path or undefined if unable to resolve
 */
async function resolveProjectRootFromFile(filePath: string): Promise<string | undefined> {
    try {
        const project = await getCurrentBallerinaProject(filePath);
        
        if (project.kind === PROJECT_TYPE.SINGLE_FILE) {
            return filePath;
        }
        
        return project.path;
    } catch {
        return undefined;
    }
}

/**
 * Gets the workspace root directory.
 * @returns The workspace root path or undefined if not available
 */
function getWorkspaceRoot(): string | undefined {
    return workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Resolves the project path based on the current context and updates the state machine accordingly.
 * @param promptMessage - The message to display when prompting for package selection
 * @returns The resolved project path or undefined if no project path is available
 */
async function resolveProjectPath(promptMessage?: string): Promise<string | undefined> {
    const { workspacePath, view: webviewType, projectPath, projectInfo } = StateMachine.context();
    const isWebviewOpen = VisualizerWebview.currentPanel !== undefined;
    const hasActiveTextEditor = !!window.activeTextEditor;
    const currentBallerinaFile = tryGetCurrentBallerinaFile();
    const projectRoot = await findBallerinaPackageRoot(currentBallerinaFile);

    let targetPath = projectPath ?? "";

    if (requiresPackageSelection(workspacePath, webviewType, projectPath, isWebviewOpen, hasActiveTextEditor)) {
        const availablePackages = projectInfo?.children.map((child: any) => child.projectPath) ?? [];
        const selectedPackage = await selectPackageOrPrompt(availablePackages, promptMessage);
        if (!selectedPackage) {
            return undefined;
        }
        targetPath = selectedPackage;
        await StateMachine.updateProjectRootAndInfo(selectedPackage, projectInfo);
    } else if (needsProjectDiscovery(projectInfo, projectRoot, projectPath)) {
        try {
            const workspaceType = await findWorkspaceTypeFromWorkspaceFolders();
            const packageRoot = await getCurrentProjectRoot();
        
            if (!packageRoot) {
                return undefined;
            }
        
            if (workspaceType.type === "MULTIPLE_PROJECTS") {
                const projectInfo = await StateMachine.langClient().getProjectInfo({ projectPath: packageRoot });
                await StateMachine.updateProjectRootAndInfo(packageRoot, projectInfo);
                return packageRoot;
            }
        
            if (workspaceType.type === "BALLERINA_WORKSPACE") {
                await StateMachine.updateProjectRootAndInfo(packageRoot, projectInfo);
                return packageRoot;
            }
        
            return packageRoot;
        } catch {
            return undefined;
        }
    }

    return targetPath;
}

export {
    addToWorkspace,
    getCurrentBallerinaProject,
    getCurrentBallerinaFile,
    getCurrenDirectoryPath,
    selectBallerinaProjectForDebugging,
    getCurrentProjectRoot,
    getWorkspaceRoot,
    resolveProjectPath
};
