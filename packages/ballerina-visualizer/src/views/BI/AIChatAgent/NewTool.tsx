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

import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { FlowNode } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { AIAgentSidePanel, ExtendedAgentToolRequest } from "./AIAgentSidePanel";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { addToolToAgentNode, findAgentNodeFromAgentCallNode, updateFlowNodePropertyValuesWithKeys } from "./utils";
import { FUNCTION_CALL } from "../../../constants";

// Module-level cache: avoids re-fetching the same agent node when switching between modes
const agentNodeCache = new Map<string, FlowNode>();

const LoaderContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

export enum NewToolSelectionMode {
    CONNECTION = "connection",
    FUNCTION = "function",
    ALL = "all",
}

interface NewToolProps {
    agentCallNode: FlowNode;
    mode?: NewToolSelectionMode;
    onBack?: () => void;
    onSave?: () => void;
}

export function NewTool(props: NewToolProps): JSX.Element {
    const { agentCallNode, mode = NewToolSelectionMode.ALL, onSave, onBack } = props;
    const { rpcClient } = useRpcContext();

    const [agentNode, setAgentNode] = useState<FlowNode | null>(null);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const agentFilePath = useRef<string>("");
    const projectPath = useRef<string>("");

    useEffect(() => {
        initPanel();
    }, [agentCallNode]);

    const initPanel = async () => {
        // get agent file path
        const visualizerContext = await rpcClient.getVisualizerLocation();
        agentFilePath.current = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: ['agents.bal'] })).filePath;
        projectPath.current = visualizerContext.projectPath;
        // fetch tools and agent node
        await fetchAgentNode();
    };

    const fetchAgentNode = async () => {
        const agentName = agentCallNode.properties?.connection?.value;
        const fileName = agentCallNode.codedata?.lineRange?.fileName;
        const cacheKey = `${fileName}-${agentName}`;

        const cached = agentNodeCache.get(cacheKey);
        if (cached) {
            console.log(">>> agent node (from cache)", { cached });
            setAgentNode(cached);
            return;
        }

        const agentNode = await findAgentNodeFromAgentCallNode(agentCallNode, rpcClient);
        console.log(">>> agent node found", { agentNode });
        if (agentNode) {
            agentNodeCache.set(cacheKey, agentNode);
        }
        setAgentNode(agentNode);
    };

    const handleOnSubmit = async (data: ExtendedAgentToolRequest) => {
        console.log(">>> submit value", { data });
        setSavingForm(true);
        if (!data.toolName) {
            console.error("Tool name is required");
            return;
        }
        try {
            const updatedAgentNode = await addToolToAgentNode(agentNode, data.toolName);
            const filePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: [updatedAgentNode.codedata.lineRange.fileName] })).filePath;
            // generate the source code
            const agentResponse = await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: filePath, flowNode: updatedAgentNode });
            console.log(">>> response getSourceCode with template ", { agentResponse });

            // wait for 2 seconds
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // add tools
            if (data.selectedCodeData.node === FUNCTION_CALL) {
                // create tool from existing function
                // get function definition
                const functionDefinition = data.functionNode;
                if (!functionDefinition) {
                    console.error("Function definition not found");
                    return;
                }
                if (functionDefinition?.codedata) {
                    functionDefinition.codedata.isNew = true;
                    functionDefinition.codedata.lineRange = {
                        ...agentNode.codedata.lineRange,
                        endLine: agentNode.codedata.lineRange.startLine,
                    };
                }
                // save tool
                const toolResponse = await rpcClient.getAIAgentRpcClient().genTool({
                    toolName: data.toolName,
                    description: data.description,
                    filePath: agentFilePath.current,
                    flowNode: functionDefinition as FlowNode,
                    connection: "",
                    toolParameters: data.toolParameters,
                });
                console.log(">>> response save tool", { toolResponse });
            } else {
                // create tool from existing connection
                if (!data.flowNode) {
                    console.error("Node template not found");
                    return;
                }
                if (data.flowNode?.codedata) {
                    data.flowNode.codedata.isNew = true;
                    data.flowNode.codedata.lineRange = {
                        ...agentNode.codedata.lineRange,
                        endLine: agentNode.codedata.lineRange.startLine,
                    };
                }
                // save tool
                const toolResponse = await rpcClient.getAIAgentRpcClient().genTool({
                    toolName: data.toolName,
                    description: data.description,
                    filePath: agentFilePath.current,
                    flowNode: data.flowNode,
                    connection: data.selectedCodeData.parentSymbol || "",
                    toolParameters: data.toolParameters,
                });
                console.log(">>> response save tool", { toolResponse });
            }
            // Invalidate cache so the updated agent node is re-fetched next time
            const agentName = agentCallNode.properties?.connection?.value;
            const fileName = agentCallNode.codedata?.lineRange?.fileName;
            agentNodeCache.delete(`${fileName}-${agentName}`);
            onSave?.();
        } catch (error) {
            console.error("Error saving tool", { error });
        } finally {
            setSavingForm(false);
        }
    };

    return (
        <>
            {agentFilePath.current && !savingForm && (
                <AIAgentSidePanel projectPath={projectPath.current} onSubmit={handleOnSubmit} mode={mode} />
            )}
            {(!agentFilePath.current || savingForm) && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
        </>
    );
}
