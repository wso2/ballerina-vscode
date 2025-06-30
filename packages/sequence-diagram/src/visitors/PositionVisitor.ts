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
    CONTAINER_PADDING,
    INTERACTION_GAP_Y,
    INTERACTION_GROUP_GAP_Y,
    INTERACTION_NODE_HEIGHT,
    PARTICIPANT_GAP_X,
    PARTICIPANT_NODE_WIDTH,
} from "../resources/constants";
import { DiagramElementKindChecker } from "../utils/check-kind-utils";
import { calculateParticipantLifelineInfo, getBranchId, getCallerNodeId, getElementBBox, getEntryParticipant, getNodeId } from "../utils/diagram";
import { ConsoleColor, logger } from "../utils/logger";
import { traverseParticipant } from "../utils/traverse-utils";
import { Participant, Node, DiagramElement, Flow, IfViewState, NodeBranch, NodeBranchType } from "../utils/types";
import { BaseVisitor } from "./BaseVisitor";

export class PositionVisitor implements BaseVisitor {
    private flow: Flow;
    private callerId: string;
    private currentParticipant: Participant | undefined;
    private entryParticipant: Participant | undefined;
    private lastInteractionY = 0;
    private lastParticipantIndex = 0;

    constructor(flow: Flow, callerId?: string, nextInteractionY = 0) {
        logger("visitor: Position factory visitor started", ConsoleColor.PINK);
        this.flow = flow;
        this.callerId = callerId;
        this.entryParticipant = getEntryParticipant(flow);
        this.lastInteractionY = nextInteractionY;
    }

    getLastInteractionY(): number {
        return this.lastInteractionY;
    }

    getLatestParticipantIndex(): number {
        return this.lastParticipantIndex;
    }

    beginVisitParticipant(participant: Participant): void {
        if (!participant.viewState) {
            console.warn(">> View state not found for participant", {
                index: participant.viewState.xIndex,
                participant,
            });
            return;
        }
        // Update the horizontal position of the participant node if not already set
        if (participant.viewState.xIndex) {
            participant.viewState.bBox.x =
                participant.viewState.xIndex * (PARTICIPANT_GAP_X + participant.viewState.bBox.w);
        }
        if (!this.currentParticipant) {
            this.currentParticipant = participant;
            logger(`Position visitor: new participant ${this.currentParticipant.name}`, ConsoleColor.PURPLE);
        }
        this.lastParticipantIndex = participant.viewState.xIndex;
    }

