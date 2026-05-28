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

import { BaseVisitor } from "@wso2/ballerina-core";

import { FlowNode } from "@wso2/ballerina-core";

export class VariableFindingVisitor implements BaseVisitor {
    private skipChildrenVisit = false;
    private varName: string;
    private varNode: FlowNode;

    constructor(varName: string) {
        // console.log(">>> variable finding visitor started");
        this.varName = varName;
    }

    beginVisitVariable(node: FlowNode, parent?: FlowNode): void {
        if (node.properties?.variable?.value === this.varName) {
            this.varNode = node;
            this.skipChildrenVisit = true;
        }
    }

    getVarNode(): FlowNode {
        return this.varNode;
    }

    skipChildren(): boolean {
        return this.skipChildrenVisit;
    }
}
