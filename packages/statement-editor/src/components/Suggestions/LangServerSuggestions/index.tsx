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
import { NodePosition } from "@wso2/syntax-tree";
import { SearchBox, Typography } from "@wso2/ui-toolkit";

import {
    ACTION,
    CURRENT_REFERENCES_TITLE,
    FUNCTION_COMPLETION_KIND,
    FUNCTION_TYPE_DESCRIPTER,
    HTTP_ACTION,
    MAPPING_TYPE_DESCRIPTER,
    METHOD_COMPLETION_KIND,
    OBJECT_TYPE_DESCRIPTER,
    PROPERTY_COMPLETION_KIND, SERVICE_TYPE_DESCRIPTER, SUGGESTION_COLUMN_SIZE, TABLE_TYPE_DESCRIPTER
} from "../../../constants";
import { Suggestion, SuggestionItem } from "../../../models/definitions";
import { InputEditorContext } from "../../../store/input-editor-context";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { getExprWithArgs } from "../../../utils";
import { DiagnosticsPaneId } from "../../Diagnostics";
import { getActionExprWithArgs } from "../../Parameters/ParameterTree/utils";
import { useStatementEditorStyles, useStmtEditorHelperPanelStyles } from "../../styles";

import { SuggestionsList } from "./SuggestionsList";

