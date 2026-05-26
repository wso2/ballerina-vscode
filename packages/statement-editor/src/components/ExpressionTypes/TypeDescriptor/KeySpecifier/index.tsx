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

import { KeySpecifier } from "@wso2/syntax-tree";

import { EXPR_CONSTRUCTOR } from "../../../../constants";
import { StatementEditorContext } from "../../../../store/statement-editor-context";
import { ExpressionArrayComponent } from "../../../ExpressionArray";
import { useStatementRendererStyles } from "../../../styles";
import { TokenComponent } from "../../../Token";

interface KeySpecifierProps {
    model: KeySpecifier;
}

export function KeySpecifierComponent(props: KeySpecifierProps) {
    const { model } = props;
    const stmtCtx = useContext(StatementEditorContext);
    const {
        modelCtx: {
            updateModel,
        }
    } = stmtCtx;

    const statementRendererClasses = useStatementRendererStyles();

    const onClickOnPlusIcon = (event: any) => {
        event.stopPropagation();
        const isEmpty = model.fieldNames.length === 0;
        const expr = isEmpty ? EXPR_CONSTRUCTOR : `, ${EXPR_CONSTRUCTOR}`;
        const newPosition = isEmpty ? {
            ...model.closeParenToken.position,
            endColumn: model.closeParenToken.position.startColumn
        } : {
            startLine: model.fieldNames[model.fieldNames.length - 1].position.endLine,
            startColumn: model.fieldNames[model.fieldNames.length - 1].position.endColumn,
            endLine: model.closeParenToken.position.startLine,
            endColumn: model.closeParenToken.position.startColumn
        }
        updateModel(expr, newPosition);
    };

    return (
        <>
            <TokenComponent model={model.keyKeyword} />
            <TokenComponent model={model.openParenToken} />
            <ExpressionArrayComponent expressions={model.fieldNames} />
            <span
                className={statementRendererClasses.plusIcon}
                onClick={onClickOnPlusIcon}
            >
                +
            </span>
            <TokenComponent model={model.closeParenToken} />
        </>
    );
}
