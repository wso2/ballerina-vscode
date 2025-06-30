import {
    ActionStatement,
    AssignmentStatement,
    BlockStatement,
    CallStatement,
    CaptureBindingPattern,
    CheckAction,
    ClientResourceAccessAction,
    DoStatement,
    ExpressionFunctionBody,
    FieldAccess,
    ForeachStatement,
    FunctionBodyBlock,
    FunctionDefinition,
    IfElseStatement,
    ListenerDeclaration,
    LocalVarDecl,
    ModulePart,
    ModuleVarDecl,
    NamedWorkerDeclaration,
    ObjectField,
    ObjectMethodDefinition,
    OnFailClause,
    RemoteMethodCallAction,
    RequiredParam,
    ResourceAccessorDefinition,
    ResourceKeyword,
    ServiceDeclaration,
    SimpleNameReference,
    STKindChecker,
    STNode,
    TypeCastExpression, TypeDefinition,
    Visitor,
    WhileStatement
} from "@wso2/syntax-tree";

import { Endpoint } from "../Types/type";
import {
    BlockViewState,
    CollapseViewState,
    CompilationUnitViewState,
    ElseViewState,
    EndpointViewState,
    ForEachViewState,
    FunctionViewState,
    IfViewState,
    ModuleMemberViewState,
    PlusViewState,
    ServiceViewState,
    SimpleBBox,
    StatementViewState,
    ViewState,
    WhileViewState
} from "../ViewState";
import { DoStatementViewState } from "../ViewState/do-statement";
import { DraftStatementViewState } from "../ViewState/draft";
import { OnFailClauseViewState } from "../ViewState/on-fail-clause";
import { WorkerDeclarationViewState } from "../ViewState/worker-declaration";

import { DefaultConfig } from "./default";
import { haveBlockStatement, isEndpointNode, isSTActionInvocation } from "./util";

let currentFnBody: FunctionBodyBlock | ExpressionFunctionBody;

function getParentNamePlaceholder(parent: STNode): string | undefined {
    if (STKindChecker.isServiceDeclaration(parent)) {
        let servicePath = "";

        parent.absoluteResourcePath.forEach(item => {
            servicePath += item.value;
        });

        return `service ${servicePath.length > 0 ? servicePath : '/'}`;
    }
    return;
}

export class InitVisitor implements Visitor {
    private allEndpoints: Map<string, Endpoint> = new Map();
    private parentConnectors: Map<string, Endpoint>;
    private offsetValue: number;

    constructor(parentConnectors?: Map<string, Endpoint>, offsetValue: number = 0) {
        this.parentConnectors = parentConnectors;
        this.offsetValue = offsetValue;
    }

    public beginVisitSTNode(node: STNode, parent?: STNode) {
        node.viewState = new StatementViewState();
        this.initStatement(node, this.removeXMLNameSpaces(parent));
    }

    public beginVisitModulePart(node: ModulePart, parent?: STNode) {
        node.viewState = new CompilationUnitViewState();
    }

    public beginVisitFunctionDefinition(node: FunctionDefinition, parent?: STNode) {
        const viewState = new FunctionViewState();
        if (node.viewState && (node.viewState as FunctionViewState).parentNamePlaceHolder) {
            viewState.parentPosition = (node.viewState as FunctionViewState).parentPosition;
            viewState.parentNamePlaceHolder = (node.viewState as FunctionViewState).parentNamePlaceHolder;
        }

        if (parent) {
            viewState.parentNamePlaceHolder = getParentNamePlaceholder(parent);
            viewState.parentPosition = parent.position;
        }

        if (viewState.initPlus) {
            viewState.initPlus = undefined;
        }
        node.viewState = viewState;
        this.allEndpoints = new Map<string, Endpoint>();
    }

    public beginVisitListenerDeclaration(node: ListenerDeclaration, parent?: STNode) {
        const viewState = new ModuleMemberViewState();
        node.viewState = viewState;
    }

