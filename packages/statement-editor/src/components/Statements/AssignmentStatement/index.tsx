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

import { AssignmentStatement, STKindChecker } from "@wso2/syntax-tree";

import { StatementEditorContext } from "../../../store/statement-editor-context";
import { ExpressionComponent } from "../../Expression";
import { TokenComponent } from "../../Token";

interface AssignmentStatementProps {
    model: AssignmentStatement;
}

export function AssignmentStatementComponent(props: AssignmentStatementProps) {
    const { model } = props;
    const stmtCtx = useContext(StatementEditorContext);
    const {
        modelCtx: {
            currentModel,
            changeCurrentModel
        }
    } = stmtCtx;

    if (!currentModel.model) {
        changeCurrentModel(model.expression);
    }

    let expressionComponent;

    if (model.expression && STKindChecker.isReceiveAction(model.expression)) {
        expressionComponent = (
            <>
                <TokenComponent model={model.expression.leftArrow} className="operator" />
                <ExpressionComponent model={model.expression.receiveWorkers} />
            </>
        );
    } else if (model.expression && STKindChecker.isWaitAction(model.expression)) {
        expressionComponent = (
            <>
                <TokenComponent model={model.expression.waitKeyword} className="operator" />
                <ExpressionComponent model={model.expression.waitFutureExpr} />
            </>
        );
    } else {
        expressionComponent = <ExpressionComponent model={model.expression} />
    }

    return (
        <>
            <ExpressionComponent model={model.varRef} />
            <TokenComponent model={model.equalsToken} className="operator" />
            {expressionComponent}
            <TokenComponent model={model.semicolonToken} />
        </>
    );
}
