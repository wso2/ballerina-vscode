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


import { BaseModel } from "@projectstorm/react-canvas-core";
import {
    ListConstructorNode,
    MappingConstructorNode,
    PrimitiveTypeNode,
    QueryExpressionNode,
    RequiredParamNode,
    EnumTypeNode,
    FromClauseNode,
    JoinClauseNode,
    LetClauseNode,
    LetExpressionNode,
    LinkConnectorNode,
    ModuleVariableNode,
    UnionTypeNode,
    UnsupportedIONode
} from "../Node";
import { IO_NODE_DEFAULT_WIDTH } from "../utils/constants";
import { ExpandedMappingHeaderNode } from "../Node/ExpandedMappingHeader";

export type InputNode =
    | RequiredParamNode
    | FromClauseNode
    | LetExpressionNode
    | ModuleVariableNode
    | EnumTypeNode
    | LetClauseNode
    | JoinClauseNode
    | ExpandedMappingHeaderNode;

export type NodeWithoutTypeDesc = 
    | LetExpressionNode
    | ModuleVariableNode
    | EnumTypeNode
    | ExpandedMappingHeaderNode;

type OutputNode =
    | MappingConstructorNode
    | ListConstructorNode
    | PrimitiveTypeNode
    | UnionTypeNode
    | UnsupportedIONode;

type IntermediateNode = 
    | LinkConnectorNode
    | QueryExpressionNode;
    
export const MIN_VISIBLE_HEIGHT = 68;
export const INPUT_NODE_DEFAULT_RIGHT_X = IO_NODE_DEFAULT_WIDTH;

export function isInputNode(node: BaseModel): node is InputNode {
    return (
        node instanceof RequiredParamNode ||
        node instanceof FromClauseNode ||
        node instanceof LetExpressionNode ||
        node instanceof ModuleVariableNode ||
        node instanceof EnumTypeNode ||
        node instanceof LetClauseNode ||
        node instanceof JoinClauseNode ||
        node instanceof ExpandedMappingHeaderNode
    );
}

export function isOutputNode(node: BaseModel): node is OutputNode {
    return (
        node instanceof MappingConstructorNode ||
        node instanceof ListConstructorNode ||
        node instanceof PrimitiveTypeNode ||
        node instanceof UnionTypeNode ||
        node instanceof UnsupportedIONode
    );
}

export function isIntermediateNode(node: BaseModel): node is IntermediateNode {
    return (
        node instanceof LinkConnectorNode ||
        node instanceof QueryExpressionNode
    );
}
