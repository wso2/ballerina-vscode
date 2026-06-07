import React from "react";

import { BallerinaConnectorInfo, ConditionConfig, ConfigOverlayFormStatus, ConfigPanelStatus, DiagnosticMsgSeverity, DiagramDiagnostic, STSymbolInfo, WizardType } from "@wso2/ballerina-core";
import { ActionStatement, CallStatement, CaptureBindingPattern, CheckAction, ElseBlock, FunctionBodyBlock, IfElseStatement, IsolatedKeyword, ListenerDeclaration, LocalVarDecl, NodePosition, PublicKeyword, QualifiedNameReference, RemoteMethodCallAction, ServiceDeclaration, STKindChecker, STNode, traversNode, TypeCastExpression } from "@wso2/syntax-tree";

import * as stComponents from '../Components/RenderingComponents';
import { ActionProcessor } from "../Components/RenderingComponents/ActionInvocation/ActionProcess";
import { ConnectorProcess } from "../Components/RenderingComponents/Connector/ConnectorProcess";
import { IfElse } from "../Components/RenderingComponents/IfElse";
import { DataProcessor } from "../Components/RenderingComponents/Processor";
import { Respond } from "../Components/RenderingComponents/Respond";
import { Statement } from "../Components/RenderingComponents/Statement";
import { Endpoint } from "../Types/type";
import { BlockViewState, FunctionViewState, StatementViewState } from "../ViewState";
import { DraftStatementViewState } from "../ViewState/draft";
import { CollapseExpandedRangeVisitor } from "../Visitors/collapse-expanded-range-visitor";
import { CollapseInitVisitor } from "../Visitors/collapse-init-visitor";
import { CollapsedRangeExpandVisitor } from "../Visitors/collapsed-range-expand-visitor";
import { InitVisitor } from "../Visitors/init-visitor";
import { PositioningVisitor } from "../Visitors/positioning-visitor";
import { SizingVisitor } from "../Visitors/sizing-visitor";
import { isSTActionInvocation } from "../Visitors/util";

export function sizingAndPositioning(st: STNode, experimentalEnabled?: boolean): STNode {
    traversNode(st, new InitVisitor());
    traversNode(st, new SizingVisitor(experimentalEnabled));
    traversNode(st, new PositioningVisitor());
    const clone = { ...st };
    return clone;
}

export function recalculateSizingAndPositioning(
    st: STNode, experimentalEnabled?: boolean, parentConnectors?: Map<string, Endpoint>
): STNode {
    traversNode(st, new SizingVisitor(experimentalEnabled, parentConnectors));
    traversNode(st, new PositioningVisitor());
    if (STKindChecker.isFunctionDefinition(st) && st?.viewState?.onFail) {
        const viewState = st.viewState as FunctionViewState;
        traversNode(viewState.onFail, new SizingVisitor(experimentalEnabled));
        traversNode(viewState.onFail, new PositioningVisitor());
    }
    const clone = { ...st };
    return clone;
}

export function initializeCollapseView(st: STNode, targetPosition: NodePosition) {
    traversNode(st, new CollapseInitVisitor(targetPosition));
    const clone = { ...st }
    return clone;
}

export function expandCollapsedRange(st: STNode, range: NodePosition) {
    traversNode(st, new CollapsedRangeExpandVisitor(range));
    const clone = { ...st }
    return clone;
}

export function collapseExpandedRange(st: STNode, range: NodePosition) {
    traversNode(st, new CollapseExpandedRangeVisitor(range));
    const clone = { ...st }
    return clone;
}

export function initializeViewState(st: STNode, parentConnectors?: Map<string, Endpoint>, offsetValue?: number): STNode {
    traversNode(st, new InitVisitor(parentConnectors, offsetValue));
    const clone = { ...st };
    return clone;
}

export function getSTComponents(nodeArray: any, viewState?: any, model?: FunctionBodyBlock, expandReadonly?: boolean): React.ReactNode[] {
    // Convert to array
    if (!(nodeArray instanceof Array)) {
        nodeArray = [nodeArray];
    }

    const children: any = [];

    nodeArray.forEach((node: any) => {
        const ChildComp = (stComponents as any)[node.kind];
        if (viewState) {
            node.viewState.functionNodeFilePath = viewState.functionNodeFilePath;
            node.viewState.functionNodeSource = viewState.functionNodeSource;
            node.viewState.parentBlock = model;
        }
        if (!ChildComp) {
            children.push(<Statement model={node} />);
        } else {
            children.push(<ChildComp model={node} expandReadonly={expandReadonly} />);
        }
    });

    return children;
}

export function getSTComponent(node: any): React.ReactElement {
    const ChildComp = (stComponents as any)[node.kind];
    if (!ChildComp) {
        return <Statement model={node} />;
    }
    return <ChildComp model={node} />;
}

