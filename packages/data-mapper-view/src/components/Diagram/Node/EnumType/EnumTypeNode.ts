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
// tslint:disable: jsx-no-multiline-js
import { Point } from "@projectstorm/geometry";
import {
    ResolvedTypeForExpression,
    ComponentInfo,
    ExpressionRange,
    PrimitiveBalType,
    TypeField,
} from "@wso2/ballerina-core";
import { NodePosition, STNode } from "@wso2/syntax-tree";

import { useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { containsWithin, isPositionsEquals } from "../../../../utils/st-utils";
import { ENUM_TYPE_SOURCE_PORT_PREFIX } from "../../utils/constants";
import { getDefinitionPosition, getTypesForExpressions } from "../../utils/ls-utils";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { ModuleVariable, ModuleVarKind } from "../ModuleVariable";
import { URI } from "vscode-uri";

export const ENUM_TYPE_SOURCE_NODE_TYPE = "datamapper-node-type-desc-enum-type";
const NODE_ID = "enum-type-node";

export interface EnumType {
    enumName: string;
    value: ResolvedTypeForExpression;
}

export interface EnumInfo {
    filePath: string;
    enum: ComponentInfo;
}

export interface DMEnumTypeDecl {
    varName: string;
    type: TypeField;
    fields: DMEnumTypeMember[];
}

export interface DMEnumTypeMember {
    varName: string;
    kind: ModuleVarKind;
    type: TypeField;
    node: STNode;
}

export class EnumTypeNode extends DataMapperNodeModel {
    public enumTypeDecls: DMEnumTypeDecl[];
    public hasNoMatchingFields: boolean;
    public x: number;
    public numberOfFields: number;
    private enums: EnumInfo[];

    constructor(public context: IDataMapperContext, public value: Map<string, ModuleVariable>) {
        super(
            NODE_ID,
            context,
            ENUM_TYPE_SOURCE_NODE_TYPE
        );
        this.numberOfFields = 1;
        this.enumTypeDecls = [];
        this.enums = context.moduleComponents ? context.moduleComponents.enumDecls : [];
    }

    async initPorts() {
        const exprRanges: ExpressionRange[] = [...this.value].map(([, item]) => {
            const exprPosition: NodePosition = item.node.position as NodePosition;
            item.exprPosition = exprPosition;
            return {
                startLine: {
                    line: exprPosition.startLine,
                    offset: exprPosition.startColumn,
                },
                endLine: {
                    line: exprPosition.endLine,
                    offset: exprPosition.endColumn,
                },
            };
        });
        const types = await getTypesForExpressions(
            this.context.filePath,
            exprRanges,
            this.context.langServerRpcClient
        );

        const allEnumTypeDecls: DMEnumTypeDecl[] = [];
        for (const type of types) {
            const definitionPosition = await getDefinitionPosition(
                this.context.filePath,
                {
                    line: type.requestedRange.startLine.line,
                    offset: type.requestedRange.startLine.offset,
                },
                this.context.langServerRpcClient
            );
            if (definitionPosition.parseSuccess) {
                const enumTypePath = URI.parse(definitionPosition.defFilePath).fsPath;
                for (const enumType of this.enums) {
                    const enumMemberPath = URI.parse(
                        enumType.filePath + enumType.enum.filePath
                    ).fsPath;
                    const contains = containsWithin(
                        enumTypePath,
                        enumMemberPath,
                        definitionPosition.syntaxTree?.position,
                        {
                            startLine: enumType.enum.startLine,
                            startColumn: enumType.enum.startColumn,
                            endLine: enumType.enum.endLine,
                            endColumn: enumType.enum.endColumn,
                        }
                    );
                    if (contains) {
                        for (const [varName, item] of this.value) {
                            if (
                                isPositionsEquals(item.exprPosition, {
                                    startLine: type.requestedRange.startLine.line,
                                    startColumn: type.requestedRange.startLine.offset,
                                    endLine: type.requestedRange.endLine.line,
                                    endColumn: type.requestedRange.endLine.offset,
                                })
                            ) {
                                let typeDeclared: boolean = false;
                                const typeDecl: TypeField = {
                                    name: varName,
                                    ...type.type,
                                };
                                for (const enumTypeDecl of allEnumTypeDecls) {
                                    if (enumTypeDecl.varName === enumType.enum.name) {
                                        enumTypeDecl.fields.push({
                                            varName,
                                            kind: item.kind,
                                            node: item.node,
                                            type: typeDecl,
                                        });
                                        typeDeclared = true;
                                        break;
                                    }
                                }
                                if (!typeDeclared)
                                    allEnumTypeDecls.push({
                                        varName: enumType.enum.name,
                                        type: {
                                            ...type.type,
                                            typeName: PrimitiveBalType.Enum,
                                        },
                                        fields: [
                                            {
                                                varName,
                                                kind: item.kind,
                                                node: item.node,
                                                type: typeDecl,
                                            },
                                        ],
                                    });
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        }

        this.enumTypeDecls = this.getSearchFilteredVariables(allEnumTypeDecls);
        const searchValue = useDMSearchStore.getState().inputSearch;
        this.hasNoMatchingFields =
            searchValue && allEnumTypeDecls.length > 0 && this.enumTypeDecls.length === 0;

        this.enumTypeDecls.forEach((enumType) => {
            const { varName, type, fields } = enumType;

            const parentPort = this.addPortsForHeaderField(
                type,
                varName,
                "OUT",
                ENUM_TYPE_SOURCE_PORT_PREFIX,
                this.context.collapsedFields
            );

            fields.forEach((field) => {
                this.numberOfFields += this.addPortsForInputRecordField(
                    field.type,
                    "OUT",
                    varName,
                    varName,
                    ENUM_TYPE_SOURCE_PORT_PREFIX,
                    parentPort,
                    this.context.collapsedFields,
                    parentPort.collapsed
                );
            });
        });
    }

    async initLinks() {
        // Currently we create links from "IN" ports and back tracing the inputs.
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === "number" && typeof y === "number") {
            if (!this.x) {
                this.x = x;
            }
            super.setPosition(this.x, y);
        }
    }

    private getSearchFilteredVariables(items: DMEnumTypeDecl[]) {
        const searchValue = useDMSearchStore.getState().inputSearch;
        if (!searchValue) {
            return items;
        }
        const filteredVariables: DMEnumTypeDecl[] = [];

        for (const item of items) {
            if (item.varName?.toLowerCase()?.includes(searchValue.toLowerCase())) {
                filteredVariables.push(item);
            } else {
                const fields: DMEnumTypeMember[] = [];
                for (const field of item.fields) {
                    if (field.varName?.toLowerCase()?.includes(searchValue.toLowerCase())) {
                        fields.push(field);
                    }
                }
                if (fields.length > 0) {
                    filteredVariables.push({
                        ...item,
                        fields,
                    });
                }
            }
        }

        return filteredVariables;
    }
}
