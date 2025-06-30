/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { NodePosition } from "@wso2/syntax-tree";
import { ConfigurableFormState, ConstantConfigFormState, HeaderObjectConfig, ModuleVariableFormState, STModification } from "../../interfaces/ballerina";
import { SendStatementConfig, ReceivestatementConfig, WaitStatementConfig, FlushStatementConfig, FormField, HTTPServiceConfigState } from "../../interfaces/config-spec";

import { getParams } from "./utils";
import { getComponentSource } from "./template-utils";

/* tslint:disable ordered-imports */

export function createIfStatement(condition: string, targetPosition?: NodePosition): STModification {
    const ifStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "IF_CONDITION",
        config: {
            "CONDITION": condition,
        }
    };

    return ifStatement;
}

export function createIfStatementWithBlock(condition: string, statements: string[], targetPosition?: NodePosition): STModification {
    const ifStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "IF_CONDITION_WITH_BLOCK",
        config: {
            "CONDITION": condition,
            "BLOCKSTATEMENTS": statements.join('')
        }
    };

    return ifStatement;
}

export function createElseIfStatement(condition: string, targetPosition?: NodePosition): STModification {
    const elseIfStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "ELSE_IF_CONDITION",
        config: {
            "CONDITION": condition,
        }
    };
    return elseIfStatement;
}

export function createElseIfStatementWithBlock(condition: string, statements: string[], targetPosition?: NodePosition): STModification {
    const elseIfStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "ELSE_IF_CONDITION_WITH_BLOCK",
        config: {
            "CONDITION": condition,
            "BLOCKSTATEMENTS": statements.join('')
        }
    };
    return elseIfStatement;
}

export function createElseStatement(targetPosition?: NodePosition): STModification {
    const elseStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "ELSE_STATEMENT"
    };
    return elseStatement;
}

export function createElseStatementWithBlock(statements: string[], targetPosition?: NodePosition): STModification {
    const elseStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "ELSE_STATEMENT_WITH_BLOCK",
        config: {
            "BLOCKSTATEMENTS": statements.join('')
        }
    };
    return elseStatement;
}

export function updateIfStatementCondition(condition: string, targetPosition: NodePosition): STModification {
    const updatedIfStatement: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "IF_STATEMENT_CONDITION",
        config: {
            "CONDITION": condition,
        }
    };

    return updatedIfStatement;
}

export function createForeachStatement(collection: string, variableName: string, type: string, targetPosition?: NodePosition): STModification {
    const foreachStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "FOREACH_STATEMENT",
        config: {
            "COLLECTION": collection,
            "TYPE": type,
            "VARIABLE": variableName
        }
    };

    return foreachStatement;
}

export function createForeachStatementWithBlock(collection: string, variableName: string, type: string, statements: string[], targetPosition?: NodePosition): STModification {
    const foreachStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "FOREACH_STATEMENT_WITH_BLOCK",
        config: {
            "COLLECTION": collection,
            "TYPE": type,
            "VARIABLE": variableName,
            "BLOCKSTATEMENTS": statements.join('')
        }
    };

    return foreachStatement;
}

export function createQueryWhileStatement(recordResultName: string, returnVariableName: string, targetPosition?: NodePosition): STModification {
    const queryForeachStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "WHILE_NEXT_STATEMENT",
        config: {
            "VARIABLE": recordResultName,
            "RETURN_TYPE": returnVariableName,
        }
    };

    return queryForeachStatement;
}

export function updateForEachCondition(collection: string, variableName: string, type: string, targetPosition: NodePosition): STModification {
    const foreachStatement: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "FOREACH_STATEMENT_CONDITION",
        config: {
            "COLLECTION": collection,
            "VARIABLE": variableName,
            "TYPE": type
        }
    };

    return foreachStatement;
}

export function createWhileStatement(conditionExpression: string, targetPosition?: NodePosition): STModification {
    const ifStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "WHILE_STATEMENT",
        config: {
            "CONDITION": conditionExpression,
        }
    };

    return ifStatement;
}

