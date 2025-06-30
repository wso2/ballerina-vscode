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

import { SCOPE } from '@wso2/ballerina-core';
import { BallerinaExtension } from '../core';
import { WorkspaceConfiguration, workspace, Uri } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export enum VERSION {
    BETA = 'beta',
    ALPHA = 'alpha',
    PREVIEW = 'preview'
}

export const AGENTS_FILE = "agents.bal";
export const AUTOMATION_FILE = "automation.bal";
export const CONFIG_FILE = "config.bal";
export const CONNECTIONS_FILE = "connections.bal";
export const DATA_MAPPING_FILE = "data_mappings.bal";
export const FUNCTIONS_FILE = "functions.bal";
export const MAIN_FILE = "main.bal";
export const TYPES_FILE = "types.bal";

export const BI_PROJECT_FILES = [
    AGENTS_FILE,
    AUTOMATION_FILE,
    CONFIG_FILE,
    CONNECTIONS_FILE,
    DATA_MAPPING_FILE,
    FUNCTIONS_FILE,
    MAIN_FILE,
    TYPES_FILE
];

interface BallerinaPluginConfig extends WorkspaceConfiguration {
    home?: string;
    debugLog?: boolean;
    classpath?: string;
}

export function getPluginConfig(): BallerinaPluginConfig {
    return workspace.getConfiguration('ballerina');
}

export function isWindows(): boolean {
    return process.platform === "win32";
}

export function isSupportedVersion(ballerinaExtInstance: BallerinaExtension, supportedRelease: VERSION,
    supportedVersion: number): boolean {
    const ballerinaVersion: string = ballerinaExtInstance.ballerinaVersion.toLocaleLowerCase();
    const isPreview: boolean = ballerinaVersion.includes(VERSION.PREVIEW);
    const isAlpha: boolean = ballerinaVersion.includes(VERSION.ALPHA);
    if ((supportedRelease == VERSION.BETA && (isAlpha || isPreview)) || (supportedRelease == VERSION.ALPHA &&
        isPreview)) {
        return false;
    }

    const isBeta: boolean = ballerinaVersion.includes(VERSION.BETA);
    if ((!isAlpha && !isBeta && !isPreview) || (supportedRelease == VERSION.ALPHA && isBeta)) {
        return true;
    }

    if ((supportedRelease == VERSION.ALPHA && isAlpha) || (supportedRelease == VERSION.BETA && isBeta)) {
        const digits = ballerinaVersion.replace(/[^0-9]/g, "");
        const versionNumber = +digits;
        if (supportedVersion <= versionNumber) {
            return true;
        }
    }
    return false;
}

export function isSupportedSLVersion(ballerinaExtInstance: BallerinaExtension, minSupportedVersion: number) {
    const ballerinaVersion: string = ballerinaExtInstance.ballerinaVersion.toLocaleLowerCase();
    const isGA: boolean = !ballerinaVersion.includes(VERSION.ALPHA) && !ballerinaVersion.includes(VERSION.BETA) && !ballerinaVersion.includes(VERSION.PREVIEW);

    const regex = /(\d+)\.(\d+)\.(\d+)/;
    const match = ballerinaVersion.match(regex);
    const currentVersionNumber = match ? Number(match.slice(1).join("")) : 0;

    if (minSupportedVersion <= currentVersionNumber && isGA) {
        return true;
    }
    return false;
}

export function checkIsBI(uri: Uri): boolean {
    const config = workspace.getConfiguration('ballerina', uri);
    const inspected = config.inspect<boolean>('isBI');

    if (inspected) {
        const valuesToCheck = [
            inspected.workspaceFolderValue,
            inspected.workspaceValue,
            inspected.globalValue
        ];
        return valuesToCheck.find(value => value === true) !== undefined; // Return true if isBI is set to true
    }
    return false; // Return false if isBI is not set
}

export function checkIsBallerina(uri: Uri): boolean {
    const ballerinaTomlPath = path.join(uri.fsPath, 'Ballerina.toml');
    return fs.existsSync(ballerinaTomlPath);
}

export function getOrgPackageName(projectPath: string): { orgName: string, packageName: string } {
    const ballerinaTomlPath = path.join(projectPath, 'Ballerina.toml');
    
    // Regular expressions for Ballerina.toml parsing
    const ORG_REGEX = /\[package\][\s\S]*?org\s*=\s*["']([^"']*)["']/;
    const NAME_REGEX = /\[package\][\s\S]*?name\s*=\s*["']([^"']*)["']/;

    if (!fs.existsSync(ballerinaTomlPath)) {
        return {orgName: '', packageName: ''};
    }
    
    try {
        const tomlContent = fs.readFileSync(ballerinaTomlPath, 'utf8');
        
        // Extract org name and package name
        const orgName = tomlContent.match(ORG_REGEX)?.[1] || '';
        const packageName = tomlContent.match(NAME_REGEX)?.[1] || '';
        
        return {orgName, packageName};
    } catch (error) {
        console.error(`Error reading Ballerina.toml: ${error}`);
        return {orgName: '', packageName: ''};
    }
}

export function fetchScope(uri: Uri): SCOPE {
    const config = workspace.getConfiguration('ballerina', uri);
    const inspected = config.inspect<SCOPE>('scope');

    if (inspected) {
        const valuesToCheck = [
            inspected.workspaceFolderValue,
            inspected.workspaceValue,
            inspected.globalValue
        ];
        const scope = valuesToCheck.find(value => value !== undefined) as SCOPE;
        if (scope) {
            // Create BI files if the scope is set
            setupBIFiles(uri.fsPath);
        }
        return scope;
    }
}

export function setupBIFiles(projectDir: string): void {
    BI_PROJECT_FILES.forEach(file => {
        const filePath = path.join(projectDir, file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '');
        }
    });
}
