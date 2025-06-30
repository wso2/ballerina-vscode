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

import vscode from 'vscode';

export interface BallerinaPluginConfig extends vscode.WorkspaceConfiguration {
    home?: string;
    debugLog?: boolean;
    classpath?: string;
}

export interface ResultItem {
    id: string;
    fileName: string;
    codeFileName: string;
    startRowforImplementationChangedAction: number;
    endRowforImplementationChangedAction: number;
    startRowforDocChangedAction: number;
    endRowforDocChangedAction: number;
    implementationChangeSolution: string;
    docChangeSolution: string;
    cause: string;
}

export interface DriftResponseData {
    results: ResultItem[];
}

export interface DriftResponse {
    drift : string;
}

export interface BallerinaSource {
    balFiles: string; 
    readme: string; 
    requirements: string; 
    developerOverview: string; 
    moduleName: string;
}
