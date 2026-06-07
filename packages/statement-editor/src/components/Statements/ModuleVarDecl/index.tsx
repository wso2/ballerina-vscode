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

import {
    ConfigurableKeyword,
    FinalKeyword,
    IsolatedKeyword,
    ModuleVarDecl,
    STKindChecker
} from "@wso2/syntax-tree";

import { CONNECTOR, CUSTOM_CONFIG_TYPE } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { ExpressionComponent } from "../../Expression";
import { KeywordComponent } from "../../Keyword";
import { TokenComponent } from "../../Token";

interface ModuleVarDeclProps {
    model: ModuleVarDecl;
}

export function ModuleVarDeclC(props: ModuleVarDeclProps) {
    const { model } = props;
    const {
        modelCtx: {
            currentModel,
            changeCurrentModel
        },
        config
    } = useContext(StatementEditorContext);

    if (!currentModel.model) {
        if (
            config.type === CONNECTOR &&
            model &&
            model.initializer &&
            STKindChecker.isCheckExpression(model.initializer) &&
            STKindChecker.isImplicitNewExpression(model.initializer.expression)
        ) {
            if (model.initializer.expression.parenthesizedArgList.arguments?.length > 0) {
                changeCurrentModel(model.initializer.expression.parenthesizedArgList.arguments[0]);
            } else {
                changeCurrentModel(model.initializer.expression.parenthesizedArgList);
            }
        } else if (model.initializer) {
            changeCurrentModel(model.initializer);
        } else if (config.type === CUSTOM_CONFIG_TYPE) {
            changeCurrentModel(model);
        }
    }

    const qualifiers = model.qualifiers.map((qualifier: ConfigurableKeyword | FinalKeyword | IsolatedKeyword) => {
        return (
            <>
                {STKindChecker.isFinalKeyword(qualifier) || STKindChecker.isIsolatedKeyword(qualifier) ?
                    <KeywordComponent model={qualifier}/> :
                    <TokenComponent model={qualifier} className={"keyword"} />
                }
            </>
        )
    });

    return (
        <>
            {model?.metadata && <TokenComponent model={model.metadata} className={"keyword"} />}
            {model.visibilityQualifier && <KeywordComponent model={model.visibilityQualifier}/>}
            {qualifiers}
            <ExpressionComponent model={model.typedBindingPattern} />
            {model?.initializer && (
                <>
                    <TokenComponent model={model.equalsToken} className={"operator"} />
                    <ExpressionComponent model={model.initializer}/>
                </>
            )}
            {/* TODO: use model.semicolonToken.isMissing when the ST interface is supporting */}
            {model.semicolonToken.position.startColumn !== model.semicolonToken.position.endColumn &&
                <TokenComponent model={model.semicolonToken} />}
        </>
    );
}
