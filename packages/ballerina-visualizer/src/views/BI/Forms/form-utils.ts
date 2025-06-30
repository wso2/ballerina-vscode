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

import { FlowNode, LineRange } from "@wso2/ballerina-core";
import { FormImports, FormValues } from "@wso2/ballerina-side-panel";
import { RemoveEmptyNodesVisitor, traverseNode } from "@wso2/bi-diagram";

import { updateNodeProperties } from "../../../utils/bi";

export function createNodeWithUpdatedLineRange(node: FlowNode, targetLineRange: LineRange): FlowNode {
    return {
        ...node,
        codedata: {
            ...node.codedata,
            lineRange: {
                ...node.codedata.lineRange,
                startLine: targetLineRange.startLine,
                endLine: targetLineRange.endLine,
            },
        }
    }
}

export function processFormData(data: FormValues): FormValues {
    if ("update-variable" in data) {
        data["variable"] = data["update-variable"];
        data["type"] = "";
    }
    return data;
}

export function updateNodeWithProperties(
    node: FlowNode,
    updatedNode: FlowNode,
    data: FormValues,
    formImports: FormImports,
    dirtyFields?: any
): FlowNode {
    const newNode = { ...updatedNode };

    if (node.branches?.at(0)?.properties) {
        // branch properties
        newNode.branches[0].properties = updateNodeProperties(data, node.branches[0].properties, formImports, dirtyFields);
    } else if (node.properties) {
        // node properties
        newNode.properties = updateNodeProperties(data, node.properties, formImports, dirtyFields);
    } else {
        console.error(">>> Error updating source code. No properties found");
    }

    return newNode;
}

export function removeEmptyNodes(updatedNode: FlowNode): FlowNode {
    const removeEmptyNodeVisitor = new RemoveEmptyNodesVisitor(updatedNode);
    traverseNode(updatedNode, removeEmptyNodeVisitor);
    return removeEmptyNodeVisitor.getNode();
}
