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
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React, { useContext } from "react";

import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { ParameterInfo, SymbolDocumentation } from "@wso2/ballerina-core";
import { STNode } from "@wso2/syntax-tree";
import { Button, Codicon, Typography } from "@wso2/ui-toolkit";

import { SymbolParameterType } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import {
    getParamHighlight,
    getParamUpdateModelPosition,
    getParentFunctionModel,
    getUpdatedContentForNewNamedArg,
    getUpdatedContentOnCheck,
    getUpdatedContentOnUncheck,
    isDocumentationSupportedModel,
} from "../../../utils";
import { StatementEditorViewState } from "../../../utils/statement-editor-viewstate";
import { useStmtEditorHelperPanelStyles } from "../../styles";
import { IncludedRecord } from "../IncludedRecord";
import { NamedArgIncludedRecord } from "../NamedArgIncludedRecord";
import { RequiredArg } from "../RequiredArg";

export interface ParameterListProps {
    paramDocumentation : SymbolDocumentation;
}

export function ParameterList(props: ParameterListProps) {
    const { paramDocumentation } = props;
    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();
    const {
        modelCtx: {
            currentModel : {
                model
            },
            statementModel,
            updateModel,
            restArg
        }
    } = useContext(StatementEditorContext);
    let includedRecordHeader: boolean = false;
    let isNewRecordBtnClicked: boolean = false;
    const [plusButtonClick, setPlusButtonClicked] = React.useState(false);

    const handleCheckboxClick = (param: ParameterInfo) => () => {
        if (!param.modelPosition) {
            if (param.kind === SymbolParameterType.REST) {
                restArg(true);
            }
            if (isDocumentationSupportedModel(model)) {
                updateModel(getUpdatedContentOnCheck(model, param, paramDocumentation.parameters),
                    getParamUpdateModelPosition(model));
            } else {
                const parentModel : STNode = getParentFunctionModel((model.parent.viewState as StatementEditorViewState)?.parentFunctionPos,
                    statementModel);
                updateModel(getUpdatedContentOnCheck(parentModel, param, paramDocumentation.parameters),
                    getParamUpdateModelPosition(parentModel));
            }
        } else {
            if (param.kind === SymbolParameterType.REST) {
                restArg(false);
            }
            if (isDocumentationSupportedModel(model)) {
                updateModel(getUpdatedContentOnUncheck(model, param.modelPosition), getParamUpdateModelPosition(model));
            } else {
                const parentModel : STNode = getParentFunctionModel((model.parent.viewState as StatementEditorViewState)?.parentFunctionPos,
                    statementModel);
                updateModel(getUpdatedContentOnUncheck(parentModel, param.modelPosition),
                    getParamUpdateModelPosition(parentModel));
            }
        }
    };

    const addIncludedRecordHeader = (param: ParameterInfo, value: number) => {
        return (
            <>
                {!includedRecordHeader && (
                    <div key={value} className={stmtEditorHelperClasses.includedRecordHeaderList}>
                        <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)'}}>
                            Add Named Argument
                        </Typography>
                        <Button
                            className={stmtEditorHelperClasses.includedRecordPlusBtn}
                            onClick={handlePlusButton()}
                            disabled={false}
                            data-testid="named-arg-button"
                        >
                            <Codicon name="diff-added" />
                        </Button>
                    </div>
                )}
                {includedRecordHeader = true}
            </>
        );
    }

    const handlePlusButton = () => () => {
        setPlusButtonClicked(true);
    }

    const addIncludedRecordToModel = (userInput: string) => {
        const modelToUpdate : STNode = isDocumentationSupportedModel(model) ? model :
            getParentFunctionModel((model.parent.viewState as StatementEditorViewState)?.parentFunctionPos,
                statementModel)
        updateModel(getUpdatedContentForNewNamedArg(modelToUpdate, userInput), getParamUpdateModelPosition(modelToUpdate));
        setPlusButtonClicked(false);
    }

    return (
        <>
            {!!paramDocumentation.parameters?.length && (
                <div data-testid="parameter-list">
                    <Typography
                        variant="h4"
                        className={stmtEditorHelperClasses.paramHeader}
                    >
                        Configure Parameters
                    </Typography>
                    <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)'}}>
                        Select parameters from the list given below
                    </Typography>
                    <div className={stmtEditorHelperClasses.paramList}>
                    {paramDocumentation.parameters?.map((param: ParameterInfo, value: number) => (
                            <>
                                {param.kind === SymbolParameterType.REQUIRED ? (
                                    <RequiredArg param={param} value={value} handleCheckboxClick={handleCheckboxClick}/>
                                ) : (
                                    <>
                                        {param.kind === SymbolParameterType.INCLUDED_RECORD ? (
                                            <>
                                                {addIncludedRecordHeader(param, value)}
                                                {param.fields ? (
                                                    param.fields.map((field, key: number) => (
                                                        <IncludedRecord
                                                            key={key}
                                                            param={field}
                                                            handleCheckboxClick={handleCheckboxClick}
                                                        />
                                                    ))
                                                ) : (
                                                    <IncludedRecord
                                                        param={param}
                                                        handleCheckboxClick={handleCheckboxClick}
                                                    />
                                                )}
                                                {(!param.modelPosition && !isNewRecordBtnClicked) && (
                                                    <>
                                                        <NamedArgIncludedRecord
                                                            isNewRecord={plusButtonClick}
                                                            addIncludedRecordToModel={addIncludedRecordToModel}
                                                        />
                                                        {isNewRecordBtnClicked = true}
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {param.kind !== SymbolParameterType.INCLUDED_RECORD && (
                                                    <div
                                                        key={value}
                                                        className={stmtEditorHelperClasses.docListDefault}
                                                        style={getParamHighlight(model, param)}
                                                        data-testid="optional-arg"
                                                    >
                                                        <VSCodeCheckbox
                                                            id="select-local-var"
                                                            checked={param.modelPosition !== undefined}
                                                            onClick={handleCheckboxClick(param)}
                                                            data-testid="arg-check"
                                                        />
                                                        <Typography
                                                            variant="body3"
                                                            sx={{margin: '0px 5px'}}
                                                        >
                                                            {param.name}
                                                        </Typography>
                                                        <Typography
                                                            className={stmtEditorHelperClasses.suggestionDataType}
                                                            variant="body3"
                                                        >
                                                            {param.type.includes("?") ? param.type + " (Optional)" : param.type}
                                                        </Typography>
                                                        {param.description !== undefined && (
                                                            <Typography
                                                                className={stmtEditorHelperClasses.docParamDescriptionText}
                                                                variant="body3"
                                                            >
                                                                {" : " + param.description}
                                                            </Typography>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )
                    )}
                    </div>
                </div>
            )}
        </>
    );
}