export function createWhileStatementWithBlock(conditionExpression: string, statements: string[], targetPosition?: NodePosition): STModification {
    const whileStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "WHILE_STATEMENT_WITH_BLOCK",
        config: {
            "CONDITION": conditionExpression,
            "BLOCKSTATEMENTS": statements.join('')
        }
    };

    return whileStatement;
}

export function updateWhileStatementCondition(conditionExpression: string, targetPosition: NodePosition): STModification {
    const updatedIfStatement: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "WHILE_STATEMENT_CONDITION",
        config: {
            "CONDITION": conditionExpression,
        }
    };

    return updatedIfStatement;
}

export function createPropertyStatement(property: string, targetPosition?: NodePosition,
                                        isLastMember?: boolean): STModification {
    const propertyStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: isLastMember ? targetPosition.endColumn : 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: isLastMember ? targetPosition.endColumn : 0,
        type: "PROPERTY_STATEMENT",
        config: {
            "PROPERTY": property,
        }
    };

    return propertyStatement;
}

export function updatePropertyStatement(property: string, targetPosition: NodePosition): STModification {
    const propertyStatement: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "PROPERTY_STATEMENT",
        config: {
            "PROPERTY": property,
        }
    };

    return propertyStatement;
}

export function createLogStatement(type: string, logExpr: string, targetPosition?: NodePosition): STModification {
    const propertyStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "LOG_STATEMENT",
        config: {
            "TYPE": type,
            "LOG_EXPR": logExpr
        }
    };

    return propertyStatement;
}

export function updateLogStatement(type: string, logExpr: string, targetPosition: NodePosition): STModification {
    const propertyStatement: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "LOG_STATEMENT",
        config: {
            "TYPE": type,
            "LOG_EXPR": logExpr
        }
    };

    return propertyStatement;
}

export function createWorker(name: string, returnType: string, targetPosition: NodePosition): STModification {
    return {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: returnType.trim().length > 0 ? 'WORKER_DEFINITION_WITH_RETURN' : 'WORKER_DEFINITION',
        config: {
            "NAME": name,
            "RETURN_TYPE": returnType
        }
    };
}

export function createReturnStatement(returnExpr: string, targetPosition?: NodePosition): STModification {
    const returnStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "RETURN_STATEMENT",
        config: {
            "RETURN_EXPR": returnExpr
        }
    };

    return returnStatement;
}

export function updateReturnStatement(returnExpr: string, targetPosition: NodePosition): STModification {
    const returnStatement: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "RETURN_STATEMENT",
        config: {
            "RETURN_EXPR": returnExpr
        }
    };

    return returnStatement;
}


export function createObjectDeclaration(type: string, variableName: string, params: string[], targetPosition: NodePosition): STModification {
    const objectDeclaration: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "DECLARATION",
        config: {
            "TYPE": type,
            "VARIABLE": variableName,
            "PARAMS": params?.join()
        }
    };
    return objectDeclaration;
}


export function updateObjectDeclaration(type: string, variableName: string, params: string[], targetPosition: NodePosition): STModification {
    const objectDeclaration: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "DECLARATION",
        config: {
            "TYPE": type,
            "VARIABLE": variableName,
            "PARAMS": params
        }
    };
    return objectDeclaration;
}

export function createCheckObjectDeclaration(type: string, variableName: string, params: string[], targetPosition: NodePosition): STModification {
    const objectDeclaration: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "DECLARATION_CHECK",
        config: {
            "TYPE": type,
            "VARIABLE": variableName,
            "PARAMS": params?.join()
        }
    };
    return objectDeclaration;
}

export function createRemoteServiceCall(
    type: string,
    variable: string,
    callerName: string,
    functionName: string,
    params: string[],
    targetPosition: NodePosition,
    withSelf?: boolean
): STModification {
    const remoteServiceCall: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "REMOTE_SERVICE_CALL",
        config: {
            TYPE: type,
            VARIABLE: variable,
            CALLER: callerName,
            FUNCTION: functionName,
            PARAMS: params,
            WITH_SELF: withSelf
        },
    };

    return remoteServiceCall;
}

