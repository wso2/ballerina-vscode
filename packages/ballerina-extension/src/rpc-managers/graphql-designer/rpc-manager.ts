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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    GetGraphqlTypeRequest,
    GetGraphqlTypeResponse,
    GraphqlDiagramAPI,
    GraphqlModelRequest,
    GraphqlModelResponse
} from "@wso2/ballerina-core";
import { StateMachine } from "../../stateMachine";

export class GraphqlDesignerRpcManager implements GraphqlDiagramAPI {
    async getGraphqlModel(params: GraphqlModelRequest): Promise<GraphqlModelResponse> {
        return new Promise(async (resolve) => {
            const res = await StateMachine.langClient().getGraphqlModel({
                filePath: params.filePath,
                startLine: params.startLine,
                endLine: params.endLine
            }) as GraphqlModelResponse;
            resolve(res);
        });
    }

    async getGraphqlTypeModel(params: GetGraphqlTypeRequest): Promise<GetGraphqlTypeResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                console.log(">>> Fetching GraphqlTypeModel", params);
                const res: GetGraphqlTypeResponse = await context.langClient.getGraphqlTypeModel(params);
                resolve(res);
            } catch (error) {
                console.log(">>> Error obtaining GraphqlTypeModel", error);
                resolve(undefined);
            }
        });
    }
}
