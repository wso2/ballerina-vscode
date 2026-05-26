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
    NodePosition,
    STNode,
    Visitor
} from "@wso2/syntax-tree";
import { Diagnostic } from "vscode-languageserver-protocol";

import { StmtOffset } from "../models/definitions";
import { isDiagnosticInRange, isPositionsEquals } from "../utils";
import { StatementEditorViewState } from "../utils/statement-editor-viewstate";

class DiagnosticsMappingVisitor implements Visitor {
    private diagnostic: Diagnostic;
    private offset: StmtOffset;

    public beginVisitSTNode(node: STNode, parent?: STNode) {
        if (parent && (parent.viewState as StatementEditorViewState).isWithinBlockStatement) {
            (node.viewState as StatementEditorViewState).isWithinBlockStatement = true;
        }
    }

    public beginVisitBlockStatement(node: BlockStatement, parent?: STNode) {
        node.statements.map((stmt: STNode) => {
            (stmt.viewState as StatementEditorViewState).isWithinBlockStatement = true;
        });
    }

    public endVisitSTNode(node: STNode, parent?: STNode) {
        const isWithinBlockStatement = (node.viewState as StatementEditorViewState).isWithinBlockStatement;
        const diagPosition: NodePosition = {
            startLine: this.diagnostic.range.start.line,
            startColumn: this.diagnostic.range.start.character,
            endLine: this.diagnostic.range.end.line,
            endColumn: this.diagnostic.range.end.character
        }
        const nodePosition: NodePosition = {
            startLine: node?.position?.startLine + this.offset.startLine,
            startColumn: node?.position?.startColumn + (!isWithinBlockStatement ? this.offset.startColumn : 0),
            endLine: node?.position?.endLine + this.offset.startLine,
            endColumn: node?.position?.endColumn + (!isWithinBlockStatement ? this.offset.startColumn : 0)
        }
        if (isPositionsEquals(diagPosition, nodePosition)) {
            // TODO: Remove this If block as all nodes coming through here
            // doesn't contain "syntaxDiagnostics" property as it is something
            // we pushed from backend.
            if (node && node.syntaxDiagnostics) {
                node?.syntaxDiagnostics?.push({
                    diagnosticInfo: {
                        code: this.diagnostic.code.toString(),
                        severity: this.diagnostic.severity.toString()
                    },
                    message: this.diagnostic.message
                });
            }

            // Statement Editor viewState will hold the diagnostics for
            // each node which matched with the position.
            // To use when highlighting an error
            if (node && node.viewState && this.diagnostic.severity === 1) {
                node?.viewState?.diagnosticsInPosition.push({
                    diagnosticInfo: {
                        code: this.diagnostic.code.toString(),
                        severity: this.diagnostic.severity.toString()
                    },
                    message: this.diagnostic.message
                });
            }
        }
        if (isDiagnosticInRange(diagPosition, nodePosition)) {
            // Statement Editor viewState will hold the diagnostics for
            // each node which matched to above condition.
            if (node && node.viewState && this.diagnostic.severity === 1) {
                node?.viewState?.diagnosticsInRange.push({
                    code: this.diagnostic.code.toString(),
                    severity: this.diagnostic.severity.toString(),
                    range: this.diagnostic.range,
                    message: this.diagnostic.message,
                    diagnosticInfo: {
                        code: this.diagnostic.code.toString(),
                        severity: this.diagnostic.severity.toString(),
                    }
                });
            }
        }
    }

    setDiagnosticsNOffset(diagnostic: Diagnostic, offset: StmtOffset) {
        this.diagnostic = diagnostic;
        this.offset = offset;
    }
}

export const visitor = new DiagnosticsMappingVisitor();
