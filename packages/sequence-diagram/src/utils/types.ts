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
    SqFlow as Flow,
    SqLocation,
    LinePosition,
    SqParticipant,
    SqParticipantType as ParticipantType,
    SqNode,
    SqNodeKind as NodeKind,
    InteractionType,
    SqNodeBranch as SNodeBranch,
    SqNodeProperties as NodeProperties,
    SqExpression as Expression,
} from "@wso2/ballerina-core";
import { BaseNodeModel } from "../components/nodes/BaseNode";
import { EmptyNodeModel } from "../components/nodes/EmptyNode";

export { ParticipantType, NodeKind, InteractionType };
export type { Flow, SqLocation, LinePosition, NodeProperties, Expression };

export type Participant = SqParticipant & {
    viewState?: ParticipantViewState;
};

export type Node = SqNode & {
    parent?: DiagramElement;
    viewStates?: NodeViewState[];
};

export type NodeBranch = SNodeBranch & {
    parent?: DiagramElement;
    viewStates?: NodeViewState[];
};

export enum ViewStateLabel {
    CONTAINER = "container",
    START_POINT = "start-point", // (x) --->
    END_POINT = "end-point", // ---> (x)
    RETURN_START_POINT = "return-start-point", // <-- (x)
    RETURN_END_POINT = "return-end-point", // (x) <---
    START_LIFELINE = "start-lifeline",
    END_LIFELINE = "end-lifeline",
}

export type ViewState = {
    bBox: BBox;
};

export type ParticipantViewState = ViewState & {
    xIndex: number;
    lifelineHeight: number;
};

export type NodeViewState = ViewState & {
    callNodeId?: string;
    points?: {
        start: PointViewState;
        end: PointViewState;
        returnStart: PointViewState;
        returnEnd: PointViewState;
    };
};

export type PointViewState = ViewState & {
    participantId?: string;
};

export type IfViewState = ViewState & {
    blockId: string;
    breakpointPercent?: number;
};

export type BBox = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export type DiagramElementType = ParticipantType | NodeKind | InteractionType;

export type DiagramElement = Participant | Node;

// Diagram types

export type NodeModel = BaseNodeModel | EmptyNodeModel;

export enum NodeBranchType {
    THEN = "THEN",
    ELSE = "ELSE",
    LOOP = "LOOP",
}
