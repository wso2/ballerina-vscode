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
import { ExpressionRange, PrimitiveBalType, TypeField } from "@wso2/ballerina-core";
import {
    NodePosition,
    STKindChecker,
    STNode
} from "@wso2/syntax-tree";

import { useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { isPositionsEquals } from "../../../../utils/st-utils";
import { MODULE_VARIABLE_SOURCE_PORT_PREFIX } from "../../utils/constants";
import { getFilteredSubFields } from "../../utils/dm-utils";
import { getTypesForExpressions } from "../../utils/ls-utils";
import { DataMapperNodeModel } from "../commons/DataMapperNode";

export const MODULE_VAR_SOURCE_NODE_TYPE = "datamapper-node-type-desc-module-variable";
const NODE_ID = "module-variable-node";

export enum ModuleVarKind {
    Variable,
    Configurable,
    Constant,
    Enum
}

export interface ModuleVariable {
    kind: ModuleVarKind;
    node: STNode;
    exprPosition?: NodePosition;
}

export interface DMModuleVarDecl {
    varName: string;
    kind: ModuleVarKind;
    type: TypeField;
    node: STNode;
}

export class ModuleVariableNode extends DataMapperNodeModel {
    public moduleVarDecls: DMModuleVarDecl[];
    public hasNoMatchingFields: boolean;
    public x: number;
    public numberOfFields:  number;

    constructor(
        public context: IDataMapperContext,
        public value: Map<string, ModuleVariable>) {
        super(
            NODE_ID,
            context,
            MODULE_VAR_SOURCE_NODE_TYPE
        );
        this.numberOfFields = 1;
        this.moduleVarDecls = [];
    }

    async initPorts() {
        this.moduleVarDecls = [];
        const exprRanges: ExpressionRange[] = [...this.value].map(([, item]) => {
            let exprPosition: NodePosition = item.node.position as NodePosition;
            if (STKindChecker.isFieldAccess(item.node) || STKindChecker.isOptionalFieldAccess(item.node)) {
                let valueExpr = item.node.expression;
                while (valueExpr && (STKindChecker.isFieldAccess(valueExpr)
                    || STKindChecker.isOptionalFieldAccess(valueExpr))) {
                    valueExpr = valueExpr.expression;
                }
                exprPosition = valueExpr.position;
            }
            item.exprPosition = exprPosition;
            return {
                startLine: {
                    line: exprPosition.startLine,
                    offset: exprPosition.startColumn
                },
                endLine: {
                    line: exprPosition.endLine,
                    offset: exprPosition.endColumn
                }
            };
        });
        const types = await getTypesForExpressions(this.context.filePath, exprRanges, this.context.langServerRpcClient);
        const allModuleVarDecls = [...this.value].map(([varName, item]) => {
            return {
                varName,
                kind: item.kind,
                node: item.node,
                type: types.find(type => isPositionsEquals(item.exprPosition, {
                    startLine: type.requestedRange.startLine.line,
                    startColumn: type.requestedRange.startLine.offset,
                    endLine: type.requestedRange.endLine.line,
                    endColumn: type.requestedRange.endLine.offset,
                })).type
            }
        });
        this.moduleVarDecls = this.getSearchFilteredVariables(allModuleVarDecls);
        const searchValue = useDMSearchStore.getState().inputSearch;
        this.hasNoMatchingFields = searchValue && allModuleVarDecls.length > 0 && this.moduleVarDecls.length === 0;

        this.moduleVarDecls.forEach(moduleVar => {
            const { varName, type } = moduleVar;

            const parentPort = this.addPortsForHeaderField(type, varName, "OUT",
                MODULE_VARIABLE_SOURCE_PORT_PREFIX, this.context.collapsedFields);

            if (type && (type.typeName === PrimitiveBalType.Record)) {
                const fields = type.fields;
                fields.forEach((subField) => {
                    this.numberOfFields += this.addPortsForInputRecordField(
                        subField, "OUT", varName, varName, MODULE_VARIABLE_SOURCE_PORT_PREFIX,
                        parentPort, this.context.collapsedFields, parentPort.collapsed);
                });
            } else {
                this.numberOfFields += this.addPortsForInputRecordField(
                    type, "OUT", varName, varName, MODULE_VARIABLE_SOURCE_PORT_PREFIX,
                    parentPort, this.context.collapsedFields, parentPort.collapsed);
            }
        });
    }

    async initLinks() {
        // Currently we create links from "IN" ports and back tracing the inputs.
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

    private getSearchFilteredVariables(items: DMModuleVarDecl[]) {
        const searchValue = useDMSearchStore.getState().inputSearch;
        if (!searchValue) {
            return items;
        }
        const filteredVariables: DMModuleVarDecl[] = [];

        for (const item of items) {
            if (item.varName?.toLowerCase()?.includes(searchValue.toLowerCase())) {
                filteredVariables.push(item)
            } else if (item.type.typeName === PrimitiveBalType.Record) {
                const filteredRecordType = getFilteredSubFields(item.type, searchValue);
                if (filteredRecordType) {
                    filteredVariables.push({ ...item, type: filteredRecordType })
                }
            }
        }

        return filteredVariables;
    }
}
