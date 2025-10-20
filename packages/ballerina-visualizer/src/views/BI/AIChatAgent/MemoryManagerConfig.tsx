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
import { usePanelOverlay } from "../FlowDiagram/hooks/usePanelOverlay";
import { ConnectionSelectionList } from "../../../components/ConnectionSelector/ConnectionSelectionList";
import { ConnectionCreator } from "../../../components/ConnectionSelector/ConnectionCreator";
import { getNodeTemplateForConnection } from "../FlowDiagram/utils";

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
    memoryManagerNode: FlowNode;
    agentNode: FlowNode;
    onSave?: () => void;
}

export function MemoryManagerConfig(props: MemoryManagerConfigProps): JSX.Element {
    const { agentNode, memoryManagerNode: existingMemoryVariable, onSave } = props;

    const { rpcClient } = useRpcContext();
    const { openOverlay, closeTopOverlay } = usePanelOverlay();

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
    const targetLineRange = useRef<any>();
    const currentOverlayId = useRef<string | null>(null);

    useEffect(() => {
        initPanel();
    }, []);

    const initPanel = async () => {
        setIsLoading(true);

        try {
            // Fetch initial configuration data
            agentFilePath.current = await getAgentFilePath(rpcClient);
            aiModuleOrg.current = await getAiModuleOrg(rpcClient);

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

    const fetchAvailableMemoryManagers = async (): Promise<CodeData[]> => {
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
        if (!agentNode) {
            console.error("Agent node reference not found");
            return;
        }

        // Get the memory manager type from agent metadata
        const currentMemoryType = (agentNode.metadata?.data as NodeMetadata)?.memory?.type as string;

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

            if (existingMemoryVariable) {
                // Existing memory manager variable found - use its line range for editing/replacing
                const existingType = existingMemoryVariable.properties.type.value.toString();
                const isSameType = existingType.includes(memoryManagerCodeData.object);

                targetLineRange.current = existingMemoryVariable.codedata?.lineRange;
                setMemoryManagerNode(isSameType ? existingMemoryVariable : undefined);

                nodeTemplate.codedata.lineRange = targetLineRange.current;
                nodeTemplate.codedata.isNew = false;
                setMemoryManagerNodeTemplate(nodeTemplate);
            } else {
                // No existing memory manager - insert new one at end of file
                const endOfFilePosition = await rpcClient
                    .getBIDiagramRpcClient()
                    .getEndOfFile({ filePath: agentFilePath.current });

                targetLineRange.current = {
                    fileName: agentFilePath.current,
                    startLine: endOfFilePosition,
                    endLine: endOfFilePosition
                };

                setMemoryManagerNode(undefined);
                setMemoryManagerNodeTemplate(nodeTemplate);
            }
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
        if (!agentNode) {
            console.error("Agent node not found", { agentNode, agentNodeRef });
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
            const updatedAgentNode = cloneDeep(agentNode);
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
            ((agentNode?.metadata?.data as NodeMetadata)?.memory?.type as string) ||
            "Select a memory manager..."
        );
    };

    const handleStoreCreated = (createdNode: FlowNode) => {
        // Extract the store reference from the created node
        const storeReference = createdNode.properties?.store?.value as string;

        if (!storeReference) {
            console.error("No store reference found in created node");
            return;
        }

        // Update the memory manager template with the new store reference
        if (memoryManagerNodeTemplate) {
            const updatedTemplate = cloneDeep(memoryManagerNodeTemplate);
            const storeProperty = (updatedTemplate.properties as any)['store'];
            if (storeProperty) {
                storeProperty.value = storeReference;
            }
            setMemoryManagerNodeTemplate(updatedTemplate);

            // If there's an existing memory manager node, update it too
            if (memoryManagerNode) {
                const updatedNode = cloneDeep(memoryManagerNode);
                const nodeStoreProperty = (updatedNode.properties as any)['store'];
                if (nodeStoreProperty) {
                    nodeStoreProperty.value = storeReference;
                }
                setMemoryManagerNode(updatedNode);
            }
        }

        // Close the overlay
        closeTopOverlay();
    };

    const handleSelectStore = async (nodeId: string, metadata?: any) => {
        if (!currentOverlayId.current) {
            return;
        }

        try {
            const { flowNode } = await getNodeTemplateForConnection(
                nodeId,
                metadata,
                targetLineRange.current,
                agentFilePath.current,
                rpcClient
            );

            // Close the selection overlay and open the creation overlay
            closeTopOverlay();

            // Open the creation overlay
            currentOverlayId.current = openOverlay({
                title: "Create Memory Store",
                content: (
                    <ConnectionCreator
                        connectionKind="MEMORY_STORE"
                        selectedNode={memoryManagerNode || memoryManagerNodeTemplate}
                        nodeFormTemplate={flowNode}
                        onSave={handleStoreCreated}
                    />
                ),
                onBack: handleBackToSelection,
            });
        } catch (error) {
            console.error("Error selecting memory store:", error);
        }
    };

    const handleBackToSelection = () => {
        // Close the current overlay (Create Memory Store) before opening the previous one
        closeTopOverlay();
        // Then open the selection overlay
        handleOpenStoreSelection();
    };

    const handleOpenStoreSelection = () => {
        currentOverlayId.current = openOverlay({
            title: "Select Memory Store",
            content: (
                <ConnectionSelectionList
                    connectionKind="MEMORY_STORE"
                    onSelect={handleSelectStore}
                />
            ),
            onBack: closeTopOverlay,
        });
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
                            label="Select Memory"
                            description="Available Memory"
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
            {!isLoading && memoryManagerNodeTemplate && targetLineRange.current && (
                <FormGenerator
                    fileName={agentFilePath.current}
                    node={memoryManagerNode || memoryManagerNodeTemplate}
                    nodeFormTemplate={memoryManagerNodeTemplate}
                    targetLineRange={targetLineRange.current}
                    onSubmit={handleOnSave}
                    disableSaveButton={isSaving}
                    submitText={isSaving ? "Saving..." : "Save"}
                    showProgressIndicator={isSaving}
                    fieldOverrides={{
                        store: {
                            type: "ACTION_EXPRESSION",
                            actionCallback: handleOpenStoreSelection,
                            defaultValue: "In-Memory Short Term Memory Store",
                            actionLabel: (
                                <>
                                    <Codicon name="add" />
                                    Create New Memory Store
                                </>
                            ),
                        },
                        overflowConfiguration: {
                            defaultValue: "Overflow Trim Configuration"
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