export function updateRemoteServiceCall(type: string, variable: string, callerName: string, functionName: string, params: string[], targetPosition: NodePosition): STModification {
    const remoteServiceCall: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "REMOTE_SERVICE_CALL",
        config: {
            "TYPE": type,
            "VARIABLE": variable,
            "CALLER": callerName,
            "FUNCTION": functionName,
            "PARAMS": params.join()
        }
    };

    return remoteServiceCall;
}

export function createCheckedRemoteServiceCall(
    type: string,
    variable: string,
    callerName: string,
    functionName: string,
    params: string[],
    targetPosition: NodePosition,
    withSelf?: boolean
): STModification {
    const checkedRemoteServiceCall: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "REMOTE_SERVICE_CALL_CHECK",
        config: {
            TYPE: type,
            VARIABLE: variable,
            CALLER: callerName,
            FUNCTION: functionName,
            PARAMS: params.join(),
            WITH_SELF: withSelf
        },
    };

    return checkedRemoteServiceCall;
}

export function createCheckedResourceServiceCall(
    type: string,
    variable: string,
    callerName: string,
    path: string[],
    functionName: string,
    params: string[],
    targetPosition: NodePosition,
    withSelf?: boolean
): STModification {
    const checkedResourceServiceCall: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "RESOURCE_SERVICE_CALL_CHECK",
        config: {
            TYPE: type,
            VARIABLE: variable,
            CALLER: callerName,
            PATH: path.length > 0 ? path.join("/") : undefined,
            FUNCTION: functionName || undefined,
            PARAMS: params?.length > 0 ? params.join() : undefined,
            WITH_SELF: withSelf
        },
    };

    return checkedResourceServiceCall;
}

export function createActionStatement(
    callerName: string,
    functionName: string,
    params: string[],
    targetPosition: NodePosition,
    withSelf?: boolean
): STModification {
    const actionStatement: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "ACTION_STATEMENT",
        config: {
            CALLER: callerName,
            FUNCTION: functionName,
            PARAMS: params.join(),
            WITH_SELF: withSelf,
        },
    };

    return actionStatement;
}

export function createCheckActionStatement(
    callerName: string,
    functionName: string,
    params: string[],
    targetPosition: NodePosition,
    withSelf?: boolean
): STModification {
    const checkActionStatement: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "ACTION_STATEMENT_CHECK",
        config: {
            CALLER: callerName,
            FUNCTION: functionName,
            PARAMS: params.join(),
            WITH_SELF: withSelf,
        },
    };

    return checkActionStatement;
}

export function updateCheckedRemoteServiceCall(type: string, variable: string, callerName: string, functionName: string, params: string[], targetPosition: NodePosition): STModification {
    const checkedRemoteServiceCall: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "REMOTE_SERVICE_CALL_CHECK",
        config: {
            "TYPE": type,
            "VARIABLE": variable,
            "CALLER": callerName,
            "FUNCTION": functionName,
            "PARAMS": params
        }
    };

    return checkedRemoteServiceCall;
}

export function createServiceCallForPayload(type: string, variable: string, callerName: string, functionName: string, params: string[], targetPosition: NodePosition): STModification {
    let statement = "http:Response $varName = <http:Response>check $callerName->$functionName($parameters);";
    statement = statement
        .replace("$parameters", params.toString())
        .replace("$varName", variable)
        .replace("$callerName", callerName)
        .replace("$functionName", functionName);
    const modification: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "PROPERTY_STATEMENT",
        config: {
            "PROPERTY": statement,
        }
    };
    return modification;
}

export function updateServiceCallForPayload(type: string, variable: string, callerName: string, functionName: string, params: string[], targetPosition: NodePosition): STModification {
    let statement = "http:Response $varName = <http:Response>check $callerName->$functionName($parameters);";
    statement = statement
        .replace("$parameters", params.toString())
        .replace("$varName", variable)
        .replace("$callerName", callerName)
        .replace("$functionName", functionName);
    const modification: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "PROPERTY_STATEMENT",
        config: {
            "PROPERTY": statement,
        }
    };
    return modification;
}

