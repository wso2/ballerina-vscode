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
import { Grid, GridItem, Tooltip, Typography } from "@wso2/ui-toolkit";

import { MAX_COLUMN_WIDTH, SUGGESTION_COLUMN_SIZE } from "../../../../constants";
import { Suggestion } from "../../../../models/definitions";
import { StatementEditorContext } from "../../../../store/statement-editor-context";
import { displayCheckBoxAsExpression, isClosedRecord } from "../../../../utils";
import { Expression, ExpressionGroup } from "../../../../utils/expressions";
import { useStmtEditorHelperPanelStyles } from "../../../styles";

interface TemplateListProps {
    group: ExpressionGroup;
    groupIndex: number;
    selectedSuggestions: Suggestion;
    onClickExpressionSuggestion: (expression: Expression, clickedSuggestion: Suggestion) => void
}

export function TemplateList(props: TemplateListProps) {
    const {
        group,
        groupIndex,
        selectedSuggestions,
        onClickExpressionSuggestion,
    } = props;
    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();

    const {
        modelCtx: {
            currentModel
        }
    } = useContext(StatementEditorContext);

    return (
        <Grid columns={SUGGESTION_COLUMN_SIZE}>
            {
                group.expressions.map((expression, index) => {
                    const isSelected = groupIndex === selectedSuggestions?.selectedGroup
                        && index === selectedSuggestions?.selectedListItem;
                    return (
                        <GridItem
                            key={index}
                            id={index}
                            onClick={() => onClickExpressionSuggestion(expression,
                                { selectedGroup: groupIndex, selectedListItem: index })}
                            sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: MAX_COLUMN_WIDTH,
                                color: isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--foreground)'
                            }}
                            selected={isSelected}
                        >
                            <Tooltip
                                content={expression.name}
                                position="bottom-end"
                            >
                                {displayCheckBoxAsExpression(currentModel.model, expression) ? (
                                    <>
                                        <VSCodeCheckbox
                                            checked={isClosedRecord(currentModel.model)}
                                            onChange={null}
                                            data-testid="is-closed"
                                        />
                                        <div>{"is-closed ?"}</div>
                                    </>
                                ) : (
                                    <Typography
                                        variant="body3"
                                        className={stmtEditorHelperClasses.expressionExample}
                                        data-testid="expression-title"
                                    >
                                        {expression.example}
                                    </Typography>
                                )}
                            </Tooltip>
                        </GridItem>
                    );
                })
            }
        </Grid>
    );
}
