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

import { ApiCallNodeModel } from "../components/nodes/ApiCallNode";
import { BaseNodeModel } from "../components/nodes/BaseNode";
import { ButtonNodeModel } from "../components/nodes/ButtonNode";
import { CommentNodeModel } from "../components/nodes/CommentNode";
import { DraftNodeModel } from "../components/nodes/DraftNode/DraftNodeModel";
import { EmptyNodeModel } from "../components/nodes/EmptyNode";
import { IfNodeModel } from "../components/nodes/IfNode/IfNodeModel";
import { StartNodeModel } from "../components/nodes/StartNode/StartNodeModel";
import { WhileNodeModel } from "../components/nodes/WhileNode";
import { EndNodeModel } from "../components/nodes/EndNode";

export type NodeModel =
    | BaseNodeModel
    | EmptyNodeModel
    | DraftNodeModel
    | IfNodeModel
    | WhileNodeModel
    | StartNodeModel
    | ApiCallNodeModel
    | CommentNodeModel
    | ButtonNodeModel
    | EndNodeModel;

// node model without button node model
export type LinkableNodeModel = Exclude<NodeModel, ButtonNodeModel>;

export type {
    Flow,
    Client,
    ClientKind,
    ClientScope,
    FlowNode,
    NodeKind,
    Branch,
    LineRange,
    LinePosition,
    Property,
    NodeProperties,
    NodePropertyKey,
    ViewState,
    NodePosition,
    ToolData,
    AgentData,
} from "@wso2/ballerina-core";

export type FlowNodeStyle = "default" | "ballerina-statements";
