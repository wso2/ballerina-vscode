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

import { isEqual } from "lodash";
import { Branch, Flow, FlowNode } from "../utils/types";
import { BaseVisitor } from "./BaseVisitor";

export class AddNodeVisitor implements BaseVisitor {
    private skipChildrenVisit = false;
    private flow: Flow;
    private topNode: FlowNode;
    private topBranch: Branch;
    private newNode: FlowNode;

    constructor(originalFlowModel: Flow, topNode: FlowNode | Branch, newNode: FlowNode) {
        this.flow = originalFlowModel;
        if ((topNode as FlowNode)?.id) {
            this.topNode = topNode as FlowNode;
        } else if ((topNode as Branch)?.children) {
            this.topBranch = topNode as Branch;
        }
        this.newNode = newNode;
    }

    beginVisitEventStart(node: FlowNode, parent?: FlowNode): void {
        // check flow nodes if one of them is target node, then add new node after the target node
        this.flow.nodes.forEach((flowNode) => {
            if (this.topNode && flowNode.id === this.topNode.id) {
                console.log(">>> add new node", { target: flowNode, new: this.newNode });
                const index = this.flow.nodes.indexOf(flowNode);
                this.flow.nodes.splice(index + 1, 0, this.newNode);
                this.skipChildrenVisit = true;
            }
        });
    }

    beginVisitErrorHandler(node: FlowNode, parent?: FlowNode): void {
        if (this.skipChildrenVisit) {
            return;
        }

        // check branches and if one of branches has target node, then add new node after the target node
        node.branches.forEach((branch) => {
            if (this.topBranch && isEqual(branch.codedata, this.topBranch.codedata)) {
                // add new node to branch first children
                branch.children.unshift(this.newNode);
                this.skipChildrenVisit = true;
            } else {
                branch.children.forEach((child) => {
                    if (this.topNode && child.id === this.topNode.id) {
                        console.log(">>> do-error add new node", { target: child, new: this.newNode });
                        const index = branch.children.indexOf(child);
                        branch.children.splice(index + 1, 0, this.newNode);
                        this.skipChildrenVisit = true;
                    }
                });
            }
        });
    }

    beginVisitIf(node: FlowNode, parent?: FlowNode): void {
        if (this.skipChildrenVisit) {
            return;
        }

        // check branches and if one of branches has target node, then add new node after the target node
        node.branches.forEach((branch) => {
            if (this.topBranch && isEqual(branch.codedata, this.topBranch.codedata)) {
                console.log(">>> if add new node to first", { target: branch, new: this.newNode });
                // add new node to branch first children
                branch.children.unshift(this.newNode);
                this.skipChildrenVisit = true;
            } else {
                branch.children.forEach((child) => {
                    if (this.topNode && child.id === this.topNode.id) {
                        console.log(">>> if add new node to end", { target: child, new: this.newNode });
                        const index = branch.children.indexOf(child);
                        branch.children.splice(index + 1, 0, this.newNode);
                        this.skipChildrenVisit = true;
                    }
                });
            }
        });
    }

    beginVisitMatch(node: FlowNode, parent?: FlowNode): void {
        this.beginVisitIf(node, parent);
    }

    beginVisitWhile(node: FlowNode, parent?: FlowNode): void {
        this.beginVisitIf(node, parent);
    }

    beginVisitForeach(node: FlowNode, parent?: FlowNode): void {
        this.beginVisitIf(node, parent);
    }

    beginVisitLock(node: FlowNode, parent?: FlowNode): void {
        this.beginVisitIf(node, parent);
    }

    beginVisitFork(node: FlowNode, parent?: FlowNode): void {
        this.beginVisitIf(node, parent);
    }

    skipChildren(): boolean {
        return this.skipChildrenVisit;
    }

    getUpdatedFlow(): Flow {
        return this.flow;
    }
}
