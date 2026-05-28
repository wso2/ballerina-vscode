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

import { ActionStatement, STKindChecker } from "@wso2/syntax-tree";

import { ACTION, HTTP_ACTION } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { ExpressionComponent } from "../../Expression";
import { TokenComponent } from "../../Token";

interface ReturnStatementProps {
    model: ActionStatement;
}

export function ActionStatementC(props: ReturnStatementProps) {
    const { model } = props;
    const stmtCtx = useContext(StatementEditorContext);
    const {
        modelCtx: { currentModel, changeCurrentModel },
        config,
    } = stmtCtx;

    if (!currentModel.model) {
        if (
            (config.type === ACTION || config.type === HTTP_ACTION) &&
            model &&
            STKindChecker.isCheckAction(model.expression) &&
            STKindChecker.isRemoteMethodCallAction(model.expression.expression)
        ) {
            if (model.expression.expression.arguments?.length > 0) {
                changeCurrentModel(model.expression.expression.arguments[0]);
            } else {
                changeCurrentModel(model.expression.expression);
            }
        } else if (model && STKindChecker.isAsyncSendAction(model.expression)) {
            changeCurrentModel(model.expression.peerWorker);
        } else {
            changeCurrentModel(model.expression);
        }
    }

    let component: JSX.Element;
    if (STKindChecker.isAsyncSendAction(model.expression)) {
        const expressionModel: any = model.expression as any;
        component = (
            <>
                <ExpressionComponent model={expressionModel.expression} />
                <TokenComponent model={expressionModel.rightArrowToken} />
                <ExpressionComponent model={expressionModel.peerWorker} />
                <TokenComponent model={model.semicolonToken} />
            </>
        );
    } else {
        component = (
            <>
                <ExpressionComponent model={model.expression} />
                <TokenComponent model={model.semicolonToken} />
            </>
        );
    }

    return component;
}
