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
/* eslint-disable @typescript-eslint/no-duplicate-enum-values */

export enum NodeTypes {
    BASE_NODE = "base-node",
    PARTICIPANT_NODE = "participant-node",
    INTERACTION_NODE = "interaction-node",
    POINT_NODE = "point-node",
    LIFE_LINE_NODE = "life-line-node",
    EMPTY_NODE = "empty-node",
    CONTAINER_NODE = "container-node",
}

export const DIAGRAM_END = 10000;

export const NODE_LINK = "node-link";
export const NODE_PORT = "node-port";
export const LOADING_OVERLAY = "loading-overlay";

export const DEFAULT_CALLER = "default-caller";

export const NODE_WIDTH = 20;
export const NODE_HEIGHT = NODE_WIDTH;

export const BORDER_WIDTH = 1.5;

export const EMPTY_NODE_WIDTH = NODE_WIDTH;

export const PARTICIPANT_NODE_WIDTH = 160;
export const PARTICIPANT_NODE_HEIGHT = 40;
export const PARTICIPANT_TAIL_MIN_HEIGHT = 200;
export const PARTICIPANT_GAP_X = 60;

export const INTERACTION_NODE_WIDTH = NODE_WIDTH;
export const INTERACTION_NODE_HEIGHT = 14;
export const INTERACTION_GAP_Y = INTERACTION_NODE_HEIGHT + BORDER_WIDTH * 2;
export const INTERACTION_GROUP_GAP_Y = INTERACTION_GAP_Y * 3;

export const CONTAINER_PADDING = 8;
