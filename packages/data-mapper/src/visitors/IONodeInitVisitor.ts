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
import { ArrayOutputNode, EmptyInputsNode, InputNode, ObjectOutputNode, PrimitiveOutputNode, QueryOutputNode } from "../components/Diagram/Node";
import { DataMapperNodeModel } from "../components/Diagram/Node/commons/DataMapperNode";
import { DataMapperContext } from "../utils/DataMapperContext/DataMapperContext";
import { ExpandedDMModel, IOType, TypeKind } from "@wso2/ballerina-core";
import { OFFSETS } from "../components/Diagram/utils/constants";
import { BaseVisitor } from "./BaseVisitor";

export class IONodeInitVisitor implements BaseVisitor {
    private inputNodes: DataMapperNodeModel[] = [];
    private outputNode: DataMapperNodeModel;

    constructor(
        private context: DataMapperContext,
    ){}

    beginVisitInputType(node: IOType, parent?: ExpandedDMModel): void {
        // Create input node
        const inputNode = new InputNode(this.context, node);
        inputNode.setPosition(0, 0);
        this.inputNodes.push(inputNode);
    }

    beginVisitOutputType(node: IOType, parent?: ExpandedDMModel): void {
        // Create output node
        if (parent?.query) {
            this.outputNode = new QueryOutputNode(this.context, node);
        } else if (node.kind === TypeKind.Record || node.kind === TypeKind.Json || node.kind === TypeKind.Xml) {
            this.outputNode = new ObjectOutputNode(this.context, node);
        } else if (node.kind === TypeKind.Array) {
            this.outputNode = new ArrayOutputNode(this.context, node);
        } else {
            this.outputNode = new PrimitiveOutputNode(this.context, node);
        }
        // TODO: Handle other types
        this.outputNode.setPosition(OFFSETS.TARGET_NODE.X, OFFSETS.TARGET_NODE.Y);
    }

    getNodes() {
        if (this.inputNodes.length === 0) {
            this.inputNodes.push(new EmptyInputsNode());
        }
        return [...this.inputNodes, this.outputNode];
    }

    getInputNodes() {
        if (this.inputNodes.length === 0) {
            this.inputNodes.push(new EmptyInputsNode());
        }
        return this.inputNodes;
    }

    getOutputNode() {
        return this.outputNode;
    }
}
