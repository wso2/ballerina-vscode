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
import { LinePosition } from "@wso2/ballerina-core";
import {
    NodePosition,
    STNode,
    traversNode
} from "@wso2/syntax-tree";
import { URI } from "vscode-uri";

import { IDataMapperContext } from "../../../utils/DataMapperContext/DataMapperContext";
import { getFnDefsForFnCalls } from "../../../utils/st-utils";
import { FunctionCallFindingVisitor } from "../visitors/FunctionCallFindingVisitor";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";

export interface FnDefInfo {
    fnCallPosition: LinePosition;
    fnDefPosition: NodePosition;
    fnName: string;
    fileUri: string,
    isExprBodiedFn?: boolean;
}

export class FunctionDefinitionStore {

    fnDefinitions: Map<LinePosition, FnDefInfo>
    static instance : FunctionDefinitionStore;

    private constructor() {
        this.fnDefinitions = new Map();
    }

    public static getInstance() {
        if (!this.instance){
            this.instance = new FunctionDefinitionStore();
        }
        return this.instance;
    }

    public async storeFunctionDefinitions(
        stNode: STNode,
        context: IDataMapperContext,
        langServerRpcClient: LangClientRpcClient) {

        this.fnDefinitions.clear();
        const fileUri = URI.file(context.currentFile.path).toString();
        const visitor = new FunctionCallFindingVisitor();
        traversNode(stNode, visitor);

        const fnCallPositions = visitor.getFunctionCallPositions();

        await this.setFnDefinitions(fileUri, fnCallPositions, langServerRpcClient);
    }

    async setFnDefinitions(fileUri: string, fnCallPositions: LinePosition[], langServerRpcClient: LangClientRpcClient) {

        const fnDefs = await getFnDefsForFnCalls(fnCallPositions, fileUri, langServerRpcClient)

        for (const fnDef of fnDefs) {
            this.fnDefinitions.set(fnDef.fnCallPosition, fnDef)
        }
    }

    public getFnDefinitions(position : LinePosition) : FnDefInfo {
        for (const [key, value] of this.fnDefinitions) {
            if (key.line === position.line && key.offset === position.offset) {
                return value;
            }
        }
    }
}
