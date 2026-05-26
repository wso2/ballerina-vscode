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

import { LinePosition } from "../../interfaces/common";

export type SqFlow = {
    participants: SqParticipant[];
    others?: SqParticipant[];
    location: SqLocation;
};

export type SqLocation = {
    fileName: string;
    startLine: LinePosition;
    endLine: LinePosition;
};

export enum SqParticipantType {
    FUNCTION = "FUNCTION",
    WORKER = "WORKER",
    ENDPOINT = "ENDPOINT",
}

export type SqParticipant = {
    id: string;
    name: string;
    kind: SqParticipantType;
    moduleName: string;
    nodes: SqNode[];
    location: SqLocation;
};

export enum SqNodeKind {
    INTERACTION = "INTERACTION",
    IF = "IF",
    WHILE = "WHILE",
    FOREACH = "FOREACH",
    MATCH = "MATCH",
    RETURN = "RETURN",
}

export enum InteractionType {
    ENDPOINT_CALL = "ENDPOINT_CALL",
    FUNCTION_CALL = "FUNCTION_CALL",
    RETURN = "RETURN",
    METHOD_CALL = "METHOD_CALL",
    WORKER_CALL = "WORKER_CALL",
}

export type SqNode = {
    interactionType?: InteractionType;
    properties: SqNodeProperties;
    targetId?: string;
    kind: SqNodeKind;
    location: SqLocation;
    branches?: SqNodeBranch[];
};

export type SqNodeBranch = {
    label: string;
    children: SqNode[];
};

export type SqExpression = {
    type: string;
    value?: string;
};

export type SqNodeProperties = {
    params?: SqExpression[];
    expr?: SqExpression;
    method?: SqExpression;
    value?: SqExpression;
    name?: SqExpression;
    condition?: SqExpression;
};