export function createRespond(type: string, variable: string, callerName: string, expression: string, targetPosition?: NodePosition): STModification {
    const respond: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: 0,
        type: "RESPOND",
        config: {
            "TYPE": type,
            "VARIABLE": variable,
            "CALLER": callerName,
            "EXPRESSION": expression
        }
    };

    return respond;
}

export function createCheckedRespond(callerName: string, expression: string, targetPosition: NodePosition): STModification {
    const checkedRespond: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "RESPOND_WITH_CHECK",
        config: {
            "CALLER": callerName,
            "EXPRESSION": expression
        }
    };

    return checkedRespond;
}

export function updateCheckedRespond(callerName: string, expression: string, targetPosition: NodePosition): STModification {
    const checkedRespond: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "RESPOND_WITH_CHECK",
        config: {
            "CALLER": callerName,
            "EXPRESSION": expression
        }
    };

    return checkedRespond;
}

export function createTypeGuard(variable: string, type: string, statement: string, targetPosition: NodePosition): STModification {
    const typeGuard: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "TYPE_GUARD_IF",
        config: {
            "TYPE": type,
            "VARIABLE": variable,
            "STATEMENT": statement
        }
    };

    return typeGuard;
}

export function createCheckedPayloadFunctionInvocation(variable: string, type: string, response: string, payload: string, targetPosition: NodePosition): STModification {
    const checkedPayloadInvo: STModification = {
        startLine: targetPosition.startLine,
        startColumn: 0,
        endLine: targetPosition.startLine,
        endColumn: 0,
        type: "CHECKED_PAYLOAD_FUNCTION_INVOCATION",
        config: {
            "TYPE": type,
            "VARIABLE": variable,
            "RESPONSE": response,
            "PAYLOAD": payload
        }
    };

    return checkedPayloadInvo;
}

export function createModuleVarDecl(config: ModuleVariableFormState, targetPosition?: NodePosition,
                                    isLastMember?: boolean): STModification {
    const { varName, varOptions, varType, varValue } = config;

    return {
        startLine: targetPosition ? targetPosition.startLine : 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: isLastMember ? targetPosition.endColumn : 0,
        endColumn: isLastMember ? targetPosition.endColumn : 0,
        type: 'MODULE_VAR_DECL_WITH_INIT',
        config: {
            'ACCESS_MODIFIER': varOptions.indexOf('public') > -1 ? 'public' : '',
            'VAR_QUALIFIER': varOptions.indexOf('final') > -1 ? 'final' : '',
            'VAR_TYPE': varType,
            'VAR_NAME': varName,
            'VAR_VALUE': varValue
        }
    };
}

export function createSendStatement(config: SendStatementConfig, targetPosition?: NodePosition): STModification {
    return {
        startLine: targetPosition ? targetPosition.startLine : 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: targetPosition ? targetPosition.endColumn : 0,
        endColumn: targetPosition ? targetPosition.endColumn : 0,
        type: 'ASYNC_SEND_STATEMENT',
        config: {
            'EXPRESSION': config.expression,
            'TARGET_WORKER': config.targetWorker
        }
    };
}

export function createReceiveStatement(config: ReceivestatementConfig, targetPosition?: NodePosition): STModification {
    return {
        startLine: targetPosition ? targetPosition.startLine : 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: targetPosition ? targetPosition.endColumn : 0,
        endColumn: targetPosition ? targetPosition.endColumn : 0,
        type: 'ASYNC_RECEIVE_STATEMENT',
        config: {
            'TYPE': config.type,
            'VAR_NAME': config.varName,
            'SENDER_WORKER': config.senderWorker
        }
    };
}

export function createWaitStatement(config: WaitStatementConfig, targetPosition?: NodePosition): STModification {
    return {
        startLine: targetPosition ? targetPosition.startLine : 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: targetPosition ? targetPosition.endColumn : 0,
        endColumn: targetPosition ? targetPosition.endColumn : 0,
        type: 'WAIT_STATEMENT',
        config: {
            'TYPE': config.type,
            'VAR_NAME': config.varName,
            'WORKER_NAME': config.expression
        }
    };
}

