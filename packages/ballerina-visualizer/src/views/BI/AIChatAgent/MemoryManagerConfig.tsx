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

import styled from "@emotion/styled";
import { CodeData, Flow, FlowNode, NodeMetadata } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Codicon, Dropdown } from "@wso2/ui-toolkit";
import { cloneDeep } from "lodash";
import { useEffect, useRef, useState } from "react";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { FormGenerator } from "../Forms/FormGenerator";
import { getAgentFilePath, getAiModuleOrg, getNodeTemplate } from "./utils";

const Container = styled.div`
    padding: 24px 16px 0;
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
`;

interface MemoryManagerConfigProps {
    agentCallNode: FlowNode;
    onSave?: () => void;
}

export function MemoryManagerConfig(props: MemoryManagerConfigProps): JSX.Element {
    const { agentCallNode, onSave } = props;

    const { rpcClient } = useRpcContext();

    // Available memory managers from the AI module
    const [availableMemoryManagers, setAvailableMemoryManagers] = useState<CodeData[]>([]);
    // Currently selected/configured memory manager with full node details
    const [memoryManagerNodeTemplate, setMemoryManagerNodeTemplate] = useState<FlowNode>();
    const [memoryManagerNode, setMemoryManagerNode] = useState<FlowNode>();

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const agentFilePath = useRef<string>("");
    const aiModuleOrg = useRef<string>("");
    const agentNodeRef = useRef<FlowNode>();
    const moduleNodes = useRef<Flow>();

    useEffect(() => {
        initPanel();
    }, []);

    const initPanel = async () => {
        setIsLoading(true);

        try {
            // Fetch initial configuration data
            agentFilePath.current = await getAgentFilePath(rpcClient);
            aiModuleOrg.current = await getAiModuleOrg(rpcClient);

            // Load module nodes and find the agent node
            await fetchModuleNodes();
            findAgentNode();

            // Load available memory managers
            const memoryManagers = await fetchAvailableMemoryManagers();
            if (memoryManagers.length > 0) {
                await loadSelectedMemoryManager(memoryManagers);
            }
        } catch (error) {
            console.error("Error initializing memory manager config panel", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchModuleNodes = async (): Promise<FlowNode[]> => {
        const moduleNodesResponse = await rpcClient.getBIDiagramRpcClient().getModuleNodes();

        if (!moduleNodesResponse.flowModel.connections.length) {
            console.error("No module connections found");
            return [];
        }

        moduleNodes.current = moduleNodesResponse.flowModel;
    };

    const findAgentNode = (): void => {
        const agentName = agentCallNode.properties.connection.value;
        if (!agentName) {
            console.error("Agent name not found in agent call node");
            return;
        }

        const agentNode = moduleNodes.current.connections?.find(
            (node) => node.properties.variable.value === agentName
        );

        if (!agentNode) {
            console.error(`Agent node not found for agent: ${agentName}`);
            return;
        }

        agentNodeRef.current = agentNode;
    };

    const fetchAvailableMemoryManagers = async (): Promise<CodeData[]> => {
        const agentName = agentCallNode?.properties.connection.value;
        if (!agentName) {
            console.error("Agent name not found", agentCallNode);
            return [];
        }

        try {
            const searchResponse = await rpcClient.getBIDiagramRpcClient().search({
                filePath: agentFilePath.current,
                queryMap: { orgName: aiModuleOrg.current },
                searchKind: "MEMORY_MANAGER"
            });

            if (!searchResponse?.categories?.[0]?.items) {
                console.error("No memory managers found in search response");
                return [];
            }

            const memoryManagers = searchResponse.categories[0].items.map((item: any) => item.codedata);
            setAvailableMemoryManagers(memoryManagers);
            return memoryManagers;
        } catch (error) {
            console.error("Error fetching memory managers", error);
            return [];
        }
    };

    const loadSelectedMemoryManager = async (memoryManagers: CodeData[]): Promise<void> => {
        if (!agentNodeRef.current) {
            console.error("Agent node reference not found");
            return;
        }

        // Get the memory manager type from agent metadata
        const currentMemoryType = (agentCallNode.metadata?.data as NodeMetadata)?.memory?.type as string;

        // Find the corresponding memory manager code data
        let memoryManagerCodeData: CodeData;
        if (currentMemoryType) {
            memoryManagerCodeData = memoryManagers.find(
                (memory) => memory.object === currentMemoryType
            );

            if (!memoryManagerCodeData) {
                console.error("Current memory manager not found in available memory managers");
                memoryManagerCodeData = memoryManagers[0];
            }
        } else {
            console.log("No memory manager associated with this agent, using first available");
            memoryManagerCodeData = memoryManagers[0];
        }

        await loadMemoryManagerTemplate(memoryManagerCodeData);
    };

    const loadMemoryManagerTemplate = async (memoryManagerCodeData: CodeData): Promise<void> => {
        setIsLoading(true);
        try {
            // Fetch the node template for the selected memory manager
            const nodeTemplate = await getNodeTemplate(
                rpcClient,
                memoryManagerCodeData,
                agentFilePath.current
            );

            if (!nodeTemplate) {
                console.error("Failed to get node template for memory manager");
                return;
            }

            setMemoryManagerNodeTemplate(nodeTemplate);

            // Check if agent already has a configured memory manager
            const agentMemoryValue = agentNodeRef.current?.properties?.memory?.value;
            if (!agentMemoryValue) {
                // No existing memory manager - use template for new configuration
                setMemoryManagerNode(nodeTemplate);
                return;
            }

            // Find the existing memory manager node from module variables
            const existingMemoryVariable = moduleNodes.current?.variables?.find(
                (node) => node.properties.variable.value === agentMemoryValue.toString().trim()
            );

            // Use existing configuration if found, otherwise use template
            setMemoryManagerNode(existingMemoryVariable || nodeTemplate);
        } catch (error) {
            console.error("Error loading memory manager template", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMemoryManagerChange = async (memoryManagerType: string): Promise<void> => {
        const memoryManagerCodeData = availableMemoryManagers.find(
            (memory) => memory.object === memoryManagerType
        );

        if (!memoryManagerCodeData) {
            console.error(`Memory manager not found: ${memoryManagerType}`);
            return;
        }

        await loadMemoryManagerTemplate(memoryManagerCodeData);
    };

    const handleOnSave = async (updatedNode?: FlowNode): Promise<void> => {
        if (!agentNodeRef.current) {
            console.error("Agent node not found", { agentCallNode, agentNodeRef });
            return;
        }

        setIsSaving(true);

        try {
            // Save the memory manager configuration
            await rpcClient.getBIDiagramRpcClient().getSourceCode({
                filePath: agentFilePath.current,
                flowNode: updatedNode,
            });

            // Update the agent node with the memory manager reference
            const updatedAgentNode = cloneDeep(agentNodeRef.current);
            updatedAgentNode.properties.memory.value = updatedNode?.properties.variable.value || "";

            await rpcClient.getBIDiagramRpcClient().getSourceCode({
                filePath: agentFilePath.current,
                flowNode: updatedAgentNode,
            });

            onSave?.();
        } catch (error) {
            console.error("Error saving memory manager configuration", error);
        } finally {
            setIsSaving(false);
        }
    };

    const getCurrentMemoryManagerType = (): string => {
        return (
            memoryManagerNodeTemplate?.codedata?.object ||
            ((agentCallNode?.metadata?.data as NodeMetadata)?.memory?.type as string) ||
            "Select a memory manager..."
        );
    };

    return (
        <>
            {availableMemoryManagers.length > 0 && (
                <Container>
                    <Row>
                        <Dropdown
                            isRequired
                            errorMsg=""
                            id="agent-memory-dropdown"
                            items={availableMemoryManagers.map((memory) => ({
                                value: memory.object,
                                content: memory.object.replace(/([A-Z])/g, ' $1').trim(),
                            }))}
                            label="Select Memory Manager"
                            description="Available Memory Managers"
                            onValueChange={handleMemoryManagerChange}
                            value={getCurrentMemoryManagerType()}
                            containerSx={{ width: "100%" }}
                        />
                    </Row>
                </Container>
            )}
            {isLoading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!isLoading && memoryManagerNodeTemplate && agentNodeRef.current?.codedata?.lineRange && (
                <FormGenerator
                    fileName={agentFilePath.current}
                    node={memoryManagerNode}
                    nodeFormTemplate={memoryManagerNodeTemplate}
                    targetLineRange={memoryManagerNode?.codedata?.lineRange ? memoryManagerNode.codedata.lineRange : agentNodeRef.current.codedata.lineRange}
                    onSubmit={handleOnSave}
                    disableSaveButton={isSaving}
                    submitText={isSaving ? "Saving..." : "Save"}
                    showProgressIndicator={isSaving}
                    fieldOverrides={{
                        store: {
                            type: "ACTION_EXPRESSION",
                            actionCallback: () => {
                                console.log("Create new store clicked!");
                                // TODO: Add your navigation logic here
                                // navigateToPanel(SidePanelView.CONNECTION_SELECT, 'store');
                            },
                            actionLabel: (
                                <>
                                    <Codicon name="add" />
                                    Create New Memory Store
                                </>
                            ),
                        },
                        type: {
                            hidden: true
                        }
                    }}
                />
            )}
        </>
    );
}
