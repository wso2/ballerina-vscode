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

import { NodePosition, STNode, traversNode } from "@wso2/syntax-tree";

import { NodeCategory, NodeType } from "../NodeFilter";
import { GraphqlDesignModel, Position } from "../resources/model";
import {visitor as STNodeFindingVisitor } from "../visitors/STNodeFindingVisitor";

export function getSTNodeFromRange(position: NodePosition, model: STNode): STNode {
    STNodeFindingVisitor.setPosition(position);
    traversNode(model, STNodeFindingVisitor);
    return STNodeFindingVisitor.getSTNode();
}

export function getParentSTNodeFromRange(position: NodePosition, model: STNode): STNode {
    STNodeFindingVisitor.setPosition(position);
    traversNode(model, STNodeFindingVisitor);
    return STNodeFindingVisitor.getParent();
}

export function getFormattedPosition(position: Position): NodePosition {
    return {
        startLine: position.startLine.line,
        endLine: position.endLine.line,
        startColumn: position.startLine.offset,
        endColumn: position.endLine.offset,
    };
}

export function getComponentName(name: string): string {
    return name?.replace(/[!\[\]]/g, "");
}

export function getNodeListOfModel(model: GraphqlDesignModel) {
    const nodes: NodeType[] = [];
    nodes.push({type: NodeCategory.GRAPHQL_SERVICE, name: model.graphqlService.serviceName});
    if (model.records) {
        Object.entries(model.records).forEach(([key]) => {
            if (!model.records.get(key)?.isInputObject) {
                nodes.push({type: NodeCategory.RECORD, name: key});
            }
        });
    }
    if (model.serviceClasses) {
        Object.entries(model.serviceClasses).forEach(([key]) => {
            nodes.push({type: NodeCategory.SERVICE_CLASS, name: key});
        });
    }
    if (model.unions) {
        Object.entries(model.unions).forEach(([key]) => {
            nodes.push({type: NodeCategory.UNION, name: key});
        });
    }
    if (model.enums) {
        Object.entries(model.enums).forEach(([key]) => {
            nodes.push({type: NodeCategory.ENUM, name: key});
        });
    }
    if (model.interfaces) {
        Object.entries(model.interfaces).forEach(([key]) => {
            nodes.push({type: NodeCategory.INTERFACE, name: key});
        });
    }
    return nodes;
}
