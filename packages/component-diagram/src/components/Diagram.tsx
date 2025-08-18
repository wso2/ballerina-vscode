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

import React, { useState, useEffect } from "react";
import { DiagramEngine, DiagramModel } from "@projectstorm/react-diagrams";
import { CanvasWidget } from "@projectstorm/react-canvas-core";
import {
    autoDistribute,
    calculateEntryNodeHeight,
    createNodesLink,
    createPortNodeLink,
    generateEngine,
    sortItems,
} from "../utils/diagram";
import { DiagramCanvas } from "./DiagramCanvas";
import { NodeModel } from "../utils/types";
import { NodeLinkModel } from "./NodeLink";
import { OverlayLayerModel } from "./OverlayLayer";
import { DiagramContextProvider, DiagramContextState } from "./DiagramContext";
import Controls from "./Controls";
import { CDAutomation, CDConnection, CDFunction, CDListener, CDModel, CDService, CDResourceFunction } from "@wso2/ballerina-core";
import { EntryNodeModel } from "./nodes/EntryNode";
import { ListenerNodeModel } from "./nodes/ListenerNode";
import { ConnectionNodeModel } from "./nodes/ConnectionNode";

export type GroupKey = "Query" | "Subscription" | "Mutation";
export const PREVIEW_COUNT = 2;
export const SHOW_ALL_THRESHOLD = 3;

export interface DiagramProps {
    project: CDModel;
    onListenerSelect: (listener: CDListener) => void;
    onServiceSelect: (service: CDService) => void;
    onFunctionSelect: (func: CDFunction | CDResourceFunction) => void;
    onAutomationSelect: (automation: CDAutomation) => void;
    onConnectionSelect: (connection: CDConnection) => void;
    onDeleteComponent: (component: CDListener | CDService | CDAutomation | CDConnection) => void;
}

