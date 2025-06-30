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
import { RequestType } from "vscode-messenger-common";

const _preFix = "ai-agent";
export const getAllAgents: RequestType<AINodesRequest, AINodesResponse> = { method: `${_preFix}/getAllAgents` };
export const getAllModels: RequestType<AIModelsRequest, AINodesResponse> = { method: `${_preFix}/getAllModels` };
export const getAllMemoryManagers: RequestType<MemoryManagersRequest, MemoryManagersResponse> = { method: `${_preFix}/getAllMemoryManagers` };
export const getModels: RequestType<AIModelsRequest, AIModelsResponse> = { method: `${_preFix}/getModels` };
export const getTools: RequestType<AIToolsRequest, AIToolsResponse> = { method: `${_preFix}/getTools` };
export const genTool: RequestType<AIGentToolsRequest, AIGentToolsResponse> = { method: `${_preFix}/genTool` };
export const createAIAgent: RequestType<AIAgentRequest, AIAgentResponse> = { method: `${_preFix}/createAIAgent` };
export const updateAIAgentTools: RequestType<AIAgentToolsUpdateRequest, AIAgentResponse> = { method: `${_preFix}/updateAIAgentTools` };
