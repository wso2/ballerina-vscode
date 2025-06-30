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
    STNode,
    Visitor,
    FunctionDefinition,
    ServiceDeclaration,
    ObjectMethodDefinition,
    ResourceAccessorDefinition,
    STKindChecker,
    TypeDefinition
} from "@wso2/syntax-tree";
import { PALETTE_COMMANDS } from "../project";
import { CodeLens, Range, Uri } from "vscode";
import { checkIsPersistModelFile } from "../../views/persist-layer-diagram/activator";
import { SHARED_COMMANDS } from "@wso2/ballerina-core";

export class CodeLensProviderVisitor implements Visitor {
    activeEditorUri: Uri;
    codeLenses: CodeLens[] = [];
    supportedServiceTypes: string[] = ["http", "ai", "graphql"];

    constructor(activeEditorUri: Uri) {
        this.activeEditorUri = activeEditorUri;
    }

    public beginVisitFunctionDefinition(node: FunctionDefinition, parent?: STNode): void {
        this.createVisulizeCodeLens(node.functionName.position, node.position);
    }

    public beginVisitServiceDeclaration(node: ServiceDeclaration, parent?: STNode): void {
        if (node.expressions.length > 0) {
            const expr = node.expressions[0];
            if ((STKindChecker.isExplicitNewExpression(expr) &&
                expr.typeDescriptor &&
                STKindChecker.isQualifiedNameReference(expr.typeDescriptor) &&
                this.supportedServiceTypes.includes(expr.typeDescriptor.modulePrefix.value)) ||
                (STKindChecker.isSimpleNameReference(expr) &&
                    this.supportedServiceTypes.includes(expr.typeData.typeSymbol.moduleID.moduleName))) {
                this.createTryItCodeLens(node.position, node.serviceKeyword.position, node.absoluteResourcePath.map((path) => path.value).join(''), node.expressions.map((exp) => exp.source.trim()).join(','));
                if (expr?.typeData?.typeSymbol?.signature?.includes("graphql")) {
                    this.createVisulizeGraphqlCodeLens(node.serviceKeyword.position, node.position);
                } else {
                    this.createVisulizeCodeLens(node.serviceKeyword.position, node.position);
                }
            }
        }
    }

    public beginVisitTypeDefinition(node: TypeDefinition, parent?: STNode): void {
        if (STKindChecker.isRecordTypeDesc(node.typeDescriptor) && checkIsPersistModelFile(this.activeEditorUri)) {
            this.createVisualizeERCodeLens(node.position, node.typeName.value);
        }
    }

    public beginVisitObjectMethodDefinition(node: ObjectMethodDefinition, parent?: STNode): void {
        this.createVisulizeCodeLens(node.functionKeyword.position, node.position);
    }

    public beginVisitResourceAccessorDefinition(node: ResourceAccessorDefinition, parent?: STNode): void {
        this.createVisulizeCodeLens(node.qualifierList[0].position, node.position);
    }

    private createVisulizeCodeLens(range: any, position: any) {
        const codeLens = new CodeLens(new Range(
            range.startLine,
            range.startColumn,
            range.endLine,
            range.endColumn
        ));
        codeLens.command = {
            title: "Visualize",
            tooltip: "Visualize code block",
            command: SHARED_COMMANDS.SHOW_VISUALIZER,
            arguments: [this.activeEditorUri.fsPath, position]
        };
        this.codeLenses.push(codeLens);
    }

    private createVisulizeGraphqlCodeLens(range: any, position: any) {
        const codeLens = new CodeLens(new Range(
            range.startLine,
            range.startColumn,
            range.endLine,
            range.endColumn
        ));
        codeLens.command = {
            title: "Visualize",
            tooltip: "Visualize code block",
            command: SHARED_COMMANDS.SHOW_VISUALIZER,
            arguments: [this.activeEditorUri.fsPath, position]
        };
        this.codeLenses.push(codeLens);
    }

    private createVisualizeERCodeLens(range: any, recordName: string) {
        const codeLens = new CodeLens(new Range(
            range.startLine,
            range.startColumn,
            range.endLine,
            range.endColumn
        ));
        codeLens.command = {
            title: "Visualize",
            tooltip: "View this entity in the Entity Relationship diagram",
            command: PALETTE_COMMANDS.SHOW_ENTITY_DIAGRAM,
            arguments: [this.activeEditorUri.fsPath, recordName]
        };
        this.codeLenses.push(codeLens);
    }

    private createTryItCodeLens(range: any, position: any, basePath: string, listener: string) {
        const codeLens = new CodeLens(new Range(
            position.startLine,
            position.startColumn,
            position.endLine,
            position.endColumn
        ));

        codeLens.command = {
            title: "Try it",
            tooltip: "Try running this service",
            command: PALETTE_COMMANDS.TRY_IT,
            arguments: [false, undefined, { basePath, listener }]
        };
        this.codeLenses.push(codeLens);
    }

    public getCodeLenses(): CodeLens[] {
        return this.codeLenses;
    }
}
