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
import React from "react";

import { Grid, GridItem } from "@wso2/ui-toolkit";

import { MAX_COLUMN_WIDTH, SUGGESTION_COLUMN_SIZE } from "../../../../constants";
import { Suggestion, SuggestionItem } from "../../../../models/definitions";
import { useStmtEditorHelperPanelStyles } from "../../../styles";
import { SuggestionListItem } from "../SuggestionListItem";

export interface SuggestionsListProps {
    lsSuggestions: SuggestionItem[];
    selectedSuggestion: Suggestion;
    currentGroup: number;
    onClickLSSuggestion: (suggestion: SuggestionItem) => void;
    selection?: string;
    header?: string;
    isReference?: boolean
}

export function SuggestionsList(props: SuggestionsListProps) {
    const {
        lsSuggestions,
        selectedSuggestion,
        onClickLSSuggestion,
        selection,
        currentGroup,
        header,
        isReference = false
    } = props;
    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();

    return (
        <>
            {(header) && (
                <div className={stmtEditorHelperClasses.groupHeaderWrapper}>
                    <div className={stmtEditorHelperClasses.groupHeader}>{header}</div>
                    <div className={stmtEditorHelperClasses.selectionSeparator} />
                </div>
            )}
            {(selection) && (
                <>
                    <div className={stmtEditorHelperClasses.selectionWrapper}>
                        <div className={stmtEditorHelperClasses.selectionSubHeader}>{selection}</div>
                        <div className={stmtEditorHelperClasses.selectionSeparator} />
                    </div>
                    <br/>
                </>
            )}
            <Grid columns={SUGGESTION_COLUMN_SIZE}>
                {
                    lsSuggestions.map((suggestion: SuggestionItem, index: number) => {
                        const isSelected = selectedSuggestion && (
                            index === selectedSuggestion.selectedListItem &&
                            currentGroup === selectedSuggestion.selectedGroup
                        )
                        return (
                            <GridItem
                                key={index}
                                id={index}
                                onClick={() => onClickLSSuggestion(suggestion)}
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: MAX_COLUMN_WIDTH,
                                    color: isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--foreground)'
                                }}
                                selected={isSelected}
                            >
                                <SuggestionListItem
                                    key={index}
                                    suggestion={suggestion}
                                    isReference={isReference}
                                />
                            </GridItem>
                        )
                    })
                }
            </Grid>
            {isReference && (
                <div className={stmtEditorHelperClasses.suggestionDividerWrapper}>
                    <div className={stmtEditorHelperClasses.selectionSeparator} />
                    <br />
                </div>
            )}
        </>
    );
}
