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
import { CodeData, FlowNode, NodeMetadata } from "@wso2/ballerina-core";
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

const WarningMessage = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    margin-top: 12px;
    background-color: var(--vscode-inputValidation-warningBackground);
    border: 1px solid var(--vscode-inputValidation-warningBorder);
    border-radius: 4px;
    color: var(--vscode-inputValidation-warningForeground);
    font-size: 13px;
    line-height: 1.4;
`;

interface MemoryConfigProps {
    memoryNode: FlowNode;
    agentNode: FlowNode;
    onSave?: () => void;
}

export function MemoryManagerConfig(props: MemoryConfigProps): JSX.Element {
    const { agentNode, memoryNode: existingMemoryVariable, onSave } = props;

    const { rpcClient } = useRpcContext();
    const { openOverlay, closeTopOverlay } = usePanelOverlay();

    const [availableMemory, setAvailableMemory] = useState<CodeData[]>([]);
    const [memoryNodeTemplate, setMemoryNodeTemplate] = useState<FlowNode>();
    const [memoryNode, setMemoryNode] = useState<FlowNode>();
    const [selectedMemoryType, setSelectedMemoryType] = useState<string>("");

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

            // Load available memory
            const memoryTypes = await fetchAvailableMemory();
            if (memoryTypes.length > 0) {
                await loadSelectedMemory(memoryTypes);
            }
        } catch (error) {
            console.error("Error initializing memory config panel", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableMemory = async (): Promise<CodeData[]> => {
        try {
            const searchResponse = await rpcClient.getBIDiagramRpcClient().search({
                filePath: agentFilePath.current,
                queryMap: { orgName: aiModuleOrg.current },
                searchKind: "MEMORY"
            });

            if (!searchResponse?.categories?.[0]?.items) {
                console.error("No memory found in search response");
                return [];
            }

            const memoryTypes = searchResponse.categories[0].items.map((item: any) => item.codedata);
            setAvailableMemory(memoryTypes);
            return memoryTypes;
        } catch (error) {
            console.error("Error fetching memory", error);
            return [];
        }
    };

    const loadSelectedMemory = async (memoryTypes: CodeData[]): Promise<void> => {
        if (!agentNode) {
            console.error("Agent node reference not found");
            return;
        }

        // Get the memory type from agent metadata
        let currentMemoryType = (agentNode.metadata?.data as NodeMetadata)?.memory?.type as string;

        // Remove "ai:" prefix if present
        if (currentMemoryType?.startsWith("ai:")) {
            currentMemoryType = currentMemoryType.substring(3);
        }

        // Find the corresponding memory code data
        let memoryCodeData: CodeData;
        if (currentMemoryType) {
            memoryCodeData = memoryTypes.find(
                (memory) => memory.object === currentMemoryType
            );

            if (!memoryCodeData) {
                console.error("Current memory not found in available memory");
                memoryCodeData = memoryTypes[0];
            }
        } else {
            console.log("No memory associated with this agent, using first available");
            memoryCodeData = memoryTypes[0];
        }

        await loadMemoryTemplate(memoryCodeData);
    };

    const extractMemorySizeFromAgent = (): string | null => {
        if (!agentNode) {
            return null;
        }
        const memoryValue = agentNode.properties?.memory?.value?.toString();
        if (memoryValue) {
            // Match patterns like "new ai:MessageWindowChatMemory(10)" or "MessageWindowChatMemory(10)"
            const sizeMatch = memoryValue.match(/\((\d+)\)/);
            if (sizeMatch && sizeMatch[1]) {
                return sizeMatch[1];
            }
        }
        return null;
    };

    const loadMemoryTemplate = async (memoryCodeData: CodeData): Promise<void> => {
        setIsLoading(true);
        try {
            // Fetch the node template for the selected memory
            const nodeTemplate = await getNodeTemplate(
                rpcClient,
                memoryCodeData,
                agentFilePath.current
            );

            if (!nodeTemplate) {
                console.error("Failed to get node template for memory");
                return;
            }

            // Extract size from agent's memory configuration if available
            const memorySizeFromAgent = extractMemorySizeFromAgent();
            if (memorySizeFromAgent !== null && nodeTemplate.properties?.['size']) {
                nodeTemplate.properties['size'].value = memorySizeFromAgent;
            }

            if (existingMemoryVariable) {
                // Existing memory variable found - use its line range for editing/replacing
                const existingType = existingMemoryVariable.properties.type.value.toString();
                const isSameType = existingType.includes(memoryCodeData.object);

                targetLineRange.current = existingMemoryVariable.codedata?.lineRange;
                setMemoryNode(isSameType ? existingMemoryVariable : undefined);

                nodeTemplate.codedata.lineRange = targetLineRange.current;
                nodeTemplate.codedata.isNew = false;
                setMemoryNodeTemplate(nodeTemplate);
            } else {
                // No existing memory - insert new one at end of file
                const endOfFilePosition = await rpcClient
                    .getBIDiagramRpcClient()
                    .getEndOfFile({ filePath: agentFilePath.current });

                targetLineRange.current = {
                    fileName: agentFilePath.current,
                    startLine: endOfFilePosition,
                    endLine: endOfFilePosition
                };

                setMemoryNode(undefined);
                setMemoryNodeTemplate(nodeTemplate);
            }

            // Update the selected memory type and remove "ai:" prefix if present
            let memoryType = memoryCodeData.object;
            if (memoryType?.startsWith("ai:")) {
                memoryType = memoryType.substring(3);
            }
            setSelectedMemoryType(memoryType);
        } catch (error) {
            console.error("Error loading memory template", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMemoryChange = async (memoryType: string): Promise<void> => {
        const memoryCodeData = availableMemory.find(
            (memory) => memory.object === memoryType
        );

        if (!memoryCodeData) {
            console.error(`Memory not found: ${memoryType}`);
            return;
        }

        await loadMemoryTemplate(memoryCodeData);
    };

    const handleOnSave = async (updatedNode?: FlowNode): Promise<void> => {
        if (!agentNode) {
            console.error("Agent node not found", { agentNode, agentNodeRef });
            return;
        }

        setIsSaving(true);

        try {
            // Save the memory configuration
            await rpcClient.getBIDiagramRpcClient().getSourceCode({
                filePath: agentFilePath.current,
                flowNode: updatedNode,
            });

            // Update the agent node with the memory reference
            const updatedAgentNode = cloneDeep(agentNode);
            const filePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: [updatedAgentNode?.codedata?.lineRange?.fileName] })).filePath;
            updatedAgentNode.properties.memory.value = updatedNode?.properties.variable.value || "";

            await rpcClient.getBIDiagramRpcClient().getSourceCode({
                filePath: filePath,
                flowNode: updatedAgentNode,
            });

            onSave?.();
        } catch (error) {
            console.error("Error saving memory configuration", error);
        } finally {
            setIsSaving(false);
        }
    };


    const handleStoreCreated = (createdNode: FlowNode) => {
        // Extract the store reference from the created node
        const storeReference = createdNode.properties?.store?.value as string;

        if (!storeReference) {
            console.error("No store reference found in created node");
            return;
        }

        // Update the memory template with the new store reference
        if (memoryNodeTemplate) {
            const updatedTemplate = cloneDeep(memoryNodeTemplate);
            const storeProperty = (updatedTemplate.properties as any)['store'];
            if (storeProperty) {
                storeProperty.value = storeReference;
            }
            setMemoryNodeTemplate(updatedTemplate);

            // If there's an existing memory node, update it too
            if (memoryNode) {
                const updatedNode = cloneDeep(memoryNode);
                const nodeStoreProperty = (updatedNode.properties as any)['store'];
                if (nodeStoreProperty) {
                    nodeStoreProperty.value = storeReference;
                }
                setMemoryNode(updatedNode);
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
                        selectedNode={memoryNode || memoryNodeTemplate}
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
            {availableMemory.length > 0 && (
                <Container>
                    <Row>
                        <Dropdown
                            isRequired
                            errorMsg=""
                            id="agent-memory-dropdown"
                            items={availableMemory.map((memory) => ({
                                value: memory.object,
                                content: memory.object.replace(/([A-Z])/g, ' $1').trim(), // Convert camel case to words
                            }))}
                            label="Select Memory"
                            description="Available Memory"
                            onValueChange={handleMemoryChange}
                            value={selectedMemoryType}
                            containerSx={{ width: "100%" }}
                        />
                    </Row>
                    {selectedMemoryType === "MessageWindowChatMemory" && availableMemory.length > 1 && (
                        <WarningMessage>
                            <Codicon name="warning" />
                            <div>
                                <strong>Note:</strong> Message Window Chat Memory is deprecated and may
                                not be supported in future versions. Please use <strong>Short Term Memory</strong> instead.
                            </div>
                        </WarningMessage>
                    )}
                </Container>
            )}
            {isLoading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!isLoading && memoryNodeTemplate && targetLineRange.current && (
                <FormGenerator
                    fileName={agentFilePath.current}
                    node={memoryNode || memoryNodeTemplate}
                    nodeFormTemplate={memoryNodeTemplate}
                    targetLineRange={targetLineRange.current}
                    onSubmit={handleOnSave}
                    disableSaveButton={isSaving}
                    submitText={isSaving ? "Saving..." : "Save"}
                    showProgressIndicator={isSaving}
                    fieldOverrides={{
                        store: {
                            type: "ACTION_EXPRESSION",
                            types: [{ fieldType: "ACTION_EXPRESSION", selected: false }],
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
