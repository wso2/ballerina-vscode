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
import { isSupportedVersion, VERSION } from "./config";
import { BallerinaProject } from "@wso2/ballerina-core";
import { readFileSync } from 'fs';
import { dirname, sep } from 'path';
import { parseTomlToConfig } from '../features/config-generator/utils';

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

function getCurrentBallerinaProject(file?: string): Promise<BallerinaProject> {
    return new Promise((resolve, reject) => {
        const activeEditor = window.activeTextEditor;
        // get path of the current bal file
        const uri = file ? Uri.file(file) : activeEditor.document.uri;
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

export { addToWorkspace, getCurrentBallerinaProject, getCurrentBallerinaFile, getCurrenDirectoryPath, selectBallerinaProjectForDebugging };
