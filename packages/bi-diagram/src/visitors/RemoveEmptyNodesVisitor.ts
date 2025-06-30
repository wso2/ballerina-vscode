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

import { FlowNode } from "../utils/types";
import { BaseVisitor } from "./BaseVisitor";

export class RemoveEmptyNodesVisitor implements BaseVisitor {
    private skipChildrenVisit = false;
    private node;

    constructor(node: FlowNode) {
        // console.log(">>> remove empty nodes visitor started");
        this.node = node;
    }

    beginVisitNode(node: FlowNode, parent?: FlowNode): void {
        node.branches?.forEach((branch) => {
            // if branch is not empty remove empty node
            if (branch.children && branch.children.length > 0) {
                const emptyNodeIndex = branch.children.findIndex((child) => child.codedata.node === "EMPTY");
                if (emptyNodeIndex >= 0) {
                    branch.children.splice(emptyNodeIndex, 1);
                }
                // remove start nodes from workers
                if (branch.children[0]?.codedata.node === "EVENT_START") {
                    branch.children.shift();
                }
            }
        });
    }

    getNode(): FlowNode {
        return this.node;
    }

    skipChildren(): boolean {
        return this.skipChildrenVisit;
    }
}
