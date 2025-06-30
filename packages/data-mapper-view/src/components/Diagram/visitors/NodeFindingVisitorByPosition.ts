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
import {
    NodePosition,
    STNode,
    Visitor,
} from "@wso2/syntax-tree";

import { isPositionsEquals } from "../../../utils/st-utils";

export class NodeFindingVisitorByPosition implements Visitor {
    private foundNode: STNode;
    private parentNode: STNode;

    constructor(private position: NodePosition) {}

    public beginVisitSTNode(node: STNode, parent?: STNode): void {
        if (!this.foundNode) {
            if (isPositionsEquals(node.position, this.position)) {
                this.foundNode = node;
                this.parentNode = parent;
            }
        }
    }

    public getNode() {
        return this.foundNode;
    }

    public getParentNode() {
        return this.parentNode;
    }
}