export function Diagram(props: DiagramProps) {
    const {
        project,
        onListenerSelect,
        onServiceSelect,
        onFunctionSelect,
        onAutomationSelect,
        onConnectionSelect,
        onDeleteComponent,
    } = props;
    const [diagramEngine] = useState<DiagramEngine>(generateEngine());
    const [diagramModel, setDiagramModel] = useState<DiagramModel | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [graphQLGroupOpen, setGraphQLGroupOpen] = useState<Record<string, { Query: boolean; Subscription: boolean; Mutation: boolean }>>({
    
    });

    // Ensure every service has a default GraphQL group open state.
    // Defaults: Query = true, Subscription = false, Mutation = false
    useEffect(() => {
        if (!project) return;
        setGraphQLGroupOpen((prev) => {
            const next = { ...prev } as Record<string, { Query: boolean; Subscription: boolean; Mutation: boolean }>;
            const services = project.services ?? [];

            // Add defaults for missing services
            services.forEach((svc) => {
                if (!next[svc.uuid]) {
                    next[svc.uuid] = { Query: true, Subscription: false, Mutation: false };
                }
            });

            // Optionally remove entries for services no longer present
            const serviceIds = new Set(services.map((s) => s.uuid));
            Object.keys(next).forEach((id) => {
                if (!serviceIds.has(id)) {
                    delete next[id];
                }
            });

            return next;
        });
    }, [project]);

    useEffect(() => {
        if (diagramEngine) {
            const { nodes, links } = getDiagramData();
            drawDiagram(nodes, links);
            autoDistribute(diagramEngine);
        }
    }, [project, expandedNodes, graphQLGroupOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (diagramEngine?.getCanvas()?.getBoundingClientRect) {
                diagramEngine.zoomToFitNodes({ margin: 40, maxZoom: 1 });
                diagramEngine.repaintCanvas();
            }
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [diagramEngine, diagramModel]);

    const handleToggleNodeExpansion = (nodeId: string) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    const handleToggleGraphQLGroup = (serviceUuid: string, group: "Query" | "Subscription" | "Mutation") => {
        setGraphQLGroupOpen(prev => {
            const current = prev[serviceUuid] ?? { Query: true, Subscription: false, Mutation: false };
            const next = { ...current, [group]: !current[group] } as { Query: boolean; Subscription: boolean; Mutation: boolean };
            return { ...prev, [serviceUuid]: next };
        });
    };

    const getDiagramData = () => {
        const nodes: NodeModel[] = [];
        const links: NodeLinkModel[] = [];

        // filtered autogenerated connections
        const filteredConnections = project.connections?.filter((connection) => !connection.symbol?.startsWith("_"));
        // Sort and create connections
        const sortedConnections = sortItems(filteredConnections || []) as CDConnection[];
        sortedConnections.forEach((connection, index) => {
            const node = new ConnectionNodeModel(connection);
            // Set initial Y position for connections
            node.setPosition(0, 100 + index * 100);
            nodes.push(node);
        });

        let startY = 100;

        // Sort services by sortText before creating nodes
        const sortedServices = sortItems(project.services || []) as CDService[];
        sortedServices.forEach((service) => {
            // Calculate height based on visible functions and expansion state
            const totalFunctions = service.remoteFunctions.length + service.resourceFunctions.length;
            const isExpanded = expandedNodes.has(service.uuid);
            const nodeHeight = calculateEntryNodeHeight(totalFunctions, isExpanded);

            // Create entry node with calculated height
            const node = new EntryNodeModel(service, "service");
            node.height = nodeHeight;
            node.setPosition(0, startY);
            nodes.push(node);

            startY += nodeHeight + 16;

            // Determine visible and hidden functions using utility (GraphQL-aware, honors open/closed group state)
            const { visible: visibleFunctions, hidden: hiddenFunctions } = partitionServiceFunctions(
                { service, expandedNodes, groupOpen: graphQLGroupOpen[service.uuid] ?? { Query: true, Subscription: false, Mutation: false } }            );

            // Create connections for visible functions
            const visibleFuncsArray = Array.isArray(visibleFunctions)
                ? visibleFunctions
                : Object.values(visibleFunctions).flat();
            visibleFuncsArray.forEach((func) => {
                func.connections?.forEach((connectionUuid) => {
                    const connectionNode = nodes.find((node) => node.getID() === connectionUuid);
                    if (connectionNode) {
                        const port = node.getFunctionPort(func);
                        if (port) {
                            const link = createPortNodeLink(port, connectionNode);
                            if (link) {
                                links.push(link);
                            }
                        }
                    }
                });
            });

            // Create connections for hidden functions
            const isGraphQL = service.type === "graphql:Service";
            if (!isGraphQL) {
                // Non-GraphQL: attach all hidden to the single view-all port
                const shouldLinkHiddenToViewAll =
                    Array.isArray(hiddenFunctions) &&
                    hiddenFunctions.length > 0 &&
                    node.getViewAllResourcesPort();
                if (shouldLinkHiddenToViewAll) {
                    const viewAllPort = node.getViewAllResourcesPort();
                    hiddenFunctions.forEach((func) => {
                        func.connections?.forEach((connectionUuid) => {
                            const connectionNode = nodes.find((node) => node.getID() === connectionUuid);
                            if (connectionNode && viewAllPort) {
                                const link = createPortNodeLink(viewAllPort, connectionNode);
                                if (link) {
                                    links.push(link);
                                }
                            }
                        });
                    });
                }
            } else {
                // GraphQL: attach hidden functions per group to the corresponding group port
                for (const group of ["Query", "Subscription", "Mutation"] as const) {
                    const groupPort = node.getGraphQLGroupPort(group);
                    hiddenFunctions[group].forEach((func) => {
                        func.connections?.forEach((connectionUuid) => {
                            const connectionNode = nodes.find((node) => node.getID() === connectionUuid);
                            if (connectionNode && groupPort) {
                                const link = createPortNodeLink(groupPort, connectionNode);
                                if (link) {
                                    links.push(link);
                                }
                            }
                        });
                    });
                }
            }
        });

        // create automation
        const automation = project.automation;
        if (automation) {
            const automationNode = new EntryNodeModel(automation, "automation");
            nodes.push(automationNode);
            // link connections
            automation.connections.forEach((connectionUuid) => {
                const connectionNode = nodes.find((node) => node.getID() === connectionUuid);
                if (connectionNode) {
                    const link = createNodesLink(automationNode, connectionNode);
                    if (link) {
                        links.push(link);
                    }
                }
            });
        }

        // create listeners
        project.listeners?.forEach((listener) => {
            const node = new ListenerNodeModel(listener);
            nodes.push(node);
            // link services
            listener.attachedServices.forEach((serviceUuid) => {
                const serviceNode = nodes.find((node) => node.getID() === serviceUuid);
                if (serviceNode) {
                    const link = createNodesLink(node, serviceNode);
                    if (link) {
                        links.push(link);
                    }
                }
            });
        });

        return { nodes, links };
    };

    const drawDiagram = (nodes: NodeModel[], links: NodeLinkModel[]) => {
        const newDiagramModel = new DiagramModel();
        newDiagramModel.addLayer(new OverlayLayerModel());
        // add nodes and links to the diagram
        newDiagramModel.addAll(...nodes, ...links);

        diagramEngine.setModel(newDiagramModel);
        setDiagramModel(newDiagramModel);
        // registerListeners(diagramEngine);

        diagramEngine.setModel(newDiagramModel);

        // diagram paint with timeout
        setTimeout(() => {
            // remove loader overlay layer
            const overlayLayer = diagramEngine
                .getModel()
                .getLayers()
                .find((layer) => layer instanceof OverlayLayerModel);
            if (overlayLayer) {
                diagramEngine.getModel().removeLayer(overlayLayer);
            }
            if (diagramEngine?.getCanvas()?.getBoundingClientRect) {
                diagramEngine.zoomToFitNodes({ margin: 40, maxZoom: 1 });
            }
            diagramEngine.repaintCanvas();
        }, 200);
    };

    const context: DiagramContextState = {
        project,
        expandedNodes,
        graphQLGroupOpen,
        onListenerSelect,
        onServiceSelect,
        onFunctionSelect,
        onAutomationSelect,
        onConnectionSelect,
        onDeleteComponent,
        onToggleNodeExpansion: handleToggleNodeExpansion,
        onToggleGraphQLGroup: handleToggleGraphQLGroup,
    };

    return (
        <>
            <Controls engine={diagramEngine} />

            {diagramEngine && diagramModel && (
                <DiagramContextProvider value={context}>
                    <DiagramCanvas>
                        <CanvasWidget engine={diagramEngine} />
                    </DiagramCanvas>
                </DiagramContextProvider>
            )}
        </>
    );
}

function getGraphQLGroupLabel(accessor?: string, name?: string): GroupKey | null {
    if (accessor === "get") return "Query";
    if (accessor === "subscribe") return "Subscription";
    if (!accessor && name) return "Mutation";
    return null;
}

function partitionServiceFunctions(
{ service, expandedNodes, groupOpen }: { service: CDService; expandedNodes: Set<string>; groupOpen?: { Query: boolean; Subscription: boolean; Mutation: boolean; }; }
): { visible: Record<GroupKey, Array<CDFunction | CDResourceFunction>>; hidden: Record<GroupKey, Array<CDFunction | CDResourceFunction>> } | { visible: Array<CDFunction | CDResourceFunction>; hidden: Array<CDFunction | CDResourceFunction> } {
    const serviceFunctions: Array<CDFunction | CDResourceFunction> = [];
    if (service.remoteFunctions?.length) serviceFunctions.push(...service.remoteFunctions);
    if (service.resourceFunctions?.length) serviceFunctions.push(...service.resourceFunctions);

    const isGraphQL = service.type === "graphql:Service";

    if (!isGraphQL) {
        const isExpanded = expandedNodes.has(service.uuid);
        if (serviceFunctions.length <= SHOW_ALL_THRESHOLD || isExpanded) {
            return { visible: serviceFunctions, hidden: [] };
        }
        return { visible: serviceFunctions.slice(0, PREVIEW_COUNT), hidden: serviceFunctions.slice(PREVIEW_COUNT) };
    }

    // GraphQL: compute per-group visibility, honoring collapsed (closed) groups
    const grouped = serviceFunctions.reduce((acc, fn) => {
        const accessor = (fn as CDResourceFunction).accessor;
        const name = (fn as CDFunction).name;
        const group = getGraphQLGroupLabel(accessor, name);
        if (!group) return acc;
        (acc[group] ||= []).push(fn);
        return acc;
    }, {} as Record<GroupKey, Array<CDFunction | CDResourceFunction>>);

    const visible: Record<GroupKey, Array<CDFunction | CDResourceFunction>> = {
        Query: [],
        Subscription: [],
        Mutation: [],
    };
    const hidden: Record<GroupKey, Array<CDFunction | CDResourceFunction>> = {
        Query: [],
        Subscription: [],
        Mutation: [],
    };

    (Object.keys(grouped) as GroupKey[]).forEach((group) => {
        const items = grouped[group];
        const isOpen = groupOpen ? !!groupOpen[group] : true; // default open if not provided
        if (!isOpen) {
            // collapsed group: hide all
            hidden[group].push(...items);
            return;
        }
        const groupExpanded = expandedNodes.has(service.uuid + group);
        if (items.length <= SHOW_ALL_THRESHOLD || groupExpanded) {
            visible[group].push(...items);
        } else {
            visible[group].push(...items.slice(0, PREVIEW_COUNT));
            hidden[group].push(...items.slice(PREVIEW_COUNT));
        }
    });

    return { visible, hidden };
}
