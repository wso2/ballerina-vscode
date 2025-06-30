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
    Visitor
} from "@wso2/syntax-tree";

import { INPUT_EDITOR_PLACEHOLDERS } from "../components/InputEditor/constants";
import { DEFAULT_INTERMEDIATE_CLAUSE, DEFAULT_WHERE_INTERMEDIATE_CLAUSE } from "../constants";
import { isPositionsEquals } from "../utils";

class ModelFindingVisitor implements Visitor {
    private position: NodePosition;
    private model: STNode;

    public beginVisitSTNode(node: STNode, parent?: STNode) {
        if (isPositionsEquals(node.position, this.position)) {
            this.model = node;
        } else if ((INPUT_EDITOR_PLACEHOLDERS.has(node?.source?.trim()) && !node?.source?.startsWith(DEFAULT_INTERMEDIATE_CLAUSE)) ||
            node?.source?.trim().includes(DEFAULT_WHERE_INTERMEDIATE_CLAUSE)) {
                const isWithinRange = this.position.startLine <= node.position.startLine
                    && this.position.endLine >= node.position.endLine
                    && this.position.startColumn <= node.position.endColumn
                    && this.position.endColumn >= node.position.startColumn;
                if (isWithinRange) {
                    this.model = node;
                }
        }
    }

    getModel(): STNode {
        const newModel = this.model;
        this.model = undefined;
        return newModel;
    }

    setPosition(position: NodePosition) {
        this.position = position;
    }
}

export const visitor = new ModelFindingVisitor();