export function LSSuggestions() {
    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();
    const statementEditorClasses = useStatementEditorStyles();
    const inputEditorCtx = useContext(InputEditorContext);

    const {
        modelCtx: {
            currentModel,
            updateModel,
        },
        suggestionsCtx: {
            lsSuggestions,
            lsSecondLevelSuggestions
        },
        statementCtx: {
            diagnostics,
            errorMsg
        },
        formCtx: {
            formArgs: {
                connector,
            }
        },
        targetPosition,
        config,
        currentReferences
    } = useContext(StatementEditorContext);
    const selectionForSecondLevel = lsSecondLevelSuggestions?.selection;
    const secondLevelSuggestions = lsSecondLevelSuggestions?.secondLevelSuggestions;
    const resourceAccessRegex = /.+\./gm;
    const [keyword, setKeyword] = useState('');
    const [filteredSuggestions, setFilteredSuggestions] = useState<SuggestionItem[]>(lsSuggestions);
    const [filteredSecondLevelSuggestions, setFilteredSecondLevelSuggestions] = useState<SuggestionItem[]>(secondLevelSuggestions);
    const [selectedSuggestion, setSelectedSuggestion] = React.useState<Suggestion>(null);
    const [references, setReferences] = useState<SuggestionItem[]>([]);
    const [diagnosticsHeight, setDiagnosticsHeight] = useState(0);

    useEffect(() => {
        setFilteredSuggestions(lsSuggestions);
        setFilteredSecondLevelSuggestions(secondLevelSuggestions);
    }, [lsSuggestions, lsSecondLevelSuggestions, currentModel.model]);

    useEffect(() => {
        const referencedFields: SuggestionItem[] = currentReferences?.map(field => {
            return {
                value: field
            }
        })
        setReferences(referencedFields);
    }, [currentReferences]);

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

    const changeSelectionOnRightLeft = (key: number) => {
        if (selectedSuggestion) {
            setSelectedSuggestion((prevState) => {
                const newSelected = prevState.selectedListItem + key;
                const newGroup = prevState.selectedGroup;
                let suggestionList: SuggestionItem[];
                switch (newGroup) {
                    case 0:
                        suggestionList = references;
                        break;
                    case 1:
                        suggestionList = filteredSuggestions;
                        break;
                    case 2:
                        suggestionList = filteredSecondLevelSuggestions;
                        break;
                }

                if (newSelected >= 0 && newSelected < suggestionList?.length) {
                    return { selectedListItem: newSelected, selectedGroup: newGroup };
                }
                return prevState;
            });
        }
    }

    const changeSelectionOnUpDown = (key: number) => {
        if (selectedSuggestion === null) {
            setSelectedSuggestion((prevState) => {
                if (references?.length >= 0) {
                    return { selectedListItem: 0, selectedGroup: 0 };
                } else if (filteredSuggestions?.length >= 0) {
                    return { selectedListItem: 0, selectedGroup: 1 };
                } else if (filteredSecondLevelSuggestions?.length >= 0) {
                    return { selectedListItem: 0, selectedGroup: 2 };
                }
                return prevState;
            });
        } else if (selectedSuggestion) {
            setSelectedSuggestion((prevState) => {
                let newSelected = prevState.selectedListItem + key;
                let newGroup = prevState.selectedGroup;
                let suggestionList: SuggestionItem[];
                switch (newGroup) {
                    case 0:
                        suggestionList = references;
                        break;
                    case 1:
                        suggestionList = filteredSuggestions;
                        break;
                    case 2:
                        suggestionList = filteredSecondLevelSuggestions;
                        break;
                }

                if (suggestionList?.length > 0) {
                    if (newSelected >= 0) {
                        if (suggestionList.length > SUGGESTION_COLUMN_SIZE && newSelected < suggestionList.length) {
                            return { selectedListItem: newSelected, selectedGroup: newGroup };
                        } else if ((selectedSuggestion.selectedListItem === suggestionList.length - 1 ||
                                newSelected >= suggestionList.length) &&
                            selectedSuggestion.selectedGroup < 2 &&
                            filteredSecondLevelSuggestions?.length > 0) {
                            newGroup = selectedSuggestion.selectedGroup + 1;
                            newSelected = 0;
                            return { selectedListItem: newSelected, selectedGroup: newGroup };
                        }
                    } else if (newSelected < 0 && newGroup > 0 && filteredSuggestions?.length > 0) {
                        newGroup = selectedSuggestion.selectedGroup - 1;
                        switch (newGroup) {
                            case 0:
                                newSelected = references.length - 1;
                                break;
                            case 1:
                                newSelected = filteredSuggestions.length - 1;
                                break;
                        }
                        return { selectedListItem: newSelected, selectedGroup: newGroup };
                    }
                }
                return prevState;
            });
        }
    }

    const enterOnSuggestion = () => {
        if (selectedSuggestion) {
            let enteredSuggestion: SuggestionItem;
            switch (selectedSuggestion.selectedGroup) {
                case 0:
                    enteredSuggestion = references[selectedSuggestion.selectedListItem]
                    break;
                case 1:
                    enteredSuggestion = filteredSuggestions[selectedSuggestion.selectedListItem]
                    break;
                case 2:
                    enteredSuggestion = filteredSecondLevelSuggestions[selectedSuggestion.selectedListItem]
                    break;
            }
            onClickLSSuggestion(enteredSuggestion);
            setSelectedSuggestion(null);
        }
    }

    React.useEffect(() => {

        const client = KeyboardNavigationManager.getClient();

        client.bindNewKey(['right'], changeSelectionOnRightLeft, 1);
        client.bindNewKey(['left'], changeSelectionOnRightLeft, -1);
        client.bindNewKey(['up'], changeSelectionOnUpDown, -SUGGESTION_COLUMN_SIZE);
        client.bindNewKey(['down'], changeSelectionOnUpDown, SUGGESTION_COLUMN_SIZE);
        client.bindNewKey(['enter'], enterOnSuggestion);

    }, [selectedSuggestion, currentModel.model]);

    const onClickLSSuggestion = (suggestion: SuggestionItem) => {
        setKeyword('');
        const completionKind = suggestion.completionKind;
        let value = completionKind === PROPERTY_COMPLETION_KIND ? suggestion.insertText : suggestion.value;
        const prefix = (inputEditorCtx.userInput.includes('.') && resourceAccessRegex.exec(inputEditorCtx.userInput)[0])
            || suggestion.prefix;
        if ((config.type === ACTION || config.type === HTTP_ACTION) && completionKind === FUNCTION_COMPLETION_KIND) {
            value = getActionExprWithArgs(value, connector);
        } else if (completionKind === METHOD_COMPLETION_KIND || completionKind === FUNCTION_COMPLETION_KIND) {
            value = getExprWithArgs(value, prefix);
        } else if (prefix) {
            value = prefix + value;
        }

        switch (value) {
            case "map": {
                value = MAPPING_TYPE_DESCRIPTER;
                break;
            }
            case "table": {
                value = TABLE_TYPE_DESCRIPTER;
                break;
            }
            case "object": {
                value = OBJECT_TYPE_DESCRIPTER;
                break;
            }
            case "service": {
                value = SERVICE_TYPE_DESCRIPTER;
                break;
            }
            case "function": {
                value = FUNCTION_TYPE_DESCRIPTER;
                break;
            }
        }

        const nodePosition: NodePosition = currentModel
            ? (currentModel.stmtPosition
                ? currentModel.stmtPosition
                : currentModel.model.position)
            : targetPosition;
        updateModel(value, nodePosition);
        inputEditorCtx.onInputChange('');
        inputEditorCtx.onSuggestionSelection(value);
        setSelectedSuggestion(null);
    }

    const searchSuggestions = (searchValue: string) => {
        setKeyword(searchValue);
        setFilteredSuggestions(lsSuggestions.filter(suggestion => suggestion.value.toLowerCase().includes(searchValue.toLowerCase())));
        setFilteredSecondLevelSuggestions(secondLevelSuggestions.filter(suggestion => suggestion.value.toLowerCase().includes(searchValue.toLowerCase())))
        setSelectedSuggestion(null);
    }

    return (
        <div className={stmtEditorHelperClasses.suggestionListInner} data-testid="expression-list">
            <div className={stmtEditorHelperClasses.searchBox}>
                <SearchBox
                    id={'ls-suggestions-searchbar'}
                    autoFocus={true}
                    placeholder={`Search Suggestions`}
                    value={keyword}
                    onChange={searchSuggestions}
                    size={100}
                    data-testid="ls-suggestions-searchbar"
                />
            </div>
            {(filteredSuggestions?.length || filteredSecondLevelSuggestions?.length) ?
            (
                <div
                    className={stmtEditorHelperClasses.suggestionListContainer}
                    style={{maxHeight: `calc(100vh - ${ 305 + diagnosticsHeight}px)`}}
                >
                    <div className={statementEditorClasses.stmtEditorExpressionWrapper}>
                        {references?.length > 0 && (
                            <SuggestionsList
                                lsSuggestions={references}
                                selectedSuggestion={selectedSuggestion}
                                currentGroup={0}
                                onClickLSSuggestion={onClickLSSuggestion}
                                header={CURRENT_REFERENCES_TITLE}
                                isReference={true}
                            />
                        )}
                        {!!filteredSuggestions?.length && (
                            <SuggestionsList
                                lsSuggestions={filteredSuggestions}
                                selectedSuggestion={selectedSuggestion}
                                currentGroup={1}
                                onClickLSSuggestion={onClickLSSuggestion}
                            />
                        )}
                        {!!filteredSecondLevelSuggestions?.length && (
                            <SuggestionsList
                                lsSuggestions={filteredSecondLevelSuggestions}
                                selectedSuggestion={selectedSuggestion}
                                currentGroup={2}
                                onClickLSSuggestion={onClickLSSuggestion}
                                selection={selectionForSecondLevel}
                            />
                        )}
                    </div>
                </div>
            )
            :
            (
                <Typography
                    variant="body3"
                    sx={{marginTop: '15px'}}
                >
                    Suggestions not available
                </Typography>
            )}
        </div>
    );
}
