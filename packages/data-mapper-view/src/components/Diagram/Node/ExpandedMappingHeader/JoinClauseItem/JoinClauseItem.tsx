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
// tslint:disable: jsx-no-lambda  jsx-no-multiline-js
import React, { useState } from "react";

import { STModification } from "@wso2/ballerina-core";
import {
    CaptureBindingPattern,
    JoinClause,
    NodePosition,
    QueryExpression,
    STNode,
} from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../../utils/DataMapperContext/DataMapperContext";
import { getRenameEdits } from "../../../utils/ls-utils";
import { ClauseAddButton } from "../ClauseAddButton";
import { ClickableExpression } from "../Common";
import { useStyles } from "../styles";
import { Button, Codicon, ProgressRing } from "@wso2/ui-toolkit";

export function JoinClauseItem(props: {
    intermediateNode: JoinClause;
    onEditClick: (value: string, position: NodePosition, label: string) => void;
    onDeleteClick: () => Promise<void>;
    context: IDataMapperContext;
    queryExprNode: QueryExpression;
    itemIndex: number;
}) {
    const { onEditClick, onDeleteClick, intermediateNode, context, queryExprNode, itemIndex } = props;
    const { filePath, applyModifications, langServerRpcClient } = context;
    const classes = useStyles();
    const [nameEditable, setNameEditable] = useState(false);
    const variableName = (intermediateNode?.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName;
    const [updatedName, setUpdatedName] = useState(variableName.value);
    const [isLoading, setLoading] = useState(false);

    const onDelete = async () => {
        setLoading(true);
        try {
            await onDeleteClick();
        } finally {
            setLoading(false);
        }
    };

    const onKeyUp = async (key: string, node?: STNode) => {
        if (key === "Escape") {
            setNameEditable(false);
            setUpdatedName("");
        }
        if (key === "Enter") {
            setLoading(true);
            try {
                const workspaceEdit = await getRenameEdits(
                    filePath,
                    updatedName,
                    node.position as NodePosition,
                    langServerRpcClient
                );
                const modifications: STModification[] = [];

                Object.values(workspaceEdit?.changes).forEach((edits) => {
                    edits.forEach((edit) => {
                        modifications.push({
                            type: "INSERT",
                            config: { STATEMENT: edit.newText },
                            endColumn: edit.range.end.character,
                            endLine: edit.range.end.line,
                            startColumn: edit.range.start.character,
                            startLine: edit.range.start.line,
                        });
                    });
                });

                modifications.sort((a, b) => a.startLine - b.startLine);
                await applyModifications(modifications);
            } finally {
                setLoading(false);
            }
        }
    };

    const expression = intermediateNode.expression;
    const onExpression = intermediateNode.joinOnCondition?.lhsExpression;
    const equalsExpression = intermediateNode.joinOnCondition?.rhsExpression;

    return (
        <>
            <div className={classes.clauseItem}>
                <div className={classes.clauseKeyWrap}>{`${
                    intermediateNode.outerKeyword ? `${intermediateNode?.outerKeyword.value} ` : ""
                }${intermediateNode.joinKeyword.value}`}</div>

                <div className={classes.clauseItemBody}>
                    <div className={classes.clauseWrap}>
                        <span>{intermediateNode.typedBindingPattern.typeDescriptor.source}</span>
                        <span className={classes.clauseExpression}>
                            {nameEditable ? (
                                <input
                                    spellCheck={false}
                                    className={classes.input}
                                    autoFocus={true}
                                    value={updatedName}
                                    onChange={(event) => setUpdatedName(event.target.value)}
                                    onKeyUp={(event) => onKeyUp(event.key, variableName)}
                                    onBlur={() => {
                                        setNameEditable(false);
                                        setUpdatedName(variableName.value);
                                    }}
                                    data-testid={`let-clause-name-input-${itemIndex}`}
                                />
                            ) : (
                                <span onClick={() => setNameEditable(true)} data-testid={`join-clause-name-${itemIndex}`}>
                                    {updatedName}
                                </span>
                            )}
                        </span>
                        <span>{intermediateNode.inKeyword.value}</span>
                        <ClickableExpression
                            node={expression}
                            onEditClick={() => onEditClick(expression?.source, expression?.position, "Join expression")}
                            index={itemIndex}
                        />
                        <span>{intermediateNode.joinOnCondition?.onKeyword?.value}</span>
                        <ClickableExpression
                            node={onExpression}
                            onEditClick={() => onEditClick(onExpression?.source, onExpression?.position, "Join on expression")}
                            index={itemIndex}
                            testIdPrefix='join-clause-on-expression'
                            expressionPlaceholder='<add-on-expression>'
                        />
                        <span>{intermediateNode.joinOnCondition?.equalsKeyword?.value}</span>
                        <ClickableExpression
                            node={equalsExpression}
                            onEditClick={() => onEditClick(equalsExpression?.source, equalsExpression?.position, "Join equals expression")}
                            index={itemIndex}
                            testIdPrefix='join-clause-equals-on-expression'
                            expressionPlaceholder='<add-equals-expression>'
                        />
                    </div>
                    {isLoading ? (
                        <ProgressRing sx={{ height: '16px', width: '16px', marginRight: "10px" }} />
                    ) : (
                        <Button
                            appearance="icon"
                            onClick={onDelete}
                            data-testid={`join-clause-delete-${itemIndex}`}
                            sx={{ marginRight: "10px"}}
                        >
                            <Codicon name="trash" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                        </Button>
                    )}
                </div>
            </div>

            <ClauseAddButton context={context} queryExprNode={queryExprNode} addIndex={itemIndex} />
        </>
    );
}
