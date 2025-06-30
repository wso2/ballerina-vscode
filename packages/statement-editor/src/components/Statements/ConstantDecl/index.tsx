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

import { ConstDeclaration } from "@wso2/syntax-tree";

import { CUSTOM_CONFIG_TYPE } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { ExpressionComponent } from "../../Expression";
import { KeywordComponent } from "../../Keyword";
import { TokenComponent } from "../../Token";

interface ConstantDeclProps {
    model: ConstDeclaration;
}

export function ConstantDeclC(props: ConstantDeclProps) {
    const { model } = props;
    const {
        modelCtx: {
            currentModel,
            changeCurrentModel
        },
        config
    } = useContext(StatementEditorContext);

    if (!currentModel.model) {
        if (model.initializer) {
            changeCurrentModel(model.initializer);
        } else if (config.type === CUSTOM_CONFIG_TYPE) {
            changeCurrentModel(model);
        }
    }

    return (
        <>
            {model.visibilityQualifier && <KeywordComponent model={model.visibilityQualifier} />}
            <TokenComponent model={model.constKeyword} className={"keyword"} />
            {model.typeDescriptor && <ExpressionComponent model={model.typeDescriptor}/>}
            <ExpressionComponent model={model.variableName}/>
            <TokenComponent model={model.equalsToken} className={"operator"} />
            <ExpressionComponent model={model.initializer}/>
            {!model.semicolonToken.isMissing && <TokenComponent model={model.semicolonToken} />}
        </>
    );
}
