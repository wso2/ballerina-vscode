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
import createEngine, { DiagramEngine, DiagramModel, NodeModel } from "@projectstorm/react-diagrams";
import { OverlayLayerFactory } from "../components/OverlayLayer";
import { DagreEngine } from "../resources/dagre/DagreEngine";
import { NodeLinkFactory } from "../components/NodeLink";
import { NodePortFactory } from "../components/NodePort";
import { EmptyNodeFactory } from "../components/nodes/EmptyNode";
import { ParticipantNodeFactory } from "../components/nodes/ParticipantNode";
import {
    BBox,
    DiagramElement,
    Flow,
    IfViewState,
    Node,
    NodeBranch,
    NodeViewState,
    Participant,
    ParticipantViewState,
} from "./types";
import { kebabCase } from "lodash";
import { DiagramElementKindChecker } from "./check-kind-utils";
import { NODE_HEIGHT, NODE_WIDTH, PARTICIPANT_NODE_HEIGHT, PARTICIPANT_NODE_WIDTH, PARTICIPANT_TAIL_MIN_HEIGHT } from "../resources/constants";
import { PointNodeFactory } from "../components/nodes/PointNode";
import { ContainerNodeFactory } from "../components/nodes/ContainerNode";
import { LifeLineNodeFactory } from "../components/nodes/LifeLineNode";

export function generateEngine(): DiagramEngine {
    const engine = createEngine({
        registerDefaultDeleteItemsAction: false,
        registerDefaultZoomCanvasAction: false,
        registerDefaultPanAndZoomCanvasAction: true,
    });

    engine.getPortFactories().registerFactory(new NodePortFactory());
    engine.getLinkFactories().registerFactory(new NodeLinkFactory());
    engine.getNodeFactories().registerFactory(new PointNodeFactory());
    engine.getNodeFactories().registerFactory(new EmptyNodeFactory());
    engine.getNodeFactories().registerFactory(new ParticipantNodeFactory());
    engine.getNodeFactories().registerFactory(new ContainerNodeFactory());
    engine.getNodeFactories().registerFactory(new LifeLineNodeFactory());
    engine.getLayerFactories().registerFactory(new OverlayLayerFactory());

    return engine;
}

export function registerListeners(engine: DiagramEngine) {
    engine.getModel().registerListener({
        offsetUpdated: (event: any) => {
            saveDiagramZoomAndPosition(engine.getModel());
        },
    });
}

export function genDagreEngine() {
    return new DagreEngine({
        graph: {
            rankdir: "TB",
            nodesep: 60,
            ranksep: 60,
            marginx: 50,
            marginy: 100,
            ranker: "tight-tree",
        },
    });
}

export function getEntryParticipant(flow: Flow): Participant {
    return flow.participants?.find(
        (participant) =>
            flow.location &&
            participant.location &&
            flow.location.startLine.line === participant.location.startLine.line &&
            flow.location.startLine.offset === participant.location.startLine.offset &&
            flow.location.endLine.line === participant.location.endLine.line &&
            flow.location.endLine.offset === participant.location.endLine.offset,
    );
}

export function getParticipantId(model: Participant, ...suffixes: string[]) {
    const suffix = suffixes.join("-");
    return kebabCase(`participant-${model.id}-${suffix}`);
}

export function getBranchId(node: NodeBranch, parent: Node) {
    return getNodeId(parent, node.label);
}

export function getNodeId(model: Node, ...suffixes: string[]) {
    if (!model?.location) {
        console.warn(">> Node or location not found", model, suffixes);
        return "";
    }
    const suffix = suffixes.join("-");
    return kebabCase(
        `node-${model.kind}-${model.location.startLine.line}-${model.location.startLine.offset}-${model.location.endLine.line}-${model.location.endLine.offset}-${suffix}`,
    );
}

export function getCallerNodeId(parent: DiagramElement, ...suffixes: string[]) {
    if (!parent?.location) {
        console.warn(">> Node or location not found", parent, suffixes);
        return "";
    }
    if (DiagramElementKindChecker.isParticipant(parent)) {
        return getParticipantId(parent, ...suffixes);
    }
    return getNodeId(parent, ...suffixes);
}

// save diagram zoom level and position to local storage
export const saveDiagramZoomAndPosition = (model: DiagramModel) => {
    const zoomLevel = model.getZoomLevel();
    const offsetX = model.getOffsetX();
    const offsetY = model.getOffsetY();

    // Store them in localStorage
    localStorage.setItem("sq-diagram-zoom-level", JSON.stringify(zoomLevel));
    localStorage.setItem("sq-diagram-offset-x", JSON.stringify(offsetX));
    localStorage.setItem("sq-diagram-offset-y", JSON.stringify(offsetY));
};

