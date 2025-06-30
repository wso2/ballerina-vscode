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
    LetClause,
    MappingConstructor, QueryPipeline,
    STKindChecker,
    STNode,
    Visitor
} from "@wso2/syntax-tree";

import { StatementEditorViewState } from "../utils/statement-editor-viewstate";

class MultilineConstructsConfigSetupVisitor implements Visitor {
    public beginVisitSTNode(node: STNode, parent?: STNode) {
        if (parent && (parent.viewState as StatementEditorViewState).multilineConstructConfig.isFieldWithNewLine) {
            (node.viewState as StatementEditorViewState).multilineConstructConfig.isFieldWithNewLine = true;
        }
    }

    public beginVisitMappingConstructor(node: MappingConstructor, parent?: STNode) {
        node.fields.map((field: STNode, index: number) => {
            if (node.fields.length - 1 === index) {
                (field.viewState as StatementEditorViewState).multilineConstructConfig.isFieldWithNewLine = true;
            }
        });
        if (node.openBrace.position.endLine !== node.closeBrace.position.startLine) {
            (node.closeBrace.viewState as StatementEditorViewState)
                .multilineConstructConfig.isClosingBraceWithNewLine = true;
        }
        if (parent && (STKindChecker.isSpecificField(parent) || STKindChecker.isComputedNameField(parent))) {
            (node.closeBrace.viewState as StatementEditorViewState)
                .multilineConstructConfig.isFieldWithNewLine = true;
        }
    }

    public beginVisitQueryPipeline(node: QueryPipeline, parent?: STNode) {
        (node.fromClause.viewState as StatementEditorViewState).multilineConstructConfig.isFieldWithNewLine = true;
        node.intermediateClauses.map((clause: STNode, index: number) => {
            (clause.viewState as StatementEditorViewState).multilineConstructConfig.isFieldWithNewLine = true;
        })
    }
}

export const visitor = new MultilineConstructsConfigSetupVisitor();
