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

import { KeyboardNavigationManager } from "@wso2/ballerina-core";
import { STKindChecker } from "@wso2/syntax-tree";
import { SearchBox, Typography } from "@wso2/ui-toolkit";

import {
    CALL_CONFIG_TYPE,
    CONFIGURABLE_VALUE_REQUIRED_TOKEN,
    DEFAULT_WHERE_INTERMEDIATE_CLAUSE,
    LOG_CONFIG_TYPE,
    QUERY_INTERMEDIATE_CLAUSES
} from "../../../constants";
import { Suggestion } from "../../../models/definitions";
import { InputEditorContext } from "../../../store/input-editor-context";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import {
    getFilteredExpressions,
    getRecordFieldSource,
    getRecordSwitchedSource,
    getRecordUpdatePosition,
    isQuestionMarkFromRecordField,
    isRecordFieldName
} from "../../../utils";
import {
    Expression,
    ExpressionGroup,
    expressions,
    EXPR_PLACEHOLDER,
    optionalRecordField,
    recordFiledOptions,
    SELECTED_EXPRESSION,
    switchOpenClose
} from "../../../utils/expressions";
import { DiagnosticsPaneId } from "../../Diagnostics";
import { useStatementEditorStyles, useStmtEditorHelperPanelStyles } from "../../styles";

import { TemplateList } from "./TemplateList";