    public beginVisitModuleVarDecl(node: ModuleVarDecl) {
        const viewState = new ModuleMemberViewState();
        node.viewState = viewState;

        if (node.typeData && node.typeData.isEndpoint) {
            const bindingPattern = node.typedBindingPattern.bindingPattern as CaptureBindingPattern;
            if (this.allEndpoints.get(bindingPattern.variableName.value)) {
                node.viewState.endpoint.epName = bindingPattern.variableName.value;
                node.viewState.isEndpoint = true;
            }
        }
    }

    public beginVisitObjectField(node: ObjectField) {
        const viewState = new ModuleMemberViewState();
        node.viewState = viewState;

        if (node.typeData && node.typeData.isEndpoint) {
            const fieldName = node.fieldName.value;
            if (this.allEndpoints.get(fieldName)) {
                node.viewState.endpoint.epName = fieldName;
                node.viewState.isEndpoint = true;
            }
        }
    }

    public beginVisitRequiredParam(node: RequiredParam, parent?: STNode): void {
        const viewState = new ModuleMemberViewState();
        node.viewState = viewState;

        if (node.typeData && node.typeData.isEndpoint) {
            const endpointName = node.paramName?.value;
            if (endpointName) {
                node.viewState.endpoint.epName = endpointName;
                node.viewState.isEndpoint = true;
            }
        }
    }

    public beginVisitTypeDefinition(node: TypeDefinition) {
        const viewState = new ModuleMemberViewState();
        node.viewState = viewState;
    }

    public beginVisitResourceAccessorDefinition(node: ResourceAccessorDefinition, parent?: STNode) {
        const viewState = new FunctionViewState();

        if (node.viewState && (node.viewState as FunctionViewState).parentNamePlaceHolder) {
            viewState.parentPosition = (node.viewState as FunctionViewState).parentPosition;
            viewState.parentNamePlaceHolder = (node.viewState as FunctionViewState).parentNamePlaceHolder;
        }

        if (parent) {
            viewState.parentNamePlaceHolder = getParentNamePlaceholder(parent);
            viewState.parentPosition = parent.position;
        }

        node.viewState = viewState;
        this.allEndpoints = new Map<string, Endpoint>();
    }

    public beginVisitObjectMethodDefinition(node: ObjectMethodDefinition, parent?: STNode) {
        const viewState = new FunctionViewState();
        node.viewState = viewState;
        this.allEndpoints = new Map<string, Endpoint>();
    }

    public beginVisitServiceDeclaration(node: ServiceDeclaration, parent?: STNode) {
        node.viewState = new ServiceViewState();
        this.allEndpoints = new Map<string, Endpoint>();
    }

