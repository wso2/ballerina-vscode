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
    getBranchId,
    getCallerNodeId,
    getInitialIfNodeViewState,
    getInitialNodeViewState,
    getInitialParticipantViewState,
    getNodeId,
} from "../utils/diagram";
import { DiagramElement, Flow, Node, NodeBranch, Participant } from "../utils/types";
import { BaseVisitor } from "./BaseVisitor";
import { traverseParticipant } from "../utils/traverse-utils";
import { ConsoleColor, logger } from "../utils/logger";

export class InitVisitor implements BaseVisitor {
    private flow: Flow;
    private callerId: string;
    private participantIndex = 0;
    private lastParticipantIndex = 0;
    private otherParticipantIndex = 0;
    private activeParticipant: Participant | undefined;

    constructor(flow: Flow, callerId?: string, participantIndex = 1) {
        logger("Init visitor started");
        this.flow = flow;
        this.callerId = callerId;
        this.participantIndex = participantIndex;
        this.lastParticipantIndex = participantIndex;
        this.otherParticipantIndex = flow.participants?.length ?? 0;
    }

    getLatestParticipantIndex(): number {
        return this.lastParticipantIndex;
    }

    beginVisitParticipant(participant: Participant): void {
        if (!participant.viewState) {
            participant.viewState = getInitialParticipantViewState(this.participantIndex);
        }
        this.activeParticipant = participant;
    }

    endVisitParticipant(participant: Participant): void {
        // flow.others list as participants in the diagram
        if (this.flow.others) {
            this.flow.others.forEach((participant: Participant) => {
                if (!participant.viewState) {
                    this.otherParticipantIndex++;
                    participant.viewState = getInitialParticipantViewState(this.otherParticipantIndex);
                }
            });
        }
    }

    beginVisitNode(node: Node, parent?: DiagramElement): void {
        if (!node.viewStates) {
            node.viewStates = [];
        }
        const callerNodeId = getCallerNodeId(parent, this.callerId);
        if (!node.viewStates.find((viewState) => viewState.callNodeId === callerNodeId)) {
            const startParticipantId = this.activeParticipant ? this.activeParticipant.id : undefined;
            // const startParticipantId = DiagramElementKindChecker.isParticipant(parent) ? parent.id : undefined;
            const endParticipantId = node.targetId ? node.targetId : undefined;
            const nodeViewState = getInitialNodeViewState(callerNodeId, startParticipantId, endParticipantId);
            node.viewStates.push(nodeViewState);
        }
        if (node.targetId && this.flow?.participants) {
            // visit target participant
            const targetParticipant = this.flow.participants?.find(
                (participant) => participant.id === node.targetId,
            ) as Participant;
            const nodeId = getNodeId(node);
            let nextParticipantIndex = this.lastParticipantIndex;
            if (!targetParticipant) {
                return;
            }
            if (!targetParticipant.viewState?.xIndex) {
                // update participant index only if it is not already set
                nextParticipantIndex = this.lastParticipantIndex + 1;
            }
            const initVisitor = new InitVisitor(this.flow, nodeId, nextParticipantIndex);
            traverseParticipant(targetParticipant, initVisitor, this.flow);
            this.lastParticipantIndex = initVisitor.getLatestParticipantIndex();
        }
    }

    endVisitNode(node: Node, parent?: DiagramElement): void {}

    beginVisitReturn(node: Node, parent?: DiagramElement): void {
        // todo: need to implement
    }

    endVisitReturn(node: Node, parent?: DiagramElement): void {
        // todo: need to implement
    }

    initIfBlock(node: Node, parent?: DiagramElement): void {
        if (!node.viewStates) {
            node.viewStates = [];
        }

        // if node is empty then don't add view state
        if (node.branches?.length === 0 || node.branches?.every((branch) => branch.children?.length === 0)) {
            return;
        }

        const nodeId = getNodeId(node);
        const nodeViewState = getInitialIfNodeViewState(nodeId);
        node.viewStates.push(nodeViewState);
    }

    initIfBlockBranch(node: NodeBranch, parent: Node): void {
        if (!node.viewStates) {
            node.viewStates = [];
        }

        // if branch is empty then don't add view state
        if (node.children?.length === 0) {
            return;
        }

        const nodeId = getBranchId(node, parent);
        const nodeViewState = getInitialIfNodeViewState(nodeId);
        node.viewStates.push(nodeViewState);
    }

    beginVisitIf(node: Node, parent?: DiagramElement): void {
        logger(`Init visitor: beginVisitIf ${getNodeId(node)}`, ConsoleColor.GREEN, { node });
        if (!node.viewStates || node.viewStates.length === 0) {
            console.warn(">> View state not found for if block", node);
            return;
        }
        this.initIfBlock(node);
    }

    beginVisitThen(branch: NodeBranch, parent?: Node): void {
        logger(`Init visitor: beginVisitThen`, ConsoleColor.GREEN, { branch, parent });
        this.initIfBlockBranch(branch, parent);
    }

    beginVisitElse(branch: NodeBranch, parent?: Node): void {
        logger(`Init visitor: beginVisitElse`, ConsoleColor.GREEN, { branch, parent });
        this.initIfBlockBranch(branch, parent);
    }

    beginVisitWhile(node: Node, parent?: DiagramElement): void {
        // todo: need to implement
    }
}
