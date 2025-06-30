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

import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { CodeData, FlowNode } from "@wso2/ballerina-core";
import { FormField, FormValues } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { convertConfig } from "../../../utils/bi";
import ConfigForm from "./ConfigForm";
import { Dropdown } from "@wso2/ui-toolkit";
import { cloneDeep } from "lodash";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { getAgentFilePath } from "./utils";

const Container = styled.div`
    padding: 16px;
    height: 100%;
`;

const LoaderContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
`;

interface MemoryManagerConfigProps {
    agentCallNode: FlowNode;
    onSave?: () => void;
}

export function MemoryManagerConfig(props: MemoryManagerConfigProps): JSX.Element {
    const { agentCallNode, onSave } = props;

    const { rpcClient } = useRpcContext();
    // use selected memory manager
    const [memoryManagersCodeData, setMemoryManagersCodeData] = useState<CodeData[]>([]);
    const [selectedMemoryManagerCodeData, setSelectedMemoryManagerCodeData] = useState<CodeData>();
    // already assigned memory manager
    const [selectedMemoryManager, setSelectedMemoryManager] = useState<FlowNode>();
    const [selectedMemoryManagerFields, setSelectedMemoryManagerFields] = useState<FormField[]>([]);

    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const agentFilePath = useRef<string>("");
    const agentNodeRef = useRef<FlowNode>();
    const moduleConnectionNodes = useRef<FlowNode[]>([]);
    const selectedMemoryManagerFlowNode = useRef<FlowNode>();

    useEffect(() => {
        initPanel();
    }, []);

    useEffect(() => {
        if (memoryManagersCodeData?.length > 0 && selectedMemoryManager && !selectedMemoryManagerCodeData) {
            fetchMemoryManagerNodeTemplate(selectedMemoryManager.codedata);
        }
    }, [memoryManagersCodeData, selectedMemoryManager]);

    const initPanel = async () => {
        setLoading(true);
        agentFilePath.current = await getAgentFilePath(rpcClient);
        // fetch all memory managers
        const memoryManagers = await fetchMemoryManagers();
        // fetch selected agent memory manager
        await fetchSelectedAgentMemoryManager(memoryManagers);
        setLoading(false);
    };

    const fetchMemoryManagers = async () => {
        console.log(">>> agent call node", agentCallNode);
        const agentName = agentCallNode?.properties.connection.value;
        if (!agentName) {
            console.error("Agent name not found", agentCallNode);
            return;
        }
        try {
            const memoryManagers = await rpcClient
                .getAIAgentRpcClient()
                .getAllMemoryManagers({ filePath: agentFilePath.current });
            console.log(">>> all memory managers", memoryManagers);
            if (memoryManagers.memoryManagers) {
                setMemoryManagersCodeData(memoryManagers.memoryManagers);
                return memoryManagers.memoryManagers;
            } else {
                console.error("Memory managers not found", memoryManagers);
            }
        } catch (error) {
            console.error("Error fetching memory managers", error);
        }
        return [];
    };

    const fetchSelectedAgentMemoryManager = async (memoryManagers: CodeData[]) => {
        // get module nodes
        const moduleNodes = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
        if (!moduleNodes.flowModel.connections.length) {
            console.error("No module connections found");
            return;
        }
        
        moduleConnectionNodes.current = moduleNodes.flowModel.connections;
        
        // get agent name
        const agentName = agentCallNode.properties.connection.value;
        if (!agentName) {
            console.error("Agent name not found in agent call node");
            return;
        }
        
        // get agent node
        const agentNode = moduleConnectionNodes.current.find((node) => node.properties.variable.value === agentName);        
        if (!agentNode) {
            console.error("Agent node not found", agentCallNode);
            return;
        }
        
        agentNodeRef.current = agentNode;
        
        // get memory manager name
        const memoryManagerName = (agentNode.properties?.memory?.value as string) || ""; // "new ai:MessageWindowChatMemory(33)"
        if (!memoryManagerName) {
            console.log("No memory manager associated with this agent");
            return;
        }
        
        // get memory manager from available ones
        const memoryManagerCodeData = memoryManagers.find((memory) => {
            // Extract the memory manager type from the expression like "new ai:MessageWindowChatMemory(33)"
            const memoryType = memoryManagerName.includes(":")
                ? memoryManagerName.split(":")[1]?.split("(")[0]?.trim()
                : memoryManagerName.split("(")[0]?.replace("new ", "")?.trim();
            return memory.object === memoryType;
        });
        if (!memoryManagerCodeData) {
            console.error("Memory manager not found in available memory managers");
            return;
        }
        
        setSelectedMemoryManagerCodeData(memoryManagerCodeData);
        
        const selectedMemoryManagerNodeTemplate = await getNodeTemplate(
            memoryManagerCodeData,
            agentFilePath.current
        );
        if (!selectedMemoryManagerNodeTemplate) {
            console.error("Failed to get node template for memory manager");
            return;
        }
        
        // set properties size value
        const sizeValue = memoryManagerName.split("(")[1]?.split(")")[0]?.trim();
        if (sizeValue) {
            selectedMemoryManagerNodeTemplate.properties.size.value = sizeValue;
        }

        // set properties variable
        selectedMemoryManagerNodeTemplate.properties.variable.hidden = true;

        setSelectedMemoryManager(selectedMemoryManagerNodeTemplate);
        const memoryManagerFields = convertConfig(selectedMemoryManagerNodeTemplate.properties);
        setSelectedMemoryManagerFields(memoryManagerFields);
    };

    // fetch selected memory manager code data - node template
    const fetchMemoryManagerNodeTemplate = async (memoryManagerCodeData: CodeData) => {
        setLoading(true);
         const selectedMemoryManagerNodeTemplate = await getNodeTemplate(
            memoryManagerCodeData,
            agentFilePath.current
        );
        if (!selectedMemoryManagerNodeTemplate) {
            console.error("Failed to get node template for memory manager");
            return;
        }
        // set properties variable
        selectedMemoryManagerNodeTemplate.properties.variable.hidden = true;
        
        setSelectedMemoryManager(selectedMemoryManagerNodeTemplate);
        const memoryManagerFields = convertConfig(selectedMemoryManagerNodeTemplate.properties);
        setSelectedMemoryManagerFields(memoryManagerFields);
        setLoading(false);
    };

    const getNodeTemplate = async (codeData: CodeData, filePath: string) => {
        const response = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
            position: { line: 0, offset: 0 },
            filePath: filePath,
            id: codeData,
        });
        console.log(">>> get node template response", response);
        return response?.flowNode;
    };

    const handleOnSave = async (data: FormField[], rawData: FormValues) => {
        console.log(">>> save value", { data, rawData });
        setSavingForm(true);
        // update agent node memory manager
        if (!agentNodeRef.current) {
            console.error("Agent node not found", { agentCallNode, agentNodeRef });
            return;
        }
        const updatedAgentNode = cloneDeep(agentNodeRef.current);
        // HACK: This is a hack to add the memory manager field to the agent node
        // TODO: Remove this once the new apis are available
        if (!updatedAgentNode.properties.memory) {
            updatedAgentNode.properties.memory = {
                metadata: {
                    label: "Memory Manager",
                    description: "",
                },
                valueType: "EXPRESSION",
                valueTypeConstraint: "ai:MemoryManager|()",
                value: "",
                placeholder: "()",
                optional: true,
                editable: true,
                advanced: true,
                hidden: false,
                codedata: {
                    node: "INCLUDED_FIELD",
                    symbol: "memory",
                },
                typeMembers: [
                    {
                        type: "MemoryManager",
                        packageInfo: "ballerinax:ai:1.0.1",
                        kind: "OBJECT_TYPE",
                        selected: false,
                    },
                    {
                        type: "()",
                        packageInfo: "",
                        kind: "BASIC_TYPE",
                        selected: false,
                    },
                ],
            };
        }

        const type = rawData.type || "ai:MessageWindowChatMemory";
        const size = rawData.size || 10;
        updatedAgentNode.properties.memory.value = `new ${type}(${size})`;
        console.log(">>> updated agent node", updatedAgentNode);
        const updatedAgentNodeResponse = await rpcClient.getBIDiagramRpcClient().getSourceCode({
            filePath: agentFilePath.current,
            flowNode: updatedAgentNode,
        });
        console.log(">>> updated agent node response", updatedAgentNodeResponse);
        onSave?.();
        setSavingForm(false);
    };

    const memoryManagerDropdownPlaceholder = "Select a memory manager...";

    return (
        <Container>
            {memoryManagersCodeData?.length > 0 && (
                <Row>
                    <Dropdown
                        isRequired
                        errorMsg=""
                        id="agent-memory-dropdown"
                        items={[
                            ...memoryManagersCodeData.map((memory) => ({
                                value: memory.object,
                                content: memory.object,
                            })),
                        ]}
                        label="Select Memory Manager"
                        description={"Available Memory Managers"}
                        onValueChange={(value) => {
                            if (value === memoryManagerDropdownPlaceholder) {
                                return; // Skip the init option
                            }
                            const selectedMemoryManagerCodeData = memoryManagersCodeData.find(
                                (memory) => memory.object === value
                            );
                            setSelectedMemoryManagerCodeData(selectedMemoryManagerCodeData);
                            fetchMemoryManagerNodeTemplate(selectedMemoryManagerCodeData);
                        }}
                        value={
                            selectedMemoryManagerCodeData?.object ||
                            (agentCallNode?.metadata?.data?.memory?.type as string) ||
                            memoryManagerDropdownPlaceholder
                        }
                        containerSx={{ width: "100%" }}
                    />
                </Row>
            )}
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && selectedMemoryManagerFields?.length > 0 && agentNodeRef.current?.codedata?.lineRange && (
                <ConfigForm
                    formFields={selectedMemoryManagerFields}
                    targetLineRange={agentNodeRef.current.codedata.lineRange}
                    onSubmit={handleOnSave}
                    disableSaveButton={savingForm}
                />
            )}
        </Container>
    );
}
