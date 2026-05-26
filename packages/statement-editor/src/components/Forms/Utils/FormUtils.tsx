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
    createFunctionSignature,
    createListenerDeclartion,
    createRemoteFunction,
    createResource,
    createServiceDeclartion,
    getSource,
    ListenerConfigFormState,
    STSymbolInfo
} from "@wso2/ballerina-core";
import {
    ListenerDeclaration,
    NodePosition,
    ServiceDeclaration,
    STKindChecker,
    STNode
} from "@wso2/syntax-tree";

export function recalculateItemIds(items: any[]) {
    items.forEach((item, index) => {
        item.id = index;
    });
}

export function getInitialSource(type: string, targetPosition: NodePosition): string {
    switch (type) {
        case "Function": {
            return getSource(createFunctionSignature("", "name", "",
                "returns error?", targetPosition));
        }
        case "Service": {
            return getSource(createServiceDeclartion({
                serviceBasePath: "/", listenerConfig: {
                    createNewListener: false, listenerName: "", listenerPort: "9090"
                }
            }, targetPosition, false));
        }
        case "Listener": {
            return getSource(createListenerDeclartion({
                listenerName: "'listener",
                listenerPort: "9090"
            }, targetPosition, false, 'http'));
        }
        case "GraphqlListener": {
            return getSource(createListenerDeclartion({
                listenerName: "graphqlListener",
                listenerPort: "9090"
            }, targetPosition, false, 'graphql'));
        }
        case "Main": {
            return getSource(createFunctionSignature("public", "main", "",
                "returns error?", targetPosition));
        }
        case "Resource": {
            return getSource(createResource("get", "path", '', "", targetPosition));
        }
        case "GraphqlResource": {
            return getSource(createResource("get", "queryName", '', "string", targetPosition));
        }
        case "ServiceClassResource": {
            return getSource(createResource("get", "fieldName", '', "string", targetPosition));
        }
        case "GraphqlMutation": {
            return getSource(createRemoteFunction("mutate", '', "string", targetPosition));
        }
        case "GraphqlSubscription": {
            return getSource(createResource("subscribe", "subscriptionName", '', "stream<string>", targetPosition));
        }
    }
    return;
}

export function getServiceTypeFromModel(model: ServiceDeclaration, symbolInfo: STSymbolInfo): string {
    if (model) {
        const listenerExpression = model?.expressions?.length > 0 && model?.expressions[0];
        if (listenerExpression) {
            if (STKindChecker.isExplicitNewExpression(listenerExpression)) {
                if (STKindChecker.isQualifiedNameReference(listenerExpression.typeDescriptor)) {
                    return listenerExpression.typeDescriptor.modulePrefix.value;
                } else {
                    return undefined;
                }
            } else if (STKindChecker.isSimpleNameReference(listenerExpression)) {
                const listenerNode: ListenerDeclaration
                    = symbolInfo.listeners.get(listenerExpression.name.value) as ListenerDeclaration;
                if (STKindChecker.isQualifiedNameReference(listenerNode.typeDescriptor)) {
                    return listenerNode.typeDescriptor.modulePrefix.value;
                } else {
                    return undefined;
                }
            }
        }
    }

    return undefined;
}

export function getListenerConfig(model: ServiceDeclaration, isEdit: boolean): ListenerConfigFormState {
    const serviceListenerExpression = model.expressions.length > 0 && model.expressions[0];
    if (isEdit) {
        if (STKindChecker.isSimpleNameReference(serviceListenerExpression)) {
            return { listenerName: serviceListenerExpression.name.value, fromVar: true }
        } else if (STKindChecker.isExplicitNewExpression(serviceListenerExpression)) {
            return {
                listenerPort: serviceListenerExpression.parenthesizedArgList.arguments.length > 0 &&
                    serviceListenerExpression.parenthesizedArgList.arguments[0].source,
                fromVar: false
            };
        }
    } else {
        if (STKindChecker.isExplicitNewExpression(serviceListenerExpression)) {
            return {
                listenerPort: serviceListenerExpression.parenthesizedArgList.arguments.length > 0 &&
                    serviceListenerExpression.parenthesizedArgList.arguments[0].source,
                fromVar: true
            };
        } else {
            return { listenerName: "", listenerPort: "", fromVar: true };
        }
    }
}

export function getUpdatedServiceInsertPosition(listeners: Map<string, STNode>, selectedListener: string,
                                                createdListenerCount: number, targetPosition: NodePosition): NodePosition {
    if (createdListenerCount > 0) {
        const selectedListenerPosition = listeners.get(selectedListener)?.position;
        return {
            startColumn: 0,
            endColumn: 0,
            endLine: selectedListenerPosition.endLine + 1,
            startLine: selectedListenerPosition.endLine + 1
        }
    } else {
        return {
            startColumn: 0,
            endColumn: 0,
            endLine: targetPosition.endLine,
            startLine: targetPosition.startLine
        }
    }
}
