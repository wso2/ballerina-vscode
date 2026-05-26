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

import { ListConstructor } from "@wso2/syntax-tree";

import { EXPR_CONSTRUCTOR } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { NewExprAddButton } from "../../Button/NewExprAddButton";
import { ExpressionArrayComponent } from "../../ExpressionArray";
import { TokenComponent } from "../../Token";

interface ListConstructorProps {
    model: ListConstructor;
}

export function ListConstructorComponent(props: ListConstructorProps) {
    const { model } = props;
    const stmtCtx = useContext(StatementEditorContext);
    const {
        modelCtx: {
            updateModel,
        }
    } = stmtCtx;

    const addNewExpression = () => {
        const isEmpty = model.expressions.length === 0;
        const expr = isEmpty ? EXPR_CONSTRUCTOR : `, ${EXPR_CONSTRUCTOR}`;
        const newPosition = isEmpty ? {
            ...model.closeBracket.position,
            endColumn: model.closeBracket.position.startColumn
        } : {
            startLine: model.expressions[model.expressions.length - 1].position.endLine,
            startColumn: model.expressions[model.expressions.length - 1].position.endColumn,
            endLine: model.closeBracket.position.startLine,
            endColumn: model.closeBracket.position.startColumn
        }
        updateModel(expr, newPosition);
    };

    return (
        <>
            <TokenComponent model={model.openBracket} />
            <ExpressionArrayComponent expressions={model.expressions} />
            <NewExprAddButton model={model} onClick={addNewExpression}/>
            <TokenComponent model={model.closeBracket} />
        </>
    );
}
