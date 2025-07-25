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
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { InputNode } from "../Node";

export function findInputNode(field: string, outputNode: DataMapperNodeModel, focusedField?: string): InputNode {
    const nodes = outputNode.getModel().getNodes();
    
    // Helper function to find input node by field path
    const findNodeByField = (fieldPath: string): InputNode | undefined => {
        const mappingStartsWith = fieldPath.split('.')[0];
        return nodes.find(node => {
            if (node instanceof InputNode) {
                return node.inputType.id === mappingStartsWith;
            }
        }) as InputNode | undefined;
    };

    // try finding input node using 'field' (map from other input ports)
    let inputNode = findNodeByField(field);
    
    // if not found and focusedField exists, try with focusedField (map from focused input port)
    if (!inputNode && focusedField) {
        inputNode = findNodeByField(focusedField);
    }

    return inputNode;
}