    public beginVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode) {
        currentFnBody = node;
        this.allEndpoints = new Map<string, Endpoint>();
        this.visitBlock(node as BlockStatement, parent);
    }

    public beginVisitBlockStatement(node: BlockStatement, parent?: STNode) {
        if (STKindChecker.isFunctionBodyBlock(parent) || STKindChecker.isBlockStatement(parent)) {
            this.initStatement(node, parent);
        } else {
            this.visitBlock(node, parent);
        }
    }

    public beginVisitActionStatement(node: ActionStatement, parent?: STNode) {
        node.viewState = new StatementViewState();
    }

    public beginVisitCheckAction(node: CheckAction, parent?: STNode) { // todo: Check panic is also replaced by this method
        node.viewState = new StatementViewState();
    }

    endVisitTypeCastExpression(node: TypeCastExpression, parent?: STNode): void {
        const stmtViewState = node.viewState as StatementViewState;
        if (node.expression) {
            stmtViewState.action = (node.expression.viewState as StatementViewState)?.action;
        }
    }

    endVisitCheckAction(node: CheckAction, parent?: STNode): void {
        const stmtViewState = node.viewState as StatementViewState;
        if (node.expression
            && (STKindChecker.isRemoteMethodCallAction(node.expression)
                || STKindChecker.isClientResourceAccessAction(node.expression))) {
            stmtViewState.action = (node.expression.viewState as StatementViewState)?.action;
        }
    }

    public endVisitCallStatement(node: CallStatement, parent?: STNode) {
        if (isSTActionInvocation(node) && node.expression) {
            const stmtViewState = node.viewState as StatementViewState;
            const expressionViewState = node.expression.viewState as StatementViewState;
            stmtViewState.isCallerAction = expressionViewState.isCallerAction;
            stmtViewState.isAction = expressionViewState.isAction;
            stmtViewState.action.endpointName = expressionViewState.action.endpointName;
            stmtViewState.action.actionName = expressionViewState.action.actionName;
            stmtViewState.action.resourcePath = expressionViewState.action.resourcePath;
        }
    }

    public beginVisitCallStatement(node: CallStatement, parent?: STNode) {
        node.viewState = new StatementViewState();
    }


    public beginVisitForeachStatement(node: ForeachStatement) {
        node.viewState = new ForEachViewState();
    }

    public beginVisitWhileStatement(node: WhileStatement) {
        node.viewState = new WhileViewState();
    }

    public endVisitActionStatement(node: ActionStatement, parent?: STNode) {
        if (isSTActionInvocation(node) && node.expression) {
            if (STKindChecker.isCheckAction(node.expression) && STKindChecker.isRemoteMethodCallAction(node.expression.expression)) {
                this.setActionInvocationInfo(node, node.expression.expression);
            } else if (STKindChecker.isRemoteMethodCallAction(node.expression)) {
                this.setActionInvocationInfo(node, node.expression);
            } else {
                const exprViewState = node.expression.viewState as StatementViewState;
                const stmtViewState = node.viewState as StatementViewState;
                stmtViewState.isCallerAction = exprViewState.isCallerAction;
                stmtViewState.isAction = exprViewState.isAction;
                stmtViewState.action.endpointName = exprViewState.action.endpointName;
                stmtViewState.action.actionName = exprViewState.action.actionName;
                stmtViewState.action.resourcePath = exprViewState.action.resourcePath;
            }
        }
    }

    public beginVisitTypeCastExpression(node: TypeCastExpression, parent?: STNode) {
        node.viewState = new StatementViewState();
    }

    private mapParentEndpointsWithCurrentEndpoints(node: FunctionBodyBlock) {
        this.parentConnectors?.forEach((parentEp: Endpoint, key: string) => {
            // TODO: Check all the conditions to map the correct endpoint
            const currentVp = this.allEndpoints?.get(key);
            if (currentVp && parentEp.visibleEndpoint.moduleName === currentVp.visibleEndpoint.moduleName
                && parentEp.visibleEndpoint.orgName === currentVp.visibleEndpoint.orgName) {
                parentEp.isExpandedPoint = true;
                parentEp.offsetValue = this.offsetValue;
                this.allEndpoints.set(key, parentEp);
            }
        })
    }

    public endVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode) {
        const blockViewState: BlockViewState = node.viewState;
        this.mapParentEndpointsWithCurrentEndpoints(node);
        blockViewState.connectors = this.allEndpoints;
        blockViewState.hasWorkerDecl = !!node.namedWorkerDeclarator;
        currentFnBody = undefined;
    }

    public beginVisitLocalVarDecl(node: LocalVarDecl, parent?: STNode) {
        const stmtViewState = new StatementViewState();

        if (isEndpointNode(node)) {
            const bindingPattern: CaptureBindingPattern = node.typedBindingPattern.bindingPattern as CaptureBindingPattern;
            stmtViewState.endpoint.epName = bindingPattern.variableName.value;
            if (this.allEndpoints.has(stmtViewState.endpoint.epName)) {
                stmtViewState.isEndpoint = true;
            }
        }

        if (isSTActionInvocation(node) && !haveBlockStatement(node)) {
            stmtViewState.isAction = true;
        }

        node.viewState = stmtViewState;
    }

    public endVisitLocalVarDecl(node: LocalVarDecl, parent?: STNode) {
        // this.initStatement(node, parent);
        const stmtViewState = node.viewState as StatementViewState;

        if (node.initializer && stmtViewState.isAction) {
            stmtViewState.action = node.initializer.viewState.action;
        }
    }

    beginVisitRemoteMethodCallAction(node: RemoteMethodCallAction, parent?: STNode): void {
        const stmtViewState = new StatementViewState();
        const typeInfo = node.typeData?.symbol?.typeDescriptor;
        if (typeInfo?.name === 'BaseClient') {
            stmtViewState.hidden = true;
        }


        let simpleName: SimpleNameReference;

        if (STKindChecker.isSimpleNameReference(node.expression)) {
            simpleName = node.expression as SimpleNameReference;
        } else if (STKindChecker.isFieldAccess(node.expression)) {
            const fieldAccessNode: FieldAccess = node.expression as FieldAccess;
            simpleName = fieldAccessNode.fieldName as SimpleNameReference;
        }

        stmtViewState.action.endpointName = simpleName.name.value;

        const actionName: SimpleNameReference = node.methodName as SimpleNameReference;
        if (actionName) {
            stmtViewState.action.actionName = actionName.name.value;
        }

        if (currentFnBody
            && STKindChecker.isFunctionBodyBlock(currentFnBody)
            && currentFnBody.VisibleEndpoints) {
            const callerParam = currentFnBody.VisibleEndpoints.find((vEP: any) => vEP.isCaller);
            stmtViewState.isCallerAction = callerParam && callerParam.name === simpleName.name.value;
        }

        node.viewState = stmtViewState;
    }

    beginVisitClientResourceAccessAction(node: ClientResourceAccessAction, parent?: STNode): void {
        const stmtViewState = new StatementViewState();
        const typeInfo = node.typeData?.symbol?.typeDescriptor;
        if (typeInfo?.name === 'BaseClient') {
            stmtViewState.hidden = true;
        }

        let simpleName: SimpleNameReference;

        if (STKindChecker.isSimpleNameReference(node.expression)) {
            simpleName = node.expression as SimpleNameReference;
        } else if (STKindChecker.isFieldAccess(node.expression)) {
            const fieldAccessNode: FieldAccess = node.expression as FieldAccess;
            simpleName = fieldAccessNode.fieldName as SimpleNameReference;
        }

        stmtViewState.action.endpointName = simpleName.name.value;

        const actionName: SimpleNameReference = node.methodName as SimpleNameReference;

        stmtViewState.action.actionName = actionName ? actionName.name.value : "get";

        if (node.resourceAccessPath && node.resourceAccessPath.length > 0) {
            stmtViewState.action.resourcePath = node.resourceAccessPath
                .reduce((acc, curr) => `${acc}${curr.value ? curr.value : curr.source}`, '/');
        } else {
            stmtViewState.action.resourcePath = '/';
        }
        node.viewState = stmtViewState;
    }

    public beginVisitExpressionFunctionBody(node: ExpressionFunctionBody) {
        // todo: Check if this is the function to replace beginVisitExpressionStatement
        node.viewState = new BlockViewState();
        currentFnBody = node;
        this.allEndpoints = new Map<string, Endpoint>();
        // this.visitBlock(node, parent);
        node.viewState.isEndComponentAvailable = true;
    }

    public endVisitExpressionFunctionBody(node: ExpressionFunctionBody) {
        // todo: Check if this is the function to replace endVisitExpressionStatement
        const blockViewState: BlockViewState = node.viewState;
        blockViewState.connectors = this.allEndpoints;
        currentFnBody = undefined;
    }

    public beginVisitIfElseStatement(node: IfElseStatement, parent?: STNode) {
        node.viewState = new IfViewState();
        if (!STKindChecker.isElseBlock(parent)) {
            (node.viewState as IfViewState).isMainIfBody = true;
        }
        if (node.elseBody) {
            if (node.elseBody.elseBody?.kind === "BlockStatement") {
                const elseBlock: BlockStatement = node.elseBody.elseBody as BlockStatement;
                elseBlock.viewState = new ElseViewState();
                elseBlock.viewState.isElseBlock = true;
                if (elseBlock.statements.length > 0 && STKindChecker.isReturnStatement(
                    elseBlock.statements[elseBlock.statements.length - 1])) {
                    elseBlock.viewState.isEndComponentAvailable = true;
                }
            } else if (node.elseBody.elseBody.kind === "IfElseStatement") {
                node.elseBody.elseBody.viewState = new IfViewState();
            }
        }
    }

    public beginVisitDoStatement(node: DoStatement, parent?: STNode) {
        node.viewState = new DoStatementViewState();
    }

    public beginVisitOnFailClause(node: OnFailClause, parent?: STNode) {
        node.viewState = new OnFailClauseViewState();
    }

    public beginVisitAssignmentStatement(node: AssignmentStatement, parent?: STNode) {
        const stmtViewState = new StatementViewState();
        node.viewState = stmtViewState;
    }

    public endVisitAssignmentStatement(node: AssignmentStatement, parent?: STNode) {
        if (node.expression && isSTActionInvocation(node)) {
            const stmtViewState: StatementViewState = node.viewState;
            stmtViewState.isAction = true;
            stmtViewState.action = node.expression.viewState.action;
        }
        // service level endpoint initialize with assignment statement
        if (STKindChecker.isCheckExpression(node.expression) && node.expression.typeData.isEndpoint
            && STKindChecker.isFieldAccess(node.varRef) && STKindChecker.isSimpleNameReference(node.varRef.fieldName)) {
            const stmtViewState: StatementViewState = node.viewState;
            stmtViewState.isEndpoint = true;
            stmtViewState.endpoint.epName = node.varRef.fieldName.name.value;
        }
    }

    public beginVisitNamedWorkerDeclaration(node: NamedWorkerDeclaration) {
        node.viewState = new WorkerDeclarationViewState();
    }

    private initStatement(node: STNode, parent?: STNode) {
        node.viewState = new StatementViewState();
        const stmtViewState: StatementViewState = node.viewState;
        // todo: In here we need to catch only the action invocations.
        if (isSTActionInvocation(node) && !haveBlockStatement(node)) {
            stmtViewState.isAction = true;
        }

    }

    private visitBlock(node: BlockStatement, parent: STNode) {
        // Preserve collapse views and draft view on clean render.
        let draft: [number, DraftStatementViewState];
        let collapseView: CollapseViewState;
        let collapseFrom: number = 0;
        let collapsed: boolean = false;
        let plusButtons: PlusViewState[] = [];
        let isDoBlock: boolean = STKindChecker.isDoStatement(parent);
        let isOnErrorBlock: boolean = STKindChecker.isOnFailClause(parent);
        if (node.viewState) {
            const viewState: BlockViewState = node.viewState as BlockViewState;
            draft = viewState.draft;
            isDoBlock = viewState.isDoBlock;
            isOnErrorBlock = viewState.isOnErrorBlock;
            if (viewState.collapseView) {
                collapseView = viewState.collapseView;
                collapseFrom = viewState.collapsedFrom;
                collapsed = viewState.collapsed;
                plusButtons = viewState.plusButtons;
            }
        }

        node.viewState = node.viewState && node.viewState.isElseBlock
            ? new ElseViewState()
            : new BlockViewState();
        node.viewState.draft = draft;
        node.viewState.collapseView = collapseView;
        node.viewState.collapsedFrom = collapseFrom;
        node.viewState.collapsed = collapsed;
        node.viewState.plusButtons = plusButtons;
        node.viewState.isDoBlock = isDoBlock;
        node.viewState.isOnErrorBlock = isOnErrorBlock;

        if (node.VisibleEndpoints) {
            const visibleEndpoints = node.VisibleEndpoints;
            let callerParamName: string;
            if (parent && STKindChecker.isFunctionDefinition(parent)) {
                const qualifierList: ResourceKeyword[] = parent.qualifierList ?
                    parent.qualifierList as ResourceKeyword[] : [];
                let resourceKeyword: ResourceKeyword;
                qualifierList.forEach((qualifier: STNode) => {
                    if (qualifier.kind === "ResourceKeyword") {
                        resourceKeyword = qualifier as ResourceKeyword;
                    }
                });
                if (resourceKeyword) {
                    const callerParam: RequiredParam = parent.functionSignature.parameters[0] as RequiredParam;
                    callerParamName = callerParam?.paramName?.value;
                }
            }
            visibleEndpoints.forEach((ep: any) => {
                ep.viewState = new SimpleBBox();
                const actions: StatementViewState[] = [];
                const endpoint: Endpoint = {
                    visibleEndpoint: ep,
                    actions
                };
                if (!this.allEndpoints.has(ep.typeName) && ep.name !== callerParamName) {
                    // Update endpoint lifeline values.
                    const endpointViewState: EndpointViewState = new EndpointViewState();
                    endpointViewState.bBox.w = DefaultConfig.connectorStart.width;
                    endpointViewState.lifeLine.h = DefaultConfig.connectorLine.height;

                    // Update the endpoint sizing values in allEndpoint map.
                    const visibleEndpoint: any = endpoint.visibleEndpoint;
                    const mainEp = endpointViewState;
                    mainEp.isUsed = endpoint.firstAction !== undefined;
                    visibleEndpoint.viewState = mainEp;
                    this.allEndpoints.set(ep.name, endpoint);
                }
            });
        }
        // evaluating return statement
        if (node.statements.length > 0 && STKindChecker.isReturnStatement(node.statements[node.statements.length - 1])) {
            node.viewState.isEndComponentAvailable = true;
        }
    }

    // TODO: Why???
    private removeXMLNameSpaces(parent?: STNode) {
        if (STKindChecker.isModulePart(parent)) {
            const modulePart = parent as ModulePart;
            const members = modulePart.members.filter(member => {
                if (member.kind !== "ModuleXmlNamespaceDeclaration") {
                    return member;
                }
            })
            modulePart.members = members;
            parent = modulePart;
        } else if (STKindChecker.isServiceDeclaration(parent)) {
            const service = parent as ServiceDeclaration;
            service.members.forEach(member => {
                if (STKindChecker.isResourceAccessorDefinition(member)) {
                    // TODO check for other functionbody types
                    const body = member.functionBody as FunctionBodyBlock;
                    const filteredStatements = body.statements?.filter(statement => {
                        if (statement.kind !== "XmlNamespaceDeclaration") {
                            return statement;
                        }
                    })
                    body.statements = filteredStatements;
                    member.functionBody = body;
                }
            })
            parent = service;
        } else if (STKindChecker.isFunctionDefinition(parent)) {
            const body = parent.functionBody;
            if (STKindChecker.isFunctionBodyBlock(body)) {
                const filteredStatements = body.statements.filter(statement => {
                    if (statement.kind !== "XmlNamespaceDeclaration") {
                        return statement;
                    }
                })
                body.statements = filteredStatements;
                parent.functionBody = body;
            }
        }
        return parent;
    }

    private setActionInvocationInfo(node: ActionStatement, remoteCall: RemoteMethodCallAction) {
        const stmtViewState: StatementViewState = node.viewState as StatementViewState;
        let endpointName = "";
        if (STKindChecker.isFieldAccess(remoteCall.expression) && STKindChecker.isSimpleNameReference(remoteCall.expression.fieldName)) {
            endpointName = remoteCall.expression.fieldName.name.value;
        } else if (STKindChecker.isSimpleNameReference(remoteCall.expression)) {
            endpointName = remoteCall.expression.name?.value;
        }
        stmtViewState.action.endpointName = endpointName || remoteCall.expression.source;
        const actionName: SimpleNameReference = remoteCall.methodName as SimpleNameReference;
        stmtViewState.action.actionName = actionName.name.value;

        if (currentFnBody && STKindChecker.isFunctionBodyBlock(currentFnBody) && currentFnBody.VisibleEndpoints) {
            const callerParam = currentFnBody.VisibleEndpoints.find((vEP: any) => vEP.isCaller);
            stmtViewState.isCallerAction = callerParam && callerParam.name === endpointName;
        }
    }

}

export const initVisitor = new InitVisitor();
