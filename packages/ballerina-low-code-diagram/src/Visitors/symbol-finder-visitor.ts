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
import { STSymbolInfo } from "@wso2/ballerina-core";
import {
    ActionStatement,
    AssignmentStatement,
    CallStatement,
    CaptureBindingPattern,
    CheckAction,
    ConstDeclaration,
    EnumDeclaration,
    ForeachStatement,
    FunctionDefinition,
    ListenerDeclaration,
    LocalVarDecl,
    MethodCall, ModuleVarDecl, NumericLiteral,
    QualifiedNameReference,
    RecordTypeDesc,
    RemoteMethodCallAction,
    RequiredParam,
    SimpleNameReference,
    STKindChecker,
    STNode,
    TypedBindingPattern,
    Visitor
} from "@wso2/syntax-tree";

import { StatementViewState } from "../ViewState";

const moduleEndpoints: Map<string, STNode> = new Map();
const localEndpoints: Map<string, STNode> = new Map();
const actions: Map<string, STNode> = new Map();
const variables: Map<string, STNode[]> = new Map();
const configurables: Map<string, STNode> = new Map();
const callStatement: Map<string, STNode[]> = new Map();
const assignmentStatement: Map<string, STNode[]> = new Map();
const variableNameReferences: Map<string, STNode[]> = new Map();
const recordTypeDescriptions: Map<string, STNode> = new Map();
const listeners: Map<string, STNode> = new Map();
const moduleVariables: Map<string, STNode> = new Map();
const constants: Map<string, STNode> = new Map();
const enums: Map<string, STNode> = new Map();

export class SymbolFindingVisitor implements Visitor {
    public beginVisitLocalVarDecl(node: LocalVarDecl) {
        const stmtViewState: StatementViewState = node.viewState as StatementViewState;
        if (stmtViewState && stmtViewState.isEndpoint && node?.typedBindingPattern?.bindingPattern
            && STKindChecker.isCaptureBindingPattern(node.typedBindingPattern.bindingPattern)) {
            const captureBindingPattern: CaptureBindingPattern =
                node.typedBindingPattern.bindingPattern as CaptureBindingPattern;
            localEndpoints.set(captureBindingPattern.variableName.value, node);
        } else if (stmtViewState && stmtViewState.isAction && node?.typedBindingPattern?.bindingPattern
            && STKindChecker.isCaptureBindingPattern(node.typedBindingPattern.bindingPattern)) {
            const captureBindingPattern: CaptureBindingPattern =
                node.typedBindingPattern.bindingPattern as CaptureBindingPattern;
            actions.set(captureBindingPattern.variableName.value, node);
        }
        const type: string = getType(node.typedBindingPattern.typeDescriptor);
        if (!type) {
            return;
        }

        if (type.endsWith("[]")) {
            variables.get("array") ? variables.get("array").push(node) : variables.set("array", [node]);
        } else if (type.startsWith("map")) {
            variables.get("map") ? variables.get("map").push(node) : variables.set("map", [node]);
        } else {
            variables.get(type) ? variables.get(type).push(node) : variables.set(type, [node]);
        }
    }

    public beginVisitCallStatement(node: CallStatement) {
        const varType = STKindChecker.isMethodCall(node.expression) ?
            (node.expression as MethodCall).expression.typeData?.symbol?.kind
            : node.typeData?.symbol?.kind;

        const varName = STKindChecker.isMethodCall(node.expression) ?
            (((node.expression as MethodCall).expression) as SimpleNameReference).name?.value
            : node.typeData?.symbol?.name;

        if (varName === undefined || varName === null || varType !== "VARIABLE") {
            return;
        }
        callStatement.get(varName) ? callStatement.get(varName).push(node) : callStatement.set(varName, [node]);
    }

    public beginVisitAssignmentStatement(node: AssignmentStatement) {
        const varType = node.varRef ?
            node.varRef?.typeData?.symbol?.kind
            : node.typeData?.symbol?.kind;

        // TODO : Remove if not necessary
        // const varName = STKindChecker.isNumericLiteral(node.expression) ?
        //     (node.expression as NumericLiteral).literalToken.value
        //     : node.typeData?.symbol?.name;
        let varName;

        if (STKindChecker.isSimpleNameReference(node.varRef)) {
            varName = (node.varRef as SimpleNameReference).name.value;
        }

        if (varName === undefined || varName === null || varType !== "VARIABLE") {
            return;
        }
        assignmentStatement.get(varName) ? assignmentStatement.get(varName).push(node) : assignmentStatement.set(varName, [node]);
    }

    public beginVisitSimpleNameReference(node: SimpleNameReference) {
        const varType = node.typeData?.symbol?.kind;
        const varName = node.name?.value;

        if (varType === "VARIABLE" || varType === "TYPE") {
            variableNameReferences.get(varName) ?
                variableNameReferences.get(varName).push(node)
                : variableNameReferences.set(varName, [node]);
        }
    }

    public beginVisitForeachStatement(node: ForeachStatement) {
        const type: string = getType(node.typedBindingPattern.typeDescriptor);
        if (variables.get(type)) {
            variables.get(type).push(node);
        } else {
            variables.set(type, [node]);
        }
    }

    public beginVisitFunctionDefinition(node: FunctionDefinition) {
        node.functionSignature.parameters.forEach((parameter) => {
            if (STKindChecker.isRequiredParam(parameter)) {
                const requiredParam = parameter as RequiredParam;
                const type = getType(requiredParam.typeName);
                if (variables.get(type)) {
                    variables.get(type).push(requiredParam);
                } else {
                    variables.set(type, [requiredParam]);
                }
            }
        });
    }

