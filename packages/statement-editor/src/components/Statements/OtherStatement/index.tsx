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

import cn from "classnames";

import SyntaxErrorWarning from "../../../assets/icons/SyntaxErrorWarning";
import { OtherStatementNodeTypes } from "../../../constants";
import { StatementEditorContext } from "../../../store/statement-editor-context";
import { checkCommentMinutiae, getJSXForMinutiae } from "../../../utils";
import { StatementEditorViewState } from "../../../utils/statement-editor-viewstate";
import { InputEditor } from "../../InputEditor";
import { useStatementRendererStyles } from "../../styles";

interface OtherStatementProps {
    model: OtherStatementNodeTypes;
}

export function OtherStatementTypes(props: OtherStatementProps) {
    const { model } = props;

    const statementRendererClasses = useStatementRendererStyles();

    const inputEditorProps = {
        model
    };

    const { modelCtx: {hasSyntaxDiagnostics} } = useContext(StatementEditorContext);

    const isFieldWithNewLine = (model?.viewState as StatementEditorViewState)?.multilineConstructConfig?.isFieldWithNewLine;

    const leadingMinutiaeJSX = getJSXForMinutiae(model?.leadingMinutiae, isFieldWithNewLine);
    const trailingMinutiaeJSX = getJSXForMinutiae(model?.trailingMinutiae, isFieldWithNewLine);
    const filteredLeadingMinutiaeJSX = checkCommentMinutiae(leadingMinutiaeJSX);

    const styleClassNames = cn(statementRendererClasses.expressionElement,
        hasSyntaxDiagnostics ? statementRendererClasses.syntaxErrorElementSelected :
                               statementRendererClasses.expressionElementSelected
    )

    return (
        <span className={styleClassNames}>
            {hasSyntaxDiagnostics  && (
                <span className={statementRendererClasses.syntaxErrorTooltip} data-testid="syntax-error-highlighting">
                    <SyntaxErrorWarning />
                </span>
            )}
            {filteredLeadingMinutiaeJSX}
            <InputEditor {...inputEditorProps} />
            {trailingMinutiaeJSX}
        </span>
    );
}
