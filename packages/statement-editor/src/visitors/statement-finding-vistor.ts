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
    BlockStatement,
    FunctionBodyBlock,
    STNode,
    Visitor
} from "@wso2/syntax-tree";

class StatementFindingVisitor implements Visitor {
    private statements: STNode[] = [];

    public beginVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode) {
            this.statements.push(...node.statements);
    }

    public beginVisitBlockStatement(node: BlockStatement, parent?: STNode) {
        this.statements.push(...node.statements);
    }

    setStatementsNull(): void {
         this.statements = []
    }

    getStatements(): STNode[] {
        return this.statements;
    }
}

export const visitor = new StatementFindingVisitor();
