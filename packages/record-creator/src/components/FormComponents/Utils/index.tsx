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
import React from "react";

import { NodePosition } from "@wso2/syntax-tree";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";
import { DiagnosticData, DiagnosticsResponse } from "@wso2/ballerina-core";
import { Codicon, Tooltip, Typography } from "@wso2/ui-toolkit";
import * as monaco from "monaco-editor";
import { VERSION } from "../../../types";

export const FILE_SCHEME = "file://";
export const EXPR_SCHEME = "expr://";

export function getUpdatedSource(
    statement: string,
    currentFileContent: string,
    targetPosition: NodePosition,
    moduleList?: Set<string>,
    skipSemiColon?: boolean
): string {
    const updatedStatement = skipSemiColon ? statement : statement.trim().endsWith(";") ? statement : statement + ";";
    return addToTargetPosition(currentFileContent, targetPosition, updatedStatement);
}

function addToTargetPosition(currentContent: string, position: NodePosition, codeSnippet: string): string {
    const splitContent: string[] = currentContent.split(/\n/g) || [];
    const splitCodeSnippet: string[] = codeSnippet.trimEnd().split(/\n/g) || [];
    const noOfLines: number = position.endLine - position.startLine + 1;
    const startLine = splitContent[position.startLine].slice(0, position.startColumn);
    const endLine = isFinite(position?.endLine)
        ? splitContent[position.endLine].slice(position.endColumn || position.startColumn)
        : "";

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

    return splitContent.join("\n");
}

export async function checkDiagnostics(
    path: string,
    updatedContent: string,
    langServerRpcClient: LangClientRpcClient
): Promise<DiagnosticData[]> {
    const fileURI = monaco.Uri.file(path).toString().replace(FILE_SCHEME, EXPR_SCHEME);
    await sendDidChange(fileURI, updatedContent, langServerRpcClient);
    return handleDiagnostics(fileURI, langServerRpcClient);
}

async function getDiagnostics(docUri: string, langServerRpcClient: LangClientRpcClient): Promise<DiagnosticsResponse> {
    const diagnostics = await langServerRpcClient.getDiagnostics({
        documentIdentifier: {
            uri: docUri,
        },
    });

    return diagnostics;
}

const handleDiagnostics = async (
    fileURI: string,
    langServerRpcClient: LangClientRpcClient
): Promise<DiagnosticData[]> => {
    const diagResp = await getDiagnostics(fileURI, langServerRpcClient);
    const diag = diagResp?.diagnostics ? diagResp.diagnostics : [];
    return diag;
};

async function sendDidChange(docUri: string, content: string, langServerRpcClient: LangClientRpcClient) {
    langServerRpcClient.didChange({
        contentChanges: [
            {
                text: content,
            },
        ],
        textDocument: {
            uri: docUri,
            version: 1,
        },
    });
}

/**
 * Creates a version object for comparison.
 * 
 * @param major Major version number
 * @param minor Minor version number  
 * @param patch Patch version number
 * @returns A version object with major, minor, and patch components
 * 
 * @example
 * // Version 2201.1.30
 * createVersionNumber(2201, 1, 30)
 * // Version 2201.12.10
 * createVersionNumber(2201, 12, 10)
 */
export function createVersionNumber(major: number, minor: number, patch: number): { major: number; minor: number; patch: number } {
    return { major, minor, patch };
}

/**
 * Compares two versions using semantic versioning rules.
 * Returns true if current version >= minimum version.
 * 
 * @param current Current version components
 * @param minimum Minimum required version components
 * @returns true if current >= minimum
 */
function compareVersions(
    current: { major: number; minor: number; patch: number },
    minimum: { major: number; minor: number; patch: number }
): boolean {
    // Compare major version first
    if (current.major !== minimum.major) {
        return current.major > minimum.major;
    }
    
    // Major versions are equal, compare minor
    if (current.minor !== minimum.minor) {
        return current.minor > minimum.minor;
    }
    
    // Major and minor are equal, compare patch
    return current.patch >= minimum.patch;
}

/**
 * Compares the current Ballerina version against a minimum required version.
 * Only returns true for GA (non-preview/alpha/beta) versions that meet or exceed the minimum.
 * 
 * @param balVersion The current Ballerina version string
 * @param minSupportedVersion Minimum version (use createVersionNumber helper to generate)
 * @returns true if current version is GA and meets minimum requirement
 * 
 * @example
 * // Check if version is at least 2201.1.30
 * isSupportedSLVersion("2201.1.30", createVersionNumber(2201, 1, 30))
 */
export function isSupportedSLVersion(
    balVersion: string,
    minSupportedVersion: { major: number; minor: number; patch: number }
) {
    const ballerinaVersion: string = balVersion.toLocaleLowerCase();
    const isGA: boolean =
        !ballerinaVersion.includes(VERSION.ALPHA) &&
        !ballerinaVersion.includes(VERSION.BETA) &&
        !ballerinaVersion.includes(VERSION.PREVIEW);

    if (!isGA) {
        return false;
    }

    // Parse current version
    const regex = /(\d+)\.(\d+)\.(\d+)/;
    const match = ballerinaVersion.match(regex);
    if (!match) {
        return false;
    }

    const currentVersion = {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3])
    };

    // Compare versions component by component
    return compareVersions(currentVersion, minSupportedVersion);
}

export function getTooltipIconComponent(title: string): React.ReactNode {
    return (
        <Tooltip content={<Typography variant="body1">{title}</Typography>} position="bottom-end">
            <Codicon name="info" />
        </Tooltip>
    );
}
