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
import {
    AddOrUpdateTestFunctionRequest,
    GetTestFunctionRequest,
    GetTestFunctionResponse,
    STModification,
    SourceUpdateResponse,
    SyntaxTree,
    TestManagerServiceAPI,
    TestSourceEditResponse,
    GetEvalsetsRequest,
    GetEvalsetsResponse,
    EvalsetItem,
} from "@wso2/ballerina-core";
import { ModulePart, NodePosition, STKindChecker } from "@wso2/syntax-tree";
import * as fs from 'fs';
import { existsSync, writeFileSync } from "fs";
import { StateMachine } from "../../stateMachine";
import { updateSourceCode } from "../../utils/source-utils";
import * as vscode from 'vscode';
import * as path from 'path';

export class TestServiceManagerRpcManager implements TestManagerServiceAPI {

    async updateTestFunction(params: AddOrUpdateTestFunctionRequest): Promise<SourceUpdateResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const targetFile = params.filePath;
                params.filePath = targetFile;
                const targetPosition: NodePosition = {
                    startLine: params.function.codedata.lineRange.startLine.line,
                    startColumn: params.function.codedata.lineRange.startLine.offset
                };
                const res: TestSourceEditResponse = await context.langClient.updateTestFunction(params);
                const artifacts = await updateSourceCode({ textEdits: res.textEdits, description: 'Test Function Update' });
                const result: SourceUpdateResponse = {
                    artifacts: artifacts
                };
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });

    }

    async addTestFunction(params: AddOrUpdateTestFunctionRequest): Promise<SourceUpdateResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const targetFile = params.filePath;
                params.filePath = targetFile;
                const res: TestSourceEditResponse = await context.langClient.addTestFunction(params);
                const artifacts = await updateSourceCode({ textEdits: res.textEdits, description: 'Test Function Creation' });
                const result: SourceUpdateResponse = {
                    artifacts: artifacts
                };
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getTestFunction(params: GetTestFunctionRequest): Promise<GetTestFunctionResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: GetTestFunctionResponse = await context.langClient.getTestFunction(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getEvalsets(params: GetEvalsetsRequest): Promise<GetEvalsetsResponse> {
        return new Promise(async (resolve) => {
            try {
                const pattern = params.projectPath
                    ? new vscode.RelativePattern(vscode.Uri.file(params.projectPath), '**/evalsets/**/*.evalset.json')
                    : '**/evalsets/**/*.evalset.json';
                const evalsetFiles = await vscode.workspace.findFiles(pattern);
                const evalsets: EvalsetItem[] = [];

                for (const uri of evalsetFiles) {
                    try {
                        const content = await fs.promises.readFile(uri.fsPath, 'utf-8');
                        const evalsetData = JSON.parse(content);

                        // Validate the evalset structure
                        if (!evalsetData.threads || !Array.isArray(evalsetData.threads)) {
                            continue;
                        }

                        const threadCount = evalsetData.threads.length;
                        const name = evalsetData.name || path.basename(uri.fsPath, '.evalset.json');
                        const description = evalsetData.description || '';
                        const filePath = params.projectPath
                            ? path.relative(params.projectPath, uri.fsPath)
                            : uri.fsPath;

                        evalsets.push({
                            id: evalsetData.id || uri.fsPath,
                            name: name,
                            filePath: filePath,
                            threadCount: threadCount,
                            description: description
                        });
                    } catch (error) {
                        console.error(`Failed to parse evalset file ${uri.fsPath}:`, error);
                    }
                }

                resolve({ evalsets });
            } catch (error) {
                console.error('Failed to get evalsets:', error);
                resolve({ evalsets: [] });
            }
        });
    }
}
