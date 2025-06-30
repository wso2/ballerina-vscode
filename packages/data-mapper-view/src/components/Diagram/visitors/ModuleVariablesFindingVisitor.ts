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
import { ComponentInfo } from "@wso2/ballerina-core";
import {
    FieldAccess,
    OptionalFieldAccess,
    SimpleNameReference,
    STKindChecker,
    STNode,
    Visitor,
} from "@wso2/syntax-tree";

import { ModuleVariable, ModuleVarKind } from "../Node/ModuleVariable";

export class ModuleVariablesFindingVisitor implements Visitor {
    private readonly moduleVariables: Map<string, ModuleVariable>;
    private readonly enumTypes: Map<string, ModuleVariable>;
    private queryExpressionDepth: number;
    private moduleVarDecls: ComponentInfo[];
    private constDecls: ComponentInfo[];

    constructor(
        moduleVariables: any
    ) {
        this.moduleVariables = new Map<string, ModuleVariable>();
        this.enumTypes = new Map<string, ModuleVariable>();
        this.queryExpressionDepth = 0;

        this.moduleVarDecls = moduleVariables ? moduleVariables.moduleVarDecls : [];
        this.constDecls = moduleVariables ? moduleVariables.constDecls : [];
    }

    public beginVisitFieldAccess(node: FieldAccess, parent?: STNode) {
        if (
            (!parent ||
                (!STKindChecker.isFieldAccess(parent) &&
                    !STKindChecker.isOptionalFieldAccess(parent))) &&
            this.queryExpressionDepth === 0
        ) {
            const varName = node.source.trim().split(".")[0];
            const moduleVarKind = this.getModuleVarKind(varName);
            if (moduleVarKind !== undefined) {
                this.moduleVariables.set(varName, {
                    kind: moduleVarKind,
                    node,
                });
            }
        }
    }

    public beginVisitOptionalFieldAccess(node: OptionalFieldAccess, parent?: STNode) {
        if (
            (!parent ||
                (!STKindChecker.isFieldAccess(parent) &&
                    !STKindChecker.isOptionalFieldAccess(parent))) &&
            this.queryExpressionDepth === 0
        ) {
            const varName = node.source.trim().split(".")[0];
            const moduleVarKind = this.getModuleVarKind(varName);
            if (moduleVarKind !== undefined) {
                this.moduleVariables.set(varName, {
                    kind: moduleVarKind,
                    node,
                });
            }
        }
    }

    public beginVisitSimpleNameReference(node: SimpleNameReference, parent?: STNode) {
        if (
            STKindChecker.isIdentifierToken(node.name) &&
            (!parent ||
                (parent &&
                    !STKindChecker.isFieldAccess(parent) &&
                    !STKindChecker.isOptionalFieldAccess(parent))) &&
            this.queryExpressionDepth === 0
        ) {
            const moduleVarKind = this.getModuleVarKind(node.name.value, node);
            if (moduleVarKind !== undefined && moduleVarKind === ModuleVarKind.Enum) {
                this.enumTypes.set(node.name.value, {
                    kind: moduleVarKind,
                    node,
                });
            } else if (moduleVarKind !== undefined) {
                this.moduleVariables.set(node.name.value, {
                    kind: moduleVarKind,
                    node,
                });
            }
        }
    }

    public beginVisitQueryExpression() {
        this.queryExpressionDepth += 1;
    }

    public endVisitQueryExpression() {
        this.queryExpressionDepth -= 1;
    }

    private getModuleVarKind(varName: string, node?: STNode) {
        let kind: ModuleVarKind;

        this.constDecls?.forEach((component) => {
            if (component.name.trim() === varName && !kind) {
                kind = ModuleVarKind.Constant;
            }
        });
        this.moduleVarDecls?.forEach((component) => {
            if (component.name.trim() === varName && !kind) {
                kind = ModuleVarKind.Variable;
            }
        });
        if (node && node.typeData?.symbol?.kind === "ENUM_MEMBER"){
            kind = ModuleVarKind.Enum;
        }

        return kind;
    }

    public getModuleVariables() {
        return this.moduleVariables;
    }

    public getEnumTypes() {
        return this.enumTypes;
    }
}
