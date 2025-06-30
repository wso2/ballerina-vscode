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
    ObjectOutputNode,
    InputNode,
    ArrayOutputNode
} from "../Node";
import { IO_NODE_DEFAULT_WIDTH } from "../utils/constants";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { DataMapperLinkModel } from "../Link";

export const INPUT_NODES = [
    InputNode
];

export const OUTPUT_NODES = [
    ObjectOutputNode,
    ArrayOutputNode
];

export const INTERMEDIATE_NODES: typeof DataMapperNodeModel[] = [];

export const MIN_VISIBLE_HEIGHT = 68;
export const INPUT_NODE_DEFAULT_RIGHT_X = IO_NODE_DEFAULT_WIDTH;

export function isInputNode(node: BaseModel) {
    return INPUT_NODES.some(nodeType => node instanceof nodeType);
}

export function isOutputNode(node: BaseModel) {
    return OUTPUT_NODES.some(nodeType => node instanceof nodeType);
}

export function isIntermediateNode(node: BaseModel) {
    return INTERMEDIATE_NODES.some(nodeType => node instanceof nodeType);
}

export function isLinkModel(node: BaseModel) {
    return node instanceof DataMapperLinkModel;
}
