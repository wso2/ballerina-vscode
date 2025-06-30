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

import { MethodCall, NodePosition, STKindChecker } from "@wso2/syntax-tree";

import { StatementEditorContext } from "../../../store/statement-editor-context";
import { PARAMETER_PLACEHOLDER } from "../../../utils/expressions";
import { ExpressionComponent } from "../../Expression";
import { ExpressionArrayComponent } from "../../ExpressionArray";
import { TokenComponent } from "../../Token";

interface MethodCallProps {
    model: MethodCall;
}

export function MethodCallComponent(props: MethodCallProps) {
    const { model } = props;
    const {
        modelCtx: {
            currentModel,
            changeCurrentModel
        }
    } = useContext(StatementEditorContext);

    const methodPosition: NodePosition = model.methodName.position
    methodPosition.endLine = model.closeParenToken.position.endLLine;
    methodPosition.endColumn = model.closeParenToken.position.endColumn;

    if (!currentModel.model || (currentModel.model.source === PARAMETER_PLACEHOLDER)) {
        if (model && STKindChecker.isMethodCall(model)) {
            changeCurrentModel(model);
        }
    }

    return (
        <>
            <ExpressionComponent model={model.expression} />
            <TokenComponent model={model.dotToken} />
            <ExpressionComponent model={model.methodName} stmtPosition={methodPosition} >
                <TokenComponent model={model.openParenToken} />
                <ExpressionArrayComponent expressions={model.arguments} />
                <TokenComponent model={model.closeParenToken} />
            </ExpressionComponent>
        </>
    );
}
