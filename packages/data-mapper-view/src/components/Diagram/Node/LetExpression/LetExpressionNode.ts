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
import { Point } from "@projectstorm/geometry";
import { PrimitiveBalType, TypeField } from "@wso2/ballerina-core";
import {
    ExpressionFunctionBody,
    LetExpression,
    LetVarDecl,
    NodePosition,
    STKindChecker
} from "@wso2/syntax-tree";

import { useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { getLetExpressions } from "../../../DataMapper/LocalVarConfigPanel/local-var-mgt-utils";
import { isGoToQueryWithinLetExprSupported } from "../../../DataMapper/utils";
import { LET_EXPRESSION_SOURCE_PORT_PREFIX } from "../../utils/constants";
import { getSearchFilteredInput, getTypeFromStore, getTypeOfOutput } from "../../utils/dm-utils";
import { DataMapperNodeModel } from "../commons/DataMapperNode";

export const LET_EXPR_SOURCE_NODE_TYPE = "datamapper-node-type-desc-let-expression";
const NODE_ID = "let-expr-node";

export interface DMLetVarDecl {
    varName: string;
    type: TypeField;
    declaration: LetVarDecl;
}

export class LetExpressionNode extends DataMapperNodeModel {
    public letExpr: LetExpression;
    public letVarDecls: DMLetVarDecl[];
    public hasNoMatchingFields: boolean;
    public numberOfFields:  number;

    constructor(
        public context: IDataMapperContext,
        public value: ExpressionFunctionBody,
        public isWithinQuery?: boolean) {
        super(
            NODE_ID,
            context,
            LET_EXPR_SOURCE_NODE_TYPE
        );
        this.numberOfFields = 1;
        this.letVarDecls = [];
    }

    async initPorts() {
        this.letVarDecls = [];
        if (!STKindChecker.isLetExpression(this.value.expression)) {
            return;
        }
        this.letExpr = this.value.expression;
        const letExpressions = getLetExpressions(this.letExpr);
        const balVersion = this.context.ballerinaVersion;
        const searchValue = useDMSearchStore.getState().inputSearch;

        letExpressions.forEach(expr => {
            const letVarDecls = expr.letVarDeclarations;
            letVarDecls.forEach(decl => {
                if (STKindChecker.isLetVarDecl(decl)) {
                    const bindingPattern = decl.typedBindingPattern.bindingPattern;

                    if (STKindChecker.isCaptureBindingPattern(bindingPattern)) {
                        const varName = bindingPattern.variableName;
                        const exprPosition = decl.expression.position as NodePosition;

                        const typeWithoutFilter = isGoToQueryWithinLetExprSupported(balVersion)
                            ? getTypeOfOutput(varName, this.context.ballerinaVersion)
                            : getTypeFromStore(exprPosition);

                        const type = getSearchFilteredInput(typeWithoutFilter, varName.value);

                        if (type) {
                            const parentPort = this.addPortsForHeaderField(type, varName.value, "OUT",
                            LET_EXPRESSION_SOURCE_PORT_PREFIX, this.context.collapsedFields);

                            if (type && (type.typeName === PrimitiveBalType.Record)) {
                                const fields = type.fields;
                                fields.forEach((subField) => {
                                    this.numberOfFields += 1 + this.addPortsForInputRecordField(
                                        subField, "OUT", varName.value, varName.value,
                                        LET_EXPRESSION_SOURCE_PORT_PREFIX, parentPort, this.context.collapsedFields,
                                        parentPort.collapsed
                                    );
                                });
                            } else {
                                this.numberOfFields += this.addPortsForInputRecordField(
                                    type, "OUT", varName.value, varName.value,
                                    LET_EXPRESSION_SOURCE_PORT_PREFIX, parentPort, this.context.collapsedFields,
                                    parentPort.collapsed
                                );
                            }

                            this.letVarDecls.push({varName: varName.value, type, declaration: decl});
                        }
                    }
                }
            });
        });
        this.hasNoMatchingFields = searchValue && letExpressions.length > 0 && this.letVarDecls.length === 0;
    }

    async initLinks() {
        // Currently we create links from "IN" ports and back tracing the inputs.
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === 'number' && typeof y === 'number'){
            super.setPosition(x, y);
        }
    }
}
