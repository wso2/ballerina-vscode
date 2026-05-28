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
// tslint:disable: jsx-no-multiline-js
import React, { useContext, useEffect, useState } from "react";

import { BallerinaConnectorInfo, FunctionDefinitionInfo, SymbolDocumentation } from "@wso2/ballerina-core";
import { STKindChecker, STNode } from "@wso2/syntax-tree";
import { Typography } from "@wso2/ui-toolkit";

import { ACTION, CONNECTOR, HTTP_ACTION } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import {
    getCurrentModelParams,
    getDocDescription,
    getParentFunctionModel,
    isBalVersionUpdateOne,
    isConfigurableEditor,
    isDescriptionWithExample,
    isDocumentationSupportedModel,
    isInsideConnectorParams,
    updateParamDocWithParamPositions,
    updateParamListFordMethodCallDoc
} from "../../../utils";
import { StatementEditorViewState } from "../../../utils/statement-editor-viewstate";
import { useStatementEditorStyles, useStmtEditorHelperPanelStyles } from "../../styles";
import { ParameterList } from "../ParameterList";
import { ParameterTree } from "../ParameterTree";
import { retrieveUsedAction } from "../ParameterTree/utils";

export function ParameterSuggestions() {
    const {
        modelCtx: {
            currentModel,
            statementModel
        },
        formCtx: {
            formArgs: {
                connector,
                action
            }
        },
        documentation: {
            documentation
        },
        editorCtx: {
            editors,
            activeEditorId
        },
        config,
        ballerinaVersion
    } = useContext(StatementEditorContext);

    const connectorInfo = connector as BallerinaConnectorInfo;
    const actionInfo = action as FunctionDefinitionInfo;

    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();
    const statementEditorClasses = useStatementEditorStyles();
    const [paramDoc, setParamDoc] = React.useState(documentation.documentation);
    const [activeMethod, setActiveMethod] = React.useState<FunctionDefinitionInfo>(
        config.type === CONNECTOR ? connectorInfo?.functions.find((func) => func.name === "init") : actionInfo
    );

    const isConfigurable = isConfigurableEditor(editors, activeEditorId);
    const isConnectorFlow =
        (config.type === CONNECTOR || config.type === ACTION || config.type === HTTP_ACTION) &&
        (connectorInfo || actionInfo) &&
        activeMethod &&
        !isConfigurable;
    const insideParamList = currentModel.model ? isInsideConnectorParams(currentModel.model, config.type) : false;

    useEffect(() => {
        if (currentModel.model && documentation && documentation.documentation?.parameters) {
            const model = isDocumentationSupportedModel(currentModel.model) ? currentModel.model :
                getParentFunctionModel((currentModel.model.parent.viewState as StatementEditorViewState)?.parentFunctionPos,
                    statementModel);
            const paramsInModel: STNode[] = getCurrentModelParams(model);
            let paramDocumentation: SymbolDocumentation = documentation.documentation;
            // Filter from FE if the Ballerina version is update 1
            if (STKindChecker.isMethodCall(model) && isBalVersionUpdateOne(ballerinaVersion)) {
                paramDocumentation = updateParamListFordMethodCallDoc(paramsInModel, paramDocumentation);
            }
            paramDocumentation = updateParamDocWithParamPositions(paramsInModel, paramDocumentation);
            setParamDoc(paramDocumentation);
        }
    }, [documentation]);

    useEffect(() => {
        if ((config.type === ACTION || config.type === HTTP_ACTION) && activeMethod && statementModel && connectorInfo?.functions.length > 0) {
            const statementMethod = retrieveUsedAction(statementModel, connectorInfo);
            if (statementMethod && activeMethod?.name !== statementMethod?.name) {
                setActiveMethod(statementMethod);
            }
        }
    }, [currentModel.model, statementModel]);

    const getDocumentationDescription = (docs?: string) => {
        const doc = docs || documentation.documentation.description;
        const docRegex = /```ballerina\n(.*?)\n```/gms;
        if (isDescriptionWithExample(doc)) {
            const des = getDocDescription(doc);
            const docEx = docRegex.exec(doc);
            return (
                <>
                    <Typography variant="body3">{des[0]}</Typography>
                    <Typography
                        variant="h5"
                        sx={{ margin: '8px 0px' }}
                    >
                        Example
                    </Typography>
                    <code className={stmtEditorHelperClasses.exampleCode}>{docEx[1]}</code>
                </>
            );
        } else {
            const trimmedDoc = doc?.replace(/\n/g, " ");
            return (
                <Typography variant="body3">{trimmedDoc}</Typography>
            );
        }
    }

    const getFnDocumentation = () => {
        if (documentation === null) {
            return <Typography variant="body3">Please upgrade to the latest Ballerina version</Typography>;
        }
        if (documentation && !(documentation.documentation === undefined)) {
            return (
                <>
                    {paramDoc && <ParameterList paramDocumentation={paramDoc} />}
                    {documentation.documentation.description && (
                        <>
                            {paramDoc?.parameters?.length > 0 && (
                                <div className={stmtEditorHelperClasses.returnSeparator} />
                            )}
                            <Typography
                                variant="h4"
                                className={stmtEditorHelperClasses.paramHeader}
                            >
                                Description
                            </Typography>
                            <div className={stmtEditorHelperClasses.docDescription}>
                                {getDocumentationDescription()}
                            </div>
                        </>
                    )}
                    {documentation.documentation.returnValueDescription && (
                        <>
                            <div className={stmtEditorHelperClasses.returnSeparator} />
                            <Typography
                                variant="h4"
                                className={stmtEditorHelperClasses.paramHeader}
                            >
                                Return
                            </Typography>
                            <div className={stmtEditorHelperClasses.returnDescription}>
                                <Typography variant="body3">
                                    {documentation.documentation.returnValueDescription}
                                </Typography>
                            </div>
                        </>
                    )}
                </>
            );
        }
        return <Typography variant="body3">Please select a function to see the parameter information</Typography>;
    };

    const getConnectorFlowDocumentation = () => {
        return (
            <div className={stmtEditorHelperClasses.docParamSuggestions}>
                {activeMethod.parameters && <ParameterTree parameters={activeMethod.parameters} connectorInfo={connectorInfo} />}
                {activeMethod.parameters?.length > 0 && <div className={stmtEditorHelperClasses.returnSeparator} />}
                {(connectorInfo?.documentation || activeMethod.documentation) && (
                    <>
                        <Typography
                            variant="h4"
                            className={stmtEditorHelperClasses.paramHeader}
                        >
                            Description
                        </Typography>
                        <div className={stmtEditorHelperClasses.docDescription}>
                            {getDocumentationDescription(connectorInfo?.documentation || activeMethod.documentation)}
                        </div>
                    </>
                )}
                {activeMethod.returnType?.documentation && (
                    <>
                        <div className={stmtEditorHelperClasses.returnSeparator} />
                        <Typography
                            variant="h4"
                            className={stmtEditorHelperClasses.paramHeader}
                        >
                            Return
                        </Typography>
                        <div className={stmtEditorHelperClasses.returnDescription}>
                            <Typography variant="body3">
                                {activeMethod.returnType?.documentation}
                            </Typography>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div style={{ maxHeight: `calc(100vh - 305px)`, width: "100%", overflowY: "scroll" }}>
            {!isConnectorFlow && getFnDocumentation()}
            {isConnectorFlow && insideParamList && getConnectorFlowDocumentation()}
            {isConnectorFlow && !insideParamList && (
                <Typography
                    variant="body3"
                    sx={{ marginTop: '10px' }}
                >
                    Please select a method or parameter to see the parameter information
                </Typography>
            )}
        </div>
    );
}
