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
// tslint:disable: jsx-no-multiline-js jsx-wrap-multiline
import { STNode } from "@wso2/syntax-tree";

import { useVisualizerContext } from "../../../Context";
import { getSymbolInfo } from "@wso2/ballerina-low-code-diagram";
import { StatementEditorComponent } from "../../StatementEditorComponent";
import { getDefaultParams, getFormFieldReturnType, getPathParams, getReturnTypeImports, isParentNodeWithErrorReturn } from "../ConnectorWizard/utils";
import { BallerinaConnectorInfo, createActionStatement, createCheckActionStatement, createCheckedRemoteServiceCall, createCheckedResourceServiceCall, createRemoteServiceCall, FunctionDefinitionInfo, genVariableName, getAllVariables, getInitialSource, STModification } from "@wso2/ballerina-core";

interface ActionFormProps {
    action: FunctionDefinitionInfo;
    endpointName: string;
    isClassField: boolean;
    functionNode: STNode;
    isHttp: boolean;
    applyModifications: (modifications: STModification[]) => Promise<void>;
    selectedConnector: BallerinaConnectorInfo;

}

export function ActionForm(props: ActionFormProps) {
    const { action, endpointName, isClassField, functionNode, isHttp, applyModifications, selectedConnector } = props;
    const { activeFileInfo, statementPosition, setActivePanel, setSidePanel } = useVisualizerContext();
    const targetPosition = statementPosition;
    const stSymbolInfo = getSymbolInfo();
    const formArgs = {
        action: action,
        endpointName: endpointName,
        isClassField,
        functionNode,
        isHttp,
    }

    let initialSource = "EXPRESSION";
    let imports = new Set<string>();

    // Adding new endpoint
    const queryParameters = getDefaultParams(action.parameters);
    const pathParameters = getPathParams(action.pathParams);
    const returnType = getFormFieldReturnType(action.returnType);
    const parentWithError = isParentNodeWithErrorReturn(functionNode);
    imports = getReturnTypeImports(returnType);

    if (action.qualifiers?.includes("resource")) {
        // handle resource functions
        initialSource = getInitialSource(
            createCheckedResourceServiceCall(
                returnType.returnType,
                genVariableName(`${action.name}Response`, getAllVariables(stSymbolInfo)),
                endpointName,
                pathParameters,
                action.name,
                queryParameters,
                targetPosition,
                isClassField
            )
        );
    } else if (isHttp) {
        // handle http functions if resource functions are not available in metadata
        queryParameters.shift();
        initialSource = getInitialSource(
            createCheckedResourceServiceCall(
                returnType.returnType,
                genVariableName(`${action.name}Response`, getAllVariables(stSymbolInfo)),
                endpointName,
                [],
                action.name === "get" ? "" : action.name,
                queryParameters,
                targetPosition,
                isClassField
            )
        );
    } else if (action.qualifiers?.includes("remote") || action.isRemote) {
        // handle remote function
        initialSource = getInitialSource(
            returnType.hasReturn
                ? returnType.hasError && parentWithError // INFO: New code actions will update parent function and `check` keyword
                    ? createCheckedRemoteServiceCall(
                        returnType.returnType,
                        genVariableName(`${action.name}Response`, getAllVariables(stSymbolInfo)),
                        endpointName,
                        action.name,
                        queryParameters,
                        targetPosition,
                        isClassField
                    )
                    : createRemoteServiceCall(
                        returnType.returnType,
                        genVariableName(`${action.name}Response`, getAllVariables(stSymbolInfo)),
                        endpointName,
                        action.name,
                        queryParameters,
                        targetPosition,
                        isClassField
                    )
                : returnType.hasError && parentWithError
                    ? createCheckActionStatement(endpointName, action.name, queryParameters, targetPosition, isClassField)
                    : createActionStatement(endpointName, action.name, queryParameters, targetPosition, isClassField)
        );
    }

    const closeStatementEditor = () => {
        setSidePanel("EMPTY");
    }


    return (
        <>
            {
                action &&
                <StatementEditorComponent
                    label={"Action"}
                    initialSource={initialSource}
                    formArgs={formArgs}
                    config={{ type: isHttp ? "HttpAction" : "Action" }}
                    applyModifications={applyModifications}
                    currentFile={{
                        content: activeFileInfo?.fullST?.source || "",
                        path: activeFileInfo?.filePath,
                        size: 1
                    }}
                    onCancel={closeStatementEditor}
                    onClose={closeStatementEditor}
                    syntaxTree={activeFileInfo?.fullST}
                    targetPosition={statementPosition}
                    skipSemicolon={false}
                    extraModules={imports}

                />
            }
        </>
    );
}
