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
    FunctionDefinition,
    NodePosition,
    QueryExpression,
    SpecificField,
    STNode,
    Visitor,
} from "@wso2/syntax-tree";

import { isPositionsEquals } from "../../../utils/st-utils";

export class QueryParentFindingVisitor implements Visitor {
    private specifField: SpecificField | FunctionDefinition;
    private foundSearchingNode: boolean;

    constructor(private position: NodePosition) {
        this.foundSearchingNode = false
    }

    public endVisitSpecificField(node: SpecificField, parent?: STNode): void {
        if (!this.specifField && this.foundSearchingNode){
            this.specifField = node;
        }
    }

    public endVisitQueryExpression(node: QueryExpression, parent?: STNode): void {
        if (isPositionsEquals(node.position, this.position) && !this.specifField){
            this.foundSearchingNode = true
        }
    }

    public endVisitFunctionDefinition(node: FunctionDefinition, parent?: STNode): void {
        if (!this.specifField && this.foundSearchingNode){
            this.specifField = node;
        }
    }

    public getSpecificField() {
        return this.specifField;
    }
}
