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
import { LinkConnectorNode, QueryExprConnectorNode, ClauseConnectorNode } from "../components/Diagram/Node";
import { DataMapperNodeModel } from "../components/Diagram/Node/commons/DataMapperNode";
import { DataMapperContext } from "../utils/DataMapperContext/DataMapperContext";
import { Mapping, Query } from "@wso2/ballerina-core";
import { BaseVisitor } from "./BaseVisitor";

export class IntermediateNodeInitVisitor implements BaseVisitor {
    private intermediateNodes: DataMapperNodeModel[] = [];
    private existingNodes: DataMapperNodeModel[];

    constructor(
        private context: DataMapperContext,
        existingNodes: DataMapperNodeModel[] = []
    ){
        this.existingNodes = existingNodes;
    }

    beginVisitMapping(node: Mapping): void {
        if (node.isQueryExpression) {
            // Create query expression connector node
            const queryExprNode = new QueryExprConnectorNode(this.context, node);
            this.intermediateNodes.push(queryExprNode);
        } else if (node.inputs.length > 1 || node.isComplex || node.isFunctionCall || node.elementAccessIndex) {
            // Create link connector node
            const linkConnectorNode = new LinkConnectorNode(this.context, node);
            this.intermediateNodes.push(linkConnectorNode);
        }
    }

    beginVisitQuery(query: Query): void {
        const clauseConnectorNode = new ClauseConnectorNode(this.context, query);
        this.intermediateNodes.push(clauseConnectorNode);
    }

    getNodes() {
        return this.intermediateNodes;
    }

    private findExistingNode(targetField: string): DataMapperNodeModel | undefined {
        return this.existingNodes.find(node => {
            if (node instanceof LinkConnectorNode) {
                return node.mapping.output === targetField;
            }
            if (node instanceof QueryExprConnectorNode) {
                return node.mapping.output === targetField;
            }
            return false;
        });
    }
}
