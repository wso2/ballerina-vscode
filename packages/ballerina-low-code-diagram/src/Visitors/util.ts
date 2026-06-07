import { NodePosition, RemoteMethodCallAction, STKindChecker, STNode, traversNode, VisibleEndpoint } from "@wso2/syntax-tree";

import { CLIENT_SVG_HEIGHT } from "../Components/RenderingComponents/Connector/ConnectorHeader/ConnectorClientSVG";
import { CONNECTOR_PROCESS_SVG_HEIGHT } from "../Components/RenderingComponents/Connector/ConnectorProcess/ConnectorProcessSVG";
import { IFELSE_SVG_HEIGHT } from "../Components/RenderingComponents/IfElse/IfElseSVG";
import { PROCESS_SVG_HEIGHT } from "../Components/RenderingComponents/Processor/ProcessSVG";
import { RESPOND_SVG_HEIGHT } from "../Components/RenderingComponents/Respond/RespondSVG";
import { Endpoint } from "../Types/type";
import { EndpointViewState, PlusViewState, SimpleBBox, StatementViewState } from "../ViewState";

import { ActionInvocationFinder } from "./action-invocation-finder";
import { BlockStatementFinder } from "./block-statement-finder";
import { DefaultConfig } from "./default";

export function isSTActionInvocation(node: STNode): RemoteMethodCallAction {
    const actionFinder: ActionInvocationFinder = new ActionInvocationFinder();
    traversNode(node, actionFinder);
    return actionFinder.getIsAction();
}


export function isPositionWithinRange(nodePosition: NodePosition, range: NodePosition): boolean {
    if (nodePosition.startLine > range.startLine
        && nodePosition.endLine < range.endLine) {
        return true;
    }

    // TODO: Check if we can simplify this more
    if (nodePosition.startLine === range.startLine
        && nodePosition.startColumn >= range.startColumn) {

        if (nodePosition.endLine < range.endLine) {
            return true;
        }

        if (nodePosition.endLine === range.endLine && nodePosition.endColumn <= range.endColumn) {
            return true;
        }
    }

    if (nodePosition.startLine > range.startLine && nodePosition.endLine === range.endLine
        && nodePosition.endColumn <= range.endColumn) {
        return true;
    }
    return false;
}

export function isPositionEquals(position1: NodePosition, position2: NodePosition): boolean {
    return position1?.startLine === position2?.startLine &&
        position1?.startColumn === position2?.startColumn &&
        position1?.endLine === position2?.endLine &&
        position1?.endColumn === position2?.endColumn;
}

export function isEndpointNode(node: STNode): boolean {
    if (node?.typeData?.isEndpoint) {
        return true;
    }
    // Check union type endpoints
    if (node && (STKindChecker.isLocalVarDecl(node) || STKindChecker.isModuleVarDecl(node))
        && node.typedBindingPattern?.typeDescriptor && STKindChecker.isUnionTypeDesc(node.typedBindingPattern.typeDescriptor)) {
        const unionNode = node.typedBindingPattern.typeDescriptor;
        if (isEndpointNode(unionNode.leftTypeDesc)) {
            return true;
        }
        if (isEndpointNode(unionNode.rightTypeDesc)) {
            return true;
        }
    }
    return false;
}

export function haveBlockStatement(node: STNode): boolean {
    const blockStatementFinder: BlockStatementFinder = new BlockStatementFinder();
    traversNode(node, blockStatementFinder);
    return blockStatementFinder.getHaveBlockStatement();
}

export function getMaXWidthOfConnectors(allEndpoints: Map<string, Endpoint>): number {
    let prevCX: number = 0;
    allEndpoints.forEach((value: Endpoint, key: string) => {
        const visibleEndpoint: VisibleEndpoint = value.visibleEndpoint;
        const mainEp: EndpointViewState = visibleEndpoint.viewState;
        mainEp.collapsed = value.firstAction?.collapsed;
        if ((prevCX < (mainEp.lifeLine.cx + (mainEp.bBox.w / 2)))) {
            prevCX = mainEp.lifeLine.cx + (mainEp.bBox.w / 2);
        }
    });

    return prevCX;
}