// load diagram zoom level and position from local storage
export const loadDiagramZoomAndPosition = (engine: DiagramEngine, node?: NodeModel) => {
    const zoomLevel = JSON.parse(localStorage.getItem("sq-diagram-zoom-level") || "100");

    const offsetX = JSON.parse(localStorage.getItem("sq-diagram-offset-x") || "0");
    const offsetY = JSON.parse(localStorage.getItem("sq-diagram-offset-y") || "0");

    engine.getModel().setZoomLevel(zoomLevel);
    engine.getModel().setOffset(offsetX, offsetY);
};

// check local storage has zoom level and position
export const hasDiagramZoomAndPosition = (file: string) => {
    return localStorage.getItem("sq-diagram-file-path") === file;
};

export const resetDiagramZoomAndPosition = (file?: string) => {
    const container = document.getElementById("bi-diagram-canvas");
    const containerWidth = container ? container.offsetWidth : window.innerWidth;
    const center = containerWidth / 2;

    if (file) {
        localStorage.setItem("sq-diagram-file-path", file);
    }
    localStorage.setItem("sq-diagram-zoom-level", "100");
    localStorage.setItem("sq-diagram-offset-x", center.toString());
    localStorage.setItem("sq-diagram-offset-y", "0");
};

export const clearDiagramZoomAndPosition = () => {
    localStorage.removeItem("sq-diagram-file-path");
    localStorage.removeItem("sq-diagram-zoom-level");
    localStorage.removeItem("sq-diagram-offset-x");
    localStorage.removeItem("sq-diagram-offset-y");
};

// traverse utils
export function getInitialNodeViewState(
    id: string,
    startParticipantId: string,
    endParticipantId: string,
): NodeViewState {
    return {
        callNodeId: id,
        bBox: {
            x: 0,
            y: 0,
            h: 0,
            w: 0,
        },
        points: {
            start: {
                bBox: {
                    x: 0,
                    y: 0,
                    h: NODE_HEIGHT,
                    w: NODE_WIDTH,
                },
                participantId: startParticipantId,
            },
            end: {
                bBox: {
                    x: 0,
                    y: 0,
                    h: NODE_HEIGHT,
                    w: NODE_WIDTH,
                },
                participantId: endParticipantId,
            },
            returnStart: {
                bBox: {
                    x: 0,
                    y: 0,
                    h: NODE_HEIGHT,
                    w: NODE_WIDTH,
                },
                participantId: endParticipantId,
            },
            returnEnd: {
                bBox: {
                    x: 0,
                    y: 0,
                    h: NODE_HEIGHT,
                    w: NODE_WIDTH,
                },
                participantId: startParticipantId,
            },
        },
    };
}

export function getInitialParticipantViewState(
    index: number,
    height = PARTICIPANT_NODE_HEIGHT,
    width = PARTICIPANT_NODE_WIDTH,
): ParticipantViewState {
    return {
        bBox: {
            x: 0,
            y: 0,
            h: height,
            w: width,
        },
        xIndex: index,
        lifelineHeight: PARTICIPANT_TAIL_MIN_HEIGHT,
    };
}

export function getInitialIfNodeViewState(id: string, height = NODE_HEIGHT, width = NODE_WIDTH): IfViewState {
    return {
        blockId: id,
        bBox: {
            x: 0,
            y: 0,
            h: height,
            w: width,
        },
    };
}

export function getElementBBox(element: DiagramElement): BBox {
    if (DiagramElementKindChecker.isParticipant(element)) {
        return element.viewState.bBox;
    }

    if (DiagramElementKindChecker.isNode(element)) {
        return element.viewStates.at(0).bBox; // todo: fix this logic
    }

    console.warn(">> Parent BBox not found. using default bBox values", element);
    return {
        x: 0,
        y: 0,
        h: 0,
        w: 0,
    };
}

export function calculateParticipantLifelineInfo(participant: Participant) {
    const renderingNodes = participant.nodes?.filter((node) => node.targetId) as Node[];
    if (!renderingNodes) {
        return {
            height: 0,
            startPoint: undefined,
            endPoint: undefined,
        };
    }
    const firstNode = renderingNodes.at(0);
    const lastNode = renderingNodes.at(-1);

    if (!firstNode?.viewStates?.at(0)?.points?.start || !lastNode?.viewStates?.at(0)?.points?.returnEnd) {
        return {
            height: 0,
            startPoint: undefined,
            endPoint: undefined,
        };
    }

    const startPointViewState = firstNode.viewStates.at(0).points.start;
    const endPointViewState = lastNode.viewStates.at(0).points.returnEnd;

    const height = endPointViewState.bBox.y - startPointViewState.bBox.y + NODE_HEIGHT;
    return {
        height,
        startPoint: startPointViewState,
        endPoint: endPointViewState,
    };
}
