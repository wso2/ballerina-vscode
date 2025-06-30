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
} from "@wso2/ballerina-core";
import { ModulePart, NodePosition, STKindChecker } from "@wso2/syntax-tree";
import * as fs from 'fs';
import { existsSync, writeFileSync } from "fs";
import { StateMachine } from "../../stateMachine";
import { updateSourceCode } from "../../utils/source-utils";

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
                const artifacts = await updateSourceCode({ textEdits: res.textEdits });
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
                const artifacts = await updateSourceCode({ textEdits: res.textEdits });
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
}
