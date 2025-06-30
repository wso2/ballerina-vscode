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

import { Flow, FlowNode } from "../utils/types";
import { BaseVisitor } from "./BaseVisitor";

export class RemoveNodeVisitor implements BaseVisitor {
    private skipChildrenVisit = false;
    private flow: Flow;
    private nodeId: string;

    constructor(originalFlowModel: Flow, nodeId: string) {
        // console.log(">>> remove node visitor started", { nodeId });
        this.flow = originalFlowModel;
        this.nodeId = nodeId;
    }

    beginVisitEventStart(node: FlowNode, parent?: FlowNode): void {
        this.flow.nodes.forEach((flowNode) => {
            if (flowNode.id === this.nodeId) {
                console.log(">>> http-api remove node", { target: flowNode });
                const index = this.flow.nodes.indexOf(flowNode);
                this.flow.nodes.splice(index, 1);
                this.skipChildrenVisit = true;
            }
        });
    }

    beginVisitErrorHandler(node: FlowNode, parent?: FlowNode): void {
        if (this.skipChildrenVisit) {
            return;
        }

        node.branches.forEach((branch) => {
            branch.children.forEach((child) => {
                if (child.id === this.nodeId) {
                    console.log(">>> do-error remove node", { target: child });
                    const index = branch.children.indexOf(child);
                    branch.children.splice(index, 1);
                    this.skipChildrenVisit = true;
                }
            });
        });
    }

    beginVisitIf(node: FlowNode, parent?: FlowNode): void {
        if (this.skipChildrenVisit) {
            return;
        }

        node.branches.forEach((branch) => {
            branch.children.forEach((child) => {
                if (child.id === this.nodeId) {
                    const index = branch.children.indexOf(child);
                    branch.children.splice(index, 1);
                    this.skipChildrenVisit = true;
                }
            });
        });
    }

    beginVisitMatch(node: FlowNode, parent?: FlowNode): void {
        this.beginVisitIf(node, parent);
    }

    skipChildren(): boolean {
        return this.skipChildrenVisit;
    }

    getUpdatedFlow(): Flow {
        return this.flow;
    }
}
