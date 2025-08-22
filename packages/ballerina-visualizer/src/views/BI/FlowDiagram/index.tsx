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

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import styled from "@emotion/styled";
import { removeMcpServerFromAgentNode } from "../AIChatAgent/utils";
import { MemoizedDiagram } from "@wso2/bi-diagram";
import {
    BIAvailableNodesRequest,
    Flow,
    FlowNode,
    Branch,
    Category,
    AvailableNode,
    LineRange,
    EVENT_TYPE,
    VisualizerLocation,
    MACHINE_VIEW,
    SubPanel,
    SubPanelView,
    CurrentBreakpointsResponse as BreakpointInfo,
    FUNCTION_TYPE,
    ParentPopupData,
    BISearchRequest,
    ToolData,
    DIRECTORY_MAP,
    UpdatedArtifactsResponse,
    ParentMetadata,
    NodeMetadata,
    SearchKind,
    Item,
} from "@wso2/ballerina-core";

import {
    addDraftNodeToDiagram,
    convertBICategoriesToSidePanelCategories,
    convertFunctionCategoriesToSidePanelCategories,
    convertModelProviderCategoriesToSidePanelCategories,
    convertVectorStoreCategoriesToSidePanelCategories,
    convertEmbeddingProviderCategoriesToSidePanelCategories,
    convertVectorKnowledgeBaseCategoriesToSidePanelCategories,
} from "../../../utils/bi";
import { NodePosition, STNode } from "@wso2/syntax-tree";
import { View, ProgressRing, ProgressIndicator, ThemeColors } from "@wso2/ui-toolkit";
import { applyModifications, textToModifications } from "../../../utils/utils";
import { PanelManager, SidePanelView } from "./PanelManager";
import { findFunctionByName, transformCategories } from "./utils";
import { ExpressionFormField, Category as PanelCategory } from "@wso2/ballerina-side-panel";
import { cloneDeep, debounce } from "lodash";
import {
    findFlowNodeByModuleVarName,
    getAgentFilePath,
    findAgentNodeFromAgentCallNode,
    removeAgentNode,
    removeToolFromAgentNode,
} from "../AIChatAgent/utils";
import { DiagramSkeleton } from "../../../components/Skeletons";
import { GET_DEFAULT_MODEL_PROVIDER } from "../../../constants";

const Container = styled.div`
    width: 100%;
    height: calc(100vh - 50px);
`;

const SpinnerContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

export interface BIFlowDiagramProps {
    projectPath: string;
    breakpointState?: boolean;
    syntaxTree?: STNode;
    onUpdate: () => void;
    onReady: (fileName: string, parentMetadata?: ParentMetadata) => void;
    onSave?: () => void;
}

// Navigation stack interface
interface NavigationStackItem {
    view: SidePanelView;
    categories: PanelCategory[];
    selectedNode?: FlowNode;
    clientName?: string;
}

