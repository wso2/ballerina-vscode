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
    STModification,
    SyntaxTree,
    TestSourceEditResponse,
    ICPServiceAPI,
    ICPEnabledRequest,
    ICPEnabledResponse,
} from "@wso2/ballerina-core";
import { ModulePart, NodePosition, STKindChecker } from "@wso2/syntax-tree";
import * as fs from 'fs';
import { existsSync, writeFileSync } from "fs";
import { Uri } from "vscode";
import { StateMachine } from "../../stateMachine";
import { applyBallerinaTomlEdit } from "../common/utils";
import { updateSourceCode } from "../../utils/source-utils";
export class ICPServiceRpcManager implements ICPServiceAPI {

    async addICP(params: ICPEnabledRequest): Promise<ICPEnabledResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectPath: string = params.projectPath || context.projectPath;
                const param = { projectPath };
                const res: TestSourceEditResponse = await context.langClient.addICP(param);
                await updateSourceCode({ textEdits: res.textEdits, description: 'ICP Creation' });
                const result: ICPEnabledResponse = await context.langClient.isIcpEnabled(param);
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async disableICP(params: ICPEnabledRequest): Promise<ICPEnabledResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectPath: string = params.projectPath || context.projectPath;
                const param = { projectPath };
                const res: TestSourceEditResponse = await context.langClient.disableICP(param);
                await updateSourceCode({ textEdits: res.textEdits, description: 'ICP Disable' });
                const result: ICPEnabledResponse = await context.langClient.isIcpEnabled(param);
                resolve(result);
            } catch (error) {
                console.log(error);
            }
        });
    }


    async isIcpEnabled(params: ICPEnabledRequest): Promise<ICPEnabledResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectPath: string = params.projectPath || context.projectPath;
                const param = { projectPath };
                const res: ICPEnabledResponse = await context.langClient.isIcpEnabled(param);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }
}
