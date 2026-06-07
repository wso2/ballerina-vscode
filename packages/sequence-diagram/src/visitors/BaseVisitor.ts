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

import { DiagramElement, Flow, Node, NodeBranch, Participant } from "../utils/types";

export interface BaseVisitor {
    // participants
    beginVisitParticipant?(participant: Participant, flow?: Flow): void;
    endVisitParticipant?(participant: Participant, flow?: Flow): void;

    beginVisitEndpoint?(participant: Participant, flow?: Flow): void;
    endVisitEndpoint?(participant: Participant, flow?: Flow): void;

    beginVisitFunction?(participant: Participant, flow?: Flow): void;
    endVisitFunction?(participant: Participant, flow?: Flow): void;

    // interactions
    beginVisitNode?(node: Node, parent?: DiagramElement): void;
    endVisitNode?(node: Node, parent?: DiagramElement): void;

    beginVisitInteraction?(node: Node, parent?: DiagramElement): void;
    endVisitInteraction?(node: Node, parent?: DiagramElement): void;

    beginVisitEndpointCall?(node: Node, parent?: DiagramElement): void;
    endVisitEndpointCall?(node: Node, parent?: DiagramElement): void;

    beginVisitFunctionCall?(node: Node, parent?: DiagramElement): void;
    endVisitFunctionCall?(node: Node, parent?: DiagramElement): void;

    beginVisitReturn?(node: Node, parent?: DiagramElement): void;
    endVisitReturn?(node: Node, parent?: DiagramElement): void;

    // operations
    beginVisitWhile?(node: Node, parent?: DiagramElement): void;
    endVisitWhile?(node: Node, parent?: DiagramElement): void;

    beginVisitIf?(node: Node, parent?: DiagramElement): void;
    endVisitIf?(node: Node, parent?: DiagramElement): void;

    beginVisitThen?(branch: NodeBranch, parent?: Node): void;
    endVisitThen?(branch: NodeBranch, parent?: Node): void;

    beginVisitElse?(branch: NodeBranch, parent?: Node): void;
    endVisitElse?(branch: NodeBranch, parent?: Node): void;
}
