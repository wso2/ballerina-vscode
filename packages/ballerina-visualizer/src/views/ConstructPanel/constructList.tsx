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

import { ActionIcon, AssignmentIcon, createElseStatement, createForeachStatement, createIfStatement, createModuleVarDecl, createPropertyStatement, createReturnStatement, createWhileStatement, ConnectorIcon, ForEachIcon, FunctionCallIcon, genVariableName, IfIcon, ModuleVariableIcon, PropertyIcon, ReturnIcon, WhileIcon } from "@wso2/ballerina-core"

export type Item = Category | Node;
export type Category = {
    title: string;
    description: string;
    icon?: React.JSX.Element;
    items: Item[];
};

export type Node = {
    id: string;
    label: string;
    description: string;
    icon?: React.JSX.Element;
    enabled?: boolean;
    metadata?: any;
};


export function constructList(): Category[] {
    return [{
        title: "Generics",
        description: "",
        items: [
            {
                id: "Variable",
                label: "Variable",
                description: constructMessage.variableStatement.defaultMessage,
                enabled: true,
                icon: <PropertyIcon/>
            },
            {
                id: "Assignment",
                label: "Assignment",
                description: constructMessage.assignmentStatement.defaultMessage,
                enabled: true,
                icon: <AssignmentIcon/>
            },
            {
                id: "FunctionCall",
                label: "FunctionCall",
                description: constructMessage.functionCallStatement.defaultMessage,
                enabled: true,
                icon: <FunctionCallIcon/>
            }
        ]
    },
    {
        title: "Control Flows",
        description: "",
        items: [
            {
                id: "If",
                label: "If",
                description: constructMessage.ifStatement.defaultMessage,
                enabled: true,
                icon: <IfIcon/>
            },
            {
                id: "Foreach",
                label: "Foreach",
                description: constructMessage.foreachStatement.defaultMessage,
                enabled: true,
                icon: <ForEachIcon/>
            },
            {
                id: "While",
                label: "While",
                description: constructMessage.whileStatement.defaultMessage,
                enabled: true,
                icon: <WhileIcon/>
            }
        ]

    },
    {
        title: "Communications",
        description: "",
        items: [
            {
                id: "Return",
                label: "Return",
                description: constructMessage.returnStatement.defaultMessage,
                enabled: true,
                icon: <ReturnIcon/>
            }
        ]
    },
    {
        title: "Actors",
        description: "",
        items: [
            {
                id: "Connector",
                label: "Connector",
                description: constructMessage.connectorStatement.defaultMessage,
                enabled: true,
                icon: <ConnectorIcon/>
            },
            {
                id: "Action",
                label: "Action",
                description: constructMessage.actionStatement.defaultMessage,
                enabled: true,
                icon: <ActionIcon/>
            }
        ]
    }
]}

const constructMessage = {
    worker: {
        defaultMessage: "A worker allows to execute code in parallel with function's default worker and other named workers."
    },
    send: {
        defaultMessage: "A send allows to send data from one worker to another."
    },
    receive: {
        defaultMessage: "A receive allows to receive data from other workers."
    },
    wait: {
        defaultMessage: "A wait allows worker to wait for another worker and get the return value of it."
    },
    flush: {
        defaultMessage: "A flush allows the worker to wait until all the send messages are consumed by the target workers."
    },
    variableStatement: {
        defaultMessage: "A variable statement holds the value of a specific data type (string, integer, etc.) so that it can be used later in the logical process of the service or integration."
    },
    assignmentStatement: {
        defaultMessage: "An assignment statement lets you to assign a value to a variable that is already defined"
    },
    ifStatement: {
        defaultMessage: "An if statement lets you specify two blocks of logical components so that the system can decide which block to execute based on whether the provided condition is true or false."
    },
    foreachStatement: {
        defaultMessage: "A foreach statement is a control flow statement that can be used to iterate over a list of items.",
    },
    whileStatement: {
        defaultMessage: "A while statement executes a block of statements in a loop as long as the specified condition is true."
    },
    returnStatement: {
        defaultMessage: "A return statement stops executing the current path or returns a value back to the caller."
    },
    respondStatement: {
        defaultMessage: "A respond statement sends the response from a service back to the client."
    },
    customStatement: {
        defaultMessage: "A custom statement can be used to write a single or a multiline code snippet that is not supported by the low code diagram."
    },
    httpConnectorStatement: {
        defaultMessage: "An HTTP connector can be used to integrate with external applications."
    },
    dataMapperStatement: {
        defaultMessage: "A data mapping statement can be used to create an object using several other variables."
    },
    connectorStatement: {
        defaultMessage: "A connector can be used to integrate with external applications."
    },
    actionStatement: {
        defaultMessage: "An action can be used to invoke operations of an existing connector."
    },
    functionCallStatement: {
        defaultMessage: "A function call is a request that performs a predetermined function."
    }
}

export function getTemplateValues(nodeType: string, allVariables: string[]) {
    switch (nodeType) {
        case "Variable":
            return createModuleVarDecl(
                {
                    varName: genVariableName("variable", allVariables),
                    varOptions: [],
                    varType: "var",
                    varValue: "EXPRESSION"
                }
            );
        case "Assignment":
            return createPropertyStatement(
                `default =  EXPRESSION;`
            );

        case "FunctionCall":
            return createPropertyStatement(
                `FUNCTION_CALL() ;`
            );

        case "Foreach":
            return createForeachStatement(
                'EXPRESSION',
                'item',
                'var'
            );
        case "While":
            return createWhileStatement(
                'EXPRESSION'
            );
        case "Return":
            return createReturnStatement(
                'EXPRESSION'
            );
        case "IfStatement":
            return createIfStatement(
                'EXPRESSION'
            );
        case "ElseStatement":
            return createElseStatement();
        default:
            // handle other cases here
            break;
    }
}