    endVisitParticipant(participant: Participant): void {
        // flow.others list as participants in the diagram
        if (this.flow.others) {
            this.flow.others.forEach((participant: Participant) => {
                if (participant.viewState.xIndex) {
                    participant.viewState.bBox.x =
                        participant.viewState.xIndex * (PARTICIPANT_GAP_X + participant.viewState.bBox.w);
                    this.lastParticipantIndex = participant.viewState.xIndex;
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

            // set lifeline height to all participant nodes
            this.flow.participants.forEach((participant: Participant) => {
                if (participant.viewState) {
                    participant.viewState.lifelineHeight = height + INTERACTION_GROUP_GAP_Y;
                }
            });
        }
    }

    gotoTargetParticipant(node: Node): void {
        if (node.targetId && this.flow?.participants) {
            // visit target participant
            const targetParticipant = this.flow.participants?.find((participant) => participant.id === node.targetId);
            if (!targetParticipant) {
                return;
            }
            const nodeId = getNodeId(node);
            const positionVisitor = new PositionVisitor(this.flow, nodeId, this.lastInteractionY);
            traverseParticipant(targetParticipant, positionVisitor, this.flow);
            this.lastInteractionY = positionVisitor.getLastInteractionY();
            const lastParticipantIndex = positionVisitor.getLatestParticipantIndex();
            if (this.lastParticipantIndex < lastParticipantIndex) {
                this.lastParticipantIndex = lastParticipantIndex;
            }
        }
    }

    beginVisitNode(node: Node, parent?: DiagramElement): void {
        if (!node.viewStates) {
            console.warn(">> View state not found for node", node);
            return;
        }

        const callNodeId = getCallerNodeId(parent, this.callerId);
        const nodeViewState = node.viewStates.find((viewState) => viewState.callNodeId === callNodeId);
        if (!nodeViewState) {
            console.warn(">> View state not found for node", node, callNodeId);
            return;
        }

        // update y with top margin
        this.lastInteractionY += INTERACTION_GAP_Y;
        if (
            nodeViewState.points.start.participantId === this.entryParticipant.id &&
            DiagramElementKindChecker.isParticipant(parent)
        ) {
            this.lastInteractionY += INTERACTION_GROUP_GAP_Y;
        }

        // position start point
        const startPointViewState = nodeViewState.points?.start;
        if (!startPointViewState) {
            console.warn(">> start point view state not found for node", node);
            return;
        }
        startPointViewState.bBox.y = this.lastInteractionY;
        // position end point
        const endPointViewState = nodeViewState.points?.end;
        if (!endPointViewState) {
            console.warn(">> end point view state not found for node", node);
            return;
        }
        endPointViewState.bBox.y = startPointViewState.bBox.y;

        // update y with node height
        this.lastInteractionY += INTERACTION_NODE_HEIGHT;

        this.gotoTargetParticipant(node);
    }

    endVisitNode(node: Node, parent?: DiagramElement): void {
        if (!node.viewStates) {
            console.warn(">> View state not found for node", node);
            return;
        }

        const callNodeId = getCallerNodeId(parent, this.callerId);
        const nodeViewState = node.viewStates.find((viewState) => viewState.callNodeId === callNodeId);
        if (!nodeViewState) {
            console.warn(">> View state not found for node", node, callNodeId);
            return;
        }

        // find target participant
        const targetParticipant = this.flow.participants.find(
            (participant) => participant.id === node.targetId,
        ) as Participant;
        if (!targetParticipant?.viewState) {
            console.warn(">> target participant view state not found", targetParticipant);
            return;
        }
        const targetParticipantBBox = getElementBBox(targetParticipant);

        // position start point
        const startPointViewState = nodeViewState.points?.start;
        if (!startPointViewState) {
            console.warn(">> start point view state not found for node", node);
            return;
        }

        // find source participant
        const sourceParticipant = this.flow.participants.find(
            (participant) => participant.id === startPointViewState.participantId,
        ) as Participant;
        if (!sourceParticipant?.viewState) {
            console.warn(">> source participant view state not found", sourceParticipant);
            return;
        }
        const sourceParticipantBBox = getElementBBox(sourceParticipant);

        startPointViewState.bBox.x = sourceParticipantBBox.x;

        // position end point
        const endPointViewState = nodeViewState.points?.end;
        if (!endPointViewState) {
            console.warn(">> end point view state not found for node", node);
            return;
        }
        endPointViewState.bBox.x = targetParticipantBBox.x;

        // update y with top margin
        this.lastInteractionY += INTERACTION_NODE_HEIGHT;

        // position return start point
        const returnStartPointViewState = nodeViewState.points?.returnStart;
        if (!returnStartPointViewState) {
            console.warn(">> return start point view state not found for node", node);
            return;
        }
        returnStartPointViewState.bBox.x = targetParticipantBBox.x;
        returnStartPointViewState.bBox.y = this.lastInteractionY;

        // position return end point
        const returnEndPointViewState = nodeViewState.points?.returnEnd;
        if (!returnEndPointViewState) {
            console.warn(">> return end point view state not found for node", node);
            return;
        }
        returnEndPointViewState.bBox.x = sourceParticipantBBox.x;
        returnEndPointViewState.bBox.y = returnStartPointViewState.bBox.y;

        // update y with node height
        this.lastInteractionY += INTERACTION_NODE_HEIGHT;
    }

    beginVisitReturn(node: Node, parent?: DiagramElement): void {
        // todo: need to implement
    }

    endVisitReturn(node: Node, parent?: DiagramElement): void {
        // todo: need to implement
    }

    updateIfBlockBranchBeginPosition(node: NodeBranch, parent: Node): void {
        if (!node.viewStates || node.viewStates.length === 0 ) {
            console.warn(">> View state not found for node", node);
            return;
        }

        const nodeId = getBranchId(node, parent);
        const nodeViewState = node.viewStates.find(
            (viewState) => (viewState as IfViewState).blockId === nodeId,
        ) as IfViewState;
        if (!nodeViewState) {
            console.warn(">> View state not found for node", node);
            return;
        }
        if (!parent || !parent.viewStates || parent.viewStates.length === 0) {
            console.warn(">> Parent not found for node", node);
            return;
        }
        const parentBBox = getElementBBox(parent);
        logger(`Position visitor: parentBBox`, ConsoleColor.PURPLE, { node, parent, parentBBox });
        nodeViewState.bBox.x = parentBBox.x;

        // add extra space for padding and margin
        this.lastInteractionY += CONTAINER_PADDING * 2;
        nodeViewState.bBox.y = this.lastInteractionY - CONTAINER_PADDING;
    }

    beginVisitIf(node: Node, parent?: DiagramElement): void {
        logger(`Position visitor: beginVisitIf ${getNodeId(node)}`, ConsoleColor.GREEN, { node });
        if (!node.viewStates) {
            console.warn(">> View state not found for node", node);
            return;
        }

        const nodeId = getNodeId(node);
        const nodeViewState = node.viewStates.find(
            (viewState) => (viewState as IfViewState).blockId === nodeId,
        ) as IfViewState;
        if (!nodeViewState) {
            console.warn(">> View state not found for node", node);
            return;
        }

        // update y with top margin
        this.lastInteractionY += CONTAINER_PADDING;
        if (this.currentParticipant.id === this.entryParticipant.id) {
            this.lastInteractionY += INTERACTION_GROUP_GAP_Y;
        }

        const parentBBox = getElementBBox(parent);
        nodeViewState.bBox.x = parentBBox.x + PARTICIPANT_NODE_WIDTH / 4;
        nodeViewState.bBox.y = this.lastInteractionY;
    }

    beginVisitThen(branch: NodeBranch, parent?: Node): void {
        logger(`Position visitor: beginVisitThen`, ConsoleColor.GREEN, { branch, parent });
        this.updateIfBlockBranchBeginPosition(branch, parent);
    }

    beginVisitElse(branch: NodeBranch, parent?: Node): void {
        logger(`Position visitor: beginVisitElse`, ConsoleColor.GREEN, { branch, parent });

        if (branch.children.length > 0) {
            this.lastInteractionY += INTERACTION_GAP_Y;
        }
        this.updateIfBlockBranchBeginPosition(branch, parent);
    }

    endVisitIf(node: Node, parent?: DiagramElement): void {
        logger(`Position visitor: endVisitIf ${getNodeId(node)}`, ConsoleColor.GREEN, { node });
        if (!node.viewStates) {
            console.warn(">> View state not found for node", node);
            return;
        }

        const nodeId = getNodeId(node);
        const nodeViewState = node.viewStates.find(
            (viewState) => (viewState as IfViewState).blockId === nodeId,
        ) as IfViewState;
        if (!nodeViewState) {
            console.warn(">> View state not found for node", node);
            return;
        }

        nodeViewState.bBox.w =
            (this.lastParticipantIndex - this.currentParticipant.viewState.xIndex) *
                (PARTICIPANT_GAP_X + PARTICIPANT_NODE_WIDTH) +
            PARTICIPANT_NODE_WIDTH / 2;

        // add extra space for padding and margin
        this.lastInteractionY += CONTAINER_PADDING;
        nodeViewState.bBox.h = this.lastInteractionY - nodeViewState.bBox.y + INTERACTION_GAP_Y;

        // update breakpoint percentage
        const elseBranch = node.branches.find(
            (branch) => branch.label.toLowerCase() === NodeBranchType.ELSE.toLowerCase(),
        ) as NodeBranch;
        if (elseBranch && elseBranch.children.length > 0) {
            const elseBranchId = getBranchId(elseBranch, node);
            const elseBranchViewState = elseBranch.viewStates.find(
                (viewState) => (viewState as IfViewState).blockId === elseBranchId,
            ) as IfViewState;
            logger(`Position visitor: elseBranchViewState`, ConsoleColor.RED, {
                elseBranch,
                elseBranchId,
                elseBranchViewState,
            });
            if (elseBranchViewState) {
                nodeViewState.breakpointPercent =
                    ((elseBranchViewState.bBox.y - nodeViewState.bBox.y) / nodeViewState.bBox.h) * 100;
            }
        }
    }

    endVisitThen(branch: NodeBranch, parent?: Node): void {
        // todo: need to implement
    }

    endVisitElse(branch: NodeBranch, parent?: Node): void {
        // todo: need to implement
    }

    beginVisitWhile(node: Node, parent?: DiagramElement): void {
        // todo: need to implement
    }
}
