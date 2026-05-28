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

import { MappingConstructor, NodePosition } from "@wso2/syntax-tree";

import { ArrayType, MAPPING_CONSTRUCTOR } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { NewExprAddButton } from "../../Button/NewExprAddButton";
import { ExpressionArrayComponent } from "../../ExpressionArray";
import { TokenComponent } from "../../Token";

interface MappingConstructorProps {
    model: MappingConstructor;
}

export function MappingConstructorComponent(props: MappingConstructorProps) {
    const { model } = props;

    const {
        modelCtx: {
            updateModel,
        }
    } = useContext(StatementEditorContext);

    const isSingleLine = model.position.startLine === model.position.endLine;
    const isEmpty = model.fields.length === 0;

    const addNewExpression = () => {
        const expressionTemplate = MAPPING_CONSTRUCTOR;
        const newField = isEmpty ? expressionTemplate : `,\n${expressionTemplate}`;
        const newPosition: NodePosition = isEmpty
            ? {
                ...model.closeBrace.position,
                endColumn: model.closeBrace.position.startColumn
            }
            : {
                startLine: model.fields[model.fields.length - 1].position.endLine,
                startColumn:  model.fields[model.fields.length - 1].position.endColumn,
                endLine: model.closeBrace.position.startLine,
                endColumn: model.closeBrace.position.startColumn
            }
        updateModel(newField, newPosition);
    };

    return (
        <>
            <TokenComponent model={model.openBrace} />
            <ExpressionArrayComponent
                expressions={model.fields}
                modifiable={!isSingleLine}
                arrayType={ArrayType.MAPPING_CONSTRUCTOR}
            />
            {(isEmpty || isSingleLine) && (<NewExprAddButton model={model} onClick={addNewExpression} />)}
            <TokenComponent model={model.closeBrace} />
        </>
    );
}
