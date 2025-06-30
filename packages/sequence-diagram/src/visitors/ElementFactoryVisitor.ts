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

import {
    DiagramElement,
    Flow,
    IfViewState,
    InteractionType,
    Node,
    NodeBranch,
    NodeModel,
    Participant,
    ViewStateLabel,
} from "../utils/types";
import { BaseVisitor } from "./BaseVisitor";
import { NodeLinkModel } from "../components/NodeLink";
import { ParticipantNodeModel } from "../components/nodes/ParticipantNode";
import { PointNodeModel } from "../components/nodes/PointNode";
import { calculateParticipantLifelineInfo, getBranchId, getCallerNodeId, getNodeId } from "../utils/diagram";
import { NODE_HEIGHT, NODE_WIDTH, PARTICIPANT_NODE_WIDTH } from "../resources/constants";
import { ConsoleColor, logger } from "../utils/logger";
import { traverseParticipant } from "../utils/traverse-utils";
import { ContainerNodeModel } from "../components/nodes/ContainerNode";
import { LifeLineNodeModel } from "../components/nodes/LifeLineNode";

export class ElementFactoryVisitor implements BaseVisitor {
    private flow: Flow;
    private callerId: string;
    nodes: NodeModel[] = [];
    links: NodeLinkModel[] = [];

    constructor(flow: Flow, callerId?: string) {
        logger("visitor: Element factory visitor started", ConsoleColor.PINK);
        this.flow = flow;
        this.callerId = callerId;
    }

    getNodes(): NodeModel[] {
        // sending participant nodes first to render them first in canvas
        return this.nodes;
    }

    getLinks(): NodeLinkModel[] {
        return this.links;
    }

    beginVisitParticipant(participant: Participant): void {
        if (!participant.viewState) {
            console.warn(">> View state not found for participant", participant);
            return;
        }

        const nodeModel = new ParticipantNodeModel(participant);
        nodeModel.setPosition(participant.viewState.bBox.x, participant.viewState.bBox.y);
        nodeModel.updateDimensions({ width: participant.viewState.bBox.w, height: participant.viewState.bBox.h });
        this.nodes.push(nodeModel);
    }

    endVisitParticipant(participant: Participant): void {
        // flow.others list as participants in the diagram
        if (this.flow.others) {
            this.flow.others.forEach((participant: Participant) => {
                if (participant.viewState) {
                    const nodeModel = new ParticipantNodeModel(participant);
                    nodeModel.setPosition(participant.viewState.bBox.x, participant.viewState.bBox.y);
                    nodeModel.updateDimensions({
                        width: participant.viewState.bBox.w,
                        height: participant.viewState.bBox.h,
                    });
                    this.nodes.push(nodeModel);
                }
            });
        }

        if (!this.callerId) {
            // start participant
            // create new lifeline box
            const { height, startPoint, endPoint } = calculateParticipantLifelineInfo(participant);
            if (height === 0 || !startPoint || !endPoint) {
                console.warn(">> Start or end point not found for participant", participant);
                return;
            }
            const startLifeLineNodeModel = new LifeLineNodeModel("start-participant-lifeline", height);
            startLifeLineNodeModel.setPosition(
                startPoint.bBox.x + (PARTICIPANT_NODE_WIDTH - NODE_WIDTH) / 2,
                startPoint.bBox.y,
            );
            this.nodes.push(startLifeLineNodeModel);
        }
    }

