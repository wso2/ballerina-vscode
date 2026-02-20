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

import * as os from 'os';
import { NodePosition } from "@wso2/syntax-tree";
import { StateMachine } from "../../stateMachine";
import { Position, Progress, Range, Uri, ViewColumn, window, workspace, WorkspaceEdit } from "vscode";
import { PROJECT_KIND, ProjectInfo, TextEdit, WorkspaceTypeResponse } from "@wso2/ballerina-core";
import axios from 'axios';
import fs from 'fs';
import * as path from 'path';

import {
    checkIsBallerinaPackage,
    checkIsBallerinaWorkspace,
    getBallerinaPackages,
    hasMultipleBallerinaPackages
} from '../../utils';
import { readOrWriteReadmeContent, resolveReadmePath } from '../bi-diagram/utils';
import { README_FILE } from '../../utils/bi';

export const BALLERINA_INTEGRATOR_ISSUES_URL = "https://github.com/wso2/product-ballerina-integrator/issues";

interface ProgressMessage {
    message: string;
    increment?: number;
}

export function getUpdatedSource(
    statement: string,
    currentFileContent: string,
    targetPosition: NodePosition,
    skipSemiColon?: boolean,
): string {
    const updatedStatement = skipSemiColon ? statement : statement.trim().endsWith(";") ? statement : statement + ";";
    const updatedContent: string = addToTargetPosition(currentFileContent, targetPosition, updatedStatement,);
    return updatedContent;
}

export function addToTargetPosition(currentContent: string, position: NodePosition, codeSnippet: string): string {

    const splitContent: string[] = currentContent.split(/\n/g) || [];
    const splitCodeSnippet: string[] = codeSnippet.trimEnd().split(/\n/g) || [];
    const noOfLines: number = position.endLine - position.startLine + 1;
    const startLine = splitContent[position.startLine].slice(0, position.startColumn);
    const endLine = isFinite(position?.endLine) ?
        splitContent[position.endLine].slice(position.endColumn || position.startColumn) : '';

    const replacements = splitCodeSnippet.map((line, index) => {
        let modifiedLine = line;
        if (index === 0) {
            modifiedLine = startLine + modifiedLine;
        }
        if (index === splitCodeSnippet.length - 1) {
            modifiedLine = modifiedLine + endLine;
        }
        if (index > 0) {
            modifiedLine = " ".repeat(position.startColumn) + modifiedLine;
        }
        return modifiedLine;
    });

    splitContent.splice(position.startLine, noOfLines, ...replacements);

    return splitContent.join('\n');
}

export async function askProjectPath() {
    return await window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: Uri.file(os.homedir()),
        title: "Select a folder"
    });
}

export async function askFilePath() {
    return await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: Uri.file(StateMachine.context().projectPath  ?? os.homedir()),
        filters: {
            'Files': ['yaml', 'json', 'yml', 'graphql', 'wsdl']
        },
        title: "Select a file",
    });
}

export async function askFileOrFolderPath() {
    return await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: Uri.file(os.homedir()),
        title: "Select a file or folder"
    });
}

export async function applyBallerinaTomlEdit(tomlPath: Uri, textEdit: TextEdit) {
    const workspaceEdit = new WorkspaceEdit();

    const range = new Range(new Position(textEdit.range.start.line, textEdit.range.start.character),
        new Position(textEdit.range.end.line, textEdit.range.end.character));

    // Create the position and range
    workspaceEdit.replace(tomlPath, range, textEdit.newText);

    // Apply the edit
    workspace.applyEdit(workspaceEdit).then(success => {
        if (success) {
        } else {
        }
    });
}

export async function selectSampleDownloadPath(): Promise<string> {
    const folderPath = await window.showOpenDialog({ title: 'Sample download directory', canSelectFolders: true, canSelectFiles: false, openLabel: 'Select Folder' });
    if (folderPath && folderPath.length > 0) {
        const newlySelectedFolder = folderPath[0].fsPath;
        return newlySelectedFolder;
    }
    return "";
}

async function downloadFile(url: string, filePath: string, progressCallback?: (downloadProgress: any) => void) {
    const writer = fs.createWriteStream(filePath);
    let totalBytes = 0;
    try {
        const response = await axios.get(url, {
            responseType: 'stream',
            headers: {
                "User-Agent": "axios"
            },
            onDownloadProgress: (progressEvent) => {
                totalBytes = progressEvent.total ?? 0;
                if (totalBytes === 0) {
                    // Cannot calculate progress without total size
                    return;
                }
                const formatSize = (sizeInBytes: number) => {
                    const sizeInKB = sizeInBytes / 1024;
                    if (sizeInKB < 1024) {
                        return `${Math.floor(sizeInKB)} KB`;
                    } else {
                        return `${Math.floor(sizeInKB / 1024)} MB`;
                    }
                };
                const progress = {
                    percentage: Math.round((progressEvent.loaded * 100) / totalBytes),
                    downloadedAmount: formatSize(progressEvent.loaded),
                    downloadSize: formatSize(totalBytes)
                };
                if (progressCallback) {
                    progressCallback(progress);
                }
            }
        });
        response.data.pipe(writer);
        await new Promise<void>((resolve, reject) => {
            writer.on('finish', () => {
                writer.close();
                resolve();
            });

            writer.on('error', (error) => {
                reject(error);
            });
        });
    } catch (error) {
        window.showErrorMessage(`Error while downloading the file: ${error}`);
        throw error;
    }
}