export function getDraftComponent(viewState: BlockViewState, state: any, insertComponentStart: (position: NodePosition) => void): React.ReactNode[] {

    const targetPosition: NodePosition = viewState.draft[1]?.targetPosition;
    if (targetPosition &&
        (targetPosition.startColumn !== state.targetPosition?.startColumn || targetPosition.startLine !== state.targetPosition?.startLine)) {
        insertComponentStart(targetPosition);
    }
    const draft: [number, DraftStatementViewState] = viewState.draft;
    const draftComponents: React.ReactNode[] = [];
    switch (draft[1].type) {
        case "APIS":
            switch (draft[1].subType) {
                case "New":
                    draftComponents.push(<ConnectorProcess model={null} blockViewState={viewState} />);
                    break;
                case "Existing":
                    draftComponents.push(<ActionProcessor model={null} blockViewState={viewState} />);
                    break;
                default:
                    break;
            }
            break;
        case "STATEMENT":
            switch (draft[1].subType) {
                case "If":
                case "ForEach":
                // FIXME: Reusing existing implementation of IfElse to add both If/Foreach
                // We should refactor it to use Foreach component for the latter.
                case "While":
                    draftComponents.push(<IfElse model={null} blockViewState={viewState} />);
                    break;
                case "Log":
                case "Worker":
                case "AssignmentStatement":
                case "Variable":
                case "AsyncSend":
                case "ReceiveStatement":
                case "WaitStatement":
                case "FlushStatement":
                case "Custom":
                    draftComponents.push(<DataProcessor model={null} blockViewState={viewState} />);
                    break;
                case "Call":
                    draftComponents.push(<DataProcessor model={null} blockViewState={viewState} />);
                    break;
                case "HTTP":
                    draftComponents.push(
                        <ConnectorProcess model={null} specialConnectorName={"HTTP"} blockViewState={viewState} />
                    );
                    break;
                case "Respond":
                    draftComponents.push(<Respond blockViewState={viewState} />);
                    break;
                case "Return":
                    draftComponents.push(<Respond blockViewState={viewState} />);
                    break;
            }
        default:
            break;
    }

    return draftComponents;
}

export function getNodeSignature(node: STNode): string {
    if (STKindChecker.isServiceDeclaration(node)) {
        let qualifiers = '';
        let path = '';

        node.qualifiers.forEach((qualifier: IsolatedKeyword | PublicKeyword, i: number) => {
            qualifiers += qualifier.value;

            if (i <= node.qualifiers.length - 1) {
                qualifiers += ' ';
            }
        });

        node.absoluteResourcePath.forEach((pathSegment, i) => {
            path += pathSegment.value;

            if (i === node.absoluteResourcePath.length - 1) {
                path += ' ';
            }
        });

        return `${qualifiers}service ${path}on ${node.expressions[0].source}`;

    } else if (STKindChecker.isResourceAccessorDefinition(node)) {
        let qualifiers = '';
        let path = '';

        node.qualifierList.forEach((qualifier: IsolatedKeyword | PublicKeyword, i: number) => {
            qualifiers += qualifier.value;

            if (i <= node.qualifierList.length - 1) {
                qualifiers += ' ';
            }
        });

        node.relativeResourcePath.forEach((pathSegment, i) => {
            path += pathSegment.value;
        });

        return `${qualifiers}function ${node.functionName.value} ${path}${node.functionSignature.source}`;
    } else if (STKindChecker.isFunctionDefinition(node)) {
        let qualifiers = '';
        const path = '';

        node.qualifierList.forEach((qualifier: IsolatedKeyword | PublicKeyword, i: number) => {
            qualifiers += qualifier.value;

            if (i <= node.qualifierList.length - 1) {
                qualifiers += ' ';
            }
        });

        return `${qualifiers}function ${node.functionName.value}${node.functionSignature.source}`;
    }

    return '';
}

export function getTargetPositionString(pos: NodePosition) {
    const { startLine, startColumn, endLine, endColumn } = pos;
    return `${startLine}.${startColumn}.${endLine}.${endColumn}`
}

export function isVarTypeDescriptor(model: STNode): boolean {
    if (model && STKindChecker.isLocalVarDecl(model)) {
        return STKindChecker.isVarTypeDesc(model.typedBindingPattern?.typeDescriptor);
    } else {
        return false;
    }
}