    public beginVisitRecordTypeDesc(node: RecordTypeDesc) {
        const typeData = node.typeData;
        const typeSymbol = typeData.typeSymbol;
        if (typeSymbol?.moduleID) {
            const recordMapKey = `${typeSymbol.moduleID.orgName}/${typeSymbol.moduleID.moduleName}:${typeSymbol.moduleID.version}:${typeSymbol.name}`
            recordTypeDescriptions.set(recordMapKey, node);
        }
    }

    public beginVisitModuleVarDecl(node: ModuleVarDecl) {
        if (STKindChecker.isCaptureBindingPattern(node.typedBindingPattern.bindingPattern)) {
            const bindingPattern = node.typedBindingPattern.bindingPattern;
            const varName = bindingPattern.variableName.value;

            if (node.qualifiers.find(token => STKindChecker.isConfigurableKeyword(token))) {
                configurables.set(varName, node);
            }
            if (bindingPattern.typeData?.isEndpoint) {
                moduleEndpoints.set(varName, node);
            }
            moduleVariables.set(varName, node);
        }
    }

    public beginVisitConstDeclaration(node: ConstDeclaration) {
        const varName = node.variableName.value;
        constants.set(varName, node);
    }

    public beginVisitActionStatement(node: ActionStatement) {
        const actionName = ((node.expression as CheckAction)?.expression as RemoteMethodCallAction)?.methodName?.name?.value;
        if (actionName) {
            actions.set(actionName, node);
        }
    }

    public beginVisitEnumDeclaration(node: EnumDeclaration) {
        const typeData = node.typeData;
        const typeSymbol = typeData?.typeSymbol;
        if (typeSymbol?.moduleID) {
            const enumMapKey = `${typeSymbol.moduleID.orgName}/${typeSymbol.moduleID.moduleName}:${typeSymbol.moduleID.version}:${typeSymbol.name}`
            enums.set(enumMapKey, node);
        }
    }

    public beginVisitResourcePathSegmentParam(node: any) {
        const type = getType(node.typeDescriptor);

        if (variables.get(type)) {
            variables.get(type).push(node);
        } else {
            variables.set(type, [node]);
        }
    }

    public beginVisitListenerDeclaration(node: ListenerDeclaration) {
        listeners.set(node.variableName.value, node);
    }

}

function getType(typeNode: any): any {
    if (STKindChecker.isVarTypeDesc(typeNode)) {
        return "var";
    } else if (STKindChecker.isIntTypeDesc(typeNode) || STKindChecker.isBooleanTypeDesc(typeNode) ||
        STKindChecker.isFloatTypeDesc(typeNode) || STKindChecker.isDecimalTypeDesc(typeNode) ||
        STKindChecker.isStringTypeDesc(typeNode) || STKindChecker.isJsonTypeDesc(typeNode)) {
        return typeNode.name.value;
    } else if (STKindChecker.isXmlTypeDesc(typeNode)) {
        return typeNode.keywordToken.value;
    } else if (STKindChecker.isQualifiedNameReference(typeNode)) {
        const nameRef: QualifiedNameReference = typeNode as QualifiedNameReference;
        const packageName = (nameRef.modulePrefix.value === "") ? "" : nameRef.modulePrefix.value + ":";
        return packageName + nameRef.identifier.value;
    } else if (STKindChecker.isSimpleNameReference(typeNode)) {
        const nameRef: SimpleNameReference = typeNode as SimpleNameReference;
        return nameRef.name.value;
    } else if (STKindChecker.isArrayTypeDesc(typeNode)) {
        return getType(typeNode.memberTypeDesc) + "[]";
    } else if (STKindChecker.isUnionTypeDesc(typeNode)) {
        return "union";
    } else if (STKindChecker.isTupleTypeDesc(typeNode)) {
        const tupleTypes: STNode[] = [];
        typeNode.memberTypeDesc.forEach((type) => {
            if (!STKindChecker.isCommaToken(type)) {
                const tupleType: STNode = type as STNode;
                tupleTypes.push(tupleType);
            }
        });
        return "[" + tupleTypes.map((memType) => getType(memType)) + "]";
    } else if (STKindChecker.isMapTypeDesc(typeNode)) {
        return "map<" + getType(typeNode.mapTypeParamsNode.typeNode) + ">";
    } else if (STKindChecker.isStreamTypeDesc(typeNode)) {
        return "stream<" + getType(typeNode.streamTypeParamsNode.leftTypeDescNode) + ">";
    } else if (STKindChecker.isErrorTypeDesc(typeNode)) {
        return "error";
    } else if (STKindChecker.isOptionalTypeDesc(typeNode)) {
        // return "var";
        return getType(typeNode.typeDescriptor);
    } else if (STKindChecker.isRecordTypeDesc(typeNode)) {
        return 'record';
    } else if (STKindChecker.isSimpleNameReference(typeNode)) {
        return typeNode?.name?.value;
    }
}

export function cleanLocalSymbols() {
    localEndpoints.clear();
    actions.clear();
    variables.clear();
    callStatement.clear();
    variableNameReferences.clear();
    assignmentStatement.clear();
}

export function cleanModuleLevelSymbols(){
    configurables.clear();
    recordTypeDescriptions.clear();
    moduleVariables.clear();
    listeners.clear();
}

export function getSymbolInfo(): STSymbolInfo {
    return {
        moduleEndpoints,
        localEndpoints,
        actions,
        variables,
        configurables,
        callStatement,
        variableNameReferences,
        assignmentStatement,
        recordTypeDescriptions,
        listeners,
        moduleVariables,
        constants,
        enums
    }
}

export const SymbolVisitor = new SymbolFindingVisitor();