export function createFlushStatement(config: FlushStatementConfig, targetPosition?: NodePosition): STModification {
    return {
        startLine: targetPosition ? targetPosition.startLine : 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: targetPosition ? targetPosition.endColumn : 0,
        endColumn: targetPosition ? targetPosition.endColumn : 0,
        type: 'FLUSH_STATEMENT',
        config: {
            'VAR_NAME': config.varName,
            'WORKER_NAME': config.expression
        }
    };
}

export function createModuleVarDeclWithoutInitialization(config: ModuleVariableFormState, targetPosition?: NodePosition,
                                                         isLastMember?: boolean): STModification {
    const { varName, varOptions, varType } = config;

    return {
        startLine: targetPosition ? targetPosition.startLine : 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: isLastMember ? targetPosition.endColumn : 0,
        endColumn: isLastMember ? targetPosition.endColumn : 0,
        type: 'MODULE_VAR_DECL_WITHOUT_INIT',
        config: {
            'ACCESS_MODIFIER': varOptions.indexOf('public') > -1 ? 'public' : '',
            'VAR_QUALIFIER': varOptions.indexOf('final') > -1 ? 'final' : '',
            'VAR_TYPE': varType,
            'VAR_NAME': varName
        }
    };
}

export function updateModuleVarDecl(config: ModuleVariableFormState, targetPosition: NodePosition): STModification {
    const { varName, varOptions, varType, varValue } = config;

    return {
        startLine: targetPosition.startLine,
        endLine: targetPosition.endLine,
        startColumn: targetPosition.startColumn,
        endColumn: targetPosition.endColumn,
        type: 'MODULE_VAR_DECL_WITH_INIT',
        config: {
            'ACCESS_MODIFIER': varOptions.indexOf('public') > -1 ? 'public' : '',
            'VAR_QUALIFIER': varOptions.indexOf('final') > -1 ? 'final' : '',
            'VAR_TYPE': varType,
            'VAR_NAME': varName,
            'VAR_VALUE': varValue
        }
    };
}

export function createConfigurableDecl(config: ConfigurableFormState, targetPosition: NodePosition,
                                       isLastMember?: boolean, skipNewLine?: boolean): STModification {
    const { isPublic, varName, varType, varValue, label } = config;

    const modification: STModification = {
        startLine: targetPosition.startLine,
        endLine: targetPosition.startLine,
        startColumn: isLastMember ? targetPosition.endColumn : 0,
        endColumn: isLastMember ? targetPosition.endColumn : 0,
        type: 'MODULE_VAR_DECL_WITH_INIT',
        config: {
            'ACCESS_MODIFIER': isPublic ? 'public' : '',
            'VAR_QUALIFIER': 'configurable',
            'VAR_TYPE': varType,
            'VAR_NAME': varName,
            'VAR_VALUE': varValue
        }
    };

    if (skipNewLine) {
        modification.type = 'MODULE_VAR_DECL_WITH_INIT_WITHOUT_NEWLINE';
    }

    if (label.length > 0) {
        modification.type = 'MODULE_VAR_DECL_WITH_INIT_WITH_DISPLAY';
        modification.config.DISPLAY_LABEL = label;
    }

    return modification;
}

export function updateConfigurableVarDecl(config: ConfigurableFormState, targetPosition: NodePosition): STModification {
    const { isPublic, varName, varType, varValue, label } = config;

    const modification: STModification = {
        startLine: targetPosition.startLine,
        endLine: targetPosition.endLine,
        startColumn: targetPosition.startColumn,
        endColumn: targetPosition.endColumn,
        type: 'MODULE_VAR_DECL_WITH_INIT',
        config: {
            'ACCESS_MODIFIER': isPublic ? 'public' : '',
            'VAR_QUALIFIER': 'configurable',
            'VAR_TYPE': varType,
            'VAR_NAME': varName,
            'VAR_VALUE': varValue
        }
    };

    if (label.length > 0) {
        modification.type = 'MODULE_VAR_DECL_WITH_INIT_WITH_DISPLAY';
        modification.config.DISPLAY_LABEL = label;
    }

    return modification;
}