export function getMatchingConnector(actionInvo: STNode): BallerinaConnectorInfo {
    const viewState = actionInvo.viewState as StatementViewState;
    let actionVariable: RemoteMethodCallAction;
    let remoteMethodCallAction: RemoteMethodCallAction;
    let connector: BallerinaConnectorInfo;

    if (viewState.isAction) {
        switch (actionInvo.kind) {
            case "LocalVarDecl":
                const variable = actionInvo as LocalVarDecl;
                switch (variable.initializer.kind) {
                    case 'TypeCastExpression':
                        const initializer: TypeCastExpression = variable.initializer as TypeCastExpression;
                        actionVariable = (initializer.expression as CheckAction).expression as RemoteMethodCallAction;
                        break;
                    case 'RemoteMethodCallAction':
                        actionVariable = variable.initializer as RemoteMethodCallAction;
                        break;
                    case 'ClientResourceAccessAction':
                        // TODO: fix once the syntaxTreeMethods are updated
                        actionVariable = variable.initializer as any;
                        break;
                    default:
                        actionVariable = (variable.initializer as CheckAction).expression as RemoteMethodCallAction;
                }
                break;
            case "ActionStatement":
                const statement = actionInvo as ActionStatement;
                actionVariable = (statement.expression as CheckAction).expression as RemoteMethodCallAction;
                break;
            default:
                // TODO: need to handle this flow
                return undefined;
        }

        remoteMethodCallAction = isSTActionInvocation(actionVariable);

        if (remoteMethodCallAction?.expression?.typeData?.typeSymbol) {
            const typeSymbol = remoteMethodCallAction.expression.typeData.typeSymbol;
            const module = typeSymbol?.moduleID;
            if (typeSymbol && module) {
                connector = {
                    name: typeSymbol.name,
                    moduleName: module.moduleName,
                    package: {
                        organization: module.orgName,
                        name: module.packageName || module.moduleName,
                        version: module.version
                    },
                    functions: []
                };
            }
        }
    } else if ((viewState.isEndpoint || isEndpointNode(actionInvo))
        && (STKindChecker.isLocalVarDecl(actionInvo) || STKindChecker.isModuleVarDecl(actionInvo))
        && (getQualifiedNameReferenceNodeFromType(actionInvo.typedBindingPattern.typeDescriptor))) {
        const nameReference = getQualifiedNameReferenceNodeFromType(actionInvo.typedBindingPattern.typeDescriptor);
        const typeSymbol = nameReference.typeData?.typeSymbol;
        const module = typeSymbol?.moduleID;
        if (typeSymbol && module) {
            connector = {
                name: typeSymbol.name,
                moduleName: module.moduleName,
                package: {
                    organization: module.orgName,
                    name: module.packageName || module.moduleName,
                    version: module.version
                },
                functions: []
            };
        }
    }
    return connector;
}

export function getQualifiedNameReferenceNodeFromType(node: STNode): QualifiedNameReference {
    if (STKindChecker.isQualifiedNameReference(node)) {
        return node;
    } else if (STKindChecker.isUnionTypeDesc(node)) {
        if (STKindChecker.isQualifiedNameReference(node.leftTypeDesc)) {
            return node.leftTypeDesc;
        } else {
            return getQualifiedNameReferenceNodeFromType(node.rightTypeDesc);
        }
    }
    return undefined;
}

export function isEndpointNode(node: STNode): boolean {
    return node && (STKindChecker.isLocalVarDecl(node) || STKindChecker.isModuleVarDecl(node)) && node.typeData?.isEndpoint;
}

export function getStatementTypesFromST(model: LocalVarDecl): string {
    return model.typedBindingPattern.typeDescriptor.source.trim();
}

export function filterComments(source: string) {
    const regex = /\/\/.*\\n|[\n]/gm;
    return source ? source.split(regex).pop().trim() : "";
}

export function getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
}

export function getDiagnosticInfo(diagnostics: DiagramDiagnostic[]): DiagnosticMsgSeverity {
    /* tslint:disable prefer-for-of */
    const diagnosticMsgsArray: string[] = [];
    if (diagnostics?.length === 0 || diagnostics === undefined) {
        return undefined;
    }
    else {
        if (diagnostics[0]?.diagnosticInfo?.severity === "WARNING") {
            for (let i = 0; i < diagnostics?.length; i++) {
                diagnosticMsgsArray.push(diagnostics[i]?.message)
            }
            return {
                message: diagnosticMsgsArray?.join(',\n'),
                severity: "WARNING"
            }
        }
        else {
            for (let i = 0; i < diagnostics?.length; i++) {
                diagnosticMsgsArray.push(diagnostics[i]?.message)
            }
            return {
                message: diagnosticMsgsArray?.join(',\n'),
                severity: "ERROR"
            }
        }
    }
}

