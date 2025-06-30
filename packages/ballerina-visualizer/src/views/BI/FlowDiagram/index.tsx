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

import { useEffect, useRef, useState, useMemo } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import styled from "@emotion/styled";
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
} from "@wso2/ballerina-core";

import {
    addDraftNodeToDiagram,
    convertBICategoriesToSidePanelCategories,
    convertFunctionCategoriesToSidePanelCategories,
} from "../../../utils/bi";
import { NodePosition, STNode } from "@wso2/syntax-tree";
import { View, ProgressRing, ProgressIndicator, ThemeColors } from "@wso2/ui-toolkit";
import { applyModifications, textToModifications } from "../../../utils/utils";
import { PanelManager, SidePanelView } from "./PanelManager";
import { findFunctionByName, transformCategories } from "./utils";
import { ExpressionFormField, Category as PanelCategory } from "@wso2/ballerina-side-panel";
import { cloneDeep } from "lodash";
import {
    findFlowNodeByModuleVarName,
    getAgentFilePath,
    findAgentNodeFromAgentCallNode,
    removeAgentNode,
    removeToolFromAgentNode,
} from "../AIChatAgent/utils";

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
    syntaxTree: STNode; // INFO: this is used to make the diagram rerender when code changes
    projectPath: string;
    onUpdate: () => void;
    onReady: (fileName: string) => void;
}

