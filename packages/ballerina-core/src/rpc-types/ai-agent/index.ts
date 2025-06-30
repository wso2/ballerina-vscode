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

import { AIGentToolsRequest, AIGentToolsResponse, AIModelsRequest, AINodesRequest, AINodesResponse, AIToolsRequest, AIToolsResponse, AIModelsResponse, MemoryManagersResponse, MemoryManagersRequest } from "../../interfaces/extended-lang-client";
import { AIAgentRequest, AIAgentResponse, AIAgentToolsUpdateRequest } from "./interfaces";

export interface AIAgentAPI {
    getAllAgents: (params: AINodesRequest) => Promise<AINodesResponse>;
    getAllModels: (params: AIModelsRequest) => Promise<AINodesResponse>;
    getAllMemoryManagers: (params: MemoryManagersRequest) => Promise<MemoryManagersResponse>;
    getModels: (params: AIModelsRequest) => Promise<AIModelsResponse>;
    getTools: (params: AIToolsRequest) => Promise<AIToolsResponse>;
    genTool: (params: AIGentToolsRequest) => Promise<AIGentToolsResponse>;
    createAIAgent: (params: AIAgentRequest) => Promise<AIAgentResponse>;
    updateAIAgentTools: (params: AIAgentToolsUpdateRequest) => Promise<AIAgentResponse>;
}
