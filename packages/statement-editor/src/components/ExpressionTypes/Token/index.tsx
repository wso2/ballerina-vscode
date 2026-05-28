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
import React from "react";

import {
    AsteriskToken,
    BooleanKeyword,
    DecimalFloatingPointLiteralToken,
    DecimalIntegerLiteralToken,
    DecimalKeyword,
    FalseKeyword,
    FloatKeyword,
    FunctionKeyword,
    IdentifierToken,
    IntKeyword,
    JsonKeyword,
    NullKeyword,
    StringKeyword,
    StringLiteralToken,
    TemplateString,
    TrueKeyword,
    VarKeyword
} from "@wso2/syntax-tree";

import { checkCommentMinutiae, getClassNameForToken, getJSXForMinutiae, getMinutiaeJSX } from "../../../utils";
import { StatementEditorViewState } from "../../../utils/statement-editor-viewstate";
import { InputEditor } from "../../InputEditor";

interface TokenProps {
    model: AsteriskToken
        | FalseKeyword
        | TrueKeyword
        | NullKeyword
        | FunctionKeyword
        | DecimalFloatingPointLiteralToken
        | DecimalIntegerLiteralToken
        | StringLiteralToken
        | BooleanKeyword
        | DecimalKeyword
        | FloatKeyword
        | IntKeyword
        | JsonKeyword
        | StringKeyword
        | VarKeyword
        | IdentifierToken
        | TemplateString;
}

export function TokenComponent(props: TokenProps) {
    const { model } = props;

    const inputEditorProps = {
        model,
        classNames: getClassNameForToken(model)
    };

    const isFieldWithNewLine = (model.viewState as StatementEditorViewState).multilineConstructConfig.isFieldWithNewLine;

    const leadingMinutiaeJSX = getJSXForMinutiae(model?.leadingMinutiae, isFieldWithNewLine);
    const trailingMinutiaeJSX = getJSXForMinutiae(model?.trailingMinutiae, isFieldWithNewLine);

    const filteredLeadingMinutiaeJSX = checkCommentMinutiae(leadingMinutiaeJSX);

    return (
        <>
            {filteredLeadingMinutiaeJSX}
            <InputEditor {...inputEditorProps} />
            {trailingMinutiaeJSX}
        </>
    );
}
