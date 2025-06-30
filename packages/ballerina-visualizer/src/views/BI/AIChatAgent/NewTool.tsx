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
import { AgentToolRequest, FlowNode } from "@wso2/ballerina-core";
import { URI, Utils } from "vscode-uri";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { AIAgentSidePanel } from "./AIAgentSidePanel";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { addToolToAgentNode, findAgentNodeFromAgentCallNode, updateFlowNodePropertyValuesWithKeys } from "./utils";

const LoaderContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

interface NewToolProps {
    agentCallNode: FlowNode;
    onBack?: () => void;
    onSave?: () => void;
}

export function NewTool(props: NewToolProps): JSX.Element {
    const { agentCallNode, onSave, onBack } = props;
    console.log(">>> NewTool props", props);
    const { rpcClient } = useRpcContext();

    const [agentNode, setAgentNode] = useState<FlowNode | null>(null);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const agentFilePath = useRef<string>("");
    const projectUri = useRef<string>("");

    useEffect(() => {
        initPanel();
    }, [agentCallNode]);

    const initPanel = async () => {
        // get agent file path
        const filePath = await rpcClient.getVisualizerLocation();
        agentFilePath.current = Utils.joinPath(URI.file(filePath.projectUri), "agents.bal").fsPath;
        projectUri.current = filePath.projectUri;
        // fetch tools and agent node
        await fetchAgentNode();
    };

    const fetchAgentNode = async () => {
        const agentNode = await findAgentNodeFromAgentCallNode(agentCallNode, rpcClient);
        setAgentNode(agentNode);
        console.log(">>> agent node", { agentNode });
    };

    const handleOnSubmit = async (data: AgentToolRequest) => {
        console.log(">>> submit value", { data });
        setSavingForm(true);
        if (!data.toolName) {
            console.error("Tool name is required");
            return;
        }
        try {
            const updatedAgentNode = await addToolToAgentNode(agentNode, data.toolName);
            // generate the source code
            const agentResponse = await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: agentFilePath.current, flowNode: updatedAgentNode });
            console.log(">>> response getSourceCode with template ", { agentResponse });

            // wait for 2 seconds
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // add tools
            if (data.selectedCodeData.node === "FUNCTION_CALL") {
                // create tool from existing function
                // get function definition
                const functionDefinition = await rpcClient.getBIDiagramRpcClient().getFunctionNode({
                    functionName: data.selectedCodeData.symbol,
                    fileName: "functions.bal",
                    projectPath: projectUri.current,
                });
                console.log(">>> response get function definition", { functionDefinition });
                if (!functionDefinition.functionDefinition) {
                    console.error("Function definition not found");
                    return;
                }
                if (functionDefinition.functionDefinition?.codedata) {
                    functionDefinition.functionDefinition.codedata.isNew = true;
                    functionDefinition.functionDefinition.codedata.lineRange = {
                        ...agentNode.codedata.lineRange,
                        endLine: agentNode.codedata.lineRange.startLine,
                    };
                }
                // save tool
                const toolResponse = await rpcClient.getAIAgentRpcClient().genTool({
                    toolName: data.toolName,
                    description: data.description,
                    filePath: agentFilePath.current,
                    flowNode: functionDefinition.functionDefinition as FlowNode,
                    connection: "",
                });
                console.log(">>> response save tool", { toolResponse });
            } else {
                // create tool from existing connection
                // get nodeTemplate
                const nodeTemplate = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                    position: { line: 0, offset: 0 },
                    filePath: agentFilePath.current,
                    id: data.selectedCodeData,
                });
                console.log(">>> node template", { nodeTemplate });
                if (!nodeTemplate.flowNode) {
                    console.error("Node template not found");
                    return;
                }
                if (nodeTemplate.flowNode?.codedata) {
                    nodeTemplate.flowNode.codedata.isNew = true;
                    nodeTemplate.flowNode.codedata.lineRange = {
                        ...agentNode.codedata.lineRange,
                        endLine: agentNode.codedata.lineRange.startLine,
                    };
                }
                updateFlowNodePropertyValuesWithKeys(nodeTemplate.flowNode);
                // save tool
                const toolResponse = await rpcClient.getAIAgentRpcClient().genTool({
                    toolName: data.toolName,
                    description: data.description,
                    filePath: agentFilePath.current,
                    flowNode: nodeTemplate.flowNode,
                    connection: data.selectedCodeData.parentSymbol || "",
                });
                console.log(">>> response save tool", { toolResponse });
            }
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
                <AIAgentSidePanel projectPath={agentFilePath.current} onSubmit={handleOnSubmit} />
            )}
            {(!agentFilePath.current || savingForm) && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
        </>
    );
}
