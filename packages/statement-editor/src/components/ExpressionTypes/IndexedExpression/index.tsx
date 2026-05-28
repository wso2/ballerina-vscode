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
import React, { useContext } from "react";

import { IndexedExpression } from "@wso2/syntax-tree";

import { EXPR_CONSTRUCTOR } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { NewExprAddButton } from "../../Button/NewExprAddButton";
import { ExpressionComponent } from "../../Expression";
import { ExpressionArrayComponent } from "../../ExpressionArray";
import { TokenComponent } from "../../Token";

interface IndexedExpressionProps {
    model: IndexedExpression;
}

export function IndexedExpressionComponent(props: IndexedExpressionProps) {
    const { model } = props;
    const {
        modelCtx: {
            updateModel,
        }
    } = useContext(StatementEditorContext);

    const addNewExpression = () => {
        const expr = `, ${EXPR_CONSTRUCTOR}`;
        const newPosition =  {
            startLine: model.keyExpression[model.keyExpression.length - 1].position.endLine,
            startColumn: model.keyExpression[model.keyExpression.length - 1].position.endColumn,
            endLine: model.closeBracket.position.startLine,
            endColumn: model.closeBracket.position.startColumn
        }
        updateModel(expr, newPosition);
    };

    return (
        <>
            <ExpressionComponent model={model.containerExpression} />
            <TokenComponent model={model.openBracket} />
            <ExpressionArrayComponent expressions={model.keyExpression} />
            <NewExprAddButton model={model} onClick={addNewExpression}/>
            <TokenComponent model={model.closeBracket} />
        </>
    );
}
