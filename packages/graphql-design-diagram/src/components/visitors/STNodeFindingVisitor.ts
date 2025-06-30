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

import { NodePosition, STNode, Visitor } from "@wso2/syntax-tree";

export class STNodeFindingVisitor implements Visitor {
    private position: NodePosition;
    private stNode: STNode;
    private parent: STNode;

    public beginVisitSTNode(node: STNode, parent?: STNode) {
        if (!this.stNode) {
            const isPositionsEquals = node.position?.startLine === this.position?.startLine &&
                node.position?.startColumn === this.position?.startColumn &&
                node.position?.endLine === this.position?.endLine &&
                node.position?.endColumn === this.position?.endColumn
            if (isPositionsEquals) {
                this.stNode = node;
                this.parent = parent;
            }
        }
    }

    getSTNode(): STNode {
        const newModel = this.stNode;
        this.stNode = undefined;
        this.parent = undefined;
        return newModel;
    }

    getParent(): STNode {
        const currentParent = this.parent;
        this.parent = undefined;
        this.stNode = undefined;
        return currentParent;
    }

    setPosition(position: NodePosition) {
        this.position = position;
    }
}

export const visitor = new STNodeFindingVisitor();