export function BIFlowDiagram(props: BIFlowDiagramProps) {
    const { syntaxTree, projectPath, onUpdate, onReady } = props;
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

    const selectedNodeRef = useRef<FlowNode>();
    const nodeTemplateRef = useRef<FlowNode>();
    const topNodeRef = useRef<FlowNode | Branch>();
    const targetRef = useRef<LineRange>();
    const originalFlowModel = useRef<Flow>();
    const suggestedText = useRef<string>();
    const selectedClientName = useRef<string>();
    const initialCategoriesRef = useRef<any[]>([]);
    const showEditForm = useRef<boolean>(false);
    const selectedNodeMetadata = useRef<{ nodeId: string, metadata: any, fileName: string }>();
    const selectedModel = useRef<Flow>();

    useEffect(() => {
        getFlowModel();
    }, [syntaxTree]);

    useEffect(() => {
        rpcClient.onParentPopupSubmitted((parent: ParentPopupData) => {
            if (parent.artifactType === DIRECTORY_MAP.FUNCTION || parent.artifactType === DIRECTORY_MAP.NP_FUNCTION || parent.artifactType === DIRECTORY_MAP.DATA_MAPPER) {
                handleOnSelectNode(selectedNodeMetadata.current.nodeId, selectedNodeMetadata.current.metadata, selectedNodeMetadata.current.fileName);
            } else {
                console.log(">>> on parent popup submitted", parent);
                if (!topNodeRef.current || !targetRef.current) {
                    console.error(">>> No parent or target found");
                    return;
                }
                setShowProgressIndicator(true);
                fetchNodesAndAISuggestions(topNodeRef.current, targetRef.current, false, false);
            }
        });
    }, [rpcClient]);

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
                        if (model?.flowModel) {
                            setModel(model.flowModel);
                            onReady(model.flowModel.fileName);
                        }
                    })
                    .finally(() => {
                        setShowProgressIndicator(false);
                        onReady(undefined);
                    });
            });
    };

    useEffect(() => {
        if (model && selectedNodeRef.current?.codedata?.lineRange?.startLine && sidePanelView === SidePanelView.FORM) {
            const matchingNode = findNodeByStartLine(model, selectedNodeRef.current.codedata.lineRange.startLine);
            console.log(">>> Matching node", matchingNode);

            // Only update refs if we found a matching node and it's different from the current one
            if (matchingNode && matchingNode.id !== selectedNodeRef.current.id) {
                selectedNodeRef.current = matchingNode;
                targetRef.current = matchingNode.codedata.lineRange;
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

        // restore original model
        if (originalFlowModel.current) {
            getFlowModel();
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

    const handleSearchNpFunction = async (searchText: string, functionType: FUNCTION_TYPE) => {
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
            searchKind: "NP_FUNCTION",
        };
        console.log(">>> Search np function request", request);
        setShowProgressIndicator(true);
        rpcClient
            .getBIDiagramRpcClient()
            .search(request)
            .then((response) => {
                console.log(">>> Searched List of np functions", response);
                setCategories(
                    convertFunctionCategoriesToSidePanelCategories(response.categories as Category[], functionType)
                );
                setSidePanelView(SidePanelView.NP_FUNCTION_LIST);
                setShowSidePanel(true);
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });
    };

    const handleSearchFunction = async (searchText: string, functionType: FUNCTION_TYPE) => {
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
            searchKind: "FUNCTION",
        };
        console.log(">>> Search function request", request);
        setShowProgressIndicator(true);
        rpcClient
            .getBIDiagramRpcClient()
            .search(request)
            .then((response) => {
                console.log(">>> Searched List of functions", response);
                setCategories(
                    convertFunctionCategoriesToSidePanelCategories(response.categories as Category[], functionType)
                );
                setSidePanelView(
                    functionType === FUNCTION_TYPE.REGULAR
                        ? SidePanelView.FUNCTION_LIST
                        : SidePanelView.DATA_MAPPER_LIST
                );
                setShowSidePanel(true);
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });
    };

    const handleOnSelectNode = (nodeId: string, metadata?: any, fileName?: string) => {
        selectedNodeMetadata.current = { nodeId, metadata, fileName: model?.fileName || fileName };
        const { node, category } = metadata as { node: AvailableNode; category?: string };
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

    const handleOnFormSubmit = (updatedNode?: FlowNode, isDataMapperFormUpdate?: boolean) => {
        if (!updatedNode) {
            console.log(">>> No updated node found");
            updatedNode = selectedNodeRef.current;
        }
        setShowProgressIndicator(true);
        rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({
                filePath: model.fileName,
                flowNode: updatedNode,
                isFunctionNodeUpdate: isDataMapperFormUpdate,
            })
            .then((response) => {
                console.log(">>> Updated source code", response);
                if (response.artifacts.length > 0) {
                    selectedNodeRef.current = undefined;
                    handleOnCloseSidePanel();
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
                return;
            }
        }
        // Get the updated component and update the location
        const artifact = deleteNodeResponse.artifacts.at(0);
        await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: artifact.path, position: artifact.position } });

        selectedNodeRef.current = undefined;
        handleOnCloseSidePanel();
        setShowProgressIndicator(false);
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
            .then((response) => {
                if (response.artifacts.length > 0) {
                    selectedNodeRef.current = undefined;
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
                // const nodesWithCustomForms = ["IF", "FORK"];
                // if (!response.flowNode.properties && !nodesWithCustomForms.includes(response.flowNode.codedata.node)) {
                //     console.log(">>> Node doesn't have properties. Don't show edit form", response.flowNode);
                //     setShowProgressIndicator(false);
                //     showEditForm.current = false;
                //     return;
                // }

                nodeTemplateRef.current = response.flowNode;
                showEditForm.current = true;
                setSidePanelView(SidePanelView.FORM);
                setShowSidePanel(true);
            })
            .finally(() => {
                setShowProgressIndicator(false);
            });
    };

    const handleOnFormBack = () => {
        if (
            sidePanelView === SidePanelView.FUNCTION_LIST ||
            sidePanelView === SidePanelView.DATA_MAPPER_LIST ||
            sidePanelView === SidePanelView.NP_FUNCTION_LIST
        ) {
            setCategories(initialCategoriesRef.current);
            setSidePanelView(SidePanelView.NODE_LIST);
        } else {
            setSidePanelView(SidePanelView.NODE_LIST);
            setSubPanel({ view: SubPanelView.UNDEFINED });
        }
        selectedNodeRef.current = undefined;
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
        }
    };

    const handleOnAddTool = (node: FlowNode) => {
        console.log(">>> Add tool called", node);
        selectedNodeRef.current = node;
        selectedClientName.current = "Add Tool";

        // Open the tool selection panel
        setShowProgressIndicator(true);

        // This would call the API to fetch tools in a real implementation
        setTimeout(() => {
            // For now, just use a dummy category
            const toolCategories: PanelCategory[] = [
                {
                    title: "Tools",
                    description: "Tools available for the agent",
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
            setSidePanelView(SidePanelView.ADD_TOOL);
            setShowSidePanel(true);
            setShowProgressIndicator(false);
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

    const handleOnDeleteTool = async (tool: ToolData, node: FlowNode) => {
        console.log(">>> Delete tool called", tool, node);
        selectedNodeRef.current = node;
        setShowProgressIndicator(true);
        try {
            const agentNode = await findAgentNodeFromAgentCallNode(node, rpcClient);
            const updatedAgentNode = await removeToolFromAgentNode(agentNode, tool.name);
            const agentFilePath = await getAgentFilePath(rpcClient);
            // Generate the source code
            const agentResponse = await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: agentFilePath, flowNode: updatedAgentNode });
            console.log(">>> response getSourceCode after tool deletion", { agentResponse });
        } catch (error) {
            console.error("Error deleting tool:", error);
            alert(`Failed to remove tool "${tool.name}". Please try again.`);
        } finally {
            setShowProgressIndicator(false);
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
                onSelectTool: handleOnSelectTool,
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
                    {!model && (
                        <SpinnerContainer>
                            <ProgressRing color={ThemeColors.PRIMARY} />
                        </SpinnerContainer>
                    )}
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
                // Regular callbacks
                onClose={handleOnCloseSidePanel}
                onBack={handleOnFormBack}
                onSelectNode={handleOnSelectNode}
                // Add node callbacks
                onAddConnection={handleOnAddConnection}
                onAddFunction={handleOnAddFunction}
                onAddNPFunction={handleOnAddNPFunction}
                onAddDataMapper={handleOnAddDataMapper}
                onSubmitForm={handleOnFormSubmit}
                showProgressIndicator={showProgressIndicator}
                onDiscardSuggestions={onDiscardSuggestions}
                onSubPanel={handleSubPanel}
                onUpdateExpressionField={handleUpdateExpressionField}
                onResetUpdatedExpressionField={handleResetUpdatedExpressionField}
                onSearchFunction={handleSearchFunction}
                onSearchNpFunction={handleSearchNpFunction}
                // AI Agent specific callbacks
                onEditAgent={handleEditAgent}
                onSelectTool={handleOnSelectTool}
                onDeleteTool={handleOnDeleteTool}
                onAddTool={handleOnAddTool}
            />
        </>
    );
}
