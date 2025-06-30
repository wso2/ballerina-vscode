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
import React, { useContext } from "react";

import { NodePosition, QueryPipeline, STNode } from "@wso2/syntax-tree";

import { ArrayType, DEFAULT_WHERE_INTERMEDIATE_CLAUSE } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { NewExprAddButton } from "../../Button/NewExprAddButton";
import { ExpressionComponent } from "../../Expression";
import { ExpressionArrayComponent } from "../../ExpressionArray";

interface QueryPipelineProps {
    model: QueryPipeline;
}

export function QueryPipelineComponent(props: QueryPipelineProps) {
    const { model } = props;

    const {
        modelCtx: {
            updateModel
        }
    } = useContext(StatementEditorContext);

    const [isHovered, setHovered] = React.useState(false);

    const addNewExpression = (fromClauseModel: STNode) => {
        const newPosition: NodePosition = {
            ...fromClauseModel.position,
            startLine: fromClauseModel.position.endLine,
            startColumn: fromClauseModel.position.endColumn
        }
        updateModel(`\n ${DEFAULT_WHERE_INTERMEDIATE_CLAUSE}`, newPosition);
    };

    const onMouseEnter = (e: React.MouseEvent) => {
        setHovered(true);
        e.stopPropagation();
        e.preventDefault();
    }

    const onMouseLeave = (e: React.MouseEvent) => {
        setHovered(false);
        e.stopPropagation();
        e.preventDefault();
    }

    return (
        <>
            <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} >
                <ExpressionComponent model={model.fromClause} />
                <NewExprAddButton
                    model={model.fromClause}
                    onClick={addNewExpression}
                    classNames={isHovered ? "view" : "hide"}
                />
            </span>
            <br/>
            <ExpressionArrayComponent
                modifiable={true}
                arrayType={ArrayType.INTERMEDIATE_CLAUSE}
                expressions={model.intermediateClauses}
            />
        </>
    );
}
