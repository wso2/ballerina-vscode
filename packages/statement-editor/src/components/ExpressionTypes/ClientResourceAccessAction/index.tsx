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

import { ClientResourceAccessAction, NodePosition } from "@wso2/syntax-tree";

import { StatementEditorContext } from "../../../store/statement-editor-context";
import { EXPR_PLACEHOLDER } from "../../../utils/expressions";
import { NewExprAddButton } from "../../Button/NewExprAddButton";
import { ExpressionComponent } from "../../Expression";
import { ExpressionArrayComponent } from "../../ExpressionArray";
import { TokenComponent } from "../../Token";

interface ClientResourceAccessActionProps {
    model: ClientResourceAccessAction;
}

export function ClientResourceAccessActionComponent(props: ClientResourceAccessActionProps) {
    const { model } = props;
    const {
        modelCtx: {
            updateModel
        }
    } = useContext(StatementEditorContext);

    const methodPosition: NodePosition = model.methodName?.position;
    if (model.arguments && methodPosition) {
        methodPosition.endLine = model.arguments.closeParenToken.position.endLLine;
        methodPosition.endColumn = model.arguments.closeParenToken.position.endColumn;
    }

    const addNewExpression = () => {
        const expression = `.${EXPR_PLACEHOLDER}`;
        const position: NodePosition =  model.position;
        position.startColumn = model.position.endColumn;
        position.startLine = model.position.endLine;
        updateModel(expression, position);
    };

    return (
        <>
            <ExpressionComponent model={model.expression} />
            <TokenComponent model={model.rightArrowToken} className={"operator"} />
            {model.resourceAccessPath.length ? <TokenComponent model={model.slashToken}  />
                : <ExpressionComponent model={model.slashToken} />}
            {model.resourceAccessPath && <ExpressionArrayComponent expressions={model.resourceAccessPath} />}
            {model.dotToken && <TokenComponent model={model.dotToken} className={"operator"} />}

            {model.methodName && (
                <ExpressionComponent model={model.methodName} stmtPosition={methodPosition}>
                    {model.arguments?.openParenToken && <TokenComponent model={model.arguments.openParenToken} />}
                    {model.arguments?.arguments && <ExpressionArrayComponent expressions={model.arguments.arguments} />}
                    {model.arguments?.closeParenToken && <TokenComponent model={model.arguments.closeParenToken} />}
                </ExpressionComponent>
            )}
            {!model.methodName && (
                <NewExprAddButton model={model} onClick={addNewExpression}/>
            )}
        </>
    );
}