export async function handleDownloadFile(rawFileLink: string, defaultDownloadsPath: string, progress: Progress<ProgressMessage>) {
    const handleProgress = (progressPercentage) => {
        progress.report({ message: "Downloading file...", increment: progressPercentage });
    };
    try {
        await downloadFile(rawFileLink, defaultDownloadsPath, handleProgress);
    } catch (error) {
        window.showErrorMessage(`Failed to download file: ${error}`);
    }
    progress.report({ message: "Download finished" });
}

export function findWorkspaceTypeFromProjectInfo(projectInfo: ProjectInfo): WorkspaceTypeResponse {
    const projectType = projectInfo.projectKind;
    switch (projectType) {
        case PROJECT_KIND.WORKSPACE_PROJECT:
            return { type: "BALLERINA_WORKSPACE" };
        case PROJECT_KIND.BUILD_PROJECT:
            return { type: "SINGLE_PROJECT" };
        default:
            return { type: "UNKNOWN" };
    }
}

export async function findWorkspaceTypeFromWorkspaceFolders(): Promise<WorkspaceTypeResponse> {
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders) {
        throw new Error("No workspaces found.");
    }

    if (workspaceFolders.length > 1) {
        let balPackagesCount = 0;
        for (const folder of workspaceFolders) {
            const packages = await getBallerinaPackages(folder.uri);
            balPackagesCount += packages.length;
        }

        const isWorkspaceFile = workspace.workspaceFile?.scheme === "file";
        if (balPackagesCount > 1) {
            return isWorkspaceFile
                ? { type: "VSCODE_WORKSPACE" }
                : { type: "MULTIPLE_PROJECTS" };
        }
    } else if (workspaceFolders.length === 1) {
        const workspaceFolderPath = workspaceFolders[0].uri.fsPath;

        const isBallerinaWorkspace = await checkIsBallerinaWorkspace(Uri.file(workspaceFolderPath));
        if (isBallerinaWorkspace) {
            return { type: "BALLERINA_WORKSPACE" };
        }

        const isBallerinaPackage = await checkIsBallerinaPackage(Uri.file(workspaceFolderPath));
        if (isBallerinaPackage) {
            return { type: "SINGLE_PROJECT" };
        }

        const hasMultiplePackages = await hasMultipleBallerinaPackages(Uri.file(workspaceFolderPath));
        if (hasMultiplePackages) {
            return { type: "MULTIPLE_PROJECTS" };
        }

        return { type: "UNKNOWN" };
    }

    return { type: "UNKNOWN" };
}

export function getTargetProjectForPublish(): {
    projectPath: string;
    projectName: string;
    artifactType: string;
} | null {
    const { projectPath, projectStructure } = StateMachine.context();
    const target = projectStructure?.projects.find((p) => p.projectPath === projectPath);
    if (!target) {
        return null;
    }
    const projectName = target.projectTitle || target.projectName;
    const artifactType = target.isLibrary ? 'library' : 'integration';
    return { projectPath, projectName, artifactType };
}

export async function getReadmeStatus(projectPath: string): Promise<'missing' | 'empty' | 'ready'> {
    if (!isReadmeExists(projectPath)) {
        return 'missing';
    }
    const { content } = await readOrWriteReadmeContent({ projectPath, read: true });
    return content === '' ? 'empty' : 'ready';
}

export function getPublishConfirmation(
    projectName: string,
    artifactType: string,
    readmeStatus: 'missing' | 'empty' | 'ready'
): { message: string; primaryButton: string } {
    if (readmeStatus === 'missing') {
        return {
            message: `"${projectName}" requires a README.md before it can be published to Ballerina Central. Please try again after creating the README.md file.`,
            primaryButton: 'Create README'
        };
    }
    if (readmeStatus === 'empty') {
        return {
            message: `"${projectName}" contains an empty README.md file. Please enter a description for your ${artifactType} and try again.`,
            primaryButton: 'Edit README'
        };
    }
    return {
        message: `Publish "${projectName}" to Ballerina Central? Your ${artifactType} will be made available to the Ballerina community.`,
        primaryButton: 'Publish to Central'
    };
}


export async function handleReadmeSetup(
    readmeStatus: 'missing' | 'empty' | 'ready',
    projectPath: string,
    projectName: string,
    artifactType: string
): Promise<boolean> {
    if (readmeStatus === 'missing') {
        const content = `# ${projectName} ${artifactType}\n\nAdd your ${artifactType} description here.`;
        await readOrWriteReadmeContent({ projectPath, content, read: false });
        openReadmeInEditor(projectPath);
        return true;
    }
    if (readmeStatus === 'empty') {
        openReadmeInEditor(projectPath);
        return true;
    }
    return false;
}

function openReadmeInEditor(projectPath: string): void {
    const readmePath = resolveReadmePath(projectPath) ?? path.join(projectPath, README_FILE);
    workspace.openTextDocument(readmePath).then((doc) => {
        window.showTextDocument(doc, ViewColumn.Beside);
    });
}

export function getFirstBalaPath(projectPath: string): string | null {
    const balaDirPath = path.join(projectPath, 'target', 'bala');
    if (!fs.existsSync(balaDirPath)) {
        return null;
    }
    const files = fs.readdirSync(balaDirPath);
    return files.length > 0 ? path.join(balaDirPath, files[0]) : null;
}

export function isReadmeExists(projectPath: string): boolean {
    const existingReadmePath = resolveReadmePath(projectPath);
    return existingReadmePath !== undefined;
}