export function createConstDeclaration(config: ConstantConfigFormState, targetPosition: NodePosition,
                                       isLastMember?: boolean): STModification {
    const { isPublic, constantName, constantType, constantValue } = config;

    return {
        startLine: targetPosition.startLine,
        endLine: targetPosition.startLine,
        startColumn: isLastMember ? targetPosition.endColumn : 0,
        endColumn: isLastMember ? targetPosition.endColumn : 0,
        type: 'CONSTANT_DECLARATION',
        config: {
            'ACCESS_MODIFIER': isPublic ? 'public' : '',
            'CONST_TYPE': constantType,
            'CONST_NAME': constantName,
            'CONST_VALUE': constantValue
        }
    };
}

export function updateConstDeclaration(config: ConstantConfigFormState, targetPosition: NodePosition): STModification {
    const { isPublic, constantName, constantType, constantValue } = config;

    return {
        startLine: targetPosition.startLine,
        endLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endColumn: targetPosition.endColumn,
        type: 'CONSTANT_DECLARATION',
        config: {
            'ACCESS_MODIFIER': isPublic ? 'public' : '',
            'CONST_TYPE': constantType,
            'CONST_NAME': constantName,
            'CONST_VALUE': constantValue
        }
    };
}

export function updateServiceDeclartion(config: HTTPServiceConfigState, targetPosition: NodePosition): STModification {
    const { serviceBasePath, listenerConfig: { fromVar, listenerName, listenerPort, createNewListener } } = config;

    const modification: STModification = {
        ...targetPosition,
        type: ''
    };

    if (createNewListener && fromVar) {
        return {
            ...modification,
            type: 'SERVICE_WITH_LISTENER_DECLARATION_UPDATE',
            config: {
                'LISTENER_NAME': listenerName,
                'PORT': listenerPort,
                'BASE_PATH': serviceBasePath,
            }
        };
    } else if (!fromVar) {
        return {
            ...modification,
            type: 'SERVICE_DECLARATION_WITH_INLINE_LISTENER_UPDATE',
            config: {
                'PORT': listenerPort,
                'BASE_PATH': serviceBasePath,
            }
        };

    } else {
        return {
            ...modification,
            type: 'SERVICE_DECLARATION_WITH_SHARED_LISTENER_UPDATE',
            config: {
                'LISTENER_NAME': listenerName,
                'BASE_PATH': serviceBasePath,
            }
        };
    }
}

export function updateTriggerServiceDeclartion(listenerName: string, triggerChannel: string, targetPosition: NodePosition): STModification {

    const modification: STModification = {
        ...targetPosition,
        type: ''
    };

    return {
        ...modification,
        type: 'TRIGGER_UPDATE',
        config: {
            'LISTENER_NAME': listenerName,
            'TRIGGER_CHANNEL': triggerChannel
        }
    };
}

export function updateCheckedPayloadFunctionInvocation(variable: string, type: string, response: string, payload: string, targetPosition: NodePosition): STModification {
    const checkedPayloadInvo: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "CHECKED_PAYLOAD_FUNCTION_INVOCATION",
        config: {
            "TYPE": type,
            "VARIABLE": variable,
            "RESPONSE": response,
            "PAYLOAD": payload
        }
    };

    return checkedPayloadInvo;
}

export function removeStatement(targetPosition: NodePosition): STModification {
    const removeLine: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: 'DELETE'
    };

    return removeLine;
}

