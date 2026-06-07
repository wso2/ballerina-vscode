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

import { NodePosition, TableConstructor } from "@wso2/syntax-tree";

import { MAPPING_CONSTRUCTOR } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { NewExprAddButton } from "../../Button/NewExprAddButton";
import { ExpressionArrayComponent } from "../../ExpressionArray";
import { TokenComponent } from "../../Token";

interface TableConstructorProps {
    model: TableConstructor;
}

export function TableConstructorComponent(props: TableConstructorProps) {
    const { model } = props;

    const {
        modelCtx: {
            updateModel,
        }
    } = useContext(StatementEditorContext);

    const addNewExpression = () => {
        const expressionTemplate = MAPPING_CONSTRUCTOR;
        const newField = model.rows.length !== 0 ? `, { ${expressionTemplate} }` : `{ ${expressionTemplate} }`;
        const newPosition: NodePosition = model.rows.length === 0
            ? {
                ...model.closeBracket.position,
                endColumn: model.closeBracket.position.startColumn
            }
            : {
                startLine: model.rows[model.rows.length - 1].position.endLine,
                startColumn:  model.rows[model.rows.length - 1].position.endColumn,
                endLine: model.closeBracket.position.startLine,
                endColumn: model.closeBracket.position.startColumn
            }
        updateModel(newField, newPosition);
    };

    return (
        <>
            <TokenComponent model={model.tableKeyword} className={"keyword"} />
            <TokenComponent model={model.openBracket} />
            <ExpressionArrayComponent expressions={model.rows} />
            <NewExprAddButton model={model} onClick={addNewExpression}/>
            <TokenComponent model={model.closeBracket} />
        </>
    );
}
