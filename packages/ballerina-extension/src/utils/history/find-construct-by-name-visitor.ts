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

import { ClassDefinition, ConstDeclaration, FunctionDefinition, ModuleVarDecl, ObjectMethodDefinition, ServiceDeclaration, STKindChecker, STNode, TypeDefinition, Visitor } from "@wso2/syntax-tree";

import { generateConstructIdStub, MODULE_DELIMETER, SUB_DELIMETER } from "./util";

export class FindConstructByNameVisitor implements Visitor {
    private extractedUid: string;
    private stack: string[];
    private moduleServiceIndex: number;
    private moduleFunctionIndex: number;
    private moduleClassIndex: number;
    private moduleTypeIndex: number;
    private classMemberIndex: number;
    private selectedNode: STNode;
    private moduleVarIndex: number;
    private constantIndex: number;
    private updatedUid: string;

    constructor(uid: string) {
        this.extractedUid = this.extractUidWithName(uid);
        this.stack = [];
        this.moduleFunctionIndex = 0;
        this.moduleServiceIndex = 0;
        this.moduleClassIndex = 0;
        this.moduleTypeIndex = 0;
        this.classMemberIndex = 0;
        this.moduleVarIndex = 0;
        this.constantIndex = 0;
    }

    beginVisitClassDefinition(node: ClassDefinition, parent?: STNode): void {
        this.moduleClassIndex++;
        this.classMemberIndex = 0;
        const constructIdStub = this.getCurrentUid(generateConstructIdStub(node));

        if (this.extractedUid === constructIdStub) {
            this.selectedNode = node;
            this.updatedUid = `${constructIdStub}${SUB_DELIMETER}${this.moduleClassIndex}`;
        }

        this.stack.push(`${constructIdStub}${SUB_DELIMETER}${this.moduleClassIndex}`);
    }

    endVisitClassDefinition(node: ClassDefinition, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitServiceDeclaration(node: ServiceDeclaration, parent?: STNode): void {
        this.moduleServiceIndex++;
        this.classMemberIndex = 0;
        const constructIdStub = this.getCurrentUid(generateConstructIdStub(node));

        if (this.extractedUid === constructIdStub) {
            this.selectedNode = node;
            this.updatedUid = `${constructIdStub}${SUB_DELIMETER}${this.moduleServiceIndex}`;
        }

        this.stack.push(`${constructIdStub}${SUB_DELIMETER}${this.moduleServiceIndex}`);
    }

    endVisitServiceDeclaration(node: ServiceDeclaration, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitFunctionDefinition(node: FunctionDefinition, parent?: STNode): void {
        const constructIdStub = this.getCurrentUid(generateConstructIdStub(node));

        let uidNext: string;

        if (STKindChecker.isModulePart(parent)) {
            this.moduleFunctionIndex++;
            this.stack.push(`${constructIdStub}${SUB_DELIMETER}${this.moduleFunctionIndex}`);
            uidNext = `${constructIdStub}${SUB_DELIMETER}${this.moduleFunctionIndex}`;
        } else {
            this.classMemberIndex++;
            this.stack.push(`${constructIdStub}${SUB_DELIMETER}${this.classMemberIndex}`);
            uidNext = `${constructIdStub}${SUB_DELIMETER}${this.classMemberIndex}`;
        }

        if (this.extractedUid === constructIdStub) {
            this.selectedNode = node;
            this.updatedUid = uidNext;
        }
    }

    endVisitFunctionDefinition(node: FunctionDefinition, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitResourceAccessorDefinition(node: FunctionDefinition, parent?: STNode): void {
        this.classMemberIndex++;
        const constructIdStub = this.getCurrentUid(generateConstructIdStub(node));

        if (this.extractedUid === constructIdStub) {
            this.selectedNode = node;
            this.updatedUid = `${constructIdStub}${SUB_DELIMETER}${this.classMemberIndex}`;
        }

        this.stack.push(`${constructIdStub}${SUB_DELIMETER}${this.classMemberIndex}`);
    }

    endVisitResourceAccessorDefinition(node: FunctionDefinition, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitObjectMethodDefinition(node: ObjectMethodDefinition, parent?: STNode): void {
        this.classMemberIndex++;
        const constructIdStub = this.getCurrentUid(generateConstructIdStub(node));

        if (this.extractedUid === constructIdStub) {
            this.selectedNode = node;
            this.updatedUid = `${constructIdStub}${SUB_DELIMETER}${this.classMemberIndex}`;
        }

        this.stack.push(`${constructIdStub}${SUB_DELIMETER}${this.classMemberIndex}`);
    }

    endVisitObjectMethodDefinition(node: ObjectMethodDefinition, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitTypeDefinition(node: TypeDefinition, parent?: STNode): void {
        this.moduleTypeIndex++;
        const constructIdStub = this.getCurrentUid(generateConstructIdStub(node));

        if (this.extractedUid === constructIdStub) {
            this.selectedNode = node;
            this.updatedUid = `${constructIdStub}${SUB_DELIMETER}${this.moduleTypeIndex}`;
        }

        this.stack.push(`${constructIdStub}${SUB_DELIMETER}${this.moduleTypeIndex}`);
    }

    endVisitTypeDefinition(node: TypeDefinition, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitModuleVarDecl(node: ModuleVarDecl, parent?: STNode): void {
        this.moduleVarIndex++;
        const constructIdStub = this.getCurrentUid(generateConstructIdStub(node));

        if (this.extractedUid === constructIdStub) {
            this.selectedNode = node;
            this.updatedUid = `${constructIdStub}${SUB_DELIMETER}${this.moduleVarIndex}`;
        }
    }

    endVisitModuleVarDecl(node: ModuleVarDecl, parent?: STNode): void {
        this.stack.pop();
    }

    beginVisitConstDeclaration(node: ConstDeclaration, parent?: STNode): void {
        this.constantIndex++;
        const constructIdStub = this.getCurrentUid(generateConstructIdStub(node));

        if (this.extractedUid === constructIdStub) {
            this.selectedNode = node;
            this.updatedUid = `${constructIdStub}${SUB_DELIMETER}${this.constantIndex}`;
        }
    }

    endVisitConstDeclaration(node: ConstDeclaration, parent?: STNode): void {
        this.stack.pop();
    }

    private extractUidWithName(uid: string): string {
        const uidStubs = uid.split(SUB_DELIMETER);
        uidStubs.splice(uidStubs.length - 1, 1);
        return uidStubs.join(SUB_DELIMETER);
    }

    private getCurrentUid(idStub: string): string {
        const parentStub = this.stack.reduce((acc, curr) => `${acc}${acc.length > 0 ? MODULE_DELIMETER : ''}${curr}`, '');
        return `${parentStub}${parentStub.length > 0 ? MODULE_DELIMETER : ''}${idStub}`;
    }

    public getNode(): STNode {
        return this.selectedNode;
    }

    public getUid(): string {
        return this.updatedUid;
    }
}

