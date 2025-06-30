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
    AIAgentAPI,
    AIAgentRequest,
    AIAgentResponse,
    AIAgentToolsUpdateRequest,
    AIGentToolsRequest,
    AIGentToolsResponse,
    AIModelsRequest,
    AIModelsResponse,
    AINodesRequest,
    AINodesResponse,
    AIToolsRequest,
    AIToolsResponse,
    MemoryManagersRequest,
    MemoryManagersResponse,
    createAIAgent,
    genTool,
    getAllAgents,
    getAllMemoryManagers,
    getAllModels,
    getModels,
    getTools,
    updateAIAgentTools
} from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class AiAgentRpcClient implements AIAgentAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    getAllAgents(params: AINodesRequest): Promise<AINodesResponse> {
        return this._messenger.sendRequest(getAllAgents, HOST_EXTENSION, params);
    }

    getAllModels(params: AIModelsRequest): Promise<AINodesResponse> {
        return this._messenger.sendRequest(getAllModels, HOST_EXTENSION, params);
    }

    getAllMemoryManagers(params: MemoryManagersRequest): Promise<MemoryManagersResponse> {
        return this._messenger.sendRequest(getAllMemoryManagers, HOST_EXTENSION, params);
    }

    getModels(params: AIModelsRequest): Promise<AIModelsResponse> {
        return this._messenger.sendRequest(getModels, HOST_EXTENSION, params);
    }

    getTools(params: AIToolsRequest): Promise<AIToolsResponse> {
        return this._messenger.sendRequest(getTools, HOST_EXTENSION, params);
    }

    genTool(params: AIGentToolsRequest): Promise<AIGentToolsResponse> {
        return this._messenger.sendRequest(genTool, HOST_EXTENSION, params);
    }

    createAIAgent(params: AIAgentRequest): Promise<AIAgentResponse> {
        return this._messenger.sendRequest(createAIAgent, HOST_EXTENSION, params);
    }

    updateAIAgentTools(params: AIAgentToolsUpdateRequest): Promise<AIAgentResponse> {
        return this._messenger.sendRequest(updateAIAgentTools, HOST_EXTENSION, params);
    }
}
