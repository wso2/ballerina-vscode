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
import React, { ReactNode, useContext } from "react";

import { LocalVarDecl, STKindChecker } from "@wso2/syntax-tree";
import classNames from "classnames";

import { ACTION, CONNECTOR, CUSTOM_CONFIG_TYPE, HTTP_ACTION } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { isPositionsEquals } from "../../../utils";
import { ExpressionComponent } from "../../Expression";
import { InputEditor } from "../../InputEditor";
import { KeywordComponent } from "../../Keyword";
import { useStatementRendererStyles } from "../../styles";
import { TokenComponent } from "../../Token";

interface LocalVarDeclProps {
    model: LocalVarDecl;
}

export function LocalVarDeclC(props: LocalVarDeclProps) {
    const { model } = props;
    const {
        modelCtx: {
            currentModel,
            changeCurrentModel
        },
        config
    } = useContext(StatementEditorContext);
    const hasTypedBindingPatternSelected = currentModel.model &&
        isPositionsEquals(currentModel.model.position, model.typedBindingPattern.position);

    const statementRendererClasses = useStatementRendererStyles();

    const onClickOnBindingPattern = (event: any) => {
        event.stopPropagation();
        changeCurrentModel(model.typedBindingPattern);
    };

    if (!currentModel.model) {
        if (
            config.type === CONNECTOR &&
            model &&
            STKindChecker.isCheckExpression(model.initializer) &&
            STKindChecker.isImplicitNewExpression(model.initializer.expression)
        ) {
            if (model.initializer.expression.parenthesizedArgList.arguments?.length > 0) {
                changeCurrentModel(model.initializer.expression.parenthesizedArgList.arguments[0]);
            } else {
                changeCurrentModel(model.initializer.expression.parenthesizedArgList);
            }
        } else if (
            (config.type === ACTION || config.type === HTTP_ACTION) &&
            model &&
            STKindChecker.isCheckAction(model.initializer) &&
            STKindChecker.isRemoteMethodCallAction(model.initializer.expression)
        ) {
            if (model.initializer.expression.arguments?.length > 0) {
                changeCurrentModel(model.initializer.expression.arguments[0]);
            } else {
                changeCurrentModel(model.initializer.expression);
            }
        } else if (
            (config.type === ACTION || config.type === HTTP_ACTION) &&
            model &&
            STKindChecker.isCheckAction(model.initializer) &&
            STKindChecker.isClientResourceAccessAction(model.initializer.expression)
        ) {
            if (model.initializer.expression.arguments) {
                changeCurrentModel(model.initializer.expression.arguments);
            } else if (model.initializer.expression.methodName){
                changeCurrentModel(model.initializer.expression.methodName);
            }else{
                changeCurrentModel(model.initializer.expression);
            }
        } else if (model.initializer && STKindChecker.isReceiveAction(model.initializer)) {
            changeCurrentModel(model.initializer.receiveWorkers);
        } else if (model.initializer && STKindChecker.isWaitAction(model.initializer)) {
            changeCurrentModel(model.initializer.waitFutureExpr);
        } else if (model.initializer && STKindChecker.isFlushAction(model.initializer)) {
            changeCurrentModel(model.initializer.peerWorker);
        } else if (model.initializer) {
            changeCurrentModel(model.initializer);
        } else if (config.type === CUSTOM_CONFIG_TYPE) {
            changeCurrentModel(model);
        } else if (!model.initializer && model.typedBindingPattern?.typeDescriptor){
            changeCurrentModel(model.typedBindingPattern.typeDescriptor);
        }
    }

    let typedBindingComponent: ReactNode;
    if (model.typedBindingPattern.bindingPattern.source) {
        typedBindingComponent = (
            <ExpressionComponent
                model={model.typedBindingPattern}
            />
        )
    } else {
        const inputEditorProps = {
            model
        };

        typedBindingComponent = (
            <span
                className={classNames(
                    statementRendererClasses.expressionElement,
                    hasTypedBindingPatternSelected && statementRendererClasses.expressionElementSelected
                )}
                onClick={onClickOnBindingPattern}
            >
                <InputEditor {...inputEditorProps} />
            </span>
        )
    }

    let expressionComponent: JSX.Element;

    if (model.initializer && STKindChecker.isReceiveAction(model.initializer)) {
        expressionComponent = (
            <>
                <TokenComponent model={model.initializer.leftArrow} className="operator" />
                <ExpressionComponent model={model.initializer.receiveWorkers} />
            </>
        );
    } else if (model.initializer && STKindChecker.isWaitAction(model.initializer)) {
        expressionComponent = (
            <>
                <TokenComponent model={model.initializer.waitKeyword} className="operator" />
                <ExpressionComponent model={model.initializer.waitFutureExpr} />
            </>
        );
    } else if (model.initializer && STKindChecker.isFlushAction(model.initializer)) {
        expressionComponent = (
            <>
                <TokenComponent model={model.initializer.flushKeyword} className="operator" />
                <ExpressionComponent model={model.initializer.peerWorker} />
            </>
        );
    } else if (model.initializer) {
        expressionComponent = (
            <>
                <ExpressionComponent model={model.initializer} />
            </>
        );
    }

    return (
        <>
            {model.finalKeyword && <KeywordComponent model={model.finalKeyword}/>}
            {typedBindingComponent}
            {model.initializer && <TokenComponent model={model.equalsToken} className="operator" />}
            {expressionComponent}
            {
                model.semicolonToken.position.startColumn !== model.semicolonToken.position.endColumn &&
                <TokenComponent model={model.semicolonToken} />
            }
        </>
    );
}

