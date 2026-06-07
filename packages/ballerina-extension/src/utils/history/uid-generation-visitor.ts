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
    ClassDefinition,
    ConstDeclaration,
    FunctionDefinition,
    ModuleVarDecl,
    NodePosition,
    ObjectMethodDefinition,
    ResourceAccessorDefinition,
    ServiceDeclaration,
    STKindChecker,
    STNode,
    TypeDefinition,
    Visitor
} from "@wso2/syntax-tree";

import { generateConstructIdStub, isPositionEqual, MODULE_DELIMETER } from "./util";


export class UIDGenerationVisitor implements Visitor {
    private position: NodePosition;
    private uid: string;
    private stack: string[];
    private moduleServiceIndex: number;
    private moduleFunctionIndex: number;
    private moduleClassIndex: number;
    private moduleTypeIndex: number;
    private classMemberIndex: number;
    private constantIndex: number;
    private moduleVarIndex: number;

    constructor(position: NodePosition) {
        this.stack = [];
        this.position = position;
        this.moduleServiceIndex = 0;
        this.moduleFunctionIndex = 0;
        this.moduleClassIndex = 0;
        this.moduleTypeIndex = 0;
        this.classMemberIndex = 0;
        this.constantIndex = 0;
        this.moduleVarIndex = 0;
    }

    beginVisitClassDefinition(node: ClassDefinition, parent?: STNode): void {
        this.moduleClassIndex++;
        this.classMemberIndex = 0;
        this.stack.push(generateConstructIdStub(node, this.moduleClassIndex));
    }

    endVisitClassDefinition(node: ClassDefinition, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitServiceDeclaration(node: ServiceDeclaration): void {
        this.moduleServiceIndex++;
        this.classMemberIndex = 0;
        this.stack.push(generateConstructIdStub(node, this.moduleServiceIndex));

        if (isPositionEqual(node.position, this.position)) {
            this.setUId();
        }
    }

    endVisitServiceDeclaration(node: ServiceDeclaration, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitFunctionDefinition(node: FunctionDefinition, parent?: STNode): void {
        let id: string;
        if (parent && STKindChecker.isModulePart(parent)) {
            this.moduleFunctionIndex++;
            id = generateConstructIdStub(node, this.moduleFunctionIndex);
        } else {
            this.classMemberIndex++;
            id = generateConstructIdStub(node, this.classMemberIndex);
        }
        this.stack.push(id);

        if (isPositionEqual(node.position, this.position)) {
            this.setUId();
        }
    }

    endVisitFunctionDefinition(node: FunctionDefinition, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitResourceAccessorDefinition(node: ResourceAccessorDefinition, parent?: STNode): void {
        this.classMemberIndex++;
        this.stack.push(generateConstructIdStub(node, this.classMemberIndex));

        if (isPositionEqual(node.position, this.position)) {
            this.setUId();
        }
    }

    endVisitResourceAccessorDefinition(node: ResourceAccessorDefinition, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitObjectMethodDefinition(node: ObjectMethodDefinition, parent?: STNode) {
        this.classMemberIndex++;
        this.stack.push(generateConstructIdStub(node, this.classMemberIndex));

        if (isPositionEqual(node.position, this.position)) {
            this.setUId();
        }
    }

    endVisitObjectMethodDefinition(node: ObjectMethodDefinition, parent?: STNode) {
        this.stack.pop();
    }

    beginVisitTypeDefinition(node: TypeDefinition, parent?: STNode): void {
        this.moduleTypeIndex++;
        this.stack.push(generateConstructIdStub(node, this.moduleTypeIndex));

        if (isPositionEqual(node.position, this.position)) {
            this.setUId();
        }
    }

    endVisitTypeDefinition(node: TypeDefinition, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitModuleVarDecl(node: ModuleVarDecl) {
        this.moduleVarIndex++;
        this.stack.push(generateConstructIdStub(node, this.moduleVarIndex));

        if (isPositionEqual(node.position, this.position)) {
            this.setUId();
        }
    }

    endVisitModuleVarDecl(node: ModuleVarDecl) {
        this.stack.pop();
    }

    beginVisitConstDeclaration(node: ConstDeclaration) {
        this.constantIndex++;
        this.stack.push(generateConstructIdStub(node, this.constantIndex));

        if (isPositionEqual(node.position, this.position)) {
            this.setUId();
        }
    }

    endVisitConstDeclaration(node: ConstDeclaration) {
        this.stack.pop();
    }

    private setUId(): void {
        this.uid = this.stack.reduce((prev, current) =>
            prev.length === 0 ? current : `${prev}${MODULE_DELIMETER}${current}`, '');
    }

    public getUId(): string {
        return this.uid;
    }

}

