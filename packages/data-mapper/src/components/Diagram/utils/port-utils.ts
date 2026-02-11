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
import { NodeModel } from "@projectstorm/react-diagrams";

import { InputNode, ObjectOutputNode, QueryOutputNode, SubMappingNode } from "../Node";
import { InputOutputPortModel } from "../Port";
import { ARRAY_OUTPUT_TARGET_PORT_PREFIX, OBJECT_OUTPUT_TARGET_PORT_PREFIX, PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX, QUERY_OUTPUT_TARGET_PORT_PREFIX, SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX } from "./constants";
import { ArrayOutputNode } from "../Node/ArrayOutput/ArrayOutputNode";
import { PrimitiveOutputNode } from "../Node/PrimitiveOutput/PrimitiveOutputNode";

export function getInputPort(node: InputNode | SubMappingNode, inputField: string): InputOutputPortModel {
    const portId = node instanceof SubMappingNode
        ? `${SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX}.${inputField}.OUT`
        : `${inputField}.OUT`;
    let port = node.getPort(portId) as InputOutputPortModel;

    while (port && port.attributes.hidden) {
        port = port.attributes.parentModel;
    }

    return port;
}

export function getOutputPort(
    node: ObjectOutputNode | ArrayOutputNode | PrimitiveOutputNode | QueryOutputNode,
    outputField: string
): [InputOutputPortModel, InputOutputPortModel] {
    const portId = `${getTargetPortPrefix(node)}.${outputField}.IN`;
    const port = node.getPort(portId);
    
    if (port) {
        const actualPort = port as InputOutputPortModel;
        let mappedPort = actualPort;

        while (mappedPort && mappedPort.attributes.hidden) {
            mappedPort = mappedPort.attributes.parentModel;
        }

        return [actualPort, mappedPort];
    }

    return [undefined, undefined];
}

export function getTargetPortPrefix(node: NodeModel): string {
	switch (true) {
		case node instanceof ObjectOutputNode:
			return OBJECT_OUTPUT_TARGET_PORT_PREFIX;
        case node instanceof ArrayOutputNode:
            return ARRAY_OUTPUT_TARGET_PORT_PREFIX;
        case node instanceof PrimitiveOutputNode:
            return PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX;
        case node instanceof QueryOutputNode:
                return QUERY_OUTPUT_TARGET_PORT_PREFIX;
		default:
			return "";
	}
}
