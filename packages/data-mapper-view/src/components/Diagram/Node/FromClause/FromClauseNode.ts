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
    CaptureBindingPattern,
    FromClause,
    ListBindingPattern,
    MappingBindingPattern,
    NodePosition,
    QueryExpression,
    RecordTypeDesc,
    STKindChecker,
    traversNode
} from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { EXPANDED_QUERY_SOURCE_PORT_PREFIX } from "../../utils/constants";
import {
    getFromClauseNodeLabel,
    getOptionalArrayField,
    getSearchFilteredInput,
    getTypeFromStore
} from "../../utils/dm-utils";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { QueryExprMappingType } from "../QueryExpression";
import { NodeFindingVisitorByPosition } from "../../visitors/NodeFindingVisitorByPosition";
import { AggregationFunctions } from "../../Label";

export const QUERY_EXPR_SOURCE_NODE_TYPE = "datamapper-node-record-type-desc";
const NODE_ID = "from-clause-node";

export class FromClauseNode extends DataMapperNodeModel {

    public sourceTypeDesc: RecordTypeDesc;
    public typeDef: TypeField;
    public sourceBindingPattern: CaptureBindingPattern | MappingBindingPattern | ListBindingPattern;
    public nodeLabel: string;
    public x: number;
    public y: number;
    public numberOfFields:  number;
    public hasNoMatchingFields: boolean;
    public mappedWithCollectClause: boolean;
    originalTypeDef: TypeField;

    constructor(
        public context: IDataMapperContext,
        public value: FromClause) {
        super(
            NODE_ID,
            context,
            QUERY_EXPR_SOURCE_NODE_TYPE
        );
        this.numberOfFields = 1;

        // tslint:disable-next-line: prefer-conditional-expression
        const valExpr = this.value.expression;
        if (STKindChecker.isBinaryExpression(valExpr)
            && STKindChecker.isElvisToken(valExpr.operator)) {
            const exprType = getTypeFromStore(valExpr.lhsExpr.position as NodePosition);
            this.typeDef = exprType && getOptionalArrayField(exprType);
        } else {
            this.typeDef = getTypeFromStore(valExpr.position as NodePosition);
        }
        const bindingPattern = this.value.typedBindingPattern.bindingPattern;
        if (STKindChecker.isCaptureBindingPattern(bindingPattern)
            || STKindChecker.isMappingBindingPattern(bindingPattern)
            || STKindChecker.isListBindingPattern(bindingPattern)
        ) {
            this.sourceBindingPattern = bindingPattern;
        }
        
        this.nodeLabel = getFromClauseNodeLabel(bindingPattern, valExpr);
        this.originalTypeDef = this.typeDef;

        // Check if the selected query expression is connected via a collect clause with aggregation function
        // If so, disable all fields since it can't accept multiple inputs (due to collect clause only deal with sequencial variables)
        const selectedST = context?.selection.selectedST;
        if (selectedST) {
            const queryExprFindingVisitor = new NodeFindingVisitorByPosition(selectedST.position);
            traversNode(selectedST.stNode, queryExprFindingVisitor);
            const queryExpr = queryExprFindingVisitor.getNode() as QueryExpression;

            const connectedViaCollectClause = selectedST?.mappingType
                && selectedST.mappingType === QueryExprMappingType.A2SWithCollect;
            if (queryExpr && connectedViaCollectClause) {
                const resultClause = queryExpr?.resultClause || queryExpr?.selectClause;
                const fnName = resultClause.kind === "CollectClause" && resultClause.expression
                    && STKindChecker.isFunctionCall(resultClause.expression)
                    && STKindChecker.isSimpleNameReference(resultClause.expression.functionName)
                    && resultClause.expression.functionName.name.value;
                if (AggregationFunctions.includes(fnName)) {
                    this.mappedWithCollectClause = true;
                }
            }
        }
    }

    initPorts(): void {
        this.typeDef = this.getSearchFilteredType();
        this.hasNoMatchingFields = !this.typeDef;
        if (this.sourceBindingPattern) {
            if (this.typeDef){
                const parentPort = this.addPortsForHeaderField(this.typeDef, this.nodeLabel, "OUT",
                    EXPANDED_QUERY_SOURCE_PORT_PREFIX, this.context.collapsedFields);

                if (this.typeDef.typeName === PrimitiveBalType.Record) {
                    const fields = this.typeDef.fields;
                    fields.forEach((subField) => {
                        this.numberOfFields += this.addPortsForInputRecordField(
                            subField, "OUT", this.nodeLabel, this.nodeLabel,
                            EXPANDED_QUERY_SOURCE_PORT_PREFIX, parentPort, this.context.collapsedFields,
                            parentPort.collapsed
                        );
                    });
                }
            }
        }
    }

    async initLinks() {
        // Currently, we create links from "IN" ports and back tracing the inputs.
    }

    public getSearchFilteredType() {
        if (this.originalTypeDef
            && this.originalTypeDef?.memberType
            && this.originalTypeDef.typeName === PrimitiveBalType.Array
        ) {
            return getSearchFilteredInput(this.originalTypeDef.memberType, this.nodeLabel);
        }
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === 'number' && typeof y === 'number'){
            if (!this.x){
                this.x = x;
            }
            super.setPosition(this.x, y);
        }
    }
}