export function createHeaderObjectDeclaration(headerObject: HeaderObjectConfig[], requestName: string, operation: string, message: FormField, targetPosition: NodePosition, modifications: STModification[]) {
    if (operation !== "forward") {
        let httpRequest: string = "http:Request ";
        httpRequest += requestName;
        httpRequest += " = new;";
        if (operation === "post" || operation === "put" || operation === "delete" || operation === "patch") {
            const payload: string = "\n" + requestName + ".setPayload(" + getParams([ message ]).toString() + ");";
            httpRequest += payload;
        }
        const requestGeneration: STModification = {
            startLine: targetPosition.startLine,
            startColumn: 0,
            endLine: targetPosition.startLine,
            endColumn: 0,
            type: "PROPERTY_STATEMENT",
            config: {
                "PROPERTY": httpRequest,
            }
        };
        modifications.push(requestGeneration);
    }

    headerObject.forEach((header) => {
        let headerStmt: string = ("$requestName.setHeader(\"$key\", \"$value\");").replace("$requestName", requestName);
        headerStmt = headerStmt.replace("$key", header.objectKey);
        headerStmt = headerStmt.replace("$value", header.objectValue);
        const headerObjectDeclaration: STModification = {
            startLine: targetPosition.startLine,
            startColumn: 0,
            endLine: targetPosition.startLine,
            endColumn: 0,
            type: "PROPERTY_STATEMENT",
            config: {
                "PROPERTY": headerStmt,
            }
        };
        modifications.push(headerObjectDeclaration);
    });
}

export function updateHeaderObjectDeclaration(headerObject: HeaderObjectConfig[], requestName: string, operation: string, message: FormField, targetPosition: NodePosition): STModification {
    let headerDecl: string = "";
    if (operation !== "forward") {
        if (operation === "post" || operation === "put" || operation === "delete" || operation === "patch") {
            const payload: string = requestName + ".setPayload(" + getParams([ message ]).toString() + ");";
            headerDecl += payload;
        }

    }

    headerObject.forEach((header) => {
        let headerStmt: string = ("$requestName.setHeader($key, $value);\n").replace("$requestName", requestName);
        const regexExp = /"(.*?)"/g;
        headerStmt = headerStmt.replace("$key", header.objectKey.match(regexExp) ? header.objectKey : `"${header.objectKey}"`);
        headerStmt = headerStmt.replace("$value", header.objectValue.match(regexExp) ? header.objectValue : `"${header.objectValue}"`);
        headerDecl += headerStmt;
    });

    const requestGeneration: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "PROPERTY_STATEMENT",
        config: {
            "PROPERTY": headerDecl,
        }
    };

    return requestGeneration;
}

export function mutateTypeDefinition(typeName: string, typeDesc: string, targetPosition: NodePosition, isNew: boolean,
                                     accessModifier?: string): STModification {
    let modification: STModification;
    if (isNew) {
        modification = {
            startLine: targetPosition.startLine,
            endLine: targetPosition.startLine,
            startColumn: 0,
            endColumn: 0,
            type: ''
        };
    } else {
        modification = {
            ...targetPosition,
            type: ''
        };
    }

    return {
        ...modification,
        type: 'TYPE_DEFINITION',
        config: {
            'ACCESS_MODIFIER': accessModifier,
            'TYPE_NAME': typeName,
            'TYPE_DESCRIPTOR': typeDesc
        }
    };
}

export function getInitialSource(modification: STModification): string {
    const source = getComponentSource(modification.type, modification.config);
    return source;
}

export function createTrigger(config: any, targetPosition?: NodePosition, isLastMember?: boolean): STModification {
    const triggerStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: isLastMember ? targetPosition.endColumn : 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: isLastMember ? targetPosition.endColumn : 0,
        type: "TRIGGER",
        config
    };

    return triggerStatement;
}

export function mutateEnumDefinition(name: string, members: string[], targetPosition: NodePosition, isNew: boolean,
                                     accessModifier?: string): STModification {
    let modification: STModification;
    if (isNew) {
        modification = {
            startLine: targetPosition.startLine,
            endLine: targetPosition.startLine,
            startColumn: 0,
            endColumn: 0,
            type: 'ENUM_DEFINITION'
        };
    } else {
        modification = {
            ...targetPosition,
            type: 'ENUM_DEFINITION'
        };
    }

    return {
        ...modification,
        type: 'ENUM_DEFINITION',
        config: {
            'ACCESS_MODIFIER': accessModifier,
            'NAME': name,
            'MEMBERS': members
        }
    };
}
