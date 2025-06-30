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

import { InferParamList } from "@wso2/syntax-tree";

import { DEFAULT_IDENTIFIER } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { NewExprAddButton } from "../../Button/NewExprAddButton";
import { ExpressionArrayComponent } from "../../ExpressionArray";
import { TokenComponent } from "../../Token";

interface InferParamListComponentProps {
    model: InferParamList;
}

export function InferParamListComponent(props: InferParamListComponentProps) {
    const { model } = props;
    const stmtCtx = useContext(StatementEditorContext);
    const {
        modelCtx: {
            updateModel,
        }
    } = stmtCtx;

    const addNewExpression = () => {
        const isEmpty = model.parameters.length === 0;
        const expr = isEmpty ? DEFAULT_IDENTIFIER : `, ${DEFAULT_IDENTIFIER}`;
        const newPosition = isEmpty ? {
            ...model.closeParenToken.position,
            endColumn: model.closeParenToken.position.startColumn
        } : {
            startLine: model.parameters[model.parameters.length - 1].position.endLine,
            startColumn: model.parameters[model.parameters.length - 1].position.endColumn,
            endLine: model.closeParenToken.position.startLine,
            endColumn: model.closeParenToken.position.startColumn
        }
        updateModel(expr, newPosition);
    };

    return (
        <>
            <TokenComponent model={model.openParenToken} />
            <ExpressionArrayComponent expressions={model.parameters} />
            <NewExprAddButton model={model} onClick={addNewExpression}/>
            <TokenComponent model={model.closeParenToken} />
        </>
    );
}
