/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { Diagnostic } from "vscode-languageserver-types";
import { Completion } from "../../interfaces/extended-lang-client";
import { NodePosition } from "@wso2/syntax-tree";

export interface TypeResponse {
    data: Completion[];
}

export interface GoToSourceRequest {
    position: NodePosition;
    filePath?: string
    fileName?: string
}

export interface WorkspaceFileRequest {
    glob?: string;
}

export interface File {
    relativePath: string;
    path: string;
}

export interface WorkspaceRootResponse {
    path: string;
}

export interface WorkspacesFileResponse {
    workspaceRoot: string;
    files: File[];
}
export interface BallerinaDiagnosticsRequest {
    ballerinaSource: string;
    targetPosition: NodePosition;
    skipSemiColon?: boolean;
    checkSeverity?: 1 | 2 | 3
}
export interface BallerinaDiagnosticsResponse {
    diagnostics: Diagnostic[];
}

export interface CommandsRequest {
    commands: any[];
}

export interface RunExternalCommandRequest {
    command: string;
}

export interface OpenExternalUrlRequest {
    url: string;
}

export interface RunExternalCommandResponse {
    error: boolean,
    message: string
}


export interface CommandsResponse {
    data: string;
}

export interface FileOrDirResponse {
    path: string;
}
export interface FileOrDirRequest {
    isFile?: boolean;
}

export interface ShowErrorMessageRequest {
    message: string;
}
