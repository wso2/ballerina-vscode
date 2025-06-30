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

import { NodePosition } from "@wso2/syntax-tree";
import { CodeData, FlowNode } from "../../interfaces/bi";

export interface AgentTool {
    toolName: string;
    toolType: string;

    // Function Related
    functionState: number; // 1 = New, 2 = Existing
    functionScope: string; // Current Integration | Library
    functionName: string;
    existingFunctionCodeData: CodeData;

    //Connector Related
    connectorState: number; // 1 = New, 2 = Existing

    // For new connector option we will collect the config updated connectorFlowNode
    connectorFlowNode: FlowNode;
    // For both new and existing We will collect the action code data which can be used to the get the template of that "REMOTE_ACTION_CALL"
    connectorActionCodeData: CodeData;
    connectionName: string;
}

export interface AgentToolRequest {
    toolName: string;
    description: string;
    selectedCodeData: CodeData; // Codedata can be FUNCTION_CALL | REMOTE_ACTION_CALL
}

export interface AIAgentRequest {
    agentFields: any[]; // Need to fix this type
    modelFields: any[];
    modelState: number; // 1 = New, 2 = Existing
    selectedModel: string;
    toolsFields: any[];
    newTools: AgentToolRequest[];
}
export interface AIAgentToolsUpdateRequest {
    agentFlowNode: FlowNode;
    toolsFields: any[];
    newTools: AgentToolRequest[];
}

export interface AIAgentResponse {
    response: boolean;
    filePath: string;
    position: NodePosition;
}