export function ExpressionSuggestions() {
    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();
    const statementEditorClasses = useStatementEditorStyles();
    const inputEditorCtx = useContext(InputEditorContext);
    const [keyword, setKeyword] = useState('');
    const [filteredExpressions, setFilteredExpressions] = useState(expressions);
    const [selectedSuggestions, setSelectedSuggestion] = React.useState<Suggestion>(null);
    const [diagnosticsHeight, setDiagnosticsHeight] = useState(0);

    const {
        modelCtx: {
            currentModel,
            updateModel,
        },
        statementCtx: {
            diagnostics,
            errorMsg
        },
        config
    } = useContext(StatementEditorContext);

    const onClickExpressionSuggestion = (expression: Expression, clickedSuggestion: Suggestion) => {
        setKeyword('');
        if (clickedSuggestion) {
            updateModelWithSuggestion(expression);
        }
    }

    const updateModelWithSuggestion = (expression: Expression) => {
        const currentModelSource = STKindChecker.isOrderKey(currentModel.model) ? currentModel.model.expression.source :
            (currentModel.model.source ? currentModel.model.source.trim() : currentModel.model.value.trim());
        let text;
        let updatePosition = currentModel.model.position;
        if (STKindChecker.isRecordField(currentModel.model)) {
            text = expression.template.replace(SELECTED_EXPRESSION, getRecordFieldSource(currentModel.model));
        } else if (STKindChecker.isRecordTypeDesc(currentModel.model) && expression.name ===
            "Switches Open/Close record to Close/Open") {
            text = expression.template.replace(SELECTED_EXPRESSION, getRecordSwitchedSource(currentModel.model));
            updatePosition = getRecordUpdatePosition(currentModel.model)
        } else {
            text = currentModelSource !== CONFIGURABLE_VALUE_REQUIRED_TOKEN
                ? expression.template.replace(SELECTED_EXPRESSION, currentModelSource)
                : expression.template.replace(SELECTED_EXPRESSION, EXPR_PLACEHOLDER);
        }
        updateModel(text, updatePosition)
        inputEditorCtx.onInputChange('');
        inputEditorCtx.onSuggestionSelection(text);
    }

    useEffect(() => {
        if (currentModel.model) {
            let filteredGroups: ExpressionGroup[] = getFilteredExpressions(expressions, currentModel.model);
            if (currentModel.model.source?.trim() === DEFAULT_WHERE_INTERMEDIATE_CLAUSE) {
                filteredGroups = expressions.filter(
                    (exprGroup) => exprGroup.name === QUERY_INTERMEDIATE_CLAUSES);
            } else if ((config.type === CALL_CONFIG_TYPE || LOG_CONFIG_TYPE) && STKindChecker.isFunctionCall(currentModel.model)) {
                filteredGroups = []
            } else if (isRecordFieldName(currentModel.model)) {
                filteredGroups = [optionalRecordField]
            } else if (isQuestionMarkFromRecordField(currentModel.model)) {
                filteredGroups = []
            } else if (STKindChecker.isRecordField(currentModel.model)) {
                filteredGroups = [recordFiledOptions]
            } else if (STKindChecker.isRecordTypeDesc(currentModel.model)) {
                filteredGroups = [switchOpenClose].concat(filteredGroups);
            }
            setFilteredExpressions(filteredGroups);
        }
    }, [currentModel.model]);

    // A workaround for https://github.com/microsoft/vscode-webview-ui-toolkit/issues/464
    useEffect(() => {
        const handleResize = () => {
            const diagnosticsElement = document.getElementById(DiagnosticsPaneId);
            if (diagnosticsElement) {
                const height = diagnosticsElement.offsetHeight;
                setDiagnosticsHeight(height);
            }
        };
        handleResize();
    }, [diagnostics, errorMsg]);

    const changeSelectionOnUpDown = (key: number) => {
        if (selectedSuggestions == null && filteredExpressions?.length > 0) {
            setSelectedSuggestion({ selectedListItem: 0, selectedGroup: 0 });
        } else if (selectedSuggestions) {
            let newSelected = selectedSuggestions.selectedListItem + key;
            let newGroup = selectedSuggestions.selectedGroup;

            if (newSelected >= 0 && filteredExpressions[selectedSuggestions.selectedGroup].expressions.length > 3 &&
                newSelected < filteredExpressions[selectedSuggestions.selectedGroup].expressions.length) {

                setSelectedSuggestion({ selectedListItem: newSelected, selectedGroup: newGroup });
            } else if (newSelected >= 0 &&
                (selectedSuggestions.selectedListItem === filteredExpressions[selectedSuggestions.selectedGroup].expressions.length - 1 ||
                    newSelected >= filteredExpressions[selectedSuggestions.selectedGroup].expressions.length) &&
                selectedSuggestions.selectedGroup < filteredExpressions.length - 1) {

                newGroup = selectedSuggestions.selectedGroup + 1;
                newSelected = 0;
                setSelectedSuggestion({ selectedListItem: newSelected, selectedGroup: newGroup });
            } else if (newSelected < 0 && newGroup >= 0) {
                newGroup = selectedSuggestions.selectedGroup - 1;
                newSelected = filteredExpressions[newGroup].expressions.length - 1;
                setSelectedSuggestion({ selectedListItem: newSelected, selectedGroup: newGroup });
            }
        }
    }

    const changeSelectionOnRightLeft = (key: number) => {
        if (selectedSuggestions) {
            const newSelected = selectedSuggestions.selectedListItem + key;
            const newGroup = selectedSuggestions.selectedGroup;
            if (newSelected >= 0 && newSelected < filteredExpressions[selectedSuggestions.selectedGroup].expressions.length) {
                setSelectedSuggestion({ selectedListItem: newSelected, selectedGroup: newGroup });
            }
        }
    }

    const enterOnSuggestion = () => {
        if (selectedSuggestions) {
            const expression: Expression =
                filteredExpressions[selectedSuggestions.selectedGroup]?.expressions[selectedSuggestions.selectedListItem];
            updateModelWithSuggestion(expression);
            setSelectedSuggestion(null);
        }
    }

    React.useEffect(() => {

        const client = KeyboardNavigationManager.getClient();

        client.bindNewKey(['right'], changeSelectionOnRightLeft, 1);
        client.bindNewKey(['left'], changeSelectionOnRightLeft, -1);
        client.bindNewKey(['up'], changeSelectionOnUpDown, -3);
        client.bindNewKey(['down'], changeSelectionOnUpDown, 3);
        client.bindNewKey(['enter'], enterOnSuggestion);

    }, [selectedSuggestions, currentModel.model]);

    const searchExpressions = (searchValue: string) => {
        setKeyword(searchValue);
        const filteredGroups: ExpressionGroup[] = [];
        expressions.forEach(group => {
            // Search expression in case insensitive manner
            const filtered: Expression[] = group.expressions.filter(
                (ex) => ex.name.toLowerCase().includes(searchValue.toLowerCase()));
            // Only push group to filter list if have at least one expression
            if (filtered.length > 0) {
                filteredGroups.push({
                    name: group.name,
                    expressions: filtered,
                    relatedModelType: group.relatedModelType
                })
            }
        });
        setFilteredExpressions(getFilteredExpressions(filteredGroups, currentModel.model));
        setSelectedSuggestion({ selectedGroup: 0, selectedListItem: 0 });
    }

    return (
        <div className={stmtEditorHelperClasses.suggestionListInner} data-testid="expression-list">
            <div className={stmtEditorHelperClasses.searchBox}>
                <SearchBox
                    id={'expr-suggestions-searchbar'}
                    autoFocus={true}
                    placeholder={`Search Expression`}
                    value={keyword}
                    onChange={searchExpressions}
                    size={100}
                    data-testid="expr-suggestions-searchbar"
                />
            </div>
            {!filteredExpressions.length && (
                <Typography
                    variant="body3"
                    sx={{marginTop: '15px'}}
                >
                    Expressions not available
                </Typography>
            )}
            <div
                className={stmtEditorHelperClasses.suggestionListContainer}
                style={{maxHeight: `calc(100vh - ${ 305 + diagnosticsHeight}px)`}}
            >
                <div className={statementEditorClasses.stmtEditorExpressionWrapper}>
                    {!!filteredExpressions.length && (
                        <>
                            {filteredExpressions.map((group, groupIndex) => (
                                <>
                                    <div className={stmtEditorHelperClasses.helperPaneSubHeader}>{group.name}</div>
                                    <TemplateList
                                        group={group}
                                        groupIndex={groupIndex}
                                        selectedSuggestions={selectedSuggestions}
                                        onClickExpressionSuggestion={onClickExpressionSuggestion}
                                    />
                                    {groupIndex !== filteredExpressions.length - 1 ? (
                                        <div className={statementEditorClasses.separatorLine}/>
                                    ) : (
                                        <div className={statementEditorClasses.lastExpression}/>
                                    )}
                                </>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