export function getVaribaleNamesFromVariableDefList(asts: STNode[]) {
    if (asts === undefined) {
        return [];
    }
    return (asts as LocalVarDecl[]).map((item) => (item?.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value);
}

export function getConditionConfig(
    type: string,
    targetPosition: NodePosition,
    wizardType: WizardType,
    blockViewState?: BlockViewState,
    config?: ConditionConfig,
    symbolInfo?: STSymbolInfo,
    model?: STNode
): Partial<ConfigOverlayFormStatus> {
    let scopeSymbols: string[] = [];

    if (symbolInfo) {
        if (type === "If") {
            scopeSymbols = [...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("boolean"))];
        } else if (type === "ForEach") {
            scopeSymbols = [...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("map")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("array"))];
        } else if (type === "Log" || type === "Return") {
            scopeSymbols = [...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("map")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("array")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("boolean")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("int")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("float")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("var")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("string"))
            ];
        } else if (type === "Respond") {
            scopeSymbols = [...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("string")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("http:Response")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("var"))
            ];
        } else if (type === "While") {
            scopeSymbols = [...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("boolean"))];
        }
        if (config && scopeSymbols) {
            config.scopeSymbols = scopeSymbols
        }
    }

    const configPanelStatus: Partial<ConfigPanelStatus> = {
        formType: type,
        formArgs: {
            type,
            targetPosition,
            wizardType,
            config,
            scopeSymbols
        },
        blockViewState,
    };

    if (wizardType === WizardType.EXISTING) {
        return {
            ...configPanelStatus,
            formArgs: {
                ...configPanelStatus.formArgs,
                model
            }
        }
    }

    return configPanelStatus;
}

export function getOverlayFormConfig(
    type: string,
    targetPosition: NodePosition,
    wizardType: WizardType,
    blockViewState?: BlockViewState,
    config?: ConditionConfig,
    symbolInfo?: STSymbolInfo,
    model?: STNode
): Partial<ConfigOverlayFormStatus> {
    let scopeSymbols: string[] = []

    if (symbolInfo) {
        if (type === "If") {
            scopeSymbols = [...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("boolean"))];
        } else if (type === "ForEach") {
            scopeSymbols = [...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("map")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("array"))];
        } else if (type === "Log" || type === "Return") {
            scopeSymbols = [...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("map")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("array")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("boolean")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("int")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("float")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("var")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("string"))
            ];
        } else if (type === "Respond") {
            scopeSymbols = [...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("string")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("http:Response")),
            ...getVaribaleNamesFromVariableDefList(symbolInfo.variables.get("var"))
            ];
        }
        if (config && scopeSymbols) {
            config.scopeSymbols = scopeSymbols
        }
    }

    const configOverlayFormStatus: Partial<ConfigOverlayFormStatus> = {
        formType: type,
        formArgs: {
            type,
            targetPosition,
            wizardType,
            config,
            scopeSymbols
        },
        blockViewState,
    };
    if (wizardType === WizardType.EXISTING) {
        configOverlayFormStatus.formArgs = { ...configOverlayFormStatus.formArgs, model }
    }

    return configOverlayFormStatus;
}

export function getMethodCallFunctionName(model: CallStatement): string {
    if (STKindChecker.isFunctionCall(model.expression)) {
        return model.expression.functionName.source.trim();
    }
}

export function findActualEndPositionOfIfElseStatement(ifNode: IfElseStatement): any {
    let position: any;
    if (ifNode.elseBody) {
        const elseStmt: ElseBlock = ifNode.elseBody;
        if (STKindChecker.isIfElseStatement(elseStmt?.elseBody)) {
            position = findActualEndPositionOfIfElseStatement(elseStmt.elseBody as IfElseStatement);
        } else if (STKindChecker.isBlockStatement(elseStmt?.elseBody)) {
            position = elseStmt.elseBody.position;
        }
    }
    return position;
}

export function getServiceTypeFromModel(model: ServiceDeclaration, symbolInfo: STSymbolInfo): string {
    if (model) {
        const listenerExpression = model.expressions.length > 0 && model.expressions[0];
        if (listenerExpression) {
            if (STKindChecker.isExplicitNewExpression(listenerExpression)) {
                if (STKindChecker.isQualifiedNameReference(listenerExpression.typeDescriptor)) {
                    return listenerExpression.typeDescriptor.modulePrefix.value;
                } else {
                    return undefined;
                }
            } else if (STKindChecker.isSimpleNameReference(listenerExpression) && symbolInfo) {
                const listenerNode: ListenerDeclaration
                    = symbolInfo.listeners.get(listenerExpression.name.value) as ListenerDeclaration;
                if (listenerNode && STKindChecker.isQualifiedNameReference(listenerNode.typeDescriptor)) {
                    return listenerNode.typeDescriptor.modulePrefix.value;
                } else {
                    return undefined;
                }
            }
        }
    }

    return undefined;
}

export function truncateText(value: string) {
    if (!value)
        return undefined
    else if (value.length > 20)
        return value.slice(0, 18) + "...";
    else
        return value;
}
