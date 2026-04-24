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
import { InputNode, SubMappingNode } from "../Node";
import { View } from "../../DataMapper/Views/DataMapperView";


export function findInputNode(field: string, outputNode: DataMapperNodeModel, views?: View[], lastViewIndex?: number): InputNode | SubMappingNode | undefined {
    const nodes = outputNode.getModel().getNodes();
    
    // Helper function to find input node by field path
    const findNodeByField = (fieldStartsWith: string): InputNode | SubMappingNode | undefined => {
        return nodes.find(node => {
            if (node instanceof InputNode) {
                return node.inputType.id === fieldStartsWith;
            } else if (node instanceof SubMappingNode) {
                return node.subMappings.some(subMapping => subMapping.name === fieldStartsWith);
            }
        }) as InputNode | SubMappingNode | undefined;
    };

    // try finding input node using 'field' (map from other input ports)
    const fieldStartsWith = field.split('.')[0];
    let inputNode = findNodeByField(fieldStartsWith);
    
    // if not found, try with parentSourceField
    if (!inputNode) {
        inputNode = findNodeByField(outputNode.context.model.focusInputRootMap?.[fieldStartsWith]);
    }

    return inputNode;
}