export function BIFlowDiagram(props: BIFlowDiagramProps) {
    const { projectPath, breakpointState, syntaxTree, onUpdate, onReady, onSave } = props;
    const { rpcClient } = useRpcContext();

    const [model, setModel] = useState<Flow>();
    const [suggestedModel, setSuggestedModel] = useState<Flow>();
    const [showSidePanel, setShowSidePanel] = useState(false);
    const [sidePanelView, setSidePanelView] = useState<SidePanelView>(SidePanelView.NODE_LIST);
    const [categories, setCategories] = useState<PanelCategory[]>([]);
    const [fetchingAiSuggestions, setFetchingAiSuggestions] = useState(false);
    const [showProgressIndicator, setShowProgressIndicator] = useState(false);
    const [subPanel, setSubPanel] = useState<SubPanel>({ view: SubPanelView.UNDEFINED });
    const [updatedExpressionField, setUpdatedExpressionField] = useState<any>(undefined);
    const [breakpointInfo, setBreakpointInfo] = useState<BreakpointInfo>();
    const [selectedMcpToolkitName, setSelectedMcpToolkitName] = useState<string | undefined>(undefined);
    const [forceUpdate, setForceUpdate] = useState(0);

    // Navigation stack for back navigation
    const [navigationStack, setNavigationStack] = useState<NavigationStackItem[]>([]);

    const selectedNodeRef = useRef<FlowNode>();
    const nodeTemplateRef = useRef<FlowNode>();
    const topNodeRef = useRef<FlowNode | Branch>();
    const targetRef = useRef<LineRange>();
    const originalFlowModel = useRef<Flow>();
    const suggestedText = useRef<string>();
    const selectedClientName = useRef<string>();
    const initialCategoriesRef = useRef<any[]>([]);
    const showEditForm = useRef<boolean>(false);
    const selectedNodeMetadata = useRef<{ nodeId: string; metadata: any; fileName: string }>();
    const isCreatingNewModelProvider = useRef<boolean>(false);
    const isCreatingNewVectorStore = useRef<boolean>(false);
    const isCreatingNewEmbeddingProvider = useRef<boolean>(false);
    const isCreatingNewVectorKnowledgeBase = useRef<boolean>(false);

    useEffect(() => {
        debouncedGetFlowModel();
    }, [breakpointState, syntaxTree]);

    useEffect(() => {
        rpcClient.onParentPopupSubmitted((parent: ParentPopupData) => {
            console.log(">>> on parent popup submitted", parent);
            if (
                parent.artifactType === DIRECTORY_MAP.FUNCTION ||
                parent.artifactType === DIRECTORY_MAP.NP_FUNCTION ||
                parent.artifactType === DIRECTORY_MAP.DATA_MAPPER
            ) {
                handleOnSelectNode(
                    selectedNodeMetadata.current.nodeId,
                    selectedNodeMetadata.current.metadata,
                    selectedNodeMetadata.current.fileName
                );
            } else {
                if (!topNodeRef.current || !targetRef.current) {
                    console.error(">>> No parent or target found");
                    return;
                }
                setShowProgressIndicator(true);
                if (parent.artifactType === DIRECTORY_MAP.CONNECTION) {
                    updateConnectionWithNewItem(parent.recentIdentifier);
                }
                fetchNodesAndAISuggestions(topNodeRef.current, targetRef.current, false, false);
            }
        });
    }, [rpcClient]);

    const updateConnectionWithNewItem = (recentIdentifier: string) => {
        // Add a new item as loading into the "Connections" category
        setCategories((prev: PanelCategory[]) => {
            // Find the "Connections" category
            const updated = prev.map((cat) => {
                if (cat.title === "Connections") {
                    // Add new item to the items array and sort the items by title
                    return {
                        ...cat,
                        items: [
                            ...(cat.items || []),
                            { title: recentIdentifier, isLoading: true, items: [] }
                        ].sort((a, b) => (a as PanelCategory).title.localeCompare((b as PanelCategory).title))
                    };
                }
                return cat;
            });
            return updated as PanelCategory[];
        });
    };

    const debouncedGetFlowModel = useCallback(
        debounce(() => {
            getFlowModel();
        }, 1000),
        []
    );

    // Navigation stack helpers
    const pushToNavigationStack = (
        view: SidePanelView,
        cats: PanelCategory[],
        node?: FlowNode,
        clientName?: string
    ) => {
        const newItem: NavigationStackItem = {
            view,
            categories: cats,
            selectedNode: node,
            clientName,
        };
        setNavigationStack((prev) => [...prev, newItem]);
    };

    const popFromNavigationStack = () => {
        setNavigationStack((prev) => {
            if (prev.length === 0) return prev;
            const newStack = [...prev];
            const poppedItem = newStack.pop();
            return newStack;
        });

        if (navigationStack.length > 0) {
            const lastItem = navigationStack[navigationStack.length - 1];
            setSidePanelView(lastItem.view);
            setCategories(lastItem.categories);
            selectedNodeRef.current = lastItem.selectedNode;
            selectedClientName.current = lastItem.clientName;
            return true;
        }
        return false;
    };

    const clearNavigationStack = () => {
        setNavigationStack([]);
    };

    const popNavigationStackUntilView = (targetView: SidePanelView) => {
        setNavigationStack((prev) => {
            const newStack = [...prev];
            while (newStack.length > 0) {
                const lastItem = newStack[newStack.length - 1];
                if (lastItem.view === targetView) {
                    // Found the target view, restore it
                    setSidePanelView(lastItem.view);
                    setCategories(lastItem.categories);
                    selectedNodeRef.current = lastItem.selectedNode;
                    selectedClientName.current = lastItem.clientName;
                    newStack.pop();
                    return newStack;
                }
                newStack.pop();
            }
            return [];
        });

        const targetItem = navigationStack.find((item) => item.view === targetView);
        return !!targetItem;
    };

    const handleModelProviderAdded = async () => {
        console.log(">>> Model provider added, navigating back to model provider list");

        // Try to navigate back to MODEL_PROVIDER_LIST in the stack
        const foundInStack = popNavigationStackUntilView(SidePanelView.MODEL_PROVIDER_LIST);

        if (foundInStack) {
            setShowProgressIndicator(true);
            try {
                const response = await rpcClient.getBIDiagramRpcClient().getAvailableModelProviders({
                    position: targetRef.current.startLine,
                    filePath: model?.fileName,
                });
                console.log(">>> Refreshed model provider list", response);
                setCategories(convertModelProviderCategoriesToSidePanelCategories(response.categories as Category[]));
                setSidePanelView(SidePanelView.MODEL_PROVIDER_LIST);
                setShowSidePanel(true);
            } catch (error) {
                console.error(">>> Error refreshing model providers", error);
            } finally {
                setShowProgressIndicator(false);
            }
        } else {
            console.log(">>> MODEL_PROVIDER_LIST not found in navigation stack, closing panel");
            handleOnCloseSidePanel();
        }
    };

    const handleVectorStoreAdded = async () => {
        console.log(">>> Vector store added, navigating back to vector store list");

        // Try to navigate back to VECTOR_STORE_LIST in the stack
        const foundInStack = popNavigationStackUntilView(SidePanelView.VECTOR_STORE_LIST);

        if (foundInStack) {
            setShowProgressIndicator(true);
            try {
                const response = await rpcClient.getBIDiagramRpcClient().getAvailableVectorStores({
                    position: targetRef.current.startLine,
                    filePath: model?.fileName,
                });
                console.log(">>> Refreshed vector store list", response);
                setCategories(
                    convertVectorStoreCategoriesToSidePanelCategories(response.categories as Category[])
                );
                setSidePanelView(SidePanelView.VECTOR_STORE_LIST);
                setShowSidePanel(true);
            } catch (error) {
                console.error(">>> Error refreshing vector stores", error);
            } finally {
                setShowProgressIndicator(false);
            }
        } else {
            console.log(">>> VECTOR_STORE_LIST not found in navigation stack, closing panel");
            handleOnCloseSidePanel();
        }
    };

    const handleEmbeddingProviderAdded = async () => {
        console.log(">>> Embedding provider added, navigating back to embedding provider list");

        // Try to navigate back to EMBEDDING_PROVIDER_LIST in the stack
        const foundInStack = popNavigationStackUntilView(SidePanelView.EMBEDDING_PROVIDER_LIST);

        if (foundInStack) {
            setShowProgressIndicator(true);
            try {
                const response = await rpcClient.getBIDiagramRpcClient().getAvailableEmbeddingProviders({
                    position: targetRef.current.startLine,
                    filePath: model?.fileName,
                });
                console.log(">>> Refreshed embedding provider list", response);
                setCategories(
                    convertEmbeddingProviderCategoriesToSidePanelCategories(response.categories as Category[])
                );
                setSidePanelView(SidePanelView.EMBEDDING_PROVIDER_LIST);
                setShowSidePanel(true);
            } catch (error) {
                console.error(">>> Error refreshing embedding providers", error);
            } finally {
                setShowProgressIndicator(false);
            }
        } else {
            console.log(">>> EMBEDDING_PROVIDER_LIST not found in navigation stack, closing panel");
            handleOnCloseSidePanel();
        }
    };

    const handleVectorKnowledgeBaseAdded = async () => {
        console.log(">>> Vector knowledge base added, navigating back to vector knowledge base list");

        // Try to navigate back to VECTOR_KNOWLEDGE_BASE_LIST in the stack
        const foundInStack = popNavigationStackUntilView(SidePanelView.VECTOR_KNOWLEDGE_BASE_LIST);

        if (foundInStack) {
            setShowProgressIndicator(true);
            try {
                const response = await rpcClient.getBIDiagramRpcClient().getAvailableVectorKnowledgeBases({
                    position: targetRef.current.startLine,
                    filePath: model?.fileName,
                });
                console.log(">>> Refreshed vector knowledge base list", response);
                setCategories(
                    convertFunctionCategoriesToSidePanelCategories(
                        response.categories as Category[],
                        FUNCTION_TYPE.REGULAR
                    )
                );
                setSidePanelView(SidePanelView.VECTOR_KNOWLEDGE_BASE_LIST);
                setShowSidePanel(true);
            } catch (error) {
                console.error(">>> Error refreshing vector knowledge bases", error);
            } finally {
                setShowProgressIndicator(false);
            }
        } else {
            console.log(">>> VECTOR_KNOWLEDGE_BASE_LIST not found in navigation stack, closing panel");
            handleOnCloseSidePanel();
        }
    };

    const getFlowModel = () => {
        setShowProgressIndicator(true);
        onUpdate();
        rpcClient
            .getBIDiagramRpcClient()
            .getBreakpointInfo()
            .then((response) => {
                setBreakpointInfo(response);
                rpcClient
                    .getBIDiagramRpcClient()
                    .getFlowModel()
                    .then((model) => {
                        console.log(">>> flow model", model);
                        if (model?.flowModel) {
                            updateAgentModelTypes(model?.flowModel);
                            setModel(model.flowModel);
                            const parentMetadata = model.flowModel.nodes.find(
                                (node) => node.codedata.node === "EVENT_START"
                            )?.metadata.data as ParentMetadata | undefined;
                            onReady(model.flowModel.fileName, parentMetadata);
                        }
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                        onReady(undefined);
                    });
            });
    };

    // Hack: Updates agent model types based on ModelProvider connections
    // This is so that we render the icons for the models in the AgentCallNodeWidget
    function updateAgentModelTypes(flowModel?: Flow) {
        if (!flowModel || !Array.isArray(flowModel.connections) || !Array.isArray(flowModel.nodes)) return;

        const setModelType = (modelObj: any, providerName: string) => {
            if (modelObj) {
                modelObj.type = providerName;
            }
        };

        flowModel.connections
            .filter(
                (connection) =>
                    connection?.codedata?.object === "ModelProvider" ||
                    connection?.codedata?.object === "OpenAiModelProvider"
            )
            .forEach((connection) => {
                const modelVarName = connection?.properties?.variable?.value;
                const modelProviderName = connection?.codedata?.module;
                if (!modelVarName || !modelProviderName) return;

                flowModel.nodes.forEach((node: FlowNode) => {
                    const nodeMetadata = node?.metadata?.data as NodeMetadata;
                    if (node?.codedata?.node === "AGENT_CALL" && nodeMetadata?.model?.name === modelVarName) {
                        setModelType(nodeMetadata.model, modelProviderName);
                    } else if (node?.codedata?.node === "ERROR_HANDLER" && Array.isArray(node.branches)) {
                        node.branches.forEach((branch) => {
                            (branch.children ?? []).forEach((child) => {
                                const childMetadata = child?.metadata?.data as NodeMetadata;
                                if (
                                    child.codedata.node === "AGENT_CALL" &&
                                    childMetadata?.model?.name === modelVarName
                                ) {
                                    setModelType(childMetadata.model, modelProviderName);
                                }
                            });
                        });
                    }
                });
            });
    }

    useEffect(() => {
        if (model && selectedNodeRef.current?.codedata?.lineRange?.startLine && sidePanelView === SidePanelView.FORM) {
            const matchingNode = findNodeByStartLine(model, selectedNodeRef.current.codedata.lineRange.startLine);
            console.log(">>> Matching node", matchingNode);

            // Only update refs if we found a matching node and it's different from the current one
            if (matchingNode && matchingNode.id !== selectedNodeRef.current.id) {
                selectedNodeRef.current = matchingNode;
                targetRef.current = matchingNode.codedata.lineRange;
                setForceUpdate(prev => prev + 1);
            }
        }
    }, [model]);

    const findNodeByStartLine = (flowModel: Flow, startLine: any): FlowNode | undefined => {
        if (!flowModel || !flowModel.nodes || !startLine) {
            return undefined;
        }

        // Helper function to check if a node matches the target startLine
        const isNodeAtStartLine = (node: FlowNode): boolean => {
            if (!node.codedata || !node.codedata.lineRange || !node.codedata.lineRange.startLine) {
                return false;
            }

            const nodeStartLine = node.codedata.lineRange.startLine;

            // Check if the node's startLine matches the target startLine
            return nodeStartLine.line === startLine.line && nodeStartLine.offset === startLine.offset;
        };

        // Recursive function to search through nodes and their branches
        const searchNodes = (nodes: FlowNode[]): FlowNode | undefined => {
            for (const node of nodes) {
                if (isNodeAtStartLine(node)) {
                    return node;
                }

                if (node.branches && node.branches.length > 0) {
                    for (const branch of node.branches) {
                        if (branch.children && branch.children.length > 0) {
                            const foundNode = searchNodes(branch.children);
                            if (foundNode) {
                                return foundNode;
                            }
                        }
                    }
                }
            }

            return undefined;
        };

        return searchNodes(flowModel.nodes);
    };

    const handleOnCloseSidePanel = () => {
        setShowSidePanel(false);
        setSidePanelView(SidePanelView.NODE_LIST);
        setSubPanel({ view: SubPanelView.UNDEFINED });
        selectedNodeRef.current = undefined;
        nodeTemplateRef.current = undefined;
        topNodeRef.current = undefined;
        targetRef.current = undefined;
        selectedClientName.current = undefined;
        showEditForm.current = false;
        isCreatingNewModelProvider.current = false;
        clearNavigationStack();

        // restore original model
        if (originalFlowModel.current) {
            debouncedGetFlowModel();
            originalFlowModel.current = undefined;
            setSuggestedModel(undefined);
            suggestedText.current = undefined;
        }
    };

    const fetchNodesAndAISuggestions = (
        parent: FlowNode | Branch,
        target: LineRange,
        fetchAiSuggestions = true,
        updateFlowModel = true
    ) => {
        if (!parent || !target) {
            console.error(">>> No parent or target found");
            return;
        }
        const getNodeRequest: BIAvailableNodesRequest = {
            position: target.startLine,
            filePath: model?.fileName || parent?.codedata?.lineRange.fileName,
        };
        console.log(">>> get available node request", getNodeRequest);
        // save original model
        originalFlowModel.current = model;
        // show side panel with available nodes
        setShowProgressIndicator(true);
        rpcClient
            .getBIDiagramRpcClient()
            .getAvailableNodes(getNodeRequest)
            .then((response) => {
                console.log(">>> Available nodes", response);
                if (!response.categories) {
                    console.error(">>> Error getting available nodes", response);
                    return;
                }

                // Use the utility function to filter categories
                const filteredCategories = transformCategories(response.categories);
                const convertedCategories = convertBICategoriesToSidePanelCategories(filteredCategories);

                setCategories(convertedCategories);
                initialCategoriesRef.current = convertedCategories; // Store initial categories
                // add draft node to model
                if (updateFlowModel) {
                    const updatedFlowModel = addDraftNodeToDiagram(model, parent, target);
                    setModel(updatedFlowModel);
                }
                setShowSidePanel(true);
                setSidePanelView(SidePanelView.NODE_LIST);
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });

        if (!fetchAiSuggestions) {
            return;
        }
        // get ai suggestions
        setFetchingAiSuggestions(true);
        const suggestionFetchingTimeout = setTimeout(() => {
            console.log(">>> AI suggestion fetching timeout");
            setFetchingAiSuggestions(false);
        }, 10000); // 10 seconds

        rpcClient
            .getBIDiagramRpcClient()
            .getAiSuggestions({ position: target, filePath: model.fileName })
            .then((model) => {
                console.log(">>> ai suggested new flow", model);
                if (model?.flowModel?.nodes?.length > 0) {
                    setSuggestedModel(model.flowModel);
                    suggestedText.current = model.suggestion;
                }
            })
            .finally(() => {
                clearTimeout(suggestionFetchingTimeout);
                setFetchingAiSuggestions(false);
            });
    };

    const handleOnAddNode = (parent: FlowNode | Branch, target: LineRange) => {
        // clear previous click if had
        if (topNodeRef.current || targetRef.current) {
            console.log(">>> Clearing previous click", {
                topNodeRef: topNodeRef.current,
                targetRef: targetRef.current,
            });
            handleOnCloseSidePanel();
            return;
        }
        // handle add new node
        topNodeRef.current = parent;
        targetRef.current = target;
        fetchNodesAndAISuggestions(parent, target);
    };

    const handleOnAddNodePrompt = (parent: FlowNode | Branch, target: LineRange, prompt: string) => {
        if (topNodeRef.current || targetRef.current) {
            handleOnCloseSidePanel();
            return;
        }
        topNodeRef.current = parent;
        targetRef.current = target;
        originalFlowModel.current = model;
        setFetchingAiSuggestions(true);
        rpcClient
            .getBIDiagramRpcClient()
            .getAiSuggestions({ position: target, filePath: model.fileName, prompt })
            .then((model) => {
                if (model?.flowModel?.nodes?.length > 0) {
                    setSuggestedModel(model.flowModel);
                    suggestedText.current = model.suggestion;
                }
            })
            .finally(() => {
                setFetchingAiSuggestions(false);
            });
    };

    const handleSearch = async (searchText: string, functionType: FUNCTION_TYPE, searchKind: SearchKind) => {
        const request: BISearchRequest = {
            position: {
                startLine: targetRef.current.startLine,
                endLine: targetRef.current.endLine,
            },
            filePath: model.fileName,
            queryMap: searchText.trim()
                ? {
                    q: searchText,
                    limit: 12,
                    offset: 0,
                    includeAvailableFunctions: "true",
                }
                : undefined,
            searchKind,
        };
        console.log(`>>> Search ${searchKind.toLowerCase()} request`, request);
        setShowProgressIndicator(true);
        rpcClient
            .getBIDiagramRpcClient()
            .search(request)
            .then((response) => {
                console.log(`>>> Searched List of ${searchKind.toLowerCase()}`, response);
                setCategories(
                    convertFunctionCategoriesToSidePanelCategories(response.categories as Category[], functionType)
                );

                // Set the appropriate side panel view based on search kind and function type
                let panelView: SidePanelView;
                switch (searchKind) {
                    case "FUNCTION":
                        panelView =
                            functionType === FUNCTION_TYPE.REGULAR
                                ? SidePanelView.FUNCTION_LIST
                                : SidePanelView.DATA_MAPPER_LIST;
                        break;
                    case "NP_FUNCTION":
                        panelView = SidePanelView.NP_FUNCTION_LIST;
                        break;
                    case "MODEL_PROVIDER":
                        panelView = SidePanelView.MODEL_PROVIDER_LIST;
                        break;
                    case "VECTOR_STORE":
                        panelView = SidePanelView.VECTOR_STORE_LIST;
                        break;
                    case "EMBEDDING_PROVIDER":
                        panelView = SidePanelView.EMBEDDING_PROVIDER_LIST;
                        break;
                    case "VECTOR_KNOWLEDGE_BASE":
                        panelView = SidePanelView.VECTOR_KNOWLEDGE_BASE_LIST;
                        break;
                    default:
                        panelView = SidePanelView.NODE_LIST;
                }

                setSidePanelView(panelView);
                setShowSidePanel(true);
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });
    };

    const handleSearchNpFunction = async (searchText: string, functionType: FUNCTION_TYPE) => {
        await handleSearch(searchText, functionType, "NP_FUNCTION");
    };

    const handleSearchFunction = async (searchText: string, functionType: FUNCTION_TYPE) => {
        await handleSearch(searchText, functionType, "FUNCTION");
    };

    const handleSearchModelProvider = async (searchText: string, functionType: FUNCTION_TYPE) => {
        // await handleSearch(searchText, functionType, "MODEL_PROVIDER");
    };

    const handleSearchVectorStore = async (searchText: string, functionType: FUNCTION_TYPE) => {
        // await handleSearch(searchText, functionType, "VECTOR_STORE");
    };

    const handleSearchEmbeddingProvider = async (searchText: string, functionType: FUNCTION_TYPE) => {
        // await handleSearch(searchText, functionType, "EMBEDDING_PROVIDER");
    };

    const handleSearchVectorKnowledgeBase = async (searchText: string, functionType: FUNCTION_TYPE) => {
        // await handleSearch(searchText, functionType, "VECTOR_KNOWLEDGE_BASE");
    };

    const updateCurrentArtifactLocation = async (artifacts: UpdatedArtifactsResponse) => {
        console.log(">>> Updating current artifact location", { artifacts });
        // Get the updated component and update the location
        const currentIdentifier = (await rpcClient.getVisualizerLocation()).identifier;
        // Find the correct artifact by currentIdentifier (id)
        let currentArtifact = artifacts.artifacts.at(0);
        artifacts.artifacts.forEach((artifact) => {
            if (artifact.id === currentIdentifier || artifact.name === currentIdentifier) {
                currentArtifact = artifact;
            }
            // Check if artifact has resources and find within those
            if (artifact.resources && artifact.resources.length > 0) {
                const resource = artifact.resources.find(
                    (resource) => resource.id === currentIdentifier || resource.name === currentIdentifier
                );
                if (resource) {
                    currentArtifact = resource;
                }
            }
        });
        if (currentArtifact) {
            console.log(">>> currentArtifact", currentArtifact);
            if (isCreatingNewModelProvider.current) {
                isCreatingNewModelProvider.current = false;
                await handleModelProviderAdded();
                return;
            }
            if (isCreatingNewVectorStore.current) {
                isCreatingNewVectorStore.current = false;
                await handleVectorStoreAdded();
                return;
            }
            if (isCreatingNewEmbeddingProvider.current) {
                isCreatingNewEmbeddingProvider.current = false;
                await handleEmbeddingProviderAdded();
                return;
            }
            if (isCreatingNewVectorKnowledgeBase.current) {
                isCreatingNewVectorKnowledgeBase.current = false;
                await handleVectorKnowledgeBaseAdded();
                return;
            }
        }
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.UPDATE_PROJECT_LOCATION,
            location: {
                documentUri: currentArtifact.path,
                position: currentArtifact.position,
                identifier: currentIdentifier,
            },
        });
        handleOnCloseSidePanel();
        debouncedGetFlowModel();
    };

    const handleOnSelectNode = (nodeId: string, metadata?: any, fileName?: string) => {
        console.log(">>> on select node", { nodeId, metadata, fileName });
        selectedNodeMetadata.current = { nodeId, metadata, fileName: model?.fileName || fileName };
        const { node, category } = metadata as { node: AvailableNode; category?: string };

        // Push current state to navigation stack before navigating
        pushToNavigationStack(sidePanelView, categories, selectedNodeRef.current, selectedClientName.current);

        switch (node.codedata.node) {
            case "FUNCTION":
                setShowProgressIndicator(true);
                rpcClient
                    .getBIDiagramRpcClient()
                    .search({
                        position: { startLine: targetRef.current.startLine, endLine: targetRef.current.endLine },
                        filePath: model?.fileName || fileName,
                        queryMap: undefined,
                        searchKind: "FUNCTION",
                    })
                    .then((response) => {
                        console.log(">>> List of functions", response);
                        setCategories(
                            convertFunctionCategoriesToSidePanelCategories(
                                response.categories as Category[],
                                FUNCTION_TYPE.REGULAR
                            )
                        );
                        setSidePanelView(SidePanelView.FUNCTION_LIST);
                        setShowSidePanel(true);
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                    });
                break;

            case "DATA_MAPPER_CALL":
                setShowProgressIndicator(true);
                rpcClient
                    .getBIDiagramRpcClient()
                    .search({
                        position: { startLine: targetRef.current.startLine, endLine: targetRef.current.endLine },
                        filePath: model?.fileName || fileName,
                        queryMap: undefined,
                        searchKind: "FUNCTION",
                    })
                    .then((response) => {
                        setCategories(
                            convertFunctionCategoriesToSidePanelCategories(
                                response.categories as Category[],
                                FUNCTION_TYPE.EXPRESSION_BODIED
                            )
                        );
                        setSidePanelView(SidePanelView.DATA_MAPPER_LIST);
                        setShowSidePanel(true);
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                    });
                break;

            case "NP_FUNCTION":
                setShowProgressIndicator(true);
                rpcClient
                    .getBIDiagramRpcClient()
                    .search({
                        position: { startLine: targetRef.current.startLine, endLine: targetRef.current.endLine },
                        filePath: model?.fileName || fileName,
                        queryMap: undefined,
                        searchKind: "NP_FUNCTION",
                    })
                    .then((response) => {
                        console.log(">>> List of np functions", response);
                        setCategories(
                            convertFunctionCategoriesToSidePanelCategories(
                                response.categories as Category[],
                                FUNCTION_TYPE.REGULAR
                            )
                        );
                        setSidePanelView(SidePanelView.NP_FUNCTION_LIST);
                        setShowSidePanel(true);
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                    });
                break;

            case "MODEL_PROVIDERS":
                setShowProgressIndicator(true);
                rpcClient
                    .getBIDiagramRpcClient()
                    .getAvailableModelProviders({
                        position: targetRef.current.startLine,
                        filePath: model?.fileName || fileName,
                    })
                    .then((response) => {
                        console.log(">>> List of model providers", response);
                        setCategories(
                            convertFunctionCategoriesToSidePanelCategories(
                                response.categories as Category[],
                                FUNCTION_TYPE.REGULAR
                            )
                        );
                        setSidePanelView(SidePanelView.MODEL_PROVIDER_LIST);
                        setShowSidePanel(true);
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                    });
                break;

            case "VECTOR_STORES":
                setShowProgressIndicator(true);
                rpcClient
                    .getBIDiagramRpcClient()
                    .getAvailableVectorStores({
                        position: targetRef.current.startLine,
                        filePath: model?.fileName || fileName,
                    })
                    .then((response) => {
                        console.log(">>> List of vector stores", response);
                        setCategories(
                            convertFunctionCategoriesToSidePanelCategories(
                                response.categories as Category[],
                                FUNCTION_TYPE.REGULAR
                            )
                        );
                        setSidePanelView(SidePanelView.VECTOR_STORE_LIST);
                        setShowSidePanel(true);
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                    });
                break;

            case "EMBEDDING_PROVIDERS":
                setShowProgressIndicator(true);
                rpcClient
                    .getBIDiagramRpcClient()
                    .getAvailableEmbeddingProviders({
                        position: targetRef.current.startLine,
                        filePath: model?.fileName || fileName,
                    })
                    .then((response) => {
                        console.log(">>> List of embedding providers", response);
                        setCategories(
                            convertFunctionCategoriesToSidePanelCategories(
                                response.categories as Category[],
                                FUNCTION_TYPE.REGULAR
                            )
                        );
                        setSidePanelView(SidePanelView.EMBEDDING_PROVIDER_LIST);
                        setShowSidePanel(true);
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                    });
                break;

            case "VECTOR_KNOWLEDGE_BASES":
                setShowProgressIndicator(true);
                rpcClient
                    .getBIDiagramRpcClient()
                    .getAvailableVectorKnowledgeBases({
                        position: targetRef.current.startLine,
                        filePath: model?.fileName || fileName,
                    })
                    .then((response) => {
                        console.log(">>> List of vector knowledge bases", response);
                        setCategories(
                            convertFunctionCategoriesToSidePanelCategories(
                                response.categories as Category[],
                                FUNCTION_TYPE.REGULAR
                            )
                        );
                        setSidePanelView(SidePanelView.VECTOR_KNOWLEDGE_BASE_LIST);
                        setShowSidePanel(true);
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                    });
                break;

            default:
                // default node
                console.log(">>> on select panel node", { nodeId, metadata });
                selectedClientName.current = category;
                setShowProgressIndicator(true);
                rpcClient
                    .getBIDiagramRpcClient()
                    .getNodeTemplate({
                        position: targetRef.current.startLine,
                        filePath: model?.fileName || fileName,
                        id: node.codedata,
                    })
                    .then((response) => {
                        console.log(">>> FlowNode template", response);
                        selectedNodeRef.current = response.flowNode;
                        showEditForm.current = false;

                        // if agent_call node, then show agent config panel
                        if (node.codedata.node === "AGENT_CALL") {
                            setSidePanelView(SidePanelView.NEW_AGENT);
                        } else {
                            setSidePanelView(SidePanelView.FORM);
                        }
                        setShowSidePanel(true);
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                    });
                break;
        }
    };

    const handleOnFormSubmit = (updatedNode?: FlowNode, openInDataMapper?: boolean) => {
        if (!updatedNode) {
            console.log(">>> No updated node found");
            updatedNode = selectedNodeRef.current;
            debouncedGetFlowModel();
        }
        setShowProgressIndicator(true);

        if (openInDataMapper) {
            rpcClient
                .getInlineDataMapperRpcClient()
                .getInitialIDMSource({
                    filePath: model.fileName,
                    flowNode: updatedNode,
                })
                .then((response) => {
                    console.log(">>> Updated source code", response);
                    if (response.codedata) {
                        rpcClient.getVisualizerRpcClient().openView({
                            type: EVENT_TYPE.OPEN_VIEW,
                            location: {
                                view: MACHINE_VIEW.InlineDataMapper,
                                documentUri: model.fileName,
                                position: {
                                    startLine: response.codedata.lineRange.startLine.line,
                                    startColumn: response.codedata.lineRange.startLine.offset,
                                    endLine: response.codedata.lineRange.endLine.line,
                                    endColumn: response.codedata.lineRange.endLine.offset,
                                },
                                dataMapperMetadata: {
                                    name: updatedNode.properties?.variable?.value as string,
                                    codeData: response.codedata,
                                }
                            }
                        });
                    }
                })
                .finally(() => {
                    setShowSidePanel(false);
                    setShowProgressIndicator(false);
                });
            return;
        }
        rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({
                filePath: model.fileName,
                flowNode: updatedNode,
                isFunctionNodeUpdate: openInDataMapper,
            })
            .then(async (response) => {
                console.log(">>> Updated source code", response);
                if (response.artifacts.length > 0) {
                    // If the selected model is the default WSO2 model provider, configure it
                    if (updatedNode?.codedata?.symbol === GET_DEFAULT_MODEL_PROVIDER) {
                        await rpcClient.getAIAgentRpcClient().configureDefaultModelProvider();
                    }
                    selectedNodeRef.current = undefined;
                    await updateCurrentArtifactLocation(response);
                } else {
                    console.error(">>> Error updating source code", response);
                }
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });
    };

    const handleOnDeleteNode = async (node: FlowNode) => {
        console.log(">>> on delete node", node);
        setShowProgressIndicator(true);

        const deleteNodeResponse = await rpcClient.getBIDiagramRpcClient().deleteFlowNode({
            filePath: model.fileName,
            flowNode: node,
        });
        console.log(">>> Updated source code after delete", deleteNodeResponse);
        if (deleteNodeResponse.artifacts.length === 0) {
            console.error(">>> Error updating source code", deleteNodeResponse);
        }

        if (node.codedata.node === "AGENT_CALL") {
            const agentNodeDeleteResponse = await removeAgentNode(node, rpcClient);
            if (!agentNodeDeleteResponse) {
                console.error(">>> Error deleting agent node", node);
                setShowProgressIndicator(false);
                debouncedGetFlowModel();
                return;
            }
        }

        await updateCurrentArtifactLocation(deleteNodeResponse);

        selectedNodeRef.current = undefined;
        handleOnCloseSidePanel();
        setShowProgressIndicator(false);
        debouncedGetFlowModel();
    };

    const handleOnAddComment = (comment: string, target: LineRange) => {
        console.log(">>> on add comment", { comment, target });
        const updatedNode: FlowNode = {
            id: "40715",
            metadata: {
                label: "Comment",
                description: "This is a comment",
            },
            codedata: {
                node: "COMMENT",
                lineRange: {
                    fileName: "currency.bal",
                    ...target,
                },
            },
            returning: false,
            properties: {
                comment: {
                    metadata: {
                        label: "Comment",
                        description: "Comment to describe the flow",
                    },
                    valueType: "STRING",
                    value: `\n${comment}\n\n`,
                    optional: false,
                    advanced: false,
                    editable: true,
                },
            },
            branches: [],
            flags: 0,
        };

        rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({
                filePath: model.fileName,
                flowNode: updatedNode,
            })
            .then(async (response) => {
                if (response.artifacts.length > 0) {
                    selectedNodeRef.current = undefined;
                    await updateCurrentArtifactLocation(response);
                    handleOnCloseSidePanel();
                } else {
                    console.error(">>> Error updating source code", response);
                }
            });
    };

    const handleOnEditNode = (node: FlowNode) => {
        console.log(">>> on edit node", node);
        selectedNodeRef.current = node;
        if (suggestedText.current) {
            // use targetRef from suggested model
        } else {
            topNodeRef.current = undefined;
            targetRef.current = node.codedata.lineRange;
        }
        if (!targetRef.current) {
            return;
        }

        // if agent_call node, then show agent config panel
        if (node.codedata.node === "AGENT_CALL") {
            setSidePanelView(SidePanelView.AGENT_CONFIG);
            setShowSidePanel(true);
            return;
        }

        setShowProgressIndicator(true);
        rpcClient
            .getBIDiagramRpcClient()
            .getNodeTemplate({
                position: targetRef.current.startLine,
                filePath: model.fileName,
                id: node.codedata,
            })
            .then((response) => {
                nodeTemplateRef.current = response.flowNode;
                showEditForm.current = true;
                setSidePanelView(SidePanelView.FORM);
                setShowSidePanel(true);
            })
            .finally(() => {
                setShowProgressIndicator(false);
                debouncedGetFlowModel();
            });
    };

    const handleOnFormBack = () => {
        // Try to navigate back using the navigation stack
        const didNavigateBack = popFromNavigationStack();

        if (!didNavigateBack) {
            // Fallback to original logic if stack is empty
            if (sidePanelView === SidePanelView.MODEL_PROVIDERS) {
                handleOnSelectNode(
                    selectedNodeMetadata.current.nodeId,
                    selectedNodeMetadata.current.metadata,
                    selectedNodeMetadata.current.fileName
                );
                setCategories([]);
                setSidePanelView(SidePanelView.MODEL_PROVIDER_LIST);
            } else if (sidePanelView === SidePanelView.VECTOR_STORES) {
                handleOnSelectNode(
                    selectedNodeMetadata.current.nodeId,
                    selectedNodeMetadata.current.metadata,
                    selectedNodeMetadata.current.fileName
                );
                setCategories([]);
                setSidePanelView(SidePanelView.VECTOR_STORE_LIST);
            } else if (sidePanelView === SidePanelView.EMBEDDING_PROVIDERS) {
                handleOnSelectNode(
                    selectedNodeMetadata.current.nodeId,
                    selectedNodeMetadata.current.metadata,
                    selectedNodeMetadata.current.fileName
                );
                setCategories([]);
                setSidePanelView(SidePanelView.EMBEDDING_PROVIDER_LIST);
            } else if (
                sidePanelView === SidePanelView.FORM &&
                selectedNodeMetadata.current.metadata.node.codedata.node === "VECTOR_KNOWLEDGE_BASE"
            ) {
                handleOnSelectNode(
                    selectedNodeMetadata.current.nodeId,
                    selectedNodeMetadata.current.metadata,
                    selectedNodeMetadata.current.fileName
                );
                setCategories([]);
                setSidePanelView(SidePanelView.VECTOR_KNOWLEDGE_BASE_LIST);
            } else if (
                sidePanelView === SidePanelView.FUNCTION_LIST ||
                sidePanelView === SidePanelView.DATA_MAPPER_LIST ||
                sidePanelView === SidePanelView.NP_FUNCTION_LIST ||
                sidePanelView === SidePanelView.MODEL_PROVIDER_LIST ||
                sidePanelView === SidePanelView.VECTOR_STORE_LIST ||
                sidePanelView === SidePanelView.EMBEDDING_PROVIDER_LIST ||
                sidePanelView === SidePanelView.VECTOR_KNOWLEDGE_BASE_LIST
            ) {
                setCategories(initialCategoriesRef.current);
                setSidePanelView(SidePanelView.NODE_LIST);
            } else {
                setSidePanelView(SidePanelView.NODE_LIST);
                setSubPanel({ view: SubPanelView.UNDEFINED });
            }
            selectedNodeRef.current = undefined;
        }

        setSubPanel({ view: SubPanelView.UNDEFINED });
    };

    const handleOnAddConnection = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.AddConnectionWizard,
                documentUri: model.fileName,
                metadata: {
                    target: targetRef.current.startLine,
                },
            },
            isPopup: true,
        });
    };

    const handleOnEditConnection = (connectionName: string) => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.EditConnectionWizard,
                identifier: connectionName,
            },
            isPopup: true,
        });
    };

    const handleOnAddFunction = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIFunctionForm,
                artifactType: DIRECTORY_MAP.FUNCTION,
            },
            isPopup: true,
        });
    };

    const handleOnAddNPFunction = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BINPFunctionForm,
                artifactType: DIRECTORY_MAP.NP_FUNCTION,
            },
            isPopup: true,
        });
    };

    const handleOnAddDataMapper = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIDataMapperForm,
                artifactType: DIRECTORY_MAP.DATA_MAPPER,
            },
            isPopup: true,
        });
    };

    const handleOnAddNewModelProvider = () => {
        console.log(">>> Adding new model provider");
        isCreatingNewModelProvider.current = true;
        setShowProgressIndicator(true);

        // Push current state to navigation stack
        pushToNavigationStack(sidePanelView, categories, selectedNodeRef.current, selectedClientName.current);

        // Use search to get available model provider types
        rpcClient
            .getBIDiagramRpcClient()
            .search({
                position: { startLine: targetRef.current.startLine, endLine: targetRef.current.endLine },
                filePath: model?.fileName,
                queryMap: undefined,
                searchKind: "MODEL_PROVIDER",
            })
            .then((response) => {
                console.log(">>> Available model provider types", response);
                setCategories(convertModelProviderCategoriesToSidePanelCategories(response.categories as Category[]));
                setSidePanelView(SidePanelView.MODEL_PROVIDERS);
                setShowSidePanel(true);
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });
    };

    const handleOnAddNewVectorStore = () => {
        console.log(">>> Adding new vector store");
        isCreatingNewVectorStore.current = true;
        setShowProgressIndicator(true);

        // Push current state to navigation stack
        pushToNavigationStack(sidePanelView, categories, selectedNodeRef.current, selectedClientName.current);

        // Use search to get available vector store types
        rpcClient
            .getBIDiagramRpcClient()
            .search({
                position: { startLine: targetRef.current.startLine, endLine: targetRef.current.endLine },
                filePath: model?.fileName,
                queryMap: undefined,
                searchKind: "VECTOR_STORE",
            })
            .then((response) => {
                console.log(">>> Available vector store types", response);
                setCategories(convertVectorStoreCategoriesToSidePanelCategories(response.categories as Category[]));
                setSidePanelView(SidePanelView.VECTOR_STORES);
                setShowSidePanel(true);
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });
    };

    const handleOnAddNewEmbeddingProvider = () => {
        console.log(">>> Adding new embedding provider");
        isCreatingNewEmbeddingProvider.current = true;
        setShowProgressIndicator(true);

        // Push current state to navigation stack
        pushToNavigationStack(sidePanelView, categories, selectedNodeRef.current, selectedClientName.current);

        // Use search to get available embedding provider types
        rpcClient
            .getBIDiagramRpcClient()
            .search({
                position: { startLine: targetRef.current.startLine, endLine: targetRef.current.endLine },
                filePath: model?.fileName,
                queryMap: undefined,
                searchKind: "EMBEDDING_PROVIDER",
            })
            .then((response) => {
                console.log(">>> Available embedding provider types", response);
                setCategories(
                    convertEmbeddingProviderCategoriesToSidePanelCategories(response.categories as Category[])
                );
                setSidePanelView(SidePanelView.EMBEDDING_PROVIDERS);
                setShowSidePanel(true);
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });
    };

    const handleOnAddNewVectorKnowledgeBase = () => {
        console.log(">>> Adding new vector knowledge base");
        isCreatingNewVectorKnowledgeBase.current = true;

        // Push current state to navigation stack
        pushToNavigationStack(sidePanelView, categories, selectedNodeRef.current, selectedClientName.current);

        // Update the node type to VECTOR_KNOWLEDGE_BASE and get the template
        const updatedMetadata = { ...selectedNodeMetadata.current.metadata };
        updatedMetadata.node.codedata.node = "VECTOR_KNOWLEDGE_BASE";
        selectedNodeMetadata.current.metadata = updatedMetadata;

        setShowProgressIndicator(true);
        rpcClient
            .getBIDiagramRpcClient()
            .getNodeTemplate({
                position: targetRef.current.startLine,
                filePath: model?.fileName,
                id: updatedMetadata.node.codedata,
            })
            .then((response) => {
                console.log(">>> Vector Knowledge Base template", response);
                selectedNodeRef.current = response.flowNode;
                showEditForm.current = false;
                setSidePanelView(SidePanelView.FORM);
                setShowSidePanel(true);
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });
    };

    const handleOnGoToSource = (node: FlowNode) => {
        const targetPosition: NodePosition = {
            startLine: node.codedata.lineRange.startLine.line,
            startColumn: node.codedata.lineRange.startLine.offset,
            endLine: node.codedata.lineRange.endLine.line,
            endColumn: node.codedata.lineRange.endLine.offset,
        };
        rpcClient.getCommonRpcClient().goToSource({ position: targetPosition });
    };

    const handleAddBreakpoint = (node: FlowNode) => {
        const request = {
            filePath: model?.fileName,
            breakpoint: {
                line: node.codedata.lineRange.startLine.line,
                column: node.codedata.lineRange.startLine?.offset,
            },
        };

        rpcClient.getBIDiagramRpcClient().addBreakpointToSource(request);
    };

    const handleRemoveBreakpoint = (node: FlowNode) => {
        const request = {
            filePath: model?.fileName,
            breakpoint: {
                line: node.codedata.lineRange.startLine.line,
                column: node.codedata.lineRange.startLine?.offset,
            },
        };

        rpcClient.getBIDiagramRpcClient().removeBreakpointFromSource(request);
    };

    // ai suggestions callbacks
    const onAcceptSuggestions = () => {
        if (!suggestedModel) {
            return;
        }
        // save suggested text
        const modifications = textToModifications(suggestedText.current, {
            startLine: targetRef.current.startLine.line,
            startColumn: targetRef.current.startLine.offset,
            endLine: targetRef.current.endLine.line,
            endColumn: targetRef.current.endLine.offset,
        });
        applyModifications(rpcClient, modifications);

        // clear diagram
        handleOnCloseSidePanel();
        onDiscardSuggestions();
    };

    const onDiscardSuggestions = () => {
        if (!suggestedModel) {
            return;
        }
        setSuggestedModel(undefined);
        suggestedText.current = undefined;
    };

    const handleOpenView = async (filePath: string, position: NodePosition, identifier?: string) => {
        console.log(">>> open view: ", { filePath, position });
        const context: VisualizerLocation = {
            documentUri: filePath,
            position: position,
            identifier: identifier,
        };
        await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: context });
    };

    const handleSubPanel = (subPanel: SubPanel) => {
        setSubPanel(subPanel);
    };

    const handleUpdateExpressionField = (data: ExpressionFormField) => {
        setUpdatedExpressionField(data);
    };

    const handleResetUpdatedExpressionField = () => {
        setUpdatedExpressionField(undefined);
    };

    const handleEditAgent = () => {
        console.log(">>> Edit agent called", selectedNodeRef.current);
        // TODO: implement the edit agent logic
    };

    // AI Agent callback handlers
    const handleOnEditAgentModel = (node: FlowNode) => {
        console.log(">>> Edit agent model called", node);
        selectedNodeRef.current = node;
        showEditForm.current = true;
        setSidePanelView(SidePanelView.AGENT_MODEL);
        setShowSidePanel(true);
    };

    const handleOnSelectMemoryManager = (node: FlowNode) => {
        console.log(">>> Select memory manager called", node);
        selectedNodeRef.current = node;
        showEditForm.current = true;
        setSidePanelView(SidePanelView.AGENT_MEMORY_MANAGER);
        setShowSidePanel(true);
    };

    const handleOnDeleteMemoryManager = async (node: FlowNode) => {
        console.log(">>> Delete memory manager called", node);
        selectedNodeRef.current = node;
        setShowProgressIndicator(true);
        try {
            const agentNode = await findAgentNodeFromAgentCallNode(node, rpcClient);
            const agentFilePath = await getAgentFilePath(rpcClient);

            // remove memory manager statement if any
            if (agentNode.properties.memory && agentNode.properties.memory?.value !== "()") {
                const memoryVar = agentNode.properties.memory.value as string;
                if (memoryVar) {
                    const memoryNode = await findFlowNodeByModuleVarName(memoryVar, rpcClient);
                    if (memoryNode) {
                        await rpcClient.getBIDiagramRpcClient().deleteFlowNode({
                            filePath: agentFilePath,
                            flowNode: memoryNode,
                        });
                        console.log(">>> deleted memory manager node", memoryNode);
                    }
                }
            }

            // Create a clone of the agent node to modify
            const updatedAgentNode = cloneDeep(agentNode);

            // Remove memory manager from agent node
            if (!updatedAgentNode.properties.memory) {
                updatedAgentNode.properties.memory = {
                    value: "",
                    advanced: true,
                    optional: true,
                    editable: true,
                    valueType: "EXPRESSION",
                    valueTypeConstraint: "agent:MemoryManager",
                    metadata: {
                        label: "Memory Manager",
                        description: "The memory manager used by the agent to store and manage conversation history",
                    },
                    placeholder: "object {}",
                };
            } else {
                agentNode.properties.memory.value = "()";
            }
            // Generate the source code
            const agentResponse = await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: agentFilePath, flowNode: agentNode });
            console.log(">>> response getSourceCode after tool deletion", { agentResponse });
        } catch (error) {
            console.error("Error deleting memory manager:", error);
            alert("Failed to remove memory manager. Please try again.");
        } finally {
            setShowProgressIndicator(false);
            debouncedGetFlowModel();
        }
    };

    const handleOnAddTool = (node: FlowNode) => {
        console.log(">>> Add tool called", node);
        selectedNodeRef.current = node;
        selectedClientName.current = "Add Tool";

        // Open the tool selection panel
        setShowProgressIndicator(true);

        setTimeout(() => {
            setSidePanelView(SidePanelView.ADD_TOOL);
            setShowSidePanel(true);
            setShowProgressIndicator(false);
        }, 500);
    };

    const handleOnAddMcpServer = (node: FlowNode) => {
        console.log(">>> Add MCP Server called", node);
        selectedNodeRef.current = node;
        selectedClientName.current = "Add MCP Server";

        // Open the tool selection panel
        setShowProgressIndicator(true);

        // This would call the API to fetch tools in a real implementation
        setTimeout(() => {
            // For now, just use a dummy category
            const toolCategories: PanelCategory[] = [
                {
                    title: "MCP Servers",
                    description: "MCP Servers available for the agent",
                    items: [
                        {
                            id: "web-search",
                            label: "Web Search",
                            description: "Search the web for information",
                            enabled: true,
                        },
                    ],
                },
            ];

            setCategories(toolCategories);
            setSidePanelView(SidePanelView.ADD_MCP_SERVER);
            setShowSidePanel(true);
            setShowProgressIndicator(false);
            debouncedGetFlowModel();
        }, 500);
    };

    const handleOnSelectTool = async (tool: ToolData, node: FlowNode) => {
        console.log(">>> Edit tool called", { node, tool });
        selectedNodeRef.current = node;
        selectedClientName.current = tool.name;
        showEditForm.current = true;

        setShowProgressIndicator(true);
        // get project components to find the function
        const projectComponents = await rpcClient.getBIDiagramRpcClient().getProjectComponents();
        if (!projectComponents || !projectComponents.components) {
            console.error("Project components not found");
            return;
        }
        // find function from project components
        const functionInfo = findFunctionByName(projectComponents.components, tool.name);
        if (!functionInfo) {
            console.error("Function not found");
            return;
        }
        setShowProgressIndicator(false);

        const context: VisualizerLocation = {
            documentUri: functionInfo.filePath,
            identifier: functionInfo.name,
            view: MACHINE_VIEW.BIFunctionForm,
        };
        await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: context });
    };

    const handleOnSelectMcpToolkit = async (tool: ToolData, node: FlowNode) => {
        console.log(">>> Edit mcp toolkit called", { node, tool });
        selectedNodeRef.current = node;
        selectedClientName.current = tool.name;
        showEditForm.current = true;
        setSelectedMcpToolkitName(tool.name);

        setShowProgressIndicator(true);
        // get project components to find the function
        const projectComponents = await rpcClient.getBIDiagramRpcClient().getProjectComponents();
        if (!projectComponents || !projectComponents.components) {
            console.error("Project components not found");
            return;
        }
        console.log(">>> Project info for mcp toolkit", projectComponents);
        setTimeout(() => {
            const toolCategories: PanelCategory[] = [
                {
                    title: "MCP Servers",
                    description: "MCP Servers available for the agent",
                    items: [
                        {
                            id: "web-search",
                            label: "Web Search",
                            description: "Search the web for information",
                            enabled: true,
                        },
                    ],
                },
            ];

            setCategories(toolCategories);
            setSidePanelView(SidePanelView.EDIT_MCP_SERVER);
            setShowSidePanel(true);
            setShowProgressIndicator(false);
        }, 500);
    };

    const handleOnDeleteTool = async (tool: ToolData, node: FlowNode) => {
        console.log(">>> Delete tool called", tool, node);

        selectedNodeRef.current = node;
        setShowProgressIndicator(true);
        try {
            const agentNode = await findAgentNodeFromAgentCallNode(node, rpcClient);
            const updatedAgentNode = await removeToolFromAgentNode(agentNode, tool.name);
            const agentFilePath = await getAgentFilePath(rpcClient);
            const toolType = tool.type ?? "";
            if (toolType.includes("MCP Server")) {
                const updateAgentNode = removeMcpServerFromAgentNode(updatedAgentNode, tool.name);
                const agentResponse = await rpcClient
                    .getBIDiagramRpcClient()
                    .getSourceCode({ filePath: agentFilePath, flowNode: updateAgentNode });
                onSave?.();
                console.log(">>> response getSourceCode after tool deletion", { agentResponse });
            } else {
                const agentResponse = await rpcClient
                    .getBIDiagramRpcClient()
                    .getSourceCode({ filePath: agentFilePath, flowNode: updatedAgentNode });
                console.log(">>> response getSourceCode after tool deletion", { agentResponse });
            }
        } catch (error) {
            console.error("Error deleting tool:", error);
            alert(`Failed to remove tool "${tool.name}". Please try again.`);
        } finally {
            setShowProgressIndicator(false);
            debouncedGetFlowModel();
        }
    };

    const handleOnGoToTool = async (tool: ToolData, node: FlowNode) => {
        console.log(">>> Go to tool called", tool, node);
        setShowProgressIndicator(true);
        const agentFilePath = await getAgentFilePath(rpcClient);
        // get project components to find the function
        const projectComponents = await rpcClient.getBIDiagramRpcClient().getProjectComponents();
        if (!projectComponents || !projectComponents.components) {
            console.error("Project components not found");
            return;
        }
        // find function from project components
        const functionInfo = findFunctionByName(projectComponents.components, tool.name);
        if (!functionInfo) {
            console.error("Function not found");
            return;
        }
        setShowProgressIndicator(false);
        handleOpenView(agentFilePath, {
            startLine: functionInfo.startLine,
            startColumn: functionInfo.startColumn,
            endLine: functionInfo.endLine,
            endColumn: functionInfo.endColumn,
        });
    };

    const flowModel = originalFlowModel.current && suggestedModel ? suggestedModel : model;

    const memoizedDiagramProps = useMemo(
        () => ({
            model: flowModel,
            onAddNode: handleOnAddNode,
            onAddNodePrompt: handleOnAddNodePrompt,
            onDeleteNode: handleOnDeleteNode,
            onAddComment: handleOnAddComment,
            onNodeSelect: handleOnEditNode,
            onConnectionSelect: handleOnEditConnection,
            goToSource: handleOnGoToSource,
            addBreakpoint: handleAddBreakpoint,
            removeBreakpoint: handleRemoveBreakpoint,
            openView: handleOpenView,
            agentNode: {
                onModelSelect: handleOnEditAgentModel,
                onAddTool: handleOnAddTool,
                onAddMcpServer: handleOnAddMcpServer,
                onSelectTool: handleOnSelectTool,
                onSelectMcpToolkit: handleOnSelectMcpToolkit,
                onDeleteTool: handleOnDeleteTool,
                goToTool: handleOnGoToTool,
                onSelectMemoryManager: handleOnSelectMemoryManager,
                onDeleteMemoryManager: handleOnDeleteMemoryManager,
            },
            suggestions: {
                fetching: fetchingAiSuggestions,
                onAccept: onAcceptSuggestions,
                onDiscard: onDiscardSuggestions,
            },
            projectPath,
            breakpointInfo,
        }),
        [flowModel, fetchingAiSuggestions, projectPath, breakpointInfo]
    );

    return (
        <>
            <View>
                {(showProgressIndicator || fetchingAiSuggestions) && model && (
                    <ProgressIndicator color={ThemeColors.PRIMARY} />
                )}
                <Container>
                    {!model && <DiagramSkeleton />}
                    {model && <MemoizedDiagram {...memoizedDiagramProps} />}
                </Container>
            </View>

            <PanelManager
                showSidePanel={showSidePanel}
                sidePanelView={sidePanelView}
                subPanel={subPanel}
                categories={categories}
                selectedNode={selectedNodeRef.current}
                nodeFormTemplate={nodeTemplateRef.current}
                selectedClientName={selectedClientName.current}
                showEditForm={showEditForm.current}
                targetLineRange={targetRef.current}
                connections={model?.connections}
                fileName={model?.fileName}
                projectPath={projectPath}
                editForm={showEditForm.current}
                updatedExpressionField={updatedExpressionField}
                canGoBack={navigationStack.length > 0}
                // Regular callbacks
                onClose={handleOnCloseSidePanel}
                onBack={handleOnFormBack}
                onSelectNode={handleOnSelectNode}
                // Add node callbacks
                onAddConnection={handleOnAddConnection}
                onAddFunction={handleOnAddFunction}
                onAddNPFunction={handleOnAddNPFunction}
                onAddDataMapper={handleOnAddDataMapper}
                onAddModelProvider={handleOnAddNewModelProvider}
                onAddVectorStore={handleOnAddNewVectorStore}
                onAddEmbeddingProvider={handleOnAddNewEmbeddingProvider}
                onAddVectorKnowledgeBase={handleOnAddNewVectorKnowledgeBase}
                onSubmitForm={handleOnFormSubmit}
                showProgressIndicator={showProgressIndicator}
                onDiscardSuggestions={onDiscardSuggestions}
                onSubPanel={handleSubPanel}
                onUpdateExpressionField={handleUpdateExpressionField}
                onResetUpdatedExpressionField={handleResetUpdatedExpressionField}
                onSearchFunction={handleSearchFunction}
                onSearchNpFunction={handleSearchNpFunction}
                onSearchModelProvider={handleSearchModelProvider}
                onSearchVectorStore={handleSearchVectorStore}
                onSearchEmbeddingProvider={handleSearchEmbeddingProvider}
                onSearchVectorKnowledgeBase={handleSearchVectorKnowledgeBase}
                // AI Agent specific callbacks
                onEditAgent={handleEditAgent}
                onSelectTool={handleOnSelectTool}
                onDeleteTool={handleOnDeleteTool}
                onAddTool={handleOnAddTool}
                onAddMcpServer={handleOnAddMcpServer}
                selectedMcpToolkitName={selectedMcpToolkitName}
            />
        </>
    );
}