export function getPlusViewState(index: number, viewStates: PlusViewState[]): PlusViewState {
    let matchingPlusViewState: PlusViewState;
    for (const plusViewState of viewStates) {
        if (plusViewState.index === index) {
            matchingPlusViewState = plusViewState
            break;
        }
    }
    return matchingPlusViewState;
}

export function updateConnectorCX(maxContainerRightWidth: number, containerCX: number, allEndpoints: Map<string, Endpoint>, startCY?: number) {
    const containerRightMostConerCX = maxContainerRightWidth + containerCX;
    let prevX = 0;
    let foundFirst: boolean = false;

    allEndpoints.forEach((value: Endpoint, key: string) => {
        const visibleEndpoint: VisibleEndpoint = value.visibleEndpoint;
        const mainEp: EndpointViewState = visibleEndpoint.viewState;
        mainEp.collapsed = value.firstAction?.collapsed;

        if (!foundFirst) {
            mainEp.lifeLine.cx = containerRightMostConerCX + (mainEp.bBox.w / 2) + DefaultConfig.epGap;
            foundFirst = true;
        } else {
            mainEp.lifeLine.cx = prevX + (mainEp.bBox.w / 2) + DefaultConfig.epGap;
        }

        prevX = mainEp.lifeLine.cx;

        if (mainEp.isExternal) { // Render external endpoints align with the start element
            mainEp.lifeLine.h += mainEp.lifeLine.cy - (startCY + (CONNECTOR_PROCESS_SVG_HEIGHT / 2));
            mainEp.lifeLine.cy = startCY + (CONNECTOR_PROCESS_SVG_HEIGHT / 2);
            const highCy = getHighestHeight(value.offsetValue, value.actions, value.firstAction);
            if (highCy > mainEp.lifeLine.h) {
                mainEp.lifeLine.h = (highCy - (startCY + (CONNECTOR_PROCESS_SVG_HEIGHT / 2))) + PROCESS_SVG_HEIGHT / 4;
            }
        }

        updateActionTriggerCx(mainEp.lifeLine.cx, value.actions);
    });
}

export function getHighestHeight(offSet: number, actions: StatementViewState[], firstAction: StatementViewState) {
    let maxValue = 0;
    const offSetValue = offSet;
    actions.forEach((action) => {
        const isFirstAction = firstAction.action.trigger.cx === action.action.trigger.cx && firstAction.action.trigger.cy === action.action.trigger.cy;
        if ((offSetValue && offSetValue > 0) && !isFirstAction) {
            const current = offSetValue + action.action.trigger.cy;
            if (current > maxValue) {
                maxValue = current;
            }
        }
    });
    return maxValue;
}

export function updateActionTriggerCx(connectorCX: number, actions: StatementViewState[]) {
    actions.forEach((action) => {
        action.action.trigger.cx = connectorCX;
    });
}

export function getDraftComponentSizes(type: string, subType: string): { h: number, w: number } {
    let h: number = 0;
    let w: number = 0;

    switch (type) {
        case "APIS":
            h = CLIENT_SVG_HEIGHT;
            w = DefaultConfig.defaultBlockWidth;
            break;
        case "STATEMENT":
            switch (subType) {
                case "If":
                case "ForEach":
                case "While":
                case "DoStatement":
                    h = IFELSE_SVG_HEIGHT;
                    w = DefaultConfig.defaultBlockWidth;
                    break;
                case "Log":
                case "Worker":
                case "Variable":
                case "AssignmentStatement":
                case "Custom":
                case "Call":
                case "AsyncSend":
                case "ReceiveStatement":
                case "WaitStatement":
                case "FlushStatement":
                    h = PROCESS_SVG_HEIGHT;
                    w = DefaultConfig.defaultBlockWidth;
                    break;
                case "HTTP":
                    h = PROCESS_SVG_HEIGHT;
                    w = DefaultConfig.defaultBlockWidth;
                    break;
                case "Respond":
                    h = RESPOND_SVG_HEIGHT;
                    w = DefaultConfig.defaultBlockWidth;
                    break;
                case "Return":
                    h = RESPOND_SVG_HEIGHT;
                    w = DefaultConfig.defaultBlockWidth;
                    break;
            }
            break;
        default:
            break;
    }

    return {
        h,
        w
    }
}
