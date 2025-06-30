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
import React from "react";

import { PortModel, PortModelGenerics } from "@projectstorm/react-diagrams";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import {
    NodePosition,
    STKindChecker,
    STNode,
} from "@wso2/syntax-tree";
import classNames from "classnames";

import { ClauseAddButton } from "./ClauseAddButton";
import { ExpandedMappingHeaderNode } from "./ExpandedMappingHeaderNode";
import { JoinClauseItem } from "./JoinClauseItem";
import { LetClauseItem } from "./LetClauseItem";
import { LimitClauseItem } from "./LimitClauseItem";
import { OrderByClauseItem } from "./OrderClauseItem";
import { useStyles } from "./styles";
import { WhereClauseItem } from "./WhereClauseItem";

export interface ExpandedMappingHeaderWidgetProps {
    node: ExpandedMappingHeaderNode;
    title: string;

    engine: DiagramEngine;
    port: PortModel<PortModelGenerics>;
}

export function ExpandedMappingHeaderWidget(props: ExpandedMappingHeaderWidgetProps) {
    const { node, engine, port } = props;
    const { context: { applyModifications }} = node;
    const classes = useStyles();

    const onClickEdit = (value: string, valuePosition: NodePosition, label: string) => {
        node.context.enableStatementEditor({value, valuePosition, label});
    };

    const deleteClause = async (clauseItem: STNode) => {
        await applyModifications([{ type: "DELETE", ...clauseItem.position }]);
    };

    const fromClause = props.node.queryExpr.queryPipeline.fromClause;
    const intermediateClauses = props.node.queryExpr.queryPipeline.intermediateClauses;

    return (
        <>
            <div>
                <div className={classes.clauseItem}>
                    <div className={classNames(classes.clauseKeyWrap, classes.fromClauseKeyWrap)}>{fromClause.fromKeyword.value}</div>
                    <div className={classes.clauseItemBody}>
                        <div className={classes.clauseWrap}>
                            <span
                                className={classes.clauseItemKey}
                            >
                                {` ${fromClause.typedBindingPattern.source} ${fromClause.inKeyword.value}`}
                            </span>
                            <span
                                className={classes.clauseExpression}
                                onClick={() => onClickEdit(fromClause.expression.source, fromClause.expression.position, "From clause")}
                            >
                                {fromClause.expression.source}
                            </span>
                        </div>
                    </div>
                </div>

                <ClauseAddButton
                    context={node.context}
                    queryExprNode={node.queryExpr}
                    addIndex={-1}
                />

                {intermediateClauses.length > 0 &&
                    intermediateClauses?.map((clauseItem, index) => {
                        const itemProps = {
                            key: index,
                            onEditClick: (value: string, position: NodePosition, label: string) => onClickEdit(value, position, label),
                            onDeleteClick: () => deleteClause(clauseItem),
                            context: node.context,
                            queryExprNode: node.queryExpr,
                            itemIndex: index,
                        };
                        if (STKindChecker.isWhereClause(clauseItem)) {
                            return <WhereClauseItem {...itemProps} intermediateNode={clauseItem} />;
                        } else if (STKindChecker.isLetClause(clauseItem)) {
                            return <LetClauseItem {...itemProps} intermediateNode={clauseItem} />;
                        } else if (STKindChecker.isLimitClause(clauseItem)) {
                            return <LimitClauseItem {...itemProps} intermediateNode={clauseItem} />;
                        } else if (STKindChecker.isOrderByClause(clauseItem)) {
                            return <OrderByClauseItem {...itemProps} intermediateNode={clauseItem} />;
                        } else if (STKindChecker.isJoinClause(clauseItem)) {
                            return <JoinClauseItem {...itemProps} intermediateNode={clauseItem} />;
                        }
                    })}

                <div className={classes.queryInputInputPortWrap}>
                    <PortWidget port={port} engine={engine} />
                </div>
            </div>
        </>
    );
}