    beginVisitNode(node: Node, parent?: DiagramElement): void {
        if (!node.viewStates) {
            console.warn(">> View state not found for interaction", node);
            return;
        }

        // function call without target id
        if (node.interactionType === InteractionType.FUNCTION_CALL && !node.targetId) {
            console.warn(">> Function call without target id", node);
            return;
        }

        const callNodeId = getCallerNodeId(parent, this.callerId);
        const nodeViewState = node.viewStates.find((viewState) => viewState.callNodeId === callNodeId);
        if (!nodeViewState) {
            console.warn(">> View state not found for node", node, callNodeId);
            return;
        }

        // create start point node
        const startPointViewState = nodeViewState.points?.start;
        if (!startPointViewState) {
            console.warn(">> start point view state not found for node", node);
            return;
        }
        const startNodeModel = new PointNodeModel(getNodeId(node, callNodeId, ViewStateLabel.START_POINT), false);
        startNodeModel.setPosition(
            startPointViewState.bBox.x + (PARTICIPANT_NODE_WIDTH - NODE_WIDTH) / 2,
            startPointViewState.bBox.y,
        );
        this.nodes.push(startNodeModel);

        // create end point node
        const endPointViewState = nodeViewState.points?.end;
        if (!endPointViewState) {
            console.warn(">> end point view state not found for node", node);
            return;
        }
        const endNodeModel = new PointNodeModel(getNodeId(node, callNodeId, ViewStateLabel.END_POINT), false);
        endNodeModel.setPosition(
            endPointViewState.bBox.x + (PARTICIPANT_NODE_WIDTH - NODE_WIDTH) / 2,
            endPointViewState.bBox.y,
        );
        this.nodes.push(endNodeModel);

        // create link between start and end
        let label = "";
        if (node.interactionType === InteractionType.FUNCTION_CALL) {
            const params = node.properties.params?.map((param) => param.value).join(", ");
            label = `${node.properties.name?.value} (${params})`;
        } else if (node.interactionType === InteractionType.ENDPOINT_CALL) {
            label = `${node.properties.name?.value}`;
        }

        const link = new NodeLinkModel(label);
        link.setSourcePort(startNodeModel.getRightPort());
        link.setTargetPort(endNodeModel.getLeftPort());
        link.setSourceNode(startNodeModel);
        link.setTargetNode(endNodeModel);
        this.links.push(link);

        // create return start point node
        const returnStartPointViewState = nodeViewState.points?.returnStart;
        if (!returnStartPointViewState) {
            console.warn(">> Return start point view state not found for node", node);
            return;
        }
        const returnStartNodeModel = new PointNodeModel(
            getNodeId(node, callNodeId, ViewStateLabel.RETURN_START_POINT),
            false,
        );
        returnStartNodeModel.setPosition(
            returnStartPointViewState.bBox.x + (PARTICIPANT_NODE_WIDTH - NODE_WIDTH) / 2,
            returnStartPointViewState.bBox.y,
        );
        this.nodes.push(returnStartNodeModel);

        // create return end point node
        const returnEndPointViewState = nodeViewState.points?.returnEnd;
        if (!returnEndPointViewState) {
            console.warn(">> Return end point view state not found for node", node);
            return;
        }
        const returnEndNodeModel = new PointNodeModel(
            getNodeId(node, callNodeId, ViewStateLabel.RETURN_END_POINT),
            false,
        );
        returnEndNodeModel.setPosition(
            returnEndPointViewState.bBox.x + (PARTICIPANT_NODE_WIDTH - NODE_WIDTH) / 2,
            returnEndPointViewState.bBox.y,
        );
        this.nodes.push(returnEndNodeModel);

        // create link between return start and return end
        const returnLink = new NodeLinkModel({ variant: true });
        returnLink.setSourcePort(returnStartNodeModel.getLeftPort());
        returnLink.setTargetPort(returnEndNodeModel.getRightPort());
        returnLink.setSourceNode(returnStartNodeModel);
        returnLink.setTargetNode(returnEndNodeModel);
        this.links.push(returnLink);

        // add lifeline box
        const startLifeLineHeight = returnEndPointViewState.bBox.y - startPointViewState.bBox.y + NODE_HEIGHT;
        const startLifeLineNodeModel = new LifeLineNodeModel(
            getNodeId(node, callNodeId, ViewStateLabel.START_LIFELINE),
            startLifeLineHeight,
        );
        startLifeLineNodeModel.setPosition(
            startPointViewState.bBox.x + (PARTICIPANT_NODE_WIDTH - NODE_WIDTH) / 2,
            startPointViewState.bBox.y,
        );
        this.nodes.push(startLifeLineNodeModel);
        // const endLifeLineHeight = endPointViewState.bBox.y - returnStartPointViewState.bBox.y + NODE_HEIGHT;
        const endLifeLineNodeModel = new LifeLineNodeModel(
            getNodeId(node, callNodeId, ViewStateLabel.END_LIFELINE),
            startLifeLineHeight,
        );
        endLifeLineNodeModel.setPosition(
            endPointViewState.bBox.x + (PARTICIPANT_NODE_WIDTH - NODE_WIDTH) / 2,
            endPointViewState.bBox.y,
        );
        this.nodes.push(endLifeLineNodeModel);

        // make as rendered
        // (nodeViewState as any).rendered = true;

        if (node.targetId && this.flow?.participants) {
            // visit target participant
            const targetParticipant = this.flow.participants?.find((participant) => participant.id === node.targetId);
            if (!targetParticipant) {
                return;
            }
            const nodeId = getNodeId(node);
            const elementVisitor = new ElementFactoryVisitor(this.flow, nodeId);
            traverseParticipant(targetParticipant, elementVisitor, this.flow);
            const nodes = elementVisitor.getNodes();
            this.nodes.push(...nodes);
            const links = elementVisitor.getLinks();
            this.links.push(...links);
        }
    }

    generateIfBlockBranchModel(node: NodeBranch, parent: Node): void {
        if (!node.viewStates || node.viewStates.length === 0) {
            console.warn(">> View state not found for if block", node);
            return;
        }

        const nodeId = getBranchId(node, parent);
        const nodeViewState = node.viewStates.find(
            (viewState) => (viewState as IfViewState).blockId === nodeId,
        ) as IfViewState;
        if (!nodeViewState) {
            console.warn(">> View state not found for if block", node);
            return;
        }
        const nodeModel = new ContainerNodeModel(nodeId, nodeViewState.bBox.w, nodeViewState.bBox.h);
        nodeModel.setPosition(nodeViewState.bBox.x, nodeViewState.bBox.y);
        this.nodes.push(nodeModel);
    }

    beginVisitIf(node: Node, parent?: DiagramElement): void {
        logger(`Element visitor: beginVisitIf ${getNodeId(node)}`, ConsoleColor.GREEN, { node });
        if (!node.viewStates) {
            console.warn(">> View state not found for if block", node);
            return;
        }

        const nodeId = getNodeId(node);
        const nodeViewState = node.viewStates.find(
            (viewState) => (viewState as IfViewState).blockId === nodeId,
        ) as IfViewState;
        if (!nodeViewState) {
            console.warn(">> View state not found for if block", node);
            return;
        }

        const nodeModel = new ContainerNodeModel(
            nodeId,
            nodeViewState.bBox.w,
            nodeViewState.bBox.h,
            nodeViewState.breakpointPercent,
            `IF [${node.properties.condition.value}]`,
        );
        nodeModel.setPosition(nodeViewState.bBox.x, nodeViewState.bBox.y);
        this.nodes.push(nodeModel);
    }

    beginVisitThen(node: NodeBranch, parent: Node): void {
        // todo: need to implement
    }

    beginVisitElse(node: NodeBranch, parent: Node): void {
        // todo: need to implement
    }

    beginVisitReturn(node: Node, parent?: DiagramElement): void {
        // skip view state initialization for return nodes
    }
}